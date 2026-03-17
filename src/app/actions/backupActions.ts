"use server"

import { getServerUser } from "@/lib/auth"
import {
  createEfrFingerprint,
  createProjectFingerprint,
  createTaskFingerprint,
  parseBackupPayload,
} from "@/lib/backup"
import { prisma } from "@/lib/db"
import {
  normalizeOptionalDate,
  normalizeOptionalText,
  normalizeOptionalUrl,
  normalizeRequiredText,
} from "@/lib/normalizers"
import { buildDefaultWorkCycle, ensureUserWorkspace } from "@/lib/work-cycles"

function serializeWorkCycle(cycle: {
  name: string
  year: number
  startDate: Date
  endDate: Date
  status: string
  focusText?: string | null
  billableTarget: number
  efrTarget: number
  multiPersonTarget: number
}) {
  return {
    name: cycle.name,
    year: cycle.year,
    startDate: cycle.startDate.toISOString(),
    endDate: cycle.endDate.toISOString(),
    status: cycle.status,
    focusText: cycle.focusText,
    billableTarget: cycle.billableTarget,
    efrTarget: cycle.efrTarget,
    multiPersonTarget: cycle.multiPersonTarget,
  }
}

function serializeProject(project: {
  workCycle?: { year: number } | null
  projectID?: string | null
  engagementName: string
  clientName: string
  assessmentType: string
  status: string
  billable: boolean
  shadowing: boolean
  effortTimeHours: number
  timelineStart?: Date | null
  timelineEnd?: Date | null
  EM?: string | null
  PM?: string | null
  consultants?: string | null
  projectReportLink?: string | null
  isMultiPerson: boolean
  isLeadConsultant: boolean
  archivedAt?: Date | null
  archivedReason?: string | null
}) {
  return {
    workCycleYear: project.workCycle?.year,
    projectID: project.projectID,
    engagementName: project.engagementName,
    clientName: project.clientName,
    assessmentType: project.assessmentType,
    status: project.status,
    billable: project.billable,
    shadowing: project.shadowing,
    effortTimeHours: project.effortTimeHours,
    timelineStart: project.timelineStart?.toISOString() ?? null,
    timelineEnd: project.timelineEnd?.toISOString() ?? null,
    EM: project.EM,
    PM: project.PM,
    consultants: project.consultants,
    projectReportLink: project.projectReportLink,
    isMultiPerson: project.isMultiPerson,
    isLeadConsultant: project.isLeadConsultant,
    archivedAt: project.archivedAt?.toISOString() ?? null,
    archivedReason: project.archivedReason,
  }
}

function serializeEfr(efr: {
  workCycle?: { year: number } | null
  projectFingerprint?: string | null
  title: string
  description?: string | null
  quarter: string
  evaluator: string
  engagement: string
  engagementStart: Date
  role: string
  duration: string
  contextComment?: string | null
  submittedAt?: Date | null
  archivedAt?: Date | null
  archivedReason?: string | null
}) {
  return {
    workCycleYear: efr.workCycle?.year,
    projectFingerprint: efr.projectFingerprint ?? null,
    title: efr.title,
    description: efr.description,
    quarter: efr.quarter,
    evaluator: efr.evaluator,
    engagement: efr.engagement,
    engagementStart: efr.engagementStart.toISOString(),
    role: efr.role,
    duration: efr.duration,
    contextComment: efr.contextComment,
    submittedAt: efr.submittedAt?.toISOString(),
    archivedAt: efr.archivedAt?.toISOString() ?? null,
    archivedReason: efr.archivedReason,
  }
}

function serializeTask(task: {
  workCycle?: { year: number } | null
  projectFingerprint?: string | null
  title: string
  description?: string | null
  status: string
  priority: string
  dueDate?: Date | null
  reminderAt?: Date | null
  completedAt?: Date | null
  estimateHours: number
  archivedAt?: Date | null
  archivedReason?: string | null
}) {
  return {
    workCycleYear: task.workCycle?.year,
    projectFingerprint: task.projectFingerprint ?? null,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate?.toISOString() ?? null,
    reminderAt: task.reminderAt?.toISOString() ?? null,
    completedAt: task.completedAt?.toISOString() ?? null,
    estimateHours: task.estimateHours,
    archivedAt: task.archivedAt?.toISOString() ?? null,
    archivedReason: task.archivedReason,
  }
}

