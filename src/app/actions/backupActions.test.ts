import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureUserWorkspace } from "@/lib/work-cycles";

import { createBackup, restoreBackup } from "./backupActions";

jest.mock("@/lib/auth", () => ({
  getServerUser: jest.fn(),
}));

jest.mock("@/lib/work-cycles", () => ({
  buildDefaultWorkCycle: jest.fn((year: number) => ({
    name: `${year} Workspace`,
    year,
    startDate: new Date(`${year}-01-01T00:00:00.000Z`),
    endDate: new Date(`${year}-12-31T23:59:59.999Z`),
    status: "ACTIVE",
    focusText: null,
    billableTarget: 1500,
    efrTarget: 3,
    multiPersonTarget: 1,
  })),
  ensureUserWorkspace: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    workCycle: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    efrSubmission: {
      findMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

const mockedGetServerUser = getServerUser as jest.MockedFunction<typeof getServerUser>;
const mockedEnsureUserWorkspace = ensureUserWorkspace as jest.MockedFunction<typeof ensureUserWorkspace>;
const mockedPrisma = prisma as unknown as {
  user: {
    findUnique: jest.Mock;
  };
  workCycle: {
    findMany: jest.Mock;
  };
  project: {
    findMany: jest.Mock;
  };
  efrSubmission: {
    findMany: jest.Mock;
  };
  task: {
    findMany: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe("backupActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedEnsureUserWorkspace.mockResolvedValue({ id: "cycle-2026", year: 2026 } as any);
  });

  it("creates sanitized JSON backups without database ids or user ids", async () => {
    mockedGetServerUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mockedPrisma.user.findUnique.mockResolvedValue({
      name: "Jane Doe",
      email: "user@example.com",
      role: "CONSULTANT",
      createdAt: new Date("2026-03-01T00:00:00.000Z"),
    });
    mockedPrisma.workCycle.findMany.mockResolvedValue([
      {
        name: "2026 Workspace",
        year: 2026,
        startDate: new Date("2026-01-01T00:00:00.000Z"),
        endDate: new Date("2026-12-31T00:00:00.000Z"),
        status: "ACTIVE",
        focusText: "Stay ahead",
        billableTarget: 1500,
        efrTarget: 3,
        multiPersonTarget: 1,
      },
    ]);
    mockedPrisma.project.findMany.mockResolvedValue([
      {
        workCycle: { year: 2026 },
        projectID: "PRJ-1",
        engagementName: "Audit",
        clientName: "Acme",
        assessmentType: "Review",
        status: "Active",
        billable: true,
        shadowing: false,
        effortTimeHours: 8,
        timelineStart: new Date("2026-03-01T00:00:00.000Z"),
        timelineEnd: new Date("2026-03-02T00:00:00.000Z"),
        EM: "Alice",
        PM: "Bob",
        consultants: "Charlie",
        projectReportLink: "https://example.com/report",
        isMultiPerson: false,
        isLeadConsultant: false,
      },
    ]);
    mockedPrisma.efrSubmission.findMany.mockResolvedValue([
      {
        title: "Quarterly Feedback",
        description: "Helpful summary",
        quarter: "Q1-2026",
        evaluator: "Jane Smith",
        engagement: "Acme - Audit",
        engagementStart: new Date("2026-03-01T00:00:00.000Z"),
        role: "Consultant",
        duration: "1 week",
        contextComment: "Great work",
        submittedAt: new Date("2026-03-02T00:00:00.000Z"),
      },
    ]);
    mockedPrisma.task.findMany.mockResolvedValue([
      {
        workCycle: { year: 2026 },
        project: null,
        title: "Draft report",
        description: "Write summary",
        status: "TODO",
        priority: "HIGH",
        dueDate: new Date("2026-03-05T00:00:00.000Z"),
        reminderAt: new Date("2026-03-04T00:00:00.000Z"),
        completedAt: null,
        estimateHours: 2,
        archivedAt: null,
        archivedReason: null,
      },
    ]);

    const result = await createBackup();

    expect(result.success).toBe(true);
    expect(typeof result.data).toBe("string");
    const parsed = JSON.parse(result.data as string);
    expect(parsed.version).toBe("3.0");
    expect(parsed.workCycles).toHaveLength(1);
    expect(parsed.tasks).toHaveLength(1);
    expect(parsed.projects[0]).not.toHaveProperty("id");
    expect(parsed.projects[0]).not.toHaveProperty("userId");
    expect(parsed.efrs[0]).not.toHaveProperty("id");
    expect(parsed.efrs[0]).not.toHaveProperty("userId");
  });

  it("restores validated backups in a transaction without reusing incoming ids", async () => {
    mockedGetServerUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });

    const tx = {
      workCycle: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "cycle-2026", year: 2026 }),
      },
      project: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "project-1" }),
      },
      efrSubmission: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "efr-1" }),
      },
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockResolvedValue({ id: "task-1" }),
      },
    };

    mockedPrisma.$transaction.mockImplementation(async (callback: (transactionClient: typeof tx) => Promise<unknown>) => {
      return callback(tx);
    });

    const result = await restoreBackup(
      JSON.stringify({
        version: "2.0",
        exportedAt: "2026-03-17T10:00:00.000Z",
        workCycles: [],
        projects: [
          {
            id: "attacker-project-id",
            engagementName: "Audit",
            clientName: "Acme",
            assessmentType: "Review",
            status: "Active",
            billable: true,
            shadowing: false,
            effortTimeHours: 8,
            timelineStart: "2026-03-01T00:00:00.000Z",
            timelineEnd: "2026-03-03T00:00:00.000Z",
            isMultiPerson: false,
            isLeadConsultant: false,
          },
        ],
        efrs: [
          {
            id: "attacker-efr-id",
            title: "Quarterly Feedback",
            quarter: "Q1-2026",
            evaluator: "Jane Smith",
            engagement: "Acme - Audit",
            engagementStart: "2026-03-01T00:00:00.000Z",
            role: "Consultant",
            duration: "1 week",
            submittedAt: "2026-03-02T00:00:00.000Z",
          },
        ],
        tasks: [],
      })
    );

    expect(result).toEqual({
      success: true,
      message: "Restored 1 projects, 1 EFR submissions, and 0 tasks",
    });
    expect(tx.project.create).toHaveBeenCalledTimes(1);
    expect(tx.efrSubmission.create).toHaveBeenCalledTimes(1);
    expect(tx.project.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({
        userId: "user-1",
        engagementName: "Audit",
      })
    );
    expect(tx.project.create.mock.calls[0][0].data).not.toHaveProperty("id");
    expect(tx.efrSubmission.create.mock.calls[0][0].data).not.toHaveProperty("id");
  });
});
