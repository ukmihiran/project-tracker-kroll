"use server"

import { revalidatePath } from "next/cache"

import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { normalizeOptionalDate, normalizeOptionalText, normalizeRequiredText } from "@/lib/normalizers"
import { TaskInput, TaskPrioritySchema, TaskSchema, TaskStatusSchema } from "@/lib/schemas"
import { ensureUserWorkspace, resolveWorkCycleForUser } from "@/lib/work-cycles"

function revalidateWorkspace() {
  revalidatePath("/dashboard")
}

async function resolveLinkedProject(userId: string, projectId?: string | null) {
  if (!projectId) return null

  return prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
    },
  })
}

function buildTaskData(data: TaskInput, workCycleId: string, projectId?: string | null) {
  const completedAt = data.status === "DONE" ? new Date() : null

  return {
    workCycleId,
    projectId: projectId ?? null,
    title: normalizeRequiredText(data.title),
    description: normalizeOptionalText(data.description),
    status: data.status,
    priority: data.priority,
    dueDate: normalizeOptionalDate(data.dueDate),
    reminderAt: normalizeOptionalDate(data.reminderAt),
    estimateHours: data.estimateHours,
    completedAt,
  }
}

export async function createTask(data: TaskInput) {
  const parsed = TaskSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Validation failed: " + parsed.error.issues.map((issue) => issue.message).join(", ") }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const linkedProject = await resolveLinkedProject(user.id, parsed.data.projectId)
    const cycle = await resolveWorkCycleForUser(
      user.id,
      parsed.data.workCycleId ?? linkedProject?.workCycleId
    )

    const task = await prisma.task.create({
      data: {
        ...buildTaskData(parsed.data, cycle.id, linkedProject?.id),
        userId: user.id,
      },
      include: {
        project: true,
        workCycle: true,
      },
    })

    revalidateWorkspace()
    return { success: true, task }
  } catch (err: unknown) {
    console.error("Create task error:", err)
    return { error: "Failed to create task" }
  }
}

export async function updateTask(id: string, data: TaskInput) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid task ID" }
  }

  const parsed = TaskSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Validation failed: " + parsed.error.issues.map((issue) => issue.message).join(", ") }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const existing = await prisma.task.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return { error: "Task not found or access denied" }

    const linkedProject = await resolveLinkedProject(user.id, parsed.data.projectId)
    const cycle = await resolveWorkCycleForUser(
      user.id,
      parsed.data.workCycleId ?? linkedProject?.workCycleId ?? existing.workCycleId
    )

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...buildTaskData(parsed.data, cycle.id, linkedProject?.id),
        completedAt: parsed.data.status === "DONE"
          ? existing.completedAt ?? new Date()
          : null,
      },
      include: {
        project: true,
        workCycle: true,
      },
    })

    revalidateWorkspace()
    return { success: true, task }
  } catch (err: unknown) {
    console.error("Update task error:", err)
    return { error: "Failed to update task" }
  }
}

export async function updateTaskStatus(id: string, status: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid task ID" }
  }

  const parsedStatus = TaskStatusSchema.safeParse(status)
  if (!parsedStatus.success) {
    return { error: "Invalid task status" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    })
    if (!task) return { error: "Task not found or access denied" }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: parsedStatus.data,
        completedAt: parsedStatus.data === "DONE" ? task.completedAt ?? new Date() : null,
      },
      include: {
        project: true,
        workCycle: true,
      },
    })

    revalidateWorkspace()
    return { success: true, task: updatedTask }
  } catch (err: unknown) {
    console.error("Update task status error:", err)
    return { error: "Failed to update task status" }
  }
}

export async function updateTaskPriority(id: string, priority: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid task ID" }
  }

  const parsedPriority = TaskPrioritySchema.safeParse(priority)
  if (!parsedPriority.success) {
    return { error: "Invalid task priority" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    })
    if (!task) return { error: "Task not found or access denied" }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        priority: parsedPriority.data,
      },
      include: {
        project: true,
        workCycle: true,
      },
    })

    revalidateWorkspace()
    return { success: true, task: updatedTask }
  } catch (err: unknown) {
    console.error("Update task priority error:", err)
    return { error: "Failed to update task priority" }
  }
}

export async function deleteTask(id: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid task ID" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    })
    if (!task) return { error: "Task not found or access denied" }

    await prisma.task.delete({
      where: { id },
    })

    revalidateWorkspace()
    return { success: true }
  } catch (err: unknown) {
    console.error("Delete task error:", err)
    return { error: "Failed to delete task" }
  }
}

export async function archiveTask(id: string, reason = "Archived from active workspace") {
  if (!id || typeof id !== "string") {
    return { error: "Invalid task ID" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    })
    if (!task) return { error: "Task not found or access denied" }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedReason: reason,
      },
      include: {
        project: true,
        workCycle: true,
      },
    })

    revalidateWorkspace()
    return { success: true, task: updatedTask }
  } catch (err: unknown) {
    console.error("Archive task error:", err)
    return { error: "Failed to archive task" }
  }
}

export async function unarchiveTask(id: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid task ID" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    })
    if (!task) return { error: "Task not found or access denied" }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        archivedAt: null,
        archivedReason: null,
      },
      include: {
        project: true,
        workCycle: true,
      },
    })

    revalidateWorkspace()
    return { success: true, task: updatedTask }
  } catch (err: unknown) {
    console.error("Unarchive task error:", err)
    return { error: "Failed to restore task" }
  }
}

export async function getTasks(options?: {
  includeArchived?: boolean
  workCycleId?: string | null
  allCycles?: boolean
}) {
  const user = await getServerUser()
  if (!user) return []

  const workCycleId = options?.allCycles
    ? null
    : options?.workCycleId ?? (await ensureUserWorkspace(user.id)).id

  return prisma.task.findMany({
    where: {
      userId: user.id,
      ...(options?.allCycles ? {} : workCycleId ? { workCycleId } : {}),
      ...(options?.includeArchived ? {} : { archivedAt: null }),
    },
    include: {
      project: true,
      workCycle: true,
    },
    orderBy: [
      { archivedAt: "asc" },
      { status: "asc" },
      { dueDate: "asc" },
      { createdAt: "desc" },
    ],
  })
}