function buildProjectCreateData(project: ReturnType<typeof serializeProject>, workCycleId: string) {
  return {
    workCycleId,
    projectID: normalizeOptionalText(project.projectID),
    engagementName: normalizeRequiredText(project.engagementName),
    clientName: normalizeRequiredText(project.clientName),
    assessmentType: normalizeRequiredText(project.assessmentType),
    status: project.status,
    billable: project.billable,
    shadowing: project.shadowing,
    effortTimeHours: project.effortTimeHours,
    timelineStart: normalizeOptionalDate(project.timelineStart ? new Date(project.timelineStart) : null),
    timelineEnd: normalizeOptionalDate(project.timelineEnd ? new Date(project.timelineEnd) : null),
    EM: normalizeOptionalText(project.EM),
    PM: normalizeOptionalText(project.PM),
    consultants: normalizeOptionalText(project.consultants),
    projectReportLink: normalizeOptionalUrl(project.projectReportLink),
    isMultiPerson: project.isMultiPerson,
    isLeadConsultant: project.isLeadConsultant,
    archivedAt: project.archivedAt ? new Date(project.archivedAt) : null,
    archivedReason: normalizeOptionalText(project.archivedReason),
  }
}

function buildEfrCreateData(
  efr: ReturnType<typeof serializeEfr>,
  workCycleId: string,
  projectId?: string | null
) {
  return {
    workCycleId,
    projectId: projectId ?? null,
    title: normalizeRequiredText(efr.title),
    description: normalizeOptionalText(efr.description),
    quarter: normalizeRequiredText(efr.quarter),
    evaluator: normalizeRequiredText(efr.evaluator),
    engagement: normalizeRequiredText(efr.engagement),
    engagementStart: new Date(efr.engagementStart),
    role: normalizeRequiredText(efr.role),
    duration: efr.duration,
    contextComment: normalizeOptionalText(efr.contextComment),
    submittedAt: efr.submittedAt ? new Date(efr.submittedAt) : undefined,
    archivedAt: efr.archivedAt ? new Date(efr.archivedAt) : null,
    archivedReason: normalizeOptionalText(efr.archivedReason),
  }
}

function buildTaskCreateData(
  task: ReturnType<typeof serializeTask>,
  workCycleId: string,
  projectId?: string | null
) {
  return {
    workCycleId,
    projectId: projectId ?? null,
    title: normalizeRequiredText(task.title),
    description: normalizeOptionalText(task.description),
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
    reminderAt: task.reminderAt ? new Date(task.reminderAt) : null,
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
    estimateHours: task.estimateHours,
    archivedAt: task.archivedAt ? new Date(task.archivedAt) : null,
    archivedReason: normalizeOptionalText(task.archivedReason),
  }
}

