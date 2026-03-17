import { getQuarterLabel, planNotifications } from "./notification-utils";

describe("notification utilities", () => {
  it("returns the expected quarter metadata", () => {
    expect(getQuarterLabel(new Date("2026-05-10T09:00:00.000Z"))).toEqual({
      quarterLabel: "Q2-2026",
      monthInQuarter: 2,
    });
  });

  it("avoids creating duplicate project ending notifications within the cooldown window", () => {
    const now = new Date("2026-03-17T10:00:00.000Z");
    const notifications = planNotifications({
      now,
      endingSoon: [
        {
          id: "project-1",
          engagementName: "Security Audit",
          clientName: "Acme",
          timelineEnd: new Date("2026-03-18T10:00:00.000Z"),
        },
      ],
      endingWeek: [],
      overdueProjects: [],
      dueTasks: [],
      overdueTasks: [],
      recentNotifications: [
        {
          title: "Project ending soon",
          message: "\"Security Audit\" for Acme ends in 1 day",
          type: "project_ending",
          link: "assessments",
          createdAt: new Date("2026-03-17T08:00:00.000Z"),
        },
      ],
      hasQuarterlyEfr: true,
    });

    expect(notifications).toHaveLength(0);
  });

  it("creates due, overdue, and quarter reminder notifications when needed", () => {
    const now = new Date("2026-05-10T10:00:00.000Z");
    const notifications = planNotifications({
      now,
      endingSoon: [],
      endingWeek: [
        {
          id: "project-2",
          engagementName: "Cloud Review",
          clientName: "Globex",
          timelineEnd: new Date("2026-05-15T10:00:00.000Z"),
        },
      ],
      overdueProjects: [
        {
          id: "project-3",
          engagementName: "Legacy Audit",
          clientName: "Initech",
          timelineEnd: new Date("2026-05-06T10:00:00.000Z"),
        },
      ],
      dueTasks: [
        {
          id: "task-1",
          title: "Draft final report",
          dueDate: new Date("2026-05-11T10:00:00.000Z"),
          project: { engagementName: "Cloud Review" },
        },
      ],
      overdueTasks: [
        {
          id: "task-2",
          title: "Send EFR follow-up",
          dueDate: new Date("2026-05-09T10:00:00.000Z"),
          project: null,
        },
      ],
      recentNotifications: [],
      hasQuarterlyEfr: false,
    });

    expect(notifications).toEqual([
      {
        title: "Assessment due in 5 days",
        message: "\"Cloud Review\" for Globex - prepare your assessment",
        type: "assessment_due",
        link: "assessments",
      },
      {
        title: "EFR submission reminder",
        message: "No EFR submitted yet for Q2-2026. Don't forget to submit your feedback!",
        type: "efr_reminder",
        link: "efr",
      },
      {
        title: "Project overdue",
        message: "\"Legacy Audit\" is 4 days past the deadline. Update status or timeline.",
        type: "assessment_due",
        link: "assessments",
      },
      {
        title: "Task due in 1 day",
        message: "\"Draft final report\" on Cloud Review needs your attention.",
        type: "task_due",
        link: "tasks",
      },
      {
        title: "Task overdue",
        message: "\"Send EFR follow-up\" is 1 day overdue.",
        type: "task_overdue",
        link: "tasks",
      },
    ]);
  });
});
