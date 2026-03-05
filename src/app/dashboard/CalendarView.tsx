"use client"

import { useState, useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Briefcase, FileText, Clock,
} from "lucide-react"

interface CalendarViewProps {
  projects: any[]
  efrs: any[]
}

interface CalendarEvent {
  id: string
  title: string
  date: Date
  type: "project-start" | "project-end" | "efr"
  color: string
  detail?: string
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function isSameDay(d1: Date, d2: Date) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function isToday(date: Date) {
  return isSameDay(date, new Date())
}

export default function CalendarView({ projects, efrs }: CalendarViewProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const events = useMemo(() => {
    const evts: CalendarEvent[] = []

    projects.forEach((p: any) => {
      if (p.timelineStart) {
        evts.push({
          id: `${p.id}-start`,
          title: p.engagementName,
          date: new Date(p.timelineStart),
          type: "project-start",
          color: "bg-emerald-500",
          detail: `${p.clientName} — Start`,
        })
      }
      if (p.timelineEnd) {
        evts.push({
          id: `${p.id}-end`,
          title: p.engagementName,
          date: new Date(p.timelineEnd),
          type: "project-end",
          color: "bg-rose-500",
          detail: `${p.clientName} — End`,
        })
      }
    })

    efrs.forEach((e: any) => {
      if (e.submittedAt) {
        evts.push({
          id: `efr-${e.id}`,
          title: e.title,
          date: new Date(e.submittedAt),
          type: "efr",
          color: "bg-indigo-500",
          detail: `EFR: ${e.engagement || ""}`,
        })
      }
    })

    return evts
  }, [projects, efrs])

  const getEventsForDate = (date: Date) => {
    return events.filter((e) => isSameDay(e.date, date))
  }

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
  const prevMonthDays = getDaysInMonth(currentYear, currentMonth - 1)

  const navigateMonth = (dir: number) => {
    let m = currentMonth + dir
    let y = currentYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setCurrentMonth(m)
    setCurrentYear(y)
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
    setSelectedDate(null)
  }

  // Build calendar grid
  const calendarDays: { day: number; isCurrentMonth: boolean; date: Date }[] = []

  // Previous month padding
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth - 1, day),
    })
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({
      day: d,
      isCurrentMonth: true,
      date: new Date(currentYear, currentMonth, d),
    })
  }

  // Next month padding
  const remaining = 42 - calendarDays.length
  for (let d = 1; d <= remaining; d++) {
    calendarDays.push({
      day: d,
      isCurrentMonth: false,
      date: new Date(currentYear, currentMonth + 1, d),
    })
  }

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : []

  // Summary counts for the month
  const monthEvents = useMemo(() => {
    return events.filter(
      (e) => e.date.getFullYear() === currentYear && e.date.getMonth() === currentMonth
    )
  }, [events, currentYear, currentMonth])

  const projectStarts = monthEvents.filter((e) => e.type === "project-start").length
  const projectEnds = monthEvents.filter((e) => e.type === "project-end").length
  const efrCount = monthEvents.filter((e) => e.type === "efr").length

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Calendar</h3>
          <p className="text-sm text-muted-foreground">
            Project timelines and EFR submissions overview
          </p>
        </div>
      </div>

      {/* Month Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 border-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-emerald">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{projectStarts}</p>
              <p className="text-xs text-muted-foreground">Project Starts</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-rose">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{projectEnds}</p>
              <p className="text-xs text-muted-foreground">Project Ends</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 border-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl gradient-indigo">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{efrCount}</p>
              <p className="text-xs text-muted-foreground">EFR Submissions</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <Card className="lg:col-span-2 border-0 shadow-md overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-border/50">
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-primary" />
              <h4 className="text-lg font-semibold">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                onClick={goToToday}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => navigateMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => navigateMonth(1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-border/30">
            {DAY_NAMES.map((day) => (
              <div
                key={day}
                className="text-center py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {calendarDays.map((cd, idx) => {
              const dayEvents = getEventsForDate(cd.date)
              const isSelected = selectedDate && isSameDay(cd.date, selectedDate)
              const isTodayDate = isToday(cd.date)

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(cd.date)}
                  className={`relative min-h-[80px] p-1.5 border-b border-r border-border/20 text-left transition-colors hover:bg-muted/30 ${
                    !cd.isCurrentMonth ? "bg-muted/10" : ""
                  } ${isSelected ? "bg-primary/5 ring-1 ring-primary/30" : ""}`}
                >
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full ${
                      isTodayDate
                        ? "bg-primary text-white font-bold"
                        : cd.isCurrentMonth
                        ? "text-foreground font-medium"
                        : "text-muted-foreground/40"
                    }`}
                  >
                    {cd.day}
                  </span>

                  {/* Event dots */}
                  <div className="mt-0.5 space-y-0.5">
                    {dayEvents.slice(0, 3).map((evt) => (
                      <div
                        key={evt.id}
                        className={`text-[9px] px-1 py-0.5 rounded truncate text-white font-medium ${evt.color}`}
                        title={evt.title}
                      >
                        {evt.title}
                      </div>
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[9px] text-muted-foreground pl-1">
                        +{dayEvents.length - 3} more
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </Card>

        {/* Sidebar - Event Details */}
        <Card className="border-0 shadow-md overflow-hidden">
          <div className="px-5 py-4 border-b border-border/50">
            <h4 className="text-sm font-semibold">
              {selectedDate
                ? selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Select a date"}
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectedDate
                ? `${selectedEvents.length} event${selectedEvents.length !== 1 ? "s" : ""}`
                : "Click on a date to see details"}
            </p>
          </div>

          <div className="p-4">
            {!selectedDate ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No date selected</p>
                <p className="text-xs text-muted-foreground/60">
                  Click on a calendar date to view events
                </p>
              </div>
            ) : selectedEvents.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">No events on this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl border border-border/30 bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${evt.color}`} />
                      <Badge
                        variant="secondary"
                        className={`text-[10px] border-0 ${
                          evt.type === "project-start"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : evt.type === "project-end"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            : "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        }`}
                      >
                        {evt.type === "project-start"
                          ? "Project Start"
                          : evt.type === "project-end"
                          ? "Project End"
                          : "EFR Submission"}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium">{evt.title}</p>
                    {evt.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {evt.detail}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Events */}
          <div className="px-5 py-4 border-t border-border/50">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Upcoming Events
            </h5>
            <div className="space-y-2">
              {events
                .filter((e) => e.date >= today)
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 5)
                .map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/20 rounded-lg px-2 py-1.5 transition-colors"
                    onClick={() => {
                      setCurrentYear(evt.date.getFullYear())
                      setCurrentMonth(evt.date.getMonth())
                      setSelectedDate(evt.date)
                    }}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${evt.color} shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{evt.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {evt.date.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              {events.filter((e) => e.date >= today).length === 0 && (
                <p className="text-xs text-muted-foreground">No upcoming events</p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span className="text-xs text-muted-foreground">Project Start</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-rose-500" />
          <span className="text-xs text-muted-foreground">Project End</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          <span className="text-xs text-muted-foreground">EFR Submission</span>
        </div>
      </div>
    </div>
  )
}
