import { revalidatePath } from "next/cache"

import { getServerUser } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ensureUserWorkspace, resolveWorkCycleForUser, shiftDateByYears } from "@/lib/work-cycles"

import { createNextYearWorkspace, deleteWorkCycle } from "./workCycleActions"

jest.mock("@/lib/auth", () => ({
  getServerUser: jest.fn(),
}))

jest.mock("@/lib/db", () => ({
  prisma: {
    workCycle: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    project: {
      count: jest.fn(),
    },
    efrSubmission: {
      count: jest.fn(),
    },
    task: {
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

jest.mock("@/lib/work-cycles", () => ({
  buildDefaultWorkCycle: jest.fn((year: number) => ({
    name: `${year} Workspace`,
    year,
    startDate: new Date(`${year}-01-01T00:00:00.000Z`),
    endDate: new Date(`${year}-12-31T23:59:59.999Z`),
    status: year > 2026 ? "PLANNED" : "ACTIVE",
    focusText: "Focus",
    billableTarget: 1500,
    efrTarget: 3,
    multiPersonTarget: 1,
  })),
  ensureUserWorkspace: jest.fn(),
  resolveWorkCycleForUser: jest.fn(),
  shiftDateByYears: jest.fn((date: Date | null) => date),
}))

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

const mockedGetServerUser = getServerUser as jest.MockedFunction<typeof getServerUser>
const mockedEnsureUserWorkspace = ensureUserWorkspace as jest.MockedFunction<typeof ensureUserWorkspace>
const mockedResolveWorkCycleForUser = resolveWorkCycleForUser as jest.MockedFunction<typeof resolveWorkCycleForUser>
const mockedShiftDateByYears = shiftDateByYears as jest.MockedFunction<typeof shiftDateByYears>
const mockedRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>
const mockedPrisma = prisma as unknown as {
  workCycle: {
    count: jest.Mock
    findFirst: jest.Mock
    findUnique: jest.Mock
  }
  $transaction: jest.Mock
}

describe("workCycleActions", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-03-17T09:00:00.000Z"))
    jest.clearAllMocks()
    mockedGetServerUser.mockResolvedValue({ id: "user-1", email: "user@example.com" })
    mockedEnsureUserWorkspace.mockResolvedValue({
      id: "cycle-2026",
      year: 2026,
      billableTarget: 1500,
      efrTarget: 3,
      multiPersonTarget: 1,
      focusText: "Keep the current year tidy",
      endDate: new Date("2026-12-31T23:59:59.999Z"),
    } as any)
    mockedResolveWorkCycleForUser.mockResolvedValue({ id: "cycle-2026", year: 2026 } as any)
    mockedShiftDateByYears.mockImplementation((date) => date)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("prevents preparing future years from a non-current workspace", async () => {
    const result = await createNextYearWorkspace("cycle-2028")

    expect(result).toEqual({
      error: "Prepare next year from your 2026 workspace to avoid duplicate future workspaces",
    })
    expect(mockedPrisma.workCycle.findUnique).not.toHaveBeenCalled()
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })

  it("blocks deletion of the current calendar workspace", async () => {
    mockedPrisma.workCycle.count.mockResolvedValue(3)
    mockedPrisma.workCycle.findFirst.mockResolvedValue({ id: "cycle-2026", year: 2026 })

    const result = await deleteWorkCycle("cycle-2026")

    expect(result).toEqual({
      error: "The 2026 workspace is pinned as your active calendar workspace",
    })
    expect(mockedPrisma.$transaction).not.toHaveBeenCalled()
  })

  it("blocks deletion when a workspace still has related records", async () => {
    mockedPrisma.workCycle.count.mockResolvedValue(3)
    mockedPrisma.workCycle.findFirst.mockResolvedValue({ id: "cycle-2025", year: 2025 })
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback({
      project: { count: jest.fn().mockResolvedValue(1) },
      efrSubmission: { count: jest.fn().mockResolvedValue(0) },
      task: { count: jest.fn().mockResolvedValue(0) },
      workCycle: { delete: jest.fn() },
    }))

    const result = await deleteWorkCycle("cycle-2025")

    expect(result).toEqual({
      error: "Move, archive, or delete every project, EFR, and task in this workspace before deleting it",
    })
  })

  it("deletes an empty non-current workspace and revalidates the dashboard", async () => {
    const deleteMock = jest.fn().mockResolvedValue({ id: "cycle-2025" })

    mockedPrisma.workCycle.count.mockResolvedValue(3)
    mockedPrisma.workCycle.findFirst.mockResolvedValue({ id: "cycle-2025", year: 2025 })
    mockedPrisma.$transaction.mockImplementation(async (callback: any) => callback({
      project: { count: jest.fn().mockResolvedValue(0) },
      efrSubmission: { count: jest.fn().mockResolvedValue(0) },
      task: { count: jest.fn().mockResolvedValue(0) },
      workCycle: { delete: deleteMock },
    }))

    const result = await deleteWorkCycle("cycle-2025")

    expect(result).toEqual({ success: true, deletedCycleId: "cycle-2025" })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "cycle-2025" } })
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard")
  })
})
