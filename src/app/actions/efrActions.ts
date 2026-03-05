"use server"

import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { EfrSchema, EfrInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string })?.id
}

export async function createEfr(data: EfrInput) {
  const parsed = EfrSchema.safeParse(data);
  if (!parsed.success) return { error: "Validation failed" }

  const userId = await getUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    const efr = await prisma.efrSubmission.create({
      data: {
        ...parsed.data,
        userId,
      }
    })
    revalidatePath("/dashboard")
    return { success: true, efr }
  } catch (err: unknown) {
    console.error("Create EFR error:", err);
    return { error: "Failed to create EFR. Please try again." }
  }
}

export async function updateEfr(id: string, data: EfrInput) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid EFR ID" };
  }
  const parsed = EfrSchema.safeParse(data);
  if (!parsed.success) return { error: "Validation failed" }

  const userId = await getUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Verify ownership before update
    const existing = await prisma.efrSubmission.findFirst({ where: { id, userId } });
    if (!existing) return { error: "EFR not found or access denied" };

    const efr = await prisma.efrSubmission.update({
      where: { id },
      data: parsed.data,
    })
    revalidatePath("/dashboard")
    return { success: true, efr }
  } catch (err: unknown) {
    console.error("Update EFR error:", err);
    return { error: "Failed to update EFR. Please try again." }
  }
}

export async function deleteEfr(id: string) {
  if (!id || typeof id !== "string") {
    return { error: "Invalid EFR ID" };
  }
  const userId = await getUserId();
  if (!userId) return { error: "Unauthorized" };
  try {
    // Verify ownership before deletion
    const efr = await prisma.efrSubmission.findFirst({ where: { id, userId } });
    if (!efr) return { error: "EFR not found or access denied" };
    await prisma.efrSubmission.delete({ where: { id } })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    console.error("Delete EFR error:", err);
    return { error: "Failed to delete EFR. Please try again." }
  }
}

export async function getEfrs() {
  const userId = await getUserId();
  if (!userId) return [];

  return await prisma.efrSubmission.findMany({
    where: { userId },
    orderBy: { submittedAt: "desc" },
  });
}
