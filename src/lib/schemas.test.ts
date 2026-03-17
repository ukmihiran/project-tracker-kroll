import { EfrSchema, ProjectSchema } from "./schemas";

describe("Validation Schemas", () => {
  describe("ProjectSchema", () => {
    it("validates a correct project payload", () => {
      const validProject = {
        engagementName: "Security Audit",
        clientName: "Acme Corp",
        assessmentType: "Pentest",
        status: "Active",
        billable: true,
        shadowing: false,
        effortTimeHours: 120,
        projectID: "PRJ-123",
        EM: "Alice",
        PM: "Bob",
        consultants: "Charlie, Dave",
        projectReportLink: "https://example.com/report",
        isMultiPerson: true,
        isLeadConsultant: true,
      };

      const result = ProjectSchema.safeParse(validProject);
      expect(result.success).toBe(true);
    });

    it("fails if required fields are missing", () => {
      const invalidProject = {
        clientName: "Acme",
      };

      const result = ProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it("defaults missing optional flags", () => {
      const project = {
        engagementName: "Audit",
        clientName: "Acme",
        assessmentType: "Review",
      };

      const result = ProjectSchema.safeParse(project);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("Active");
        expect(result.data.billable).toBe(true);
        expect(result.data.effortTimeHours).toBe(0);
        expect(result.data.isMultiPerson).toBe(false);
        expect(result.data.isLeadConsultant).toBe(false);
      }
    });

    it("rejects negative effort time", () => {
      const projectWithNegativeEffort = {
        engagementName: "Audit",
        clientName: "Acme",
        assessmentType: "Review",
        effortTimeHours: -10,
      };

      const result = ProjectSchema.safeParse(projectWithNegativeEffort);
      expect(result.success).toBe(false);
    });

    it("rejects timeline ranges where end date is before the start date", () => {
      const result = ProjectSchema.safeParse({
        engagementName: "Audit",
        clientName: "Acme",
        assessmentType: "Review",
        timelineStart: "2026-03-20",
        timelineEnd: "2026-03-01",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Timeline end date must be on or after the start date");
      }
    });

    it("strips unknown keys such as client supplied ids", () => {
      const result = ProjectSchema.safeParse({
        id: "attacker-controlled-id",
        engagementName: "Audit",
        clientName: "Acme",
        assessmentType: "Review",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
      }
    });
  });

  describe("EfrSchema", () => {
    it("validates a proper EFR submission", () => {
      const validEfr = {
        title: "Kubernetes Security Guide",
        description: "Published an EFR on container security best practices",
        quarter: "Q1-2026",
        evaluator: "John Smith",
        engagement: "ACME Corp - Cloud Migration",
        engagementStart: "2026-01-15",
        role: "Lead Consultant",
        duration: "2 weeks",
        contextComment: "Great work on the migration",
      };

      const result = EfrSchema.safeParse(validEfr);
      expect(result.success).toBe(true);
    });

    it("fails if title is missing", () => {
      const invalidEfr = {
        quarter: "Q1-2026",
      };

      const result = EfrSchema.safeParse(invalidEfr);
      expect(result.success).toBe(false);
    });

    it("fails if quarter is missing", () => {
      const invalidEfr = {
        title: "Some EFR",
      };

      const result = EfrSchema.safeParse(invalidEfr);
      expect(result.success).toBe(false);
    });

    it("strips unknown keys such as client supplied ids", () => {
      const result = EfrSchema.safeParse({
        id: "attacker-controlled-id",
        title: "Quarterly Feedback",
        quarter: "Q1-2026",
        evaluator: "Jane Smith",
        engagement: "Acme - Audit",
        engagementStart: "2026-01-15",
        role: "Consultant",
        duration: "1 week",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty("id");
      }
    });
  });
});
