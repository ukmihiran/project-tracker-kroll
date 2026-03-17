"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Briefcase,
  Calendar as CalendarIcon,
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Layers3,
} from "lucide-react"

import {
  assignWeekEventLanes,
  buildCalendarEvents,
  buildCalendarGrid,
  chunkIntoWeeks,
  eventOccursOnDate,
  getEventsForDate,
  getMonthEventSummary,
  isSameDay,
  isToday,
  type CalendarEvent,
} from "@/lib/calendar-utils"

interface CalendarViewProps {
  projects: any[]
  efrs: any[]
  tasks: any[]
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const VISIBLE_LANES = 4

function getEventLabel(event: CalendarEvent) {
  if (event.type === "assessment") return "Assessment"
  if (event.type === "task-due") return "Task due"
  return "EFR submission"
}

function formatEventRange(event: CalendarEvent) {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

  if (isSameDay(event.startDate, event.endDate)) {
    return formatter.format(event.startDate)
  }

  return `${formatter.format(event.startDate)} - ${formatter.format(event.endDate)}`
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any
  label: string
  value: number
  tone: string
}) {
  return (
    <Card className="rounded-2xl border border-border/40 shadow-sm">
      <div className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </Card>
  )
}

function LegendItem({ colorClass, label }: { colorClass: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
      <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
      <span>{label}</span>
    </div>
  )
}

