"use server"

import bcrypt from "bcryptjs"

import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ChangePasswordSchema, UpdateProfileSchema } from "@/lib/schemas"

export async function getProfile() {
  try {
    const sessionUser = await getServerUser()
    if (!sessionUser) return { error: "Not authenticated" }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            efrs: true,
          },
        },
      },
    })

    if (!user) return { error: "User not found" }

    return {
      success: true,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        projectCount: user._count.projects,
        efrCount: user._count.efrs,
      },
    }
  } catch (error: unknown) {
    console.error("Get profile error:", error)
    return { error: "Failed to load profile" }
  }
}

export async function updateProfile(name: string, email: string) {
  try {
    const sessionUser = await getServerUser()
    if (!sessionUser) return { error: "Not authenticated" }

    const parsed = UpdateProfileSchema.safeParse({ name, email })
    if (!parsed.success) {
      return { error: parsed.error.issues.map((issue) => issue.message).join(", ") }
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()
    const trimmedName = parsed.data.name.trim()

    if (normalizedEmail !== sessionUser.email?.toLowerCase()) {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      })
      if (existingUser && existingUser.id !== sessionUser.id) {
        return { error: "An account with that email already exists" }
      }
    }

    const updated = await prisma.user.update({
      where: { id: sessionUser.id },
      data: {
        name: trimmedName,
        email: normalizedEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return { success: true, user: updated }
  } catch (error: unknown) {
    console.error("Update profile error:", error)
    return { error: "Failed to update profile. Please try again." }
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
) {
  try {
    const sessionUser = await getServerUser()
    if (!sessionUser) return { error: "Not authenticated" }

    const parsed = ChangePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })
    if (!parsed.success) {
      return { error: parsed.error.issues.map((issue) => issue.message).join(", ") }
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, passwordHash: true },
    })
    if (!user) return { error: "User not found" }

    const isCurrentValid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
    if (!isCurrentValid) {
      return { error: "Current password is incorrect" }
    }

    const isSamePassword = await bcrypt.compare(parsed.data.newPassword, user.passwordHash)
    if (isSamePassword) {
      return { error: "New password must be different from your current password" }
    }

    const newHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await prisma.user.update({
      where: { id: sessionUser.id },
      data: { passwordHash: newHash },
    })

    return { success: true }
  } catch (error: unknown) {
    console.error("Change password error:", error)
    return { error: "Failed to change password. Please try again." }
  }
}

export async function deleteAccount(password: string) {
  try {
    const sessionUser = await getServerUser()
    if (!sessionUser) return { error: "Not authenticated" }

    if (!password || password.length === 0) {
      return { error: "Password is required to delete your account" }
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, passwordHash: true },
    })
    if (!user) return { error: "User not found" }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return { error: "Incorrect password" }
    }

    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { userId: user.id } }),
      prisma.efrSubmission.deleteMany({ where: { userId: user.id } }),
      prisma.project.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ])

    return { success: true }
  } catch (error: unknown) {
    console.error("Delete account error:", error)
    return { error: "Failed to delete account. Please try again." }
  }
}
