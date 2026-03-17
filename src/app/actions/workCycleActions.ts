"use server"

import { revalidatePath } from "next/cache"

import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { normalizeOptionalText, normalizeRequiredText } from "@/lib/normalizers"
import { WorkCycleInput, WorkCycleSchema } from "@/lib/schemas"
import {
  buildDefaultWorkCycle,
  ensureUserWorkspace,
  resolveWorkCycleForUser,
  shiftDateByYears,
} from "@/lib/work-cycles"

function revalidateWorkspace() {
  revalidatePath("/dashboard")
}

function buildWorkCycleData(data: WorkCycleInput) {
  return {
    name: normalizeRequiredText(data.name),
    year: data.year,
    startDate: data.startDate,
    endDate: data.endDate,
    status: data.status,
    focusText: normalizeOptionalText(data.focusText),
    billableTarget: data.billableTarget,
    efrTarget: data.efrTarget,
    multiPersonTarget: data.multiPersonTarget,
  }
}

export async function getWorkCycles() {
  const user = await getServerUser()
  if (!user) return []

  await ensureUserWorkspace(user.id)

  return prisma.workCycle.findMany({
    where: { userId: user.id },
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  })
}

export async function createWorkCycle(data: WorkCycleInput) {
  const parsed = WorkCycleSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Validation failed: " + parsed.error.issues.map((issue) => issue.message).join(", ") }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const existingCycle = await prisma.workCycle.findUnique({
      where: {
        userId_year: {
          userId: user.id,
          year: parsed.data.year,
        },
      },
    })

    if (existingCycle) {
      return { error: `A workspace for ${parsed.data.year} already exists` }
    }

    const cycle = await prisma.workCycle.create({
      data: {
        ...buildWorkCycleData(parsed.data),
        userId: user.id,
      },
    })

    revalidateWorkspace()
    return { success: true, cycle }
  } catch (err: unknown) {
    console.error("Create cycle error:", err)
    return { error: "Failed to create workspace" }
  }
}

export async function updateWorkCycle(id: string, data: WorkCycleInput) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid workspace ID" }
  }

  const parsed = WorkCycleSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Validation failed: " + parsed.error.issues.map((issue) => issue.message).join(", ") }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const existingCycle = await prisma.workCycle.findFirst({
      where: { id, userId: user.id },
    })
    if (!existingCycle) return { error: "Workspace not found or access denied" }

    const conflictingCycle = await prisma.workCycle.findFirst({
      where: {
        id: { not: id },
        userId: user.id,
        year: parsed.data.year,
      },
    })
    if (conflictingCycle) {
      return { error: `A workspace for ${parsed.data.year} already exists` }
    }

    const cycle = await prisma.workCycle.update({
      where: { id },
      data: buildWorkCycleData(parsed.data),
    })

    revalidateWorkspace()
    return { success: true, cycle }
  } catch (err: unknown) {
    console.error("Update cycle error:", err)
    return { error: "Failed to update workspace" }
  }
}

