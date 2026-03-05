"use server"

import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import bcrypt from "bcryptjs"
import { UpdateProfileSchema, ChangePasswordSchema } from "@/lib/schemas"

async function getAuthenticatedUser() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return null
  }
  // The id and role are added via JWT callback in NextAuth config
  const user = session.user as { id?: string; email?: string | null; name?: string | null; role?: string }
  if (!user.id) return null
  return user
}

export async function getProfile() {
  try {
    const sessionUser = await getAuthenticatedUser()
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
    const sessionUser = await getAuthenticatedUser()
    if (!sessionUser) return { error: "Not authenticated" }

    const parsed = UpdateProfileSchema.safeParse({ name, email })
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") }
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()
    const trimmedName = parsed.data.name.trim()

    // Check if email is already taken by another user
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
    const sessionUser = await getAuthenticatedUser()
    if (!sessionUser) return { error: "Not authenticated" }

    const parsed = ChangePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword,
    })
    if (!parsed.success) {
      return { error: parsed.error.issues.map((i) => i.message).join(", ") }
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, passwordHash: true },
    })
    if (!user) return { error: "User not found" }

    // Verify current password
    const isCurrentValid = await bcrypt.compare(
      parsed.data.currentPassword,
      user.passwordHash
    )
    if (!isCurrentValid) {
      return { error: "Current password is incorrect" }
    }

    // Ensure new password is different from current
    const isSamePassword = await bcrypt.compare(
      parsed.data.newPassword,
      user.passwordHash
    )
    if (isSamePassword) {
      return { error: "New password must be different from your current password" }
    }

    // Hash and update
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
    const sessionUser = await getAuthenticatedUser()
    if (!sessionUser) return { error: "Not authenticated" }

    if (!password || password.length === 0) {
      return { error: "Password is required to delete your account" }
    }

    const user = await prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: { id: true, passwordHash: true },
    })
    if (!user) return { error: "User not found" }

    // Verify password before deletion
    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return { error: "Incorrect password" }
    }

    // Delete all user data in a transaction
    await prisma.$transaction([
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
