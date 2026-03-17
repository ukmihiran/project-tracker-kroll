"use client"

import { useMemo, useState } from "react"
import { toast } from "react-toastify"
import {
  ArrowRight,
  CalendarRange,
  CheckSquare2,
  FileText,
  FolderKanban,
  Loader2,
  Settings2,
  Sparkles,
  Trash2,
} from "lucide-react"

import { useConfirm } from "@/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface WorkspaceSettingsPanelProps {
  workCycles: any[]
  selectedCycleId?: string
  projects: any[]
  efrs: any[]
  tasks: any[]
  onSelectCycle: (cycleId: string) => void
  onCreateWorkspace: () => void
  onEditWorkspace: (cycle: any) => void
  onPrepareNextYear: () => Promise<boolean>
  onDeleteWorkspace: (cycle: any) => Promise<boolean>
}

function formatCycleRange(cycle: any) {
  return `${new Date(cycle.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${new Date(cycle.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

function getStatusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase()
}

function getStatusTone(status: string) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
    case "CLOSED":
      return "bg-slate-500/10 text-slate-600 dark:text-slate-300"
    default:
      return "bg-amber-500/10 text-amber-600 dark:text-amber-300"
  }
}

export default function WorkspaceSettingsPanel({
  workCycles,
  selectedCycleId,
  projects,
  efrs,
  tasks,
  onSelectCycle,
  onCreateWorkspace,
  onEditWorkspace,
  onPrepareNextYear,
  onDeleteWorkspace,
}: WorkspaceSettingsPanelProps) {
  const confirm = useConfirm()
  const [preparing, setPreparing] = useState(false)
  const [deletingCycleId, setDeletingCycleId] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1

  const currentYearCycle = useMemo(
    () => workCycles.find((cycle) => cycle.year === currentYear) ?? null,
    [currentYear, workCycles]
  )
  const nextYearCycle = useMemo(
    () => workCycles.find((cycle) => cycle.year === nextYear) ?? null,
    [nextYear, workCycles]
  )

  const workspaceCards = useMemo(() => {
    return workCycles.map((cycle) => {
      const projectCount = projects.filter((project) => project.workCycleId === cycle.id).length
      const efrCount = efrs.filter((efr) => efr.workCycleId === cycle.id).length
      const taskCount = tasks.filter((task) => task.workCycleId === cycle.id).length
      const totalItems = projectCount + efrCount + taskCount
      const isCurrentCalendarWorkspace = cycle.year === currentYear
      const isSelected = cycle.id === selectedCycleId

      let deleteReason = ""
      if (workCycles.length <= 1) {
        deleteReason = "Keep at least one workspace in the app."
      } else if (isCurrentCalendarWorkspace) {
        deleteReason = "The current calendar year stays pinned as your active workspace."
      } else if (totalItems > 0) {
        deleteReason = "Delete becomes available after this workspace is fully empty."
      }

      return {
        ...cycle,
        isSelected,
        projectCount,
        efrCount,
        taskCount,
        totalItems,
        canDelete: deleteReason.length === 0,
        deleteReason,
      }
    })
  }, [currentYear, efrs, projects, selectedCycleId, tasks, workCycles])

  const handlePrepareNextYear = async () => {
    if (nextYearCycle) {
      onSelectCycle(nextYearCycle.id)
      toast.info(`${nextYear} workspace is already ready`)
      return
    }

    setPreparing(true)
    try {
      await onPrepareNextYear()
    } finally {
      setPreparing(false)
    }
  }

  const handleDeleteWorkspace = async (cycle: any) => {
    const confirmed = await confirm({
      title: `Delete ${cycle.name}?`,
      description: "Only empty workspaces can be deleted. This removes the workspace shell but keeps your other years intact.",
      confirmText: "Delete workspace",
      cancelText: "Cancel",
      variant: "danger",
    })

    if (!confirmed) return

    setDeletingCycleId(cycle.id)
    try {
      await onDeleteWorkspace(cycle)
    } finally {
      setDeletingCycleId(null)
    }
  }

  return (
    <Card className="rounded-2xl border border-border/40 shadow-sm overflow-hidden">
      <div className="border-b border-border/40 bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(239,246,255,0.88))] dark:bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.14),_transparent_28%),linear-gradient(135deg,rgba(21,24,41,0.98),rgba(17,24,39,0.94))] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full border-0 bg-primary/10 text-primary">
                Workspace settings
              </Badge>
              {currentYearCycle && (
                <Badge variant="secondary" className="rounded-full border-0 bg-muted/80 text-muted-foreground">
                  Current year: {currentYearCycle.name}
                </Badge>
              )}
            </div>
            <div>
              <h4 className="text-lg font-semibold">Keep this year focused and next year clean.</h4>
              <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                Edit workspace goals here, prepare only the immediate next calendar year once, and delete old workspace shells safely when they are empty.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-background/80 px-2.5 py-1 ring-1 ring-border/50">
                {workCycles.length} workspace{workCycles.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-background/80 px-2.5 py-1 ring-1 ring-border/50">
                {projects.length} projects
              </span>
              <span className="rounded-full bg-background/80 px-2.5 py-1 ring-1 ring-border/50">
                {efrs.length} EFRs
              </span>
              <span className="rounded-full bg-background/80 px-2.5 py-1 ring-1 ring-border/50">
                {tasks.length} tasks
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button variant="outline" className="rounded-xl border-border/50" onClick={onCreateWorkspace}>
              <Settings2 className="mr-2 h-4 w-4" />
              Create workspace
            </Button>
            <Button
              className="rounded-xl gradient-indigo border-0 text-white"
              onClick={() => void handlePrepareNextYear()}
              disabled={preparing}
            >
              {preparing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : nextYearCycle ? (
                <ArrowRight className="mr-2 h-4 w-4" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {nextYearCycle ? `Open ${nextYear}` : `Prepare ${nextYear}`}
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {workspaceCards.map((cycle) => (
          <Card
            key={cycle.id}
            className={`rounded-2xl border p-5 shadow-sm transition-all ${cycle.isSelected ? "border-primary/30 bg-primary/5 shadow-indigo-500/10" : "border-border/40 bg-card"}`}
          >
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-blue shadow-sm">
                    <CalendarRange className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-base font-semibold">{cycle.name}</h5>
                      <Badge variant="secondary" className={`rounded-full border-0 ${getStatusTone(cycle.status)}`}>
                        {getStatusLabel(cycle.status)}
                      </Badge>
                      <Badge variant="secondary" className="rounded-full border-0 bg-primary/10 text-primary">
                        {cycle.year}
                      </Badge>
                      {cycle.isSelected && (
                        <Badge variant="secondary" className="rounded-full border-0 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                          Current view
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {cycle.focusText || "Keep delivery smooth, protect deep work, and stay ahead of deadlines."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted/40 px-2.5 py-1">{formatCycleRange(cycle)}</span>
                  <span className="rounded-full bg-muted/40 px-2.5 py-1 inline-flex items-center gap-1.5">
                    <FolderKanban className="h-3.5 w-3.5" />
                    {cycle.projectCount} projects
                  </span>
                  <span className="rounded-full bg-muted/40 px-2.5 py-1 inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {cycle.efrCount} EFRs
                  </span>
                  <span className="rounded-full bg-muted/40 px-2.5 py-1 inline-flex items-center gap-1.5">
                    <CheckSquare2 className="h-3.5 w-3.5" />
                    {cycle.taskCount} tasks
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                {!cycle.isSelected && (
                  <Button
                    variant="outline"
                    className="rounded-xl border-border/50"
                    onClick={() => onSelectCycle(cycle.id)}
                  >
                    Open workspace
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="rounded-xl border-border/50"
                  onClick={() => onEditWorkspace(cycle)}
                >
                  <Settings2 className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl border-red-500/20 text-red-600 hover:bg-red-500/10 hover:text-red-700"
                  disabled={!cycle.canDelete || deletingCycleId === cycle.id}
                  onClick={() => void handleDeleteWorkspace(cycle)}
                >
                  {deletingCycleId === cycle.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </div>
            </div>

            {!cycle.canDelete && (
              <p className="mt-4 text-xs text-muted-foreground">
                {cycle.deleteReason}
              </p>
            )}
          </Card>
        ))}
      </div>
    </Card>
  )
}
