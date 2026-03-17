"use server"

import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getQuarterLabel, planNotifications } from "@/lib/notification-utils"
import { ensureUserWorkspace } from "@/lib/work-cycles"

export async function getNotifications() {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return { success: true, notifications }
  } catch (err: unknown) {
    console.error("Get notifications error:", err)
    return { error: "Failed to load notifications" }
  }
}

export async function getUnreadCount() {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const count = await prisma.notification.count({
      where: { userId: user.id, read: false },
    })

    return { success: true, count }
  } catch (err: unknown) {
    console.error("Unread count error:", err)
    return { error: "Failed to get count" }
  }
}

export async function markAsRead(notificationId: string) {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  if (!notificationId || typeof notificationId !== "string") {
    return { error: "Invalid notification ID" }
  }

  try {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId: user.id },
      data: { read: true },
    })

    return { success: true }
  } catch (err: unknown) {
    console.error("Mark read error:", err)
    return { error: "Failed to mark as read" }
  }
}

export async function markAllAsRead() {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    await prisma.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    })

    return { success: true }
  } catch (err: unknown) {
    console.error("Mark all read error:", err)
    return { error: "Failed to mark all as read" }
  }
}

export async function deleteNotification(notificationId: string) {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  if (!notificationId || typeof notificationId !== "string") {
    return { error: "Invalid notification ID" }
  }

  try {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId: user.id },
    })

    return { success: true }
  } catch (err: unknown) {
    console.error("Delete notification error:", err)
    return { error: "Failed to delete notification" }
  }
}

export async function clearAllNotifications() {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    await prisma.notification.deleteMany({
      where: { userId: user.id },
    })

    return { success: true }
  } catch (err: unknown) {
    console.error("Clear notifications error:", err)
    return { error: "Failed to clear notifications" }
  }
}

export async function generateNotifications() {
  const user = await getServerUser()
  if (!user) return { error: "Unauthorized" }

  try {
    const activeCycle = await ensureUserWorkspace(user.id)
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const recentWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const { quarterLabel } = getQuarterLabel(now)

    const [endingSoon, endingWeek, overdueProjects, dueTasks, overdueTasks, recentNotifications, hasQuarterlyEfr] =
      await Promise.all([
        prisma.project.findMany({
          where: {
            userId: user.id,
            workCycleId: activeCycle.id,
            archivedAt: null,
            status: "Active",
            timelineEnd: {
              gte: now,
              lte: threeDaysFromNow,
            },
          },
          select: {
            id: true,
            engagementName: true,
            clientName: true,
            timelineEnd: true,
          },
        }),
        prisma.project.findMany({
          where: {
            userId: user.id,
            workCycleId: activeCycle.id,
            archivedAt: null,
            status: "Active",
            timelineEnd: {
              gt: threeDaysFromNow,
              lte: sevenDaysFromNow,
            },
          },
          select: {
            id: true,
            engagementName: true,
            clientName: true,
            timelineEnd: true,
          },
        }),
        prisma.project.findMany({
          where: {
            userId: user.id,
            workCycleId: activeCycle.id,
            archivedAt: null,
            status: "Active",
            timelineEnd: { lt: now },
          },
          select: {
            id: true,
            engagementName: true,
            clientName: true,
            timelineEnd: true,
          },
        }),
        prisma.task.findMany({
          where: {
            userId: user.id,
            workCycleId: activeCycle.id,
            archivedAt: null,
            status: { not: "DONE" },
            dueDate: {
              gte: now,
              lte: tomorrow,
            },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            project: {
              select: {
                engagementName: true,
              },
            },
          },
        }),
        prisma.task.findMany({
          where: {
            userId: user.id,
            workCycleId: activeCycle.id,
            archivedAt: null,
            status: { not: "DONE" },
            dueDate: { lt: now },
          },
          select: {
            id: true,
            title: true,
            dueDate: true,
            project: {
              select: {
                engagementName: true,
              },
            },
          },
        }),
        prisma.notification.findMany({
          where: {
            userId: user.id,
            createdAt: { gte: recentWindowStart },
            type: { in: ["project_ending", "assessment_due", "efr_reminder", "task_due", "task_overdue"] },
          },
          select: {
            title: true,
            message: true,
            type: true,
            link: true,
            createdAt: true,
          },
        }),
        prisma.efrSubmission.findFirst({
          where: {
            userId: user.id,
            workCycleId: activeCycle.id,
            archivedAt: null,
            quarter: quarterLabel,
          },
          select: { id: true },
        }),
      ])

    const drafts = planNotifications({
      now,
      endingSoon,
      endingWeek,
      overdueProjects,
      dueTasks,
      overdueTasks,
      recentNotifications,
      hasQuarterlyEfr: Boolean(hasQuarterlyEfr),
    })

    if (drafts.length > 0) {
      await prisma.$transaction(
        drafts.map((draft) =>
          prisma.notification.create({
            data: {
              userId: user.id,
              ...draft,
            },
          })
        )
      )
    }

    return { success: true, created: drafts.length }
  } catch (err: unknown) {
    console.error("Generate notifications error:", err)
    return { error: "Failed to generate notifications" }
  }
}
