"use server"

import { revalidatePath } from "next/cache"

import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { normalizeOptionalText, normalizeRequiredText } from "@/lib/normalizers"
import { EfrInput, EfrSchema } from "@/lib/schemas"
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

function buildEfrData(data: EfrInput, workCycleId: string, projectId?: string | null) {
  return {
    workCycleId,
    projectId: projectId ?? null,
    title: normalizeRequiredText(data.title),
    description: normalizeOptionalText(data.description),
    quarter: normalizeRequiredText(data.quarter),
    evaluator: normalizeRequiredText(data.evaluator),
    engagement: normalizeRequiredText(data.engagement),
    engagementStart: data.engagementStart,
    role: normalizeRequiredText(data.role),
    duration: data.duration,
    contextComment: normalizeOptionalText(data.contextComment),
  }
}

export async function createEfr(data: EfrInput) {
  const parsed = EfrSchema.safeParse(data)
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

    const efr = await prisma.efrSubmission.create({
      data: {
        ...buildEfrData(parsed.data, cycle.id, linkedProject?.id),
        userId: user.id,
      },
      include: {
        project: true,
      },
    })

    revalidateWorkspace()
    return { success: true, efr }
  } catch (err: unknown) {
    console.error("Create EFR error:", err)
    return { error: "Failed to create EFR. Please try again." }
  }
}

export async function updateEfr(id: string, data: EfrInput) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid EFR ID" }
  }

  const parsed = EfrSchema.safeParse(data)
  if (!parsed.success) {
    return { error: "Validation failed: " + parsed.error.issues.map((issue) => issue.message).join(", ") }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const existing = await prisma.efrSubmission.findFirst({
      where: { id, userId: user.id },
    })
    if (!existing) return { error: "EFR not found or access denied" }

    const linkedProject = await resolveLinkedProject(user.id, parsed.data.projectId)
    const cycle = await resolveWorkCycleForUser(
      user.id,
      parsed.data.workCycleId ?? linkedProject?.workCycleId ?? existing.workCycleId
    )

    const efr = await prisma.efrSubmission.update({
      where: { id },
      data: buildEfrData(parsed.data, cycle.id, linkedProject?.id),
      include: {
        project: true,
      },
    })

    revalidateWorkspace()
    return { success: true, efr }
  } catch (err: unknown) {
    console.error("Update EFR error:", err)
    return { error: "Failed to update EFR. Please try again." }
  }
}

export async function deleteEfr(id: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid EFR ID" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const efr = await prisma.efrSubmission.findFirst({
      where: { id, userId: user.id },
    })
    if (!efr) return { error: "EFR not found or access denied" }

    await prisma.efrSubmission.delete({ where: { id } })
    revalidateWorkspace()
    return { success: true }
  } catch (err: unknown) {
    console.error("Delete EFR error:", err)
    return { error: "Failed to delete EFR. Please try again." }
  }
}

export async function archiveEfr(id: string, reason = "Archived from active workspace") {
  if (!id || typeof id !== "string") {
    return { error: "Invalid EFR ID" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const efr = await prisma.efrSubmission.findFirst({
      where: { id, userId: user.id },
    })
    if (!efr) return { error: "EFR not found or access denied" }

    const updatedEfr = await prisma.efrSubmission.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        archivedReason: reason,
      },
      include: {
        project: true,
      },
    })

    revalidateWorkspace()
    return { success: true, efr: updatedEfr }
  } catch (err: unknown) {
    console.error("Archive EFR error:", err)
    return { error: "Failed to archive EFR" }
  }
}

export async function unarchiveEfr(id: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid EFR ID" }
  }

  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const efr = await prisma.efrSubmission.findFirst({
      where: { id, userId: user.id },
    })
    if (!efr) return { error: "EFR not found or access denied" }

    const updatedEfr = await prisma.efrSubmission.update({
      where: { id },
      data: {
        archivedAt: null,
        archivedReason: null,
      },
      include: {
        project: true,
      },
    })

    revalidateWorkspace()
    return { success: true, efr: updatedEfr }
  } catch (err: unknown) {
    console.error("Unarchive EFR error:", err)
    return { error: "Failed to restore EFR" }
  }
}

export async function getEfrs(options?: {
  includeArchived?: boolean
  workCycleId?: string | null
  allCycles?: boolean
}) {
  const user = await getServerUser()
  if (!user) return []

  const workCycleId = options?.allCycles
    ? null
    : options?.workCycleId ?? (await ensureUserWorkspace(user.id)).id

  return prisma.efrSubmission.findMany({
    where: {
      userId: user.id,
      ...(options?.allCycles ? {} : workCycleId ? { workCycleId } : {}),
      ...(options?.includeArchived ? {} : { archivedAt: null }),
    },
    include: {
      project: true,
    },
    orderBy: [
      { archivedAt: "asc" },
      { submittedAt: "desc" },
    ],
  })
}