export default function CalendarView({ projects, efrs, tasks }: CalendarViewProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date>(today)

  const events = useMemo(() => buildCalendarEvents({ projects, efrs, tasks }), [projects, efrs, tasks])
  const calendarDays = useMemo(() => buildCalendarGrid(currentYear, currentMonth), [currentYear, currentMonth])
  const weeks = useMemo(() => chunkIntoWeeks(calendarDays), [calendarDays])
  const weekLayouts = useMemo(
    () => weeks.map((week) => assignWeekEventLanes(events, week)),
    [events, weeks]
  )
  const selectedEvents = useMemo(() => getEventsForDate(events, selectedDate), [events, selectedDate])
  const monthSummary = useMemo(() => getMonthEventSummary(events, currentYear, currentMonth), [events, currentYear, currentMonth])
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const upcomingEvents = useMemo(() => {
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    return events
      .filter((event) => event.endDate >= startOfToday)
      .sort((left, right) => left.startDate.getTime() - right.startDate.getTime())
      .slice(0, 6)
  }, [events, today])

  const navigateMonth = (direction: number) => {
    let nextMonth = currentMonth + direction
    let nextYear = currentYear

    if (nextMonth < 0) {
      nextMonth = 11
      nextYear -= 1
    }
    if (nextMonth > 11) {
      nextMonth = 0
      nextYear += 1
    }

    setCurrentMonth(nextMonth)
    setCurrentYear(nextYear)
    setSelectedDate(new Date(nextYear, nextMonth, 1))
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(today)
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-semibold">Calendar</h3>
        <p className="text-sm text-muted-foreground">
          Track assessment spans, deadlines, and EFR activity across the month without losing sight of multi-day work.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Briefcase} label="Assessments in view" value={monthSummary.assessments} tone="gradient-emerald" />
        <SummaryCard icon={Layers3} label="Busy days" value={monthSummary.busyDays} tone="gradient-blue" />
        <SummaryCard icon={FileText} label="EFR submissions" value={monthSummary.efrs} tone="gradient-indigo" />
        <SummaryCard icon={CheckSquare2} label="Task due dates" value={monthSummary.taskDue} tone="gradient-amber" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_360px]">
        <Card className="overflow-hidden rounded-3xl border border-border/50 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-border/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full border-0 bg-primary/10 text-primary">
                  Calendar board
                </Badge>
                <Badge variant="secondary" className="rounded-full border-0 bg-muted/80 text-muted-foreground">
                  Multi-day assessment spans
                </Badge>
              </div>
              <h4 className="mt-3 text-lg font-semibold">{MONTH_NAMES[currentMonth]} {currentYear}</h4>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 rounded-xl border-border/50" onClick={goToToday}>
                Today
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigateMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl" onClick={() => navigateMonth(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-border/30 bg-muted/10">
            {DAY_NAMES.map((day) => (
              <div key={day} className="px-3 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div>
            {weeks.map((week, weekIndex) => {
              const placements = weekLayouts[weekIndex] ?? []

              return (
                <div key={`${currentYear}-${currentMonth}-week-${weekIndex}`} className="grid grid-cols-7 border-b border-border/20 last:border-b-0">
                  {week.map((day) => {
                    const dayEvents = getEventsForDate(events, day.date)
                    const visiblePlacements = placements.filter((placement) => placement.lane < VISIBLE_LANES && eventOccursOnDate(placement, day.date))
                    const overflowCount = Math.max(dayEvents.length - visiblePlacements.length, 0)
                    const isSelected = isSameDay(day.date, selectedDate)
                    const isTodayDate = isToday(day.date, today)

                    return (
                      <button
                        key={day.date.toISOString()}
                        onClick={() => setSelectedDate(day.date)}
                        className={`group min-h-37 flex flex-col border-r border-border/20 text-left transition-colors last:border-r-0 hover:bg-muted/20 ${day.isCurrentMonth ? "bg-background" : "bg-muted/10 text-muted-foreground/60"} ${isSelected ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-2 p-2.5 pb-1">
                          <span
                            className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${isTodayDate ? "bg-primary text-primary-foreground" : isSelected ? "bg-primary/10 text-primary" : ""}`}
                          >
                            {day.day}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">{dayEvents.length}</span>
                          )}
                        </div>

                        <div className="mt-1 space-y-0.5 w-full flex-1">
                          {Array.from({ length: VISIBLE_LANES }).map((_, laneIndex) => {
                            const laneEvent = placements.find((placement) => placement.lane === laneIndex && eventOccursOnDate(placement, day.date))

                            if (!laneEvent) {
                              return <div key={`${day.date.toISOString()}-${laneIndex}`} className="h-5.5" />
                            }

                            const isRangeStart = isSameDay(day.date, laneEvent.visibleStart)
                            const isRangeEnd = isSameDay(day.date, laneEvent.visibleEnd)
                            const isSingleDayEvent = isSameDay(laneEvent.startDate, laneEvent.endDate)
                            const showTitle = isRangeStart || isSingleDayEvent || day.date.getDay() === 0 // Show title on Sunday too for long events

                            // Full width bar, no gap
                            return (
                              <div
                                key={laneEvent.id}
                                title={`${laneEvent.title} • ${formatEventRange(laneEvent)}`}
                                className={`flex h-5.5 items-center overflow-hidden text-[10.5px] font-medium text-white ${laneEvent.colorClass} ${isSingleDayEvent || (isRangeStart && isRangeEnd) ? "rounded-md mx-1.5 px-2" : `${isRangeStart ? "rounded-l-md ml-1.5 pl-2" : "pl-3"} ${isRangeEnd ? "rounded-r-md mr-1.5 pr-2" : "pr-0"}`}`}
                              >
                                <span className="truncate">{showTitle ? laneEvent.title : "\u00A0"}</span>
                              </div>
                            )
                          })}

                          {overflowCount > 0 && (
                            <div className="px-2.5 pt-1 text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                              {overflowCount} more...
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-border/50 shadow-sm">
          <div className="border-b border-border/50 px-5 py-4">
            <h4 className="text-sm font-semibold">
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h4>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {selectedEvents.length} event{selectedEvents.length === 1 ? "" : "s"}
            </p>
          </div>

          <div className="p-4">
            {selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No events on this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-border/40 bg-muted/20 p-4">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${event.colorClass}`} />
                      <Badge variant="secondary" className={`rounded-full border-0 text-[10px] ${event.badgeClass}`}>
                        {getEventLabel(event)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium">{event.title}</p>
                    {event.detail && (
                      <p className="mt-1 text-xs text-muted-foreground">{event.detail}</p>
                    )}
                    <p className="mt-2 text-xs text-muted-foreground">{formatEventRange(event)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-border/50 px-5 py-4">
            <h5 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Upcoming events
            </h5>
            <div className="space-y-2">
              {upcomingEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No upcoming events</p>
              ) : (
                upcomingEvents.map((event) => (
                  <button
                    key={event.id}
                    className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-muted/20"
                    onClick={() => {
                      setCurrentYear(event.startDate.getFullYear())
                      setCurrentMonth(event.startDate.getMonth())
                      setSelectedDate(event.startDate)
                    }}
                  >
                    <span className={`mt-1 h-2.5 w-2.5 rounded-full ${event.colorClass}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{formatEventRange(event)}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <LegendItem colorClass="bg-emerald-500" label="Assessment span" />
        <LegendItem colorClass="bg-indigo-500" label="EFR submission" />
        <LegendItem colorClass="bg-amber-500" label="Task due" />
      </div>
    </div>
  )
}
