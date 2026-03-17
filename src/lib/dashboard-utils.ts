import type { WorkCycle } from "@prisma/client";

type ProjectLike = {
  id: string;
  status: string;
  billable: boolean;
  effortTimeHours: number;
  isMultiPerson: boolean;
  isLeadConsultant: boolean;
  timelineStart: Date | string | null;
  timelineEnd: Date | string | null;
};

type EfrLike = {
  id: string;
  quarter: string;
};

type TaskLike = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  archivedAt?: Date | string | null;
  completedAt?: Date | string | null;
};

function getYearQuarters(year: number) {
  return [`Q1-${year}`, `Q2-${year}`, `Q3-${year}`, `Q4-${year}`];
}

function getCurrentQuarter(now = new Date()) {
  const month = now.getMonth();
  const year = now.getFullYear();
  const q = Math.floor(month / 3) + 1;

  return `Q${q}-${year}`;
}

export function buildDashboardStats({
  cycle,
  projects,
  efrs,
  tasks,
  now = new Date(),
}: {
  cycle: Pick<WorkCycle, "id" | "name" | "year" | "focusText" | "billableTarget" | "efrTarget" | "multiPersonTarget">;
  projects: ProjectLike[];
  efrs: EfrLike[];
  tasks: TaskLike[];
  now?: Date;
}) {
  const yearQuarters = getYearQuarters(cycle.year);
  const currentQuarter = getCurrentQuarter(now);

  const assessmentCounts = {
    active: projects.filter((project) => project.status === "Active").length,
    placeholder: projects.filter((project) => project.status === "Placeholder").length,
    delivered: projects.filter((project) => project.status === "Delivered").length,
    cancelled: projects.filter((project) => project.status === "Cancelled").length,
    total: projects.length,
  };

  const totalBillableHours = projects
    .filter((project) => project.billable)
    .reduce((sum, project) => sum + project.effortTimeHours, 0);

  const efrsByQuarter = Object.fromEntries(
    yearQuarters.map((quarter) => [
      quarter,
      efrs.filter((efr) => efr.quarter === quarter).length,
    ])
  ) as Record<string, number>;

  const multiPersonByQuarter: Record<string, number> = {};
  for (const quarter of yearQuarters) {
    const quarterNumber = parseInt(quarter.charAt(1), 10);
    const quarterStart = new Date(cycle.year, (quarterNumber - 1) * 3, 1);
    const quarterEnd = new Date(cycle.year, quarterNumber * 3, 0, 23, 59, 59);

    multiPersonByQuarter[quarter] = projects.filter((project) => {
      if (!project.isMultiPerson || !project.isLeadConsultant) return false;
      if (project.status === "Cancelled") return false;

      const start = project.timelineStart ? new Date(project.timelineStart) : null;
      const end = project.timelineEnd ? new Date(project.timelineEnd) : null;

      if (start && start > quarterEnd) return false;
      if (end && end < quarterStart) return false;

      return true;
    }).length;
  }

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

  const taskCounts = {
    todo: tasks.filter((task) => task.status === "TODO").length,
    inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
    blocked: tasks.filter((task) => task.status === "BLOCKED").length,
    done: tasks.filter((task) => task.status === "DONE").length,
    dueToday: tasks.filter((task) => {
      if (!task.dueDate || task.status === "DONE") return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfToday && dueDate < startOfTomorrow;
    }).length,
    overdue: tasks.filter((task) => {
      if (!task.dueDate || task.status === "DONE") return false;
      return new Date(task.dueDate) < startOfToday;
    }).length,
  };

  return {
    cycle,
    assessmentCounts,
    billableHours: {
      current: totalBillableHours,
      target: cycle.billableTarget,
    },
    efrsByQuarter,
    efrTarget: cycle.efrTarget,
    multiPersonByQuarter,
    multiPersonTarget: cycle.multiPersonTarget,
    currentQuarter,
    yearQuarters,
    taskCounts,
  };
}

export function getTaskFocusGroups(tasks: TaskLike[], now = new Date()) {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

  const activeTasks = tasks.filter((task) => !task.archivedAt && task.status !== "DONE");

  return {
    overdue: activeTasks.filter((task) => task.dueDate && new Date(task.dueDate) < startOfToday),
    today: activeTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfToday && dueDate < startOfTomorrow;
    }),
    thisWeek: activeTasks.filter((task) => {
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate >= startOfTomorrow && dueDate <= endOfWeek;
    }),
    backlog: activeTasks.filter((task) => !task.dueDate),
    recentlyDone: tasks.filter((task) => {
      if (!task.completedAt) return false;
      const completedAt = new Date(task.completedAt);
      const lastSevenDays = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return completedAt >= lastSevenDays;
    }),
  };
}
