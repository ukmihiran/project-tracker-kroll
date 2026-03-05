"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"
import path from "path"
import fs from "fs/promises"

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string })?.id
}

export async function createBackup() {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    // Export user's data as a JSON backup
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    const projects = await prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })

    const efrs = await prisma.efrSubmission.findMany({
      where: { userId },
      orderBy: { submittedAt: "desc" },
    })

    const backup = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      user,
      projects: projects.map(({ userId: _uid, ...rest }) => rest),
      efrs: efrs.map(({ userId: _uid, ...rest }) => rest),
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
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    const backup = JSON.parse(jsonData)

    if (!backup.version || !backup.projects || !backup.efrs) {
      return { error: "Invalid backup file format" }
    }

    let projectsRestored = 0
    let efrsRestored = 0

    // Restore projects
    for (const project of backup.projects) {
      const { id, createdAt, updatedAt: _updatedAt, ...data } = project
      // Check if project already exists
      const existing = await prisma.project.findFirst({
        where: { id, userId },
      })
      if (!existing) {
        await prisma.project.create({
          data: {
            ...data,
            id, // Preserve original ID
            userId,
            createdAt: new Date(createdAt),
            timelineStart: data.timelineStart ? new Date(data.timelineStart) : null,
            timelineEnd: data.timelineEnd ? new Date(data.timelineEnd) : null,
          },
        })
        projectsRestored++
      }
    }

    // Restore EFRs
    for (const efr of backup.efrs) {
      const { id, createdAt: _createdAt, updatedAt: _updatedAt2, submittedAt, ...data } = efr
      const existing = await prisma.efrSubmission.findFirst({
        where: { id, userId },
      })
      if (!existing) {
        await prisma.efrSubmission.create({
          data: {
            ...data,
            id,
            userId,
            submittedAt: new Date(submittedAt),
            engagementStart: new Date(data.engagementStart),
          },
        })
        efrsRestored++
      }
    }

    return {
      success: true,
      message: `Restored ${projectsRestored} projects and ${efrsRestored} EFR submissions`,
    }
  } catch (err: unknown) {
    console.error("Restore error:", err)
    if (err instanceof SyntaxError) {
      return { error: "Invalid JSON file" }
    }
    return { error: "Failed to restore backup" }
  }
}

export async function getDatabaseBackup() {
  const userId = await getUserId()
  if (!userId) return { error: "Unauthorized" }

  try {
    const dbPath = path.join(process.cwd(), "prisma", "dev.db")
    const dbBuffer = await fs.readFile(dbPath)
    const base64 = dbBuffer.toString("base64")

    return {
      success: true,
      data: base64,
      filename: `project-tracker-db-${new Date().toISOString().split("T")[0]}.db`,
    }
  } catch (err: unknown) {
    console.error("DB backup error:", err)
    return { error: "Failed to create database backup" }
  }
}
