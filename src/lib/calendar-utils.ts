export type CalendarEventType = "assessment" | "efr" | "task-due"

export interface CalendarEvent {
  id: string
  title: string
  type: CalendarEventType
  startDate: Date
  endDate: Date
  detail?: string
  colorClass: string
  badgeClass: string
}

export interface CalendarDayCell {
  day: number
  isCurrentMonth: boolean
  date: Date
}

export interface WeekEventPlacement extends CalendarEvent {
  lane: number
  visibleStart: Date
  visibleEnd: Date
}

function normalizeToStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function normalizeToEndOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
}

export function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear()
    && d1.getMonth() === d2.getMonth()
    && d1.getDate() === d2.getDate()
}

export function isToday(date: Date, today = new Date()) {
  return isSameDay(date, today)
}

export function eventOccursOnDate(event: CalendarEvent | WeekEventPlacement, date: Date) {
  const day = normalizeToStartOfDay(date)
  return day >= normalizeToStartOfDay(event.startDate) && day <= normalizeToStartOfDay(event.endDate)
}

export function eventOverlapsRange(event: CalendarEvent, rangeStart: Date, rangeEnd: Date) {
  const start = normalizeToStartOfDay(event.startDate)
  const end = normalizeToEndOfDay(event.endDate)
  return end >= normalizeToStartOfDay(rangeStart) && start <= normalizeToEndOfDay(rangeEnd)
}

export function buildCalendarGrid(year: number, month: number) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()
  const prevMonthDays = new Date(year, month, 0).getDate()
  const calendarDays: CalendarDayCell[] = []

  for (let i = firstDay - 1; i >= 0; i -= 1) {
    const day = prevMonthDays - i
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month - 1, day),
    })
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: new Date(year, month, day),
    })
  }

  const remaining = 42 - calendarDays.length
  for (let day = 1; day <= remaining; day += 1) {
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(year, month + 1, day),
    })
  }

  return calendarDays
}

export function chunkIntoWeeks(days: CalendarDayCell[]) {
  const weeks: CalendarDayCell[][] = []

  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7))
  }

  return weeks
}

export function buildCalendarEvents({
  projects,
  efrs,
  tasks,
}: {
  projects: any[]
  efrs: any[]
  tasks: any[]
}) {
  const events: CalendarEvent[] = []

  projects.forEach((project) => {
    const start = project.timelineStart ? new Date(project.timelineStart) : null
    const end = project.timelineEnd ? new Date(project.timelineEnd) : null
    const startDate = start ?? end
    const endDate = end ?? start

    if (!startDate || !endDate) return

    const normalizedStart = startDate <= endDate ? startDate : endDate
    const normalizedEnd = endDate >= startDate ? endDate : startDate
    const totalDays = Math.max(1, Math.round((normalizeToStartOfDay(normalizedEnd).getTime() - normalizeToStartOfDay(normalizedStart).getTime()) / 86400000) + 1)

    events.push({
      id: `assessment-${project.id}`,
      title: project.engagementName,
      type: "assessment",
      startDate: normalizedStart,
      endDate: normalizedEnd,
      detail: `${project.clientName} • ${totalDays} day assessment`,
      colorClass: "bg-emerald-500",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    })
  })

  efrs.forEach((efr) => {
    if (!efr.submittedAt) return

    const submittedAt = new Date(efr.submittedAt)
    events.push({
      id: `efr-${efr.id}`,
      title: efr.title,
      type: "efr",
      startDate: submittedAt,
      endDate: submittedAt,
      detail: efr.engagement ? `EFR • ${efr.engagement}` : "EFR submission",
      colorClass: "bg-indigo-500",
      badgeClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-300",
    })
  })

  tasks.forEach((task) => {
    if (!task.dueDate || task.status === "DONE" || task.archivedAt) return

    const dueDate = new Date(task.dueDate)
    events.push({
      id: `task-${task.id}`,
      title: task.title,
      type: "task-due",
      startDate: dueDate,
      endDate: dueDate,
      detail: task.project?.engagementName ? `Task for ${task.project.engagementName}` : "Task due date",
      colorClass: "bg-amber-500",
      badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    })
  })

  return events.sort((left, right) => {
    const leftDuration = normalizeToStartOfDay(left.endDate).getTime() - normalizeToStartOfDay(left.startDate).getTime()
    const rightDuration = normalizeToStartOfDay(right.endDate).getTime() - normalizeToStartOfDay(right.startDate).getTime()

    if (leftDuration !== rightDuration) {
      return rightDuration - leftDuration
    }

    return left.startDate.getTime() - right.startDate.getTime()
  })
}

export function getEventsForDate(events: CalendarEvent[], date: Date) {
  return events.filter((event) => eventOccursOnDate(event, date))
}

export function assignWeekEventLanes(events: CalendarEvent[], week: CalendarDayCell[]) {
  if (week.length === 0) return []

  const weekStart = week[0].date
  const weekEnd = week[week.length - 1].date
  const laneEndDates: Date[] = []

  return events
    .filter((event) => eventOverlapsRange(event, weekStart, weekEnd))
    .sort((left, right) => {
      const leftDuration = normalizeToStartOfDay(left.endDate).getTime() - normalizeToStartOfDay(left.startDate).getTime()
      const rightDuration = normalizeToStartOfDay(right.endDate).getTime() - normalizeToStartOfDay(right.startDate).getTime()

      if (leftDuration !== rightDuration) {
        return rightDuration - leftDuration
      }

      return left.startDate.getTime() - right.startDate.getTime()
    })
    .map((event) => {
      const visibleStart = event.startDate > weekStart ? normalizeToStartOfDay(event.startDate) : normalizeToStartOfDay(weekStart)
      const visibleEnd = event.endDate < weekEnd ? normalizeToEndOfDay(event.endDate) : normalizeToEndOfDay(weekEnd)

      let lane = 0
      while (laneEndDates[lane] && laneEndDates[lane] >= visibleStart) {
        lane += 1
      }
      laneEndDates[lane] = visibleEnd

      return {
        ...event,
        lane,
        visibleStart,
        visibleEnd,
      }
    })
}

export function getMonthEventSummary(events: CalendarEvent[], year: number, month: number) {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const eventsInMonth = events.filter((event) => eventOverlapsRange(event, monthStart, monthEnd))

  return {
    assessments: eventsInMonth.filter((event) => event.type === "assessment").length,
    efrs: eventsInMonth.filter((event) => event.type === "efr").length,
    taskDue: eventsInMonth.filter((event) => event.type === "task-due").length,
    busyDays: new Set(
      eventsInMonth.flatMap((event) => {
        const days: string[] = []
        const current = normalizeToStartOfDay(event.startDate)
        const last = normalizeToStartOfDay(event.endDate)

        while (current <= last) {
          if (current >= normalizeToStartOfDay(monthStart) && current <= normalizeToStartOfDay(monthEnd)) {
            days.push(current.toISOString())
          }
          current.setDate(current.getDate() + 1)
        }

        return days
      })
    ).size,
  }
}
