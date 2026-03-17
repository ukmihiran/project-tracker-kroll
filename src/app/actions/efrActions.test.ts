import { revalidatePath } from "next/cache";

import { getServerUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveWorkCycleForUser } from "@/lib/work-cycles";

import { createEfr } from "./efrActions";

jest.mock("@/lib/auth", () => ({
  getServerUser: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    project: {
      findFirst: jest.fn(),
    },
    efrSubmission: {
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
  efrSubmission: {
    create: jest.Mock;
  };
};

describe("efrActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedResolveWorkCycleForUser.mockResolvedValue({ id: "cycle-2026", year: 2026 } as any);
  });

  it("creates EFRs with normalized fields and without client supplied ids", async () => {
    mockedGetServerUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mockedPrisma.efrSubmission.create.mockResolvedValue({ id: "efr-1" });

    const result = await createEfr({
      id: "attacker-id",
      title: "  Quarterly Feedback  ",
      description: "  Helpful summary  ",
      quarter: "  Q1-2026  ",
      evaluator: "  Jane Smith  ",
      engagement: "  Acme - Audit  ",
      engagementStart: "2026-01-15",
      role: "  Lead Consultant  ",
      duration: "2 weeks",
      contextComment: "  Great work  ",
      workCycleId: "cycle-2026",
    } as any);

    expect(result).toEqual({ success: true, efr: { id: "efr-1" } });
    expect(mockedPrisma.efrSubmission.create).toHaveBeenCalledTimes(1);
    const createdData = mockedPrisma.efrSubmission.create.mock.calls[0][0].data;
    expect(createdData).toEqual({
      workCycleId: "cycle-2026",
      projectId: null,
      title: "Quarterly Feedback",
      description: "Helpful summary",
      quarter: "Q1-2026",
      evaluator: "Jane Smith",
      engagement: "Acme - Audit",
      engagementStart: new Date("2026-01-15"),
      role: "Lead Consultant",
      duration: "2 weeks",
      contextComment: "Great work",
      userId: "user-1",
    });
    expect(createdData).not.toHaveProperty("id");
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/dashboard");
  });
});
