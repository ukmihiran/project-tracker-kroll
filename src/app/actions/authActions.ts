"use server"

import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { RegisterSchema } from "@/lib/schemas"

export async function registerUser(name: string, email: string, password: string) {
  try {
    // Validate inputs server-side
    const parsed = RegisterSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      return { error: parsed.error.issues.map(i => i.message).join(", ") }
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase().trim() }
    })
    if (existing) {
      return { error: "An account with that email already exists" }
    }

    const hashed = await bcrypt.hash(parsed.data.password, 12)
    
    await prisma.user.create({
      data: {
        name: parsed.data.name.trim(),
        email: parsed.data.email.toLowerCase().trim(),
        passwordHash: hashed,
        role: "CONSULTANT"
      }
    })
    
    return { success: true }
  } catch (error: unknown) {
    console.error("Registration error:", error);
    return { error: "Registration failed. Please try again." }
  }
}
