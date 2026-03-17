"use server"

import { revalidatePath } from "next/cache"

import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  normalizeOptionalDate,
  normalizeOptionalText,
  normalizeOptionalUrl,
  normalizeRequiredText,
} from "@/lib/normalizers"
import { ProjectInput, ProjectSchema } from "@/lib/schemas"
import { ensureUserWorkspace, resolveWorkCycleForUser } from "@/lib/work-cycles"

function buildProjectData(data: ProjectInput, workCycleId: string) {
  return {
    workCycleId,
    projectID: normalizeOptionalText(data.projectID),
    engagementName: normalizeRequiredText(data.engagementName),
    clientName: normalizeRequiredText(data.clientName),
    assessmentType: normalizeRequiredText(data.assessmentType),
    status: data.status,
    billable: data.billable,
    shadowing: data.shadowing,
    effortTimeHours: data.effortTimeHours,
    timelineStart: normalizeOptionalDate(data.timelineStart),
    timelineEnd: normalizeOptionalDate(data.timelineEnd),
    EM: normalizeOptionalText(data.EM),
    PM: normalizeOptionalText(data.PM),
    consultants: normalizeOptionalText(data.consultants),
    projectReportLink: normalizeOptionalUrl(data.projectReportLink),
    isMultiPerson: data.isMultiPerson,
    isLeadConsultant: data.isLeadConsultant,
  }
}

function revalidateWorkspace() {
  revalidatePath("/dashboard")
}

export async function createProject(data: ProjectInput) {
  const parsed = ProjectSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Validation failed: " + parsed.error.issues.map((issue) => issue.message).join(", ") }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const cycle = await resolveWorkCycleForUser(user.id, parsed.data.workCycleId)

    const project = await prisma.project.create({
      data: {
        ...buildProjectData(parsed.data, cycle.id),
        userId: user.id,
      },
    })

    revalidateWorkspace()
    return { success: true, project }
  } catch (err: unknown) {
    console.error("Create project error:", err)
    return { error: "Failed to create project" }
  }
}

export async function updateProject(id: string, data: ProjectInput) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid project ID" }
  }

  const parsed = ProjectSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Validation failed: " + parsed.error.issues.map((issue) => issue.message).join(", ") }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return { error: "Project not found or access denied" }

    const cycle = await resolveWorkCycleForUser(user.id, parsed.data.workCycleId ?? existing.workCycleId)

    const project = await prisma.project.update({
      where: { id },
      data: buildProjectData(parsed.data, cycle.id),
    })

    revalidateWorkspace()
    return { success: true, project }
  } catch (err: unknown) {
    console.error("Update project error:", err)
    return { error: "Failed to update project" }
  }
}

export async function deleteProject(id: string) {
  if (!id || typeof id !== "string") return { error: "Invalid project ID" }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const existing = await prisma.project.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return { error: "Project not found or access denied" }

    await prisma.project.delete({ where: { id } })
    revalidateWorkspace()
    return { success: true }
  } catch (err: unknown) {
    console.error("Delete project error:", err)
    return { error: "Failed to delete project" }
  }
}

export async function archiveProject(id: string, reason = "Archived from active workspace") {
  if (!id || typeof id !== "string") return { error: "Invalid project ID" }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    })
    if (!project) return { error: "Project not found or access denied" }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedReason: reason,
      },
    })

    revalidateWorkspace()
    return { success: true, project: updatedProject }
  } catch (err: unknown) {
    console.error("Archive project error:", err)
    return { error: "Failed to archive project" }
  }
}

export async function unarchiveProject(id: string) {
  if (!id || typeof id !== "string") return { error: "Invalid project ID" }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
    })
    if (!project) return { error: "Project not found or access denied" }

    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        archivedAt: null,
        archivedReason: null,
      },
    })

    revalidateWorkspace()
    return { success: true, project: updatedProject }
  } catch (err: unknown) {
    console.error("Unarchive project error:", err)
    return { error: "Failed to restore project" }
  }
}

