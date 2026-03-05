"use server"

import { prisma } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ProjectSchema, ProjectInput } from "@/lib/schemas"
import { revalidatePath } from "next/cache"

async function getUserId() {
  const session = await getServerSession(authOptions)
  return (session?.user as { id?: string })?.id
}

export async function createProject(data: ProjectInput) {
  const parsed = ProjectSchema.safeParse(data);
  if (!parsed.success) return { error: "Validation failed: " + parsed.error.issues.map(i => i.message).join(", ") }
  
  const userId = await getUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        userId: userId
      }
    })
    revalidatePath("/dashboard")
    return { success: true, project }
  } catch (err: unknown) {
    console.error("Create project error:", err);
    return { error: "Failed to create project" }
  }
}

export async function updateProject(id: string, data: ProjectInput) {
  const parsed = ProjectSchema.safeParse(data);
  if (!parsed.success) return { error: "Validation failed: " + parsed.error.issues.map(i => i.message).join(", ") }

  const userId = await getUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Verify ownership before updating
    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) return { error: "Project not found or access denied" };

    const project = await prisma.project.update({
      where: { id },
      data: parsed.data
    })
    revalidatePath("/dashboard")
    return { success: true, project }
  } catch (err: unknown) {
    console.error("Update project error:", err);
    return { error: "Failed to update project" }
  }
}

export async function deleteProject(id: string) {
  if (!id || typeof id !== "string") return { error: "Invalid project ID" };

  const userId = await getUserId();
  if (!userId) return { error: "Unauthorized" };

  try {
    // Verify ownership before deleting
    const existing = await prisma.project.findFirst({ where: { id, userId } });
    if (!existing) return { error: "Project not found or access denied" };

    await prisma.project.delete({ where: { id } })
    revalidatePath("/dashboard")
    return { success: true }
  } catch (err: unknown) {
    console.error("Delete project error:", err);
    return { error: "Failed to delete project" }
  }
}

export async function getProjects() {
  const userId = await getUserId();
  if (!userId) return [];
  
  return await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" }
  });
}

// Helper to get the current quarter string, e.g. "Q1-2026"
function getCurrentQuarter(): { quarter: string; year: number; q: number } {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const q = Math.floor(month / 3) + 1;
  return { quarter: `Q${q}-${year}`, year, q };
}

// Get all four quarter labels for the current year
function getYearQuarters(year: number): string[] {
  return [`Q1-${year}`, `Q2-${year}`, `Q3-${year}`, `Q4-${year}`];
}

export async function getDashboardStats() {
  const userId = await getUserId();
  if (!userId) return null;

  const currentYear = new Date().getFullYear();
  const yearQuarters = getYearQuarters(currentYear);
  const { quarter: currentQuarter } = getCurrentQuarter();

  // Fetch all user projects
  const projects = await prisma.project.findMany({
    where: { userId },
  });

  // Fetch all user EFR submissions for this year
  const efrs = await prisma.efrSubmission.findMany({
    where: {
      userId,
      quarter: { in: yearQuarters },
    },
  });

  // Assessment status counts
  const assessmentCounts = {
    active: projects.filter((p) => p.status === "Active").length,
    placeholder: projects.filter((p) => p.status === "Placeholder").length,
    delivered: projects.filter((p) => p.status === "Delivered").length,
    cancelled: projects.filter((p) => p.status === "Cancelled").length,
    total: projects.length,
  };

  // Goal 1: 1500 billable hours
  const totalBillableHours = projects
    .filter((p) => p.billable)
    .reduce((sum, p) => sum + p.effortTimeHours, 0);

  // Goal 2: 3 EFRs per quarter (career development)
  const efrsByQuarter: Record<string, number> = {};
  for (const q of yearQuarters) {
    efrsByQuarter[q] = efrs.filter((e) => e.quarter === q).length;
  }

  // Goal 3: Lead 1 multi-person project per quarter
  const multiPersonByQuarter: Record<string, number> = {};
  for (const q of yearQuarters) {
    // Determine quarter date range
    const qNum = parseInt(q.charAt(1));
    const qStart = new Date(currentYear, (qNum - 1) * 3, 1);
    const qEnd = new Date(currentYear, qNum * 3, 0, 23, 59, 59);

    multiPersonByQuarter[q] = projects.filter((p) => {
      if (!p.isMultiPerson || !p.isLeadConsultant) return false;
      if (p.status === "Cancelled") return false;
      // Check if project timeline overlaps with the quarter
      const start = p.timelineStart ? new Date(p.timelineStart) : null;
      const end = p.timelineEnd ? new Date(p.timelineEnd) : null;
      if (start && start > qEnd) return false;
      if (end && end < qStart) return false;
      return true;
    }).length;
  }

  return {
    assessmentCounts,
    billableHours: {
      current: totalBillableHours,
      target: 1500,
    },
    efrsByQuarter,
    efrTarget: 3,
    multiPersonByQuarter,
    multiPersonTarget: 1,
    currentQuarter,
    yearQuarters,
  };
}
