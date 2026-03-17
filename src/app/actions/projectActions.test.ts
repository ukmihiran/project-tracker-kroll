import { revalidatePath } from "next/cache";

import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveWorkCycleForUser } from "@/lib/work-cycles";

import { createProject, updateProject } from "./projectActions";

jest.mock("@/lib/auth", () => ({
  getServerUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    efrSubmission: {
      findMany: jest.fn(),
    },
    task: {
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
  project: {
    create: jest.Mock;
    findFirst: jest.Mock;
    update: jest.Mock;
  };
};

describe("projectActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveWorkCycleForUser.mockResolvedValue({ id: "cycle-2026", year: 2026 } as any);
  });

  it("creates projects with explicit server controlled fields only", async () => {
    mockedGetServerUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mockedPrisma.project.create.mockResolvedValue({ id: "project-1" });

    const result = await createProject({
      id: "attacker-id",
      projectID: "  ",
      engagementName: "  Security Audit  ",
      clientName: "  Acme Corp  ",
      assessmentType: "  Pentest  ",
      status: "Active",
      billable: true,
      shadowing: false,
      effortTimeHours: 8,
      timelineStart: "2026-03-01",
      timelineEnd: "2026-03-02",
      EM: " Alice ",
      PM: " ",
      consultants: " Bob ",
      projectReportLink: "",
      isMultiPerson: false,
      isLeadConsultant: true,
      workCycleId: "cycle-2026",
    } as any);

    expect(result).toEqual({ success: true, project: { id: "project-1" } });
    expect(mockedPrisma.project.create).toHaveBeenCalledTimes(1);
    const createdData = mockedPrisma.project.create.mock.calls[0][0].data;
    expect(createdData).toEqual({
      projectID: null,
      engagementName: "Security Audit",
      clientName: "Acme Corp",
      assessmentType: "Pentest",
      status: "Active",
      billable: true,
      shadowing: false,
      effortTimeHours: 8,
      timelineStart: new Date("2026-03-01"),
      timelineEnd: new Date("2026-03-02"),
      EM: "Alice",
      PM: null,
      consultants: "Bob",
      projectReportLink: null,
      isMultiPerson: false,
      isLeadConsultant: true,
      workCycleId: "cycle-2026",
      userId: "user-1",
    });
    expect(createdData).not.toHaveProperty("id");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("rejects invalid timeline updates before querying the database", async () => {
    mockedGetServerUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });

    const result = await updateProject("project-1", {
      engagementName: "Audit",
      clientName: "Acme",
      assessmentType: "Review",
      timelineStart: "2026-03-10",
      timelineEnd: "2026-03-01",
    } as any);

    expect(result).toEqual({
      error: "Validation failed: Timeline end date must be on or after the start date",
    });
    expect(mockedPrisma.project.findFirst).not.toHaveBeenCalled();
    expect(mockedPrisma.project.update).not.toHaveBeenCalled();
  });
});