export async function createBackup() {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const activeCycle = await ensureUserWorkspace(user.id)

    const [profile, workCycles, projects, efrs, tasks] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: {
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.workCycle.findMany({
        where: { userId: user.id },
        orderBy: { year: "desc" },
        select: {
          name: true,
          year: true,
          startDate: true,
          endDate: true,
          status: true,
          focusText: true,
          billableTarget: true,
          efrTarget: true,
          multiPersonTarget: true,
        },
      }),
      prisma.project.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          workCycle: { select: { year: true } },
          projectID: true,
          engagementName: true,
          clientName: true,
          assessmentType: true,
          status: true,
          billable: true,
          shadowing: true,
          effortTimeHours: true,
          timelineStart: true,
          timelineEnd: true,
          EM: true,
          PM: true,
          consultants: true,
          projectReportLink: true,
          isMultiPerson: true,
          isLeadConsultant: true,
          archivedAt: true,
          archivedReason: true,
        },
      }),
      prisma.efrSubmission.findMany({
        where: { userId: user.id },
        orderBy: { submittedAt: "desc" },
        select: {
          workCycle: { select: { year: true } },
          project: {
            select: {
              workCycle: { select: { year: true } },
              projectID: true,
              engagementName: true,
              clientName: true,
              assessmentType: true,
              status: true,
              billable: true,
              shadowing: true,
              effortTimeHours: true,
              timelineStart: true,
              timelineEnd: true,
              EM: true,
              PM: true,
              consultants: true,
              projectReportLink: true,
              isMultiPerson: true,
              isLeadConsultant: true,
            },
          },
          title: true,
          description: true,
          quarter: true,
          evaluator: true,
          engagement: true,
          engagementStart: true,
          role: true,
          duration: true,
          contextComment: true,
          submittedAt: true,
          archivedAt: true,
          archivedReason: true,
        },
      }),
      prisma.task.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: {
          workCycle: { select: { year: true } },
          project: {
            select: {
              workCycle: { select: { year: true } },
              projectID: true,
              engagementName: true,
              clientName: true,
              assessmentType: true,
              status: true,
              billable: true,
              shadowing: true,
              effortTimeHours: true,
              timelineStart: true,
              timelineEnd: true,
              EM: true,
              PM: true,
              consultants: true,
              projectReportLink: true,
              isMultiPerson: true,
              isLeadConsultant: true,
            },
          },
          title: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          reminderAt: true,
          completedAt: true,
          estimateHours: true,
          archivedAt: true,
          archivedReason: true,
        },
      }),
    ])

    const backup = {
      version: "3.0",
      exportedAt: new Date().toISOString(),
      workspaceYear: activeCycle.year,
      user: profile
        ? {
            ...profile,
            createdAt: profile.createdAt.toISOString(),
          }
        : undefined,
      workCycles: workCycles.map(serializeWorkCycle),
      projects: projects.map(serializeProject),
      efrs: efrs.map((efr) =>
        serializeEfr({
          ...efr,
          projectFingerprint: efr.project ? createProjectFingerprint(serializeProject(efr.project)) : null,
        })
      ),
      tasks: tasks.map((task) =>
        serializeTask({
          ...task,
          projectFingerprint: task.project ? createProjectFingerprint(serializeProject(task.project)) : null,
        })
      ),
    }

    return {
      success: true,
      data: JSON.stringify(backup, null, 2),
      filename: `project-tracker-backup-${new Date().toISOString().split("T")[0]}.json`,
    }
  } catch (err: unknown) {
    console.error("Backup error:", err)
    return { error: "Failed to create backup" }
  }
}