export async function getProjects(options?: {
  includeArchived?: boolean
  workCycleId?: string | null
  allCycles?: boolean
}) {
  const user = await getServerUser()
  if (!user) return []

  const workCycleId = options?.allCycles
    ? null
    : options?.workCycleId ?? (await ensureUserWorkspace(user.id)).id

  return prisma.project.findMany({
    where: {
      userId: user.id,
      ...(options?.allCycles ? {} : workCycleId ? { workCycleId } : {}),
      ...(options?.includeArchived ? {} : { archivedAt: null }),
    },
    orderBy: [
      { archivedAt: "asc" },
      { timelineEnd: "asc" },
      { createdAt: "desc" },
    ],
    include: {
      tasks: {
        where: { archivedAt: null },
        orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      },
      efrs: {
        where: { archivedAt: null },
        orderBy: { submittedAt: "desc" },
      },
    },
  })
}

function getCurrentQuarter(now = new Date()): { quarter: string; year: number; q: number } {
  const month = now.getMonth()
  const year = now.getFullYear()
  const q = Math.floor(month / 3) + 1

  return { quarter: `Q${q}-${year}`, year, q }
}

function getYearQuarters(year: number): string[] {
  return [`Q1-${year}`, `Q2-${year}`, `Q3-${year}`, `Q4-${year}`]
}

export async function getDashboardStats(workCycleId?: string) {
  const user = await getServerUser()
  if (!user) return null

  const activeCycle = await ensureUserWorkspace(user.id)
  const cycle = await resolveWorkCycleForUser(user.id, workCycleId ?? activeCycle.id)
  const yearQuarters = getYearQuarters(cycle.year)
  const { quarter: currentQuarter } = getCurrentQuarter()

  const [projects, efrs, tasks] = await Promise.all([
    prisma.project.findMany({
      where: {
        userId: user.id,
        workCycleId: cycle.id,
        archivedAt: null,
      },
    }),
    prisma.efrSubmission.findMany({
      where: {
        userId: user.id,
        workCycleId: cycle.id,
        archivedAt: null,
        quarter: { in: yearQuarters },
      },
    }),
    prisma.task.findMany({
      where: {
        userId: user.id,
        workCycleId: cycle.id,
        archivedAt: null,
      },
    }),
  ])

  const assessmentCounts = {
    active: projects.filter((project) => project.status === "Active").length,
    placeholder: projects.filter((project) => project.status === "Placeholder").length,
    delivered: projects.filter((project) => project.status === "Delivered").length,
    cancelled: projects.filter((project) => project.status === "Cancelled").length,
    total: projects.length,
  }

  const totalBillableHours = projects
    .filter((project) => project.billable)
    .reduce((sum, project) => sum + project.effortTimeHours, 0)

  const efrsByQuarter: Record<string, number> = {}
  for (const quarter of yearQuarters) {
    efrsByQuarter[quarter] = efrs.filter((efr) => efr.quarter === quarter).length
  }

  const multiPersonByQuarter: Record<string, number> = {}
  for (const quarter of yearQuarters) {
    const quarterNumber = parseInt(quarter.charAt(1), 10)
    const quarterStart = new Date(cycle.year, (quarterNumber - 1) * 3, 1)
    const quarterEnd = new Date(cycle.year, quarterNumber * 3, 0, 23, 59, 59)

    multiPersonByQuarter[quarter] = projects.filter((project) => {
      if (!project.isMultiPerson || !project.isLeadConsultant) return false
      if (project.status === "Cancelled") return false

      const start = project.timelineStart ? new Date(project.timelineStart) : null
      const end = project.timelineEnd ? new Date(project.timelineEnd) : null

      if (start && start > quarterEnd) return false
      if (end && end < quarterStart) return false

      return true
    }).length
  }

  const now = new Date()
  const taskCounts = {
    todo: tasks.filter((task) => task.status === "TODO").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    blocked: tasks.filter((task) => task.status === "BLOCKED").length,
    done: tasks.filter((task) => task.status === "DONE").length,
    dueToday: tasks.filter((task) => {
      if (!task.dueDate || task.status === "DONE") return false
      const dueDate = new Date(task.dueDate)
      return dueDate.toDateString() === now.toDateString()
    }).length,
    overdue: tasks.filter((task) => {
      if (!task.dueDate || task.status === "DONE") return false
      return new Date(task.dueDate) < now
    }).length,
  }

  return {
    cycle,
    assessmentCounts,
    billableHours: {
      current: totalBillableHours,
      target: cycle.billableTarget,
    },
    efrsByQuarter,
    efrTarget: cycle.efrTarget,
    multiPersonByQuarter,
    multiPersonTarget: cycle.multiPersonTarget,
    currentQuarter,
    yearQuarters,
    taskCounts,
  }
}
