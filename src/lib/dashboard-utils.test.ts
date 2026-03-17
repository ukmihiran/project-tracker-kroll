import { buildDashboardStats, getTaskFocusGroups } from "./dashboard-utils";

describe("dashboard utilities", () => {
  it("builds workspace stats using cycle targets and task counts", () => {
    const stats = buildDashboardStats({
      cycle: {
        id: "cycle-2026",
        year: 2026,
        billableTarget: 1600,
        efrTarget: 4,
        multiPersonTarget: 2,
      },
      now: new Date("2026-03-17T10:00:00.000Z"),
      projects: [
        {
          id: "project-1",
          status: "Active",
          billable: true,
          effortTimeHours: 24,
          isMultiPerson: true,
          isLeadConsultant: true,
          timelineStart: new Date("2026-03-01T00:00:00.000Z"),
          timelineEnd: new Date("2026-03-20T00:00:00.000Z"),
        },
        {
          id: "project-2",
          status: "Delivered",
          billable: false,
          effortTimeHours: 5,
          isMultiPerson: false,
          isLeadConsultant: false,
          timelineStart: null,
          timelineEnd: null,
        },
      ],
      efrs: [
        { id: "efr-1", quarter: "Q1-2026" },
        { id: "efr-2", quarter: "Q1-2026" },
      ],
      tasks: [
        { id: "task-1", title: "Task 1", status: "TODO", priority: "HIGH", dueDate: new Date("2026-03-17T15:00:00.000Z") },
        { id: "task-2", title: "Task 2", status: "DONE", priority: "LOW", dueDate: new Date("2026-03-10T15:00:00.000Z") },
        { id: "task-3", title: "Task 3", status: "BLOCKED", priority: "URGENT", dueDate: new Date("2026-03-15T15:00:00.000Z") },
      ],
    });

    expect(stats.assessmentCounts).toEqual({
      active: 1,
      placeholder: 0,
      delivered: 1,
      cancelled: 0,
      total: 2,
    });
    expect(stats.billableHours).toEqual({ current: 24, target: 1600 });
    expect(stats.efrsByQuarter["Q1-2026"]).toBe(2);
    expect(stats.multiPersonByQuarter["Q1-2026"]).toBe(1);
    expect(stats.taskCounts).toEqual({
      todo: 1,
      inProgress: 0,
      blocked: 1,
      done: 1,
      dueToday: 1,
      overdue: 1,
    });
  });

  it("groups tasks into focus buckets", () => {
    const groups = getTaskFocusGroups([
      { id: "task-1", title: "Overdue", status: "TODO", priority: "HIGH", dueDate: new Date("2026-03-15T10:00:00.000Z") },
      { id: "task-2", title: "Today", status: "TODO", priority: "MEDIUM", dueDate: new Date("2026-03-17T14:00:00.000Z") },
      { id: "task-3", title: "This week", status: "IN_PROGRESS", priority: "LOW", dueDate: new Date("2026-03-20T14:00:00.000Z") },
      { id: "task-4", title: "Backlog", status: "TODO", priority: "LOW", dueDate: null },
      { id: "task-5", title: "Done", status: "DONE", priority: "LOW", dueDate: null, completedAt: new Date("2026-03-16T14:00:00.000Z") },
    ], new Date("2026-03-17T10:00:00.000Z"));

    expect(groups.overdue.map((task) => task.id)).toEqual(["task-1"]);
    expect(groups.today.map((task) => task.id)).toEqual(["task-2"]);
    expect(groups.thisWeek.map((task) => task.id)).toEqual(["task-3"]);
    expect(groups.backlog.map((task) => task.id)).toEqual(["task-4"]);
    expect(groups.recentlyDone.map((task) => task.id)).toEqual(["task-5"]);
  });
});
