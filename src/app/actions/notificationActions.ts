"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string })?.id
}

export async function getNotifications() {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    const notifications = await prisma.notification.findMany({
      where: { userId },
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
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    const count = await prisma.notification.count({
      where: { userId, read: false },
    })
    return { success: true, count }
  } catch (err: unknown) {
    console.error("Unread count error:", err)
    return { error: "Failed to get count" }
  }
}

export async function markAsRead(notificationId: string) {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    })
    return { success: true }
  } catch (err: unknown) {
    console.error("Mark read error:", err)
    return { error: "Failed to mark as read" }
  }
}

export async function markAllAsRead() {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    })
    return { success: true }
  } catch (err: unknown) {
    console.error("Mark all read error:", err)
    return { error: "Failed to mark all as read" }
  }
}

export async function deleteNotification(notificationId: string) {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    await prisma.notification.deleteMany({
      where: { id: notificationId, userId },
    })
    return { success: true }
  } catch (err: unknown) {
    console.error("Delete notification error:", err)
    return { error: "Failed to delete notification" }
  }
}

export async function clearAllNotifications() {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    await prisma.notification.deleteMany({
      where: { userId },
    })
    return { success: true }
  } catch (err: unknown) {
    console.error("Clear notifications error:", err)
    return { error: "Failed to clear notifications" }
  }
}

// Generate notifications for upcoming due dates and reminders
export async function generateNotifications() {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const created: string[] = []

    // 1. Projects ending within 3 days
    const endingSoon = await prisma.project.findMany({
      where: {
        userId,
        status: "Active",
        timelineEnd: {
          gte: now,
          lte: threeDaysFromNow,
        },
      },
    })

    for (const project of endingSoon) {
      const daysLeft = Math.ceil(
        (new Date(project.timelineEnd!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const existingId = `project-ending-${project.id}-${project.timelineEnd!.toISOString().split("T")[0]}`
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          title: { contains: project.engagementName },
          type: "project_ending",
          createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            title: `Project ending soon`,
            message: `"${project.engagementName}" for ${project.clientName} ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
            type: "project_ending",
            link: "assessments",
          },
        })
        created.push(existingId)
      }
    }

    // 2. Projects ending within 7 days (softer reminder)
    const endingWeek = await prisma.project.findMany({
      where: {
        userId,
        status: "Active",
        timelineEnd: {
          gt: threeDaysFromNow,
          lte: sevenDaysFromNow,
        },
      },
    })

    for (const project of endingWeek) {
      const daysLeft = Math.ceil(
        (new Date(project.timelineEnd!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          title: { contains: "Assessment due" },
          message: { contains: project.engagementName },
          createdAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            title: `Assessment due in ${daysLeft} days`,
            message: `"${project.engagementName}" for ${project.clientName} — prepare your assessment`,
            type: "assessment_due",
            link: "assessments",
          },
        })
        created.push(`assessment-due-${project.id}`)
      }
    }

    // 3. Quarterly EFR reminder — check if current quarter has no EFR
    const currentMonth = now.getMonth() + 1
    const currentQuarter = Math.ceil(currentMonth / 3)
    const currentYear = now.getFullYear()
    const quarterLabel = `Q${currentQuarter}-${currentYear}`

    const hasQuarterlyEfr = await prisma.efrSubmission.findFirst({
      where: {
        userId,
        quarter: quarterLabel,
      },
    })

    // Only remind if we're past the first month of the quarter and no EFR exists
    const monthInQuarter = ((currentMonth - 1) % 3) + 1
    if (!hasQuarterlyEfr && monthInQuarter >= 2) {
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "efr_reminder",
          message: { contains: quarterLabel },
          createdAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            title: `EFR submission reminder`,
            message: `No EFR submitted yet for ${quarterLabel}. Don't forget to submit your feedback!`,
            type: "efr_reminder",
            link: "efr",
          },
        })
        created.push(`efr-reminder-${quarterLabel}`)
      }
    }

    // 4. Overdue projects (past timelineEnd but still Active)
    const overdueProjects = await prisma.project.findMany({
      where: {
        userId,
        status: "Active",
        timelineEnd: { lt: now },
      },
    })

    for (const project of overdueProjects) {
      const daysOverdue = Math.ceil(
        (now.getTime() - new Date(project.timelineEnd!).getTime()) / (1000 * 60 * 60 * 24)
      )
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "assessment_due",
          message: { contains: project.engagementName },
          title: { contains: "overdue" },
          createdAt: { gte: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) },
        },
      })
      if (!existing) {
        await prisma.notification.create({
          data: {
            userId,
            title: `Project overdue`,
            message: `"${project.engagementName}" is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} past the deadline. Update status or timeline.`,
            type: "assessment_due",
            link: "assessments",
          },
        })
        created.push(`overdue-${project.id}`)
      }
    }

    return { success: true, created: created.length }
  } catch (err: unknown) {
    console.error("Generate notifications error:", err)
    return { error: "Failed to generate notifications" }
  }
}
