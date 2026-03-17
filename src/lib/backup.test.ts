import {
  createEfrFingerprint,
  createProjectFingerprint,
  parseBackupPayload,
} from "./backup";

describe("backup utilities", () => {
  it("rejects invalid JSON", () => {
    expect(parseBackupPayload("{not-json")).toEqual({
      success: false,
      error: "Invalid JSON file",
    });
  });

  it("rejects oversized backup payloads", () => {
    const largeString = "a".repeat(5 * 1024 * 1024 + 1);

    expect(parseBackupPayload(largeString)).toEqual({
      success: false,
      error: "Backup file is too large. Maximum supported size is 5 MB.",
    });
  });

  it("parses a valid backup and strips unknown keys", () => {
    const result = parseBackupPayload(
      JSON.stringify({
        version: "2.0",
        exportedAt: "2026-03-17T10:00:00.000Z",
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
          },
        ],
      })
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.projects[0]).not.toHaveProperty("id");
      expect(result.data.efrs[0]).not.toHaveProperty("id");
    }
  });

  it("creates stable project fingerprints for matching content", () => {
    const first = createProjectFingerprint({
      projectID: " PRJ-1 ",
      engagementName: "Security Audit",
      clientName: "Acme",
      assessmentType: "Review",
      status: "Active",
      billable: true,
      shadowing: false,
      effortTimeHours: 12,
      timelineStart: new Date("2026-03-01T00:00:00.000Z"),
      timelineEnd: new Date("2026-03-02T00:00:00.000Z"),
      EM: "Alice",
      PM: "Bob",
      consultants: "Charlie",
      projectReportLink: "https://example.com/report",
      isMultiPerson: false,
      isLeadConsultant: false,
    });
    const second = createProjectFingerprint({
      projectID: "prj-1",
      engagementName: " security audit ",
      clientName: "ACME",
      assessmentType: "review",
      status: "active",
      billable: true,
      shadowing: false,
      effortTimeHours: 12,
      timelineStart: new Date("2026-03-01T00:00:00.000Z"),
      timelineEnd: new Date("2026-03-02T00:00:00.000Z"),
      EM: " alice ",
      PM: "bob",
      consultants: "charlie",
      projectReportLink: "https://example.com/report",
      isMultiPerson: false,
      isLeadConsultant: false,
    });

    expect(first).toBe(second);
  });

  it("creates stable EFR fingerprints for matching content", () => {
    const first = createEfrFingerprint({
      title: "Quarterly Feedback",
      description: " Great work ",
      quarter: "Q1-2026",
      evaluator: "Jane Smith",
      engagement: "Acme - Audit",
      engagementStart: new Date("2026-03-01T00:00:00.000Z"),
      role: "Consultant",
      duration: "1 week",
      contextComment: "Thanks",
      submittedAt: new Date("2026-03-02T00:00:00.000Z"),
    });
    const second = createEfrFingerprint({
      title: " quarterly feedback ",
      description: "great work",
      quarter: "q1-2026",
      evaluator: "jane smith",
      engagement: "acme - audit",
      engagementStart: new Date("2026-03-01T00:00:00.000Z"),
      role: "consultant",
      duration: "1 week",
      contextComment: "thanks",
      submittedAt: new Date("2026-03-05T00:00:00.000Z"),
    });

    expect(first).toBe(second);
  });
});