export async function restoreBackup(jsonData: string) {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  const parsedBackup = parseBackupPayload(jsonData)
  if (!parsedBackup.success) {
    return { error: parsedBackup.error }
  }

  try {
    const restoreResult = await prisma.$transaction(async (tx) => {
      const cycleMap = new Map<number, string>()

      const existingCycles = await tx.workCycle.findMany({
        where: { userId: user.id },
        select: { id: true, year: true },
      })
      for (const cycle of existingCycles) {
        cycleMap.set(cycle.year, cycle.id)
      }

      for (const cycle of parsedBackup.data.workCycles) {
        if (cycleMap.has(cycle.year)) continue

        const restoredCycle = await tx.workCycle.create({
          data: {
            ...buildDefaultWorkCycle(cycle.year),
            userId: user.id,
            name: cycle.name,
            startDate: new Date(cycle.startDate),
            endDate: new Date(cycle.endDate),
            status: cycle.status,
            focusText: normalizeOptionalText(cycle.focusText),
            billableTarget: cycle.billableTarget,
            efrTarget: cycle.efrTarget,
            multiPersonTarget: cycle.multiPersonTarget,
          },
        })
        cycleMap.set(cycle.year, restoredCycle.id)
      }

      const defaultCycle = await ensureUserWorkspace(user.id)
      if (!cycleMap.has(defaultCycle.year)) {
        cycleMap.set(defaultCycle.year, defaultCycle.id)
      }

      const [existingProjects, existingEfrs, existingTasks] = await Promise.all([
        tx.project.findMany({
          where: { userId: user.id },
          select: {
            id: true,
            workCycle: { select: { year: true } },
            projectID: true,
            engagementName: true,
            clientName: true,
            assessmentType: true,
            status: true,
            billable: true,
            shadowing: true,
            effortTimeHours: true,
            timelineStart: true,
            timelineEnd: true,
            EM: true,
            PM: true,
            consultants: true,
            projectReportLink: true,
            isMultiPerson: true,
            isLeadConsultant: true,
          },
        }),
        tx.efrSubmission.findMany({
          where: { userId: user.id },
          select: {
            workCycle: { select: { year: true } },
            project: {
              select: {
                workCycle: { select: { year: true } },
                projectID: true,
                engagementName: true,
                clientName: true,
                assessmentType: true,
                status: true,
                billable: true,
                shadowing: true,
                effortTimeHours: true,
                timelineStart: true,
                timelineEnd: true,
                EM: true,
                PM: true,
                consultants: true,
                projectReportLink: true,
                isMultiPerson: true,
                isLeadConsultant: true,
              },
            },
            title: true,
            description: true,
            quarter: true,
            evaluator: true,
            engagement: true,
            engagementStart: true,
            role: true,
            duration: true,
            contextComment: true,
          },
        }),
        tx.task.findMany({
          where: { userId: user.id },
          select: {
            workCycle: { select: { year: true } },
            project: {
              select: {
                workCycle: { select: { year: true } },
                projectID: true,
                engagementName: true,
                clientName: true,
                assessmentType: true,
                status: true,
                billable: true,
                shadowing: true,
                effortTimeHours: true,
                timelineStart: true,
                timelineEnd: true,
                EM: true,
                PM: true,
                consultants: true,
                projectReportLink: true,
                isMultiPerson: true,
                isLeadConsultant: true,
              },
            },
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            reminderAt: true,
            estimateHours: true,
          },
        }),
      ])

      const projectFingerprintToId = new Map<string, string>()
      const existingProjectFingerprints = new Set(
        existingProjects.map((project) => {
          const fingerprint = createProjectFingerprint(serializeProject(project))
          projectFingerprintToId.set(fingerprint, project.id)
          return fingerprint
        })
      )
      const existingEfrFingerprints = new Set(
        existingEfrs.map((efr) =>
          createEfrFingerprint(
            serializeEfr({
              ...efr,
              projectFingerprint: efr.project ? createProjectFingerprint(serializeProject(efr.project)) : null,
            })
          )
        )
      )
      const existingTaskFingerprints = new Set(
        existingTasks.map((task) =>
          createTaskFingerprint(
            serializeTask({
              ...task,
              projectFingerprint: task.project ? createProjectFingerprint(serializeProject(task.project)) : null,
            })
          )
        )
      )

      let projectsRestored = 0
      let efrsRestored = 0
      let tasksRestored = 0

      for (const project of parsedBackup.data.projects) {
        const fingerprint = createProjectFingerprint(project)
        if (existingProjectFingerprints.has(fingerprint)) continue

        const cycleId = cycleMap.get(project.workCycleYear ?? defaultCycle.year) ?? defaultCycle.id
        const createdProject = await tx.project.create({
          data: {
            ...buildProjectCreateData(serializeProject(project), cycleId),
            userId: user.id,
          },
        })

        projectFingerprintToId.set(fingerprint, createdProject.id)
        existingProjectFingerprints.add(fingerprint)
        projectsRestored++
      }

      for (const efr of parsedBackup.data.efrs) {
        const fingerprint = createEfrFingerprint(efr)
        if (existingEfrFingerprints.has(fingerprint)) continue

        const cycleId = cycleMap.get(efr.workCycleYear ?? defaultCycle.year) ?? defaultCycle.id
        const projectId = efr.projectFingerprint ? projectFingerprintToId.get(efr.projectFingerprint) ?? null : null

        await tx.efrSubmission.create({
          data: {
            ...buildEfrCreateData(serializeEfr(efr), cycleId, projectId),
            userId: user.id,
          },
        })

        existingEfrFingerprints.add(fingerprint)
        efrsRestored++
      }

      for (const task of parsedBackup.data.tasks) {
        const fingerprint = createTaskFingerprint(task)
        if (existingTaskFingerprints.has(fingerprint)) continue

        const cycleId = cycleMap.get(task.workCycleYear ?? defaultCycle.year) ?? defaultCycle.id
        const projectId = task.projectFingerprint ? projectFingerprintToId.get(task.projectFingerprint) ?? null : null

        await tx.task.create({
          data: {
            ...buildTaskCreateData(serializeTask(task), cycleId, projectId),
            userId: user.id,
          },
        })

        existingTaskFingerprints.add(fingerprint)
        tasksRestored++
      }

      return { projectsRestored, efrsRestored, tasksRestored }
    })

    return {
      success: true,
      message: `Restored ${restoreResult.projectsRestored} projects, ${restoreResult.efrsRestored} EFR submissions, and ${restoreResult.tasksRestored} tasks`,
    }
  } catch (err: unknown) {
    console.error("Restore error:", err)
    return { error: "Failed to restore backup" }
  }
}
