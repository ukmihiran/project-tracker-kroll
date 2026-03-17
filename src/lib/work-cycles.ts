import type { WorkCycle } from "@prisma/client";

import { prisma } from "@/lib/db";

const DEFAULT_BILLABLE_TARGET = 1500;
const DEFAULT_EFR_TARGET = 3;
const DEFAULT_MULTI_PERSON_TARGET = 1;

export function getYearBounds(year: number) {
  return {
    startDate: new Date(year, 0, 1),
    endDate: new Date(year, 11, 31, 23, 59, 59, 999),
  };
}

export function getCycleStatusForYear(year: number, now = new Date()) {
  const currentYear = now.getFullYear();

  if (year > currentYear) return "PLANNED" as const;
  if (year < currentYear) return "CLOSED" as const;
  return "ACTIVE" as const;
}

export function buildDefaultWorkCycle(year: number) {
  const bounds = getYearBounds(year);

  return {
    name: `${year} Workspace`,
    year,
    ...bounds,
    status: getCycleStatusForYear(year),
    focusText: "Keep projects moving, protect focus time, and stay ahead of EFR deadlines.",
    billableTarget: DEFAULT_BILLABLE_TARGET,
    efrTarget: DEFAULT_EFR_TARGET,
    multiPersonTarget: DEFAULT_MULTI_PERSON_TARGET,
  };
}

export function formatCycleLabel(cycle: Pick<WorkCycle, "name" | "year">) {
  return `${cycle.name} (${cycle.year})`;
}

export function shiftDateByYears(date: Date | null | undefined, years: number) {
  if (!date) return null;

  const shiftedDate = new Date(date);
  shiftedDate.setFullYear(shiftedDate.getFullYear() + years);
  return shiftedDate;
}

export async function ensureWorkCycleForYear(userId: string, year: number) {
  return prisma.workCycle.upsert({
    where: {
      userId_year: {
        userId,
        year,
      },
    },
    update: {},
    create: {
      ...buildDefaultWorkCycle(year),
      userId,
    },
  });
}

export async function ensureUserWorkspace(userId: string, year = new Date().getFullYear()) {
  const activeCycle = await ensureWorkCycleForYear(userId, year);

  await Promise.all([
    prisma.project.updateMany({
      where: {
        userId,
        workCycleId: null,
      },
      data: {
        workCycleId: activeCycle.id,
      },
    }),
    prisma.efrSubmission.updateMany({
      where: {
        userId,
        workCycleId: null,
      },
      data: {
        workCycleId: activeCycle.id,
      },
    }),
  ]);

  return activeCycle;
}

export async function resolveWorkCycleForUser(userId: string, workCycleId?: string | null) {
  if (workCycleId) {
    const selectedCycle = await prisma.workCycle.findFirst({
      where: {
        id: workCycleId,
        userId,
      },
    });

    if (selectedCycle) {
      return selectedCycle;
    }
  }

  return ensureUserWorkspace(userId);
}
