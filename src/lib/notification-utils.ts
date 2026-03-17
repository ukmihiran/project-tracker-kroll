type NotificationRecord = {
  title: string;
  message: string;
  type: string;
  link: string | null;
  createdAt: Date | string;
};

type ProjectLike = {
  id: string;
  engagementName: string;
  clientName: string;
  timelineEnd: Date | string | null;
};

type TaskLike = {
  id: string;
  title: string;
  dueDate: Date | string | null;
  project?: {
    engagementName: string;
  } | null;
};

export type NotificationDraft = {
  title: string;
  message: string;
  type: string;
  link: string;
};

type NotificationPlanInput = {
  now: Date;
  endingSoon: ProjectLike[];
  endingWeek: ProjectLike[];
  overdueProjects: ProjectLike[];
  dueTasks: TaskLike[];
  overdueTasks: TaskLike[];
  recentNotifications: NotificationRecord[];
  hasQuarterlyEfr: boolean;
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function wasCreatedAfter(notification: NotificationRecord, cutoff: Date) {
  return new Date(notification.createdAt) >= cutoff;
}

function includesEngagement(notification: NotificationRecord, engagementName: string) {
  return notification.message.includes(`"${engagementName}"`);
}

function includesTask(notification: NotificationRecord, taskTitle: string) {
  return notification.message.includes(`"${taskTitle}"`);
}

function getDaysBetween(laterDate: Date, earlierDate: Date) {
  return Math.ceil((laterDate.getTime() - earlierDate.getTime()) / DAY_IN_MS);
}

export function getQuarterLabel(now: Date) {
  const currentMonth = now.getMonth() + 1;
  const currentQuarter = Math.ceil(currentMonth / 3);
  const currentYear = now.getFullYear();

  return {
    quarterLabel: `Q${currentQuarter}-${currentYear}`,
    monthInQuarter: ((currentMonth - 1) % 3) + 1,
  };
}

export function planNotifications({
  now,
  endingSoon,
  endingWeek,
  overdueProjects,
  dueTasks,
  overdueTasks,
  recentNotifications,
  hasQuarterlyEfr,
}: NotificationPlanInput): NotificationDraft[] {
  const drafts: NotificationDraft[] = [];

  for (const project of endingSoon) {
    if (!project.timelineEnd) continue;

    const existing = recentNotifications.some(
      (notification) =>
        notification.type === "project_ending" &&
        includesEngagement(notification, project.engagementName) &&
        wasCreatedAfter(notification, new Date(now.getTime() - DAY_IN_MS))
    );

    if (existing) continue;

    const timelineEnd = new Date(project.timelineEnd);
    const daysLeft = getDaysBetween(timelineEnd, now);
    drafts.push({
      title: "Project ending soon",
      message: `"${project.engagementName}" for ${project.clientName} ends in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      type: "project_ending",
      link: "assessments",
    });
  }

  for (const project of endingWeek) {
    if (!project.timelineEnd) continue;

    const existing = recentNotifications.some(
      (notification) =>
        notification.type === "assessment_due" &&
        notification.title.startsWith("Assessment due") &&
        includesEngagement(notification, project.engagementName) &&
        wasCreatedAfter(notification, new Date(now.getTime() - 3 * DAY_IN_MS))
    );

    if (existing) continue;

    const timelineEnd = new Date(project.timelineEnd);
    const daysLeft = getDaysBetween(timelineEnd, now);
    drafts.push({
      title: `Assessment due in ${daysLeft} days`,
      message: `"${project.engagementName}" for ${project.clientName} - prepare your assessment`,
      type: "assessment_due",
      link: "assessments",
    });
  }

  const { quarterLabel, monthInQuarter } = getQuarterLabel(now);
  if (!hasQuarterlyEfr && monthInQuarter >= 2) {
    const existing = recentNotifications.some(
      (notification) =>
        notification.type === "efr_reminder" &&
        notification.message.includes(quarterLabel) &&
        wasCreatedAfter(notification, new Date(now.getTime() - 7 * DAY_IN_MS))
    );

    if (!existing) {
      drafts.push({
        title: "EFR submission reminder",
        message: `No EFR submitted yet for ${quarterLabel}. Don't forget to submit your feedback!`,
        type: "efr_reminder",
        link: "efr",
      });
    }
  }

  for (const project of overdueProjects) {
    if (!project.timelineEnd) continue;

    const existing = recentNotifications.some(
      (notification) =>
        notification.type === "assessment_due" &&
        notification.title === "Project overdue" &&
        includesEngagement(notification, project.engagementName) &&
        wasCreatedAfter(notification, new Date(now.getTime() - 3 * DAY_IN_MS))
    );

    if (existing) continue;

    const timelineEnd = new Date(project.timelineEnd);
    const daysOverdue = getDaysBetween(now, timelineEnd);
    drafts.push({
      title: "Project overdue",
      message: `"${project.engagementName}" is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} past the deadline. Update status or timeline.`,
      type: "assessment_due",
      link: "assessments",
    });
  }

  for (const task of dueTasks) {
    if (!task.dueDate) continue;

    const existing = recentNotifications.some(
      (notification) =>
        notification.type === "task_due" &&
        includesTask(notification, task.title) &&
        wasCreatedAfter(notification, new Date(now.getTime() - DAY_IN_MS))
    );

    if (existing) continue;

    const dueDate = new Date(task.dueDate);
    const daysLeft = getDaysBetween(dueDate, now);
    drafts.push({
      title: daysLeft <= 0 ? "Task due today" : `Task due in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      message: `"${task.title}"${task.project?.engagementName ? ` on ${task.project.engagementName}` : ""} needs your attention.`,
      type: "task_due",
      link: "tasks",
    });
  }

  for (const task of overdueTasks) {
    if (!task.dueDate) continue;

    const existing = recentNotifications.some(
      (notification) =>
        notification.type === "task_overdue" &&
        includesTask(notification, task.title) &&
        wasCreatedAfter(notification, new Date(now.getTime() - DAY_IN_MS))
    );

    if (existing) continue;

    const dueDate = new Date(task.dueDate);
    const daysOverdue = getDaysBetween(now, dueDate);
    drafts.push({
      title: "Task overdue",
      message: `"${task.title}"${task.project?.engagementName ? ` on ${task.project.engagementName}` : ""} is ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} overdue.`,
      type: "task_overdue",
      link: "tasks",
    });
  }

  return drafts;
}