export async function createNextYearWorkspace(sourceCycleId?: string) {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const currentYear = new Date().getFullYear()
    const nextYear = currentYear + 1
    const sourceCycle = await ensureUserWorkspace(user.id, currentYear)

    if (!sourceCycle) return { error: "Workspace not found" }

    if (sourceCycleId && sourceCycleId !== sourceCycle.id) {
      return { error: `Prepare next year from your ${currentYear} workspace to avoid duplicate future workspaces` }
    }

    const existingNextCycle = await prisma.workCycle.findUnique({
      where: {
        userId_year: {
          userId: user.id,
          year: nextYear,
        },
      },
    })

    if (existingNextCycle) {
      return { error: `${nextYear} workspace already exists` }
    }

    const defaultTargetCycle = buildDefaultWorkCycle(nextYear)

    const result = await prisma.$transaction(async (tx) => {
      const targetCycle = await tx.workCycle.create({
        data: {
          ...defaultTargetCycle,
          billableTarget: sourceCycle.billableTarget,
          efrTarget: sourceCycle.efrTarget,
          multiPersonTarget: sourceCycle.multiPersonTarget,
          focusText: sourceCycle.focusText,
          userId: user.id,
        },
      })
      let carriedProjectCount = 0
      let carriedTaskCount = 0

      const carryProjects = await tx.project.findMany({
        where: {
          userId: user.id,
          workCycleId: sourceCycle.id,
          archivedAt: null,
          status: { in: ["Active", "Placeholder"] },
        },
      })

      const projectCloneMap = new Map<string, string>()

      for (const project of carryProjects) {
        if (projectCloneMap.has(project.id)) continue

        const clonedProject = await tx.project.create({
          data: {
            engagementName: project.engagementName,
            clientName: project.clientName,
            assessmentType: project.assessmentType,
            status: project.status,
            timelineStart: shiftDateByYears(project.timelineStart, 1),
            timelineEnd: shiftDateByYears(project.timelineEnd, 1),
            billable: project.billable,
            shadowing: project.shadowing,
            effortTimeHours: project.effortTimeHours,
            projectID: project.projectID,
            EM: project.EM,
            PM: project.PM,
            consultants: project.consultants,
            projectReportLink: project.projectReportLink,
            isMultiPerson: project.isMultiPerson,
            isLeadConsultant: project.isLeadConsultant,
            userId: user.id,
            workCycleId: targetCycle.id,
            carriedForwardFromId: project.id,
          },
        })

        projectCloneMap.set(project.id, clonedProject.id)
        carriedProjectCount += 1
      }

      const carryTasks = await tx.task.findMany({
        where: {
          userId: user.id,
          workCycleId: sourceCycle.id,
          archivedAt: null,
          status: { not: "DONE" },
        },
      })

      for (const task of carryTasks) {
        const targetProjectId = task.projectId ? projectCloneMap.get(task.projectId) : null

        if (task.projectId && !targetProjectId) {
          continue
        }

        const existingTaskClone = await tx.task.findFirst({
          where: {
            userId: user.id,
            workCycleId: targetCycle.id,
            title: task.title,
            projectId: targetProjectId,
          },
          select: { id: true },
        })

        if (existingTaskClone) continue

        await tx.task.create({
          data: {
            title: task.title,
            description: task.description,
            status: task.status,
            priority: task.priority,
            dueDate: shiftDateByYears(task.dueDate, 1),
            reminderAt: shiftDateByYears(task.reminderAt, 1),
            estimateHours: task.estimateHours,
            projectId: targetProjectId,
            workCycleId: targetCycle.id,
            userId: user.id,
          },
        })
        carriedTaskCount += 1
      }

      const cycleEnded = new Date() > sourceCycle.endDate
      if (cycleEnded) {
        await tx.project.updateMany({
          where: {
            userId: user.id,
            workCycleId: sourceCycle.id,
            id: { in: carryProjects.map((project) => project.id) },
            archivedAt: null,
          },
          data: {
            archivedAt: new Date(),
            archivedReason: `Carried forward to ${nextYear}`,
          },
        })

        await tx.task.updateMany({
          where: {
            userId: user.id,
            workCycleId: sourceCycle.id,
            id: { in: carryTasks.map((task) => task.id) },
            archivedAt: null,
          },
          data: {
            archivedAt: new Date(),
            archivedReason: `Carried forward to ${nextYear}`,
          },
        })

        await tx.workCycle.update({
          where: { id: sourceCycle.id },
          data: { status: "CLOSED" },
        })
      }

      return {
        targetCycle,
        carriedProjects: carriedProjectCount,
        carriedTasks: carriedTaskCount,
        closedSource: cycleEnded,
      }
    })

    revalidateWorkspace()
    return {
      success: true,
      cycle: result.targetCycle,
      carriedProjects: result.carriedProjects,
      carriedTasks: result.carriedTasks,
      closedSource: result.closedSource,
    }
  } catch (err: unknown) {
    console.error("Create next year workspace error:", err)
    return { error: "Failed to prepare next year's workspace" }
  }
}

export async function deleteWorkCycle(id: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid workspace ID" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const currentYear = new Date().getFullYear()
    const workspaceCount = await prisma.workCycle.count({
      where: { userId: user.id },
    })

    if (workspaceCount <= 1) {
      return { error: "Keep at least one workspace in the app" }
    }

    const cycle = await prisma.workCycle.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        year: true,
      },
    })

    if (!cycle) return { error: "Workspace not found or access denied" }

    if (cycle.year === currentYear) {
      return { error: `The ${currentYear} workspace is pinned as your active calendar workspace` }
    }

    const result = await prisma.$transaction(async (tx) => {
      const [projectCount, efrCount, taskCount] = await Promise.all([
        tx.project.count({ where: { userId: user.id, workCycleId: cycle.id } }),
        tx.efrSubmission.count({ where: { userId: user.id, workCycleId: cycle.id } }),
        tx.task.count({ where: { userId: user.id, workCycleId: cycle.id } }),
      ])

      if (projectCount + efrCount + taskCount > 0) {
        return { deleted: false }
      }

      await tx.workCycle.delete({
        where: { id: cycle.id },
      })

      return { deleted: true }
    })

    if (!result.deleted) {
      return {
        error: "Move, archive, or delete every project, EFR, and task in this workspace before deleting it",
      }
    }

    revalidateWorkspace()
    return {
      success: true,
      deletedCycleId: cycle.id,
    }
  } catch (err: unknown) {
    console.error("Delete cycle error:", err)
    return { error: "Failed to delete workspace" }
  }
}

export async function getResolvedWorkCycle(workCycleId?: string) {
  const user = await getServerUser()
  if (!user) return null

  return resolveWorkCycleForUser(user.id, workCycleId)
}
