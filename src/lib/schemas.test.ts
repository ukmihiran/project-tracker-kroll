import { ProjectSchema, EfrSchema } from "./schemas";

describe("Validation Schemas", () => {
  describe("ProjectSchema", () => {
    it("should validate a correct project payload", () => {
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

    it("should fail if required fields are missing", () => {
      const invalidProject = {
        clientName: "Acme",
      };

      const result = ProjectSchema.safeParse(invalidProject);
      expect(result.success).toBe(false);
    });

    it("should default status to Active if omitted", () => {
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

    it("should coerce negative effort time to fail or throw error", () => {
      const projectWithNegativeEffort = {
        engagementName: "Audit",
        clientName: "Acme",
        assessmentType: "Review",
        effortTimeHours: -10,
      };
      const result = ProjectSchema.safeParse(projectWithNegativeEffort);
      expect(result.success).toBe(false);
    });
  });

  describe("EfrSchema", () => {
    it("should validate a proper EFR submission", () => {
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

    it("should fail if title is missing", () => {
      const invalidEfr = {
        quarter: "Q1-2026",
      };

      const result = EfrSchema.safeParse(invalidEfr);
      expect(result.success).toBe(false);
    });

    it("should fail if quarter is missing", () => {
      const invalidEfr = {
        title: "Some EFR",
      };

      const result = EfrSchema.safeParse(invalidEfr);
      expect(result.success).toBe(false);
    });
  });
});
