import { revalidatePath } from "next/cache";

import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveWorkCycleForUser } from "@/lib/work-cycles";

import { createTask, updateTaskStatus } from "./taskActions";

jest.mock("@/lib/auth", () => ({
  getServerUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findFirst: jest.fn(),
    },
    task: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

jest.mock("@/lib/work-cycles", () => ({
  ensureUserWorkspace: jest.fn(),
  resolveWorkCycleForUser: jest.fn(),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

const mockedGetServerUser = getServerUser as jest.MockedFunction<typeof getServerUser>;
const mockedResolveWorkCycleForUser = resolveWorkCycleForUser as jest.MockedFunction<typeof resolveWorkCycleForUser>;
const mockedRevalidatePath = revalidatePath as jest.MockedFunction<typeof revalidatePath>;
const mockedPrisma = prisma as unknown as {
  task: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

describe("taskActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetServerUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mockedResolveWorkCycleForUser.mockResolvedValue({ id: "cycle-2026", year: 2026 } as any);
  });

  it("creates tasks with normalized fields and server controlled workspace ids", async () => {
    mockedPrisma.task.create.mockResolvedValue({ id: "task-1" });

    const result = await createTask({
      id: "attacker-id",
      title: "  Draft executive summary  ",
      description: "  Capture key findings  ",
      status: "TODO",
      priority: "HIGH",
      dueDate: "2026-03-20",
      reminderAt: "2026-03-18",
      estimateHours: 3,
      workCycleId: "cycle-2026",
    } as any);

    expect(result).toEqual({ success: true, task: { id: "task-1" } });
    expect(mockedPrisma.task.create).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.task.create.mock.calls[0][0].data).toEqual({
      workCycleId: "cycle-2026",
      projectId: null,
      title: "Draft executive summary",
      description: "Capture key findings",
      status: "TODO",
      priority: "HIGH",
      dueDate: new Date("2026-03-20"),
      reminderAt: new Date("2026-03-18"),
      estimateHours: 3,
      completedAt: null,
      userId: "user-1",
    });
    expect(mockedPrisma.task.create.mock.calls[0][0].data).not.toHaveProperty("id");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("marks a task as completed when updating the status to DONE", async () => {
    mockedPrisma.task.findFirst.mockResolvedValue({
      id: "task-1",
      userId: "user-1",
      status: "IN_PROGRESS",
      completedAt: null,
    });
    mockedPrisma.task.update.mockResolvedValue({ id: "task-1", status: "DONE" });

    const result = await updateTaskStatus("task-1", "DONE");

    expect(result).toEqual({ success: true, task: { id: "task-1", status: "DONE" } });
    expect(mockedPrisma.task.update).toHaveBeenCalledTimes(1);
    expect(mockedPrisma.task.update.mock.calls[0][0].data.status).toBe("DONE");
    expect(mockedPrisma.task.update.mock.calls[0][0].data.completedAt).toBeInstanceOf(Date);
  });
});
