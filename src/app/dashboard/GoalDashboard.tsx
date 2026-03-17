"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, TrendingUp, Users, CheckCircle2, Clock, XCircle, BarChart3, Activity, CheckSquare2, ShieldAlert } from "lucide-react"

interface DashboardStats {
  cycle: {
    name: string
    year: number
    focusText?: string | null
  }
  assessmentCounts: {
    active: number
    placeholder: number
    delivered: number
    cancelled: number
    total: number
  }
  billableHours: { current: number; target: number }
  efrsByQuarter: Record<string, number>
  efrTarget: number
  multiPersonByQuarter: Record<string, number>
  multiPersonTarget: number
  currentQuarter: string
  yearQuarters: string[]
  taskCounts: {
    todo: number
    inProgress: number
    blocked: number
    done: number
    dueToday: number
    overdue: number
  }
}

function ProgressBar({ value, max, color, className = "" }: { value: number; max: number; color: string; className?: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <div className={`w-full bg-muted rounded-full h-2 ${className}`}>
      <div
        className={`h-2 rounded-full transition-all duration-500 ease-out ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function StatCard({ label, value, icon: Icon, gradient }: { label: string; value: number | string; icon: any; gradient: string }) {
  return (
    <Card className="relative overflow-hidden border-0 shadow-md hover:shadow-lg transition-all duration-300 group">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GoalDashboard({
  stats,
  efrs,
}: {
  stats: DashboardStats
  efrs: any[]
}) {
  const billablePct = Math.round((stats.billableHours.current / stats.billableHours.target) * 100)

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Assessment Overview</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          {stats.cycle.name} stays centered on active delivery, completed outcomes, and the goals you are tracking through {stats.cycle.year}.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <StatCard label="Active" value={stats.assessmentCounts.active} icon={Activity} gradient="gradient-emerald" />
          <StatCard label="Placeholder" value={stats.assessmentCounts.placeholder} icon={Clock} gradient="gradient-amber" />
          <StatCard label="Delivered" value={stats.assessmentCounts.delivered} icon={CheckCircle2} gradient="gradient-blue" />
          <StatCard label="Cancelled" value={stats.assessmentCounts.cancelled} icon={XCircle} gradient="gradient-rose" />
          <StatCard label="Total" value={stats.assessmentCounts.total} icon={BarChart3} gradient="gradient-purple" />
        </div>
      </div>

      {/* Career Goals */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Career Goals Progress</h3>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Goal 1: Billable Hours */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-blue">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                Billable Hours
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <span className="text-3xl font-bold">{stats.billableHours.current}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ {stats.billableHours.target} hrs</span>
                </div>
                <Badge variant="secondary" className="font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-0">
                  {billablePct}%
                </Badge>
              </div>
              <ProgressBar value={stats.billableHours.current} max={stats.billableHours.target} color="gradient-blue" />
              <p className="text-xs text-muted-foreground">Annual target progress</p>
            </CardContent>
          </Card>

          {/* Goal 2: EFRs per Quarter */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-purple">
                  <FileText className="h-4 w-4 text-white" />
                </div>
                EFR Submissions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.yearQuarters.map((q) => {
                const count = stats.efrsByQuarter[q] || 0
                const isCurrent = q === stats.currentQuarter
                return (
                  <div key={q} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className={`flex items-center gap-2 ${isCurrent ? "font-semibold" : "text-muted-foreground"}`}>
                        {q}
                        {isCurrent && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 gradient-indigo text-white border-0">
                            Now
                          </Badge>
                        )}
                      </span>
                      <span className="font-medium">{count} / {stats.efrTarget}</span>
                    </div>
                    <ProgressBar value={count} max={stats.efrTarget} color="gradient-purple" />
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Goal 3: Multi-Person Project Leadership */}
          <Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-xl gradient-emerald">
                  <Users className="h-4 w-4 text-white" />
                </div>
                Multi-Person Lead
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.yearQuarters.map((q) => {
                const count = stats.multiPersonByQuarter[q] || 0
                const isCurrent = q === stats.currentQuarter
                return (
                  <div key={q} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className={`flex items-center gap-2 ${isCurrent ? "font-semibold" : "text-muted-foreground"}`}>
                        {q}
                        {isCurrent && (
                          <Badge className="text-[10px] px-1.5 py-0 h-4 gradient-indigo text-white border-0">
                            Now
                          </Badge>
                        )}
                      </span>
                      <span className="font-medium">{count} / {stats.multiPersonTarget}</span>
                    </div>
                    <ProgressBar value={count} max={stats.multiPersonTarget} color="gradient-emerald" />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-2 mb-4">
          <CheckSquare2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Task Momentum</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="To do" value={stats.taskCounts.todo} icon={CheckSquare2} gradient="gradient-blue" />
          <StatCard label="In Progress" value={stats.taskCounts.inProgress} icon={Activity} gradient="gradient-indigo" />
          <StatCard label="Blocked" value={stats.taskCounts.blocked} icon={ShieldAlert} gradient="gradient-rose" />
          <StatCard label="Done" value={stats.taskCounts.done} icon={CheckCircle2} gradient="gradient-emerald" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Due Today</p>
                <p className="text-3xl font-bold mt-1">{stats.taskCounts.dueToday}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-amber shadow-lg">
                <Clock className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-3xl font-bold mt-1">{stats.taskCounts.overdue}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-rose shadow-lg">
                <ShieldAlert className="h-5 w-5 text-white" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent EFR Submissions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Recent EFR Submissions</h3>
          </div>
          <span className="text-xs text-muted-foreground">{efrs.length} total</span>
        </div>
        <Card className="border-0 shadow-md overflow-hidden">
          {efrs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No EFR submissions yet</p>
              <p className="text-xs text-muted-foreground/60">Go to EFR Submissions page to add one</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {efrs.slice(0, 5).map((efr: any) => (
                <div key={efr.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{efr.title}</span>
                      <Badge variant="secondary" className="rounded-md text-[10px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-0 shrink-0">
                        {efr.quarter}
                      </Badge>
                    </div>
                    {efr.engagement && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{efr.engagement}</p>
                    )}
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap ml-4">
                    {new Date(efr.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              ))}
              {efrs.length > 5 && (
                <div className="text-center py-2">
                  <span className="text-xs text-muted-foreground">+{efrs.length - 5} more &middot; View all on EFR Submissions page</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
