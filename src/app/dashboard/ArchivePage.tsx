"use client"

import { useMemo, useState } from "react"
import { toast } from "react-toastify"
import { ArchiveRestore, Briefcase, CheckSquare2, FileText, Layers3 } from "lucide-react"

import { unarchiveEfr } from "@/app/actions/efrActions"
import { unarchiveProject } from "@/app/actions/projectActions"
import { unarchiveTask } from "@/app/actions/taskActions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function ArchiveCard({
  title,
  subtitle,
  meta,
  reason,
  onRestore,
}: {
  title: string
  subtitle?: string
  meta?: string
  reason?: string | null
  onRestore: () => void
}) {
  return (
    <Card className="rounded-2xl border border-border/50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium">{title}</p>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {meta && <span className="rounded-full bg-muted/40 px-2 py-1">{meta}</span>}
            {reason && <span className="rounded-full bg-muted/40 px-2 py-1">{reason}</span>}
          </div>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={onRestore}>
          <ArchiveRestore className="mr-2 h-4 w-4" />
          Restore
        </Button>
      </div>
    </Card>
  )
}

export default function ArchivePage({
  projects,
  setProjects,
  efrs,
  setEfrs,
  tasks,
  setTasks,
  workCycles,
  selectedCycleId,
}: {
  projects: any[]
  setProjects: any
  efrs: any[]
  setEfrs: any
  tasks: any[]
  setTasks: any
  workCycles: any[]
  selectedCycleId?: string
}) {
  const [view, setView] = useState("all")
  const [cycleFilter, setCycleFilter] = useState(selectedCycleId ?? "all")

  const archivedProjects = useMemo(
    () => projects.filter((project) => project.archivedAt && (cycleFilter === "all" || project.workCycleId === cycleFilter)),
    [projects, cycleFilter]
  )
  const archivedEfrs = useMemo(
    () => efrs.filter((efr) => efr.archivedAt && (cycleFilter === "all" || efr.workCycleId === cycleFilter)),
    [efrs, cycleFilter]
  )
  const archivedTasks = useMemo(
    () => tasks.filter((task) => task.archivedAt && (cycleFilter === "all" || task.workCycleId === cycleFilter)),
    [tasks, cycleFilter]
  )

  const handleRestoreProject = async (project: any) => {
    const result = await unarchiveProject(project.id)
    if (!result.success) {
      toast.error(result.error || "Failed to restore project")
      return
    }

    setProjects((currentProjects: any[]) => currentProjects.map((currentProject) => (
      currentProject.id === result.project.id ? result.project : currentProject
    )))
    toast.success("Project restored")
  }

  const handleRestoreEfr = async (efr: any) => {
    const result = await unarchiveEfr(efr.id)
    if (!result.success) {
      toast.error(result.error || "Failed to restore EFR")
      return
    }

    setEfrs((currentEfrs: any[]) => currentEfrs.map((currentEfr) => (
      currentEfr.id === result.efr.id ? result.efr : currentEfr
    )))
    toast.success("EFR restored")
  }

  const handleRestoreTask = async (task: any) => {
    const result = await unarchiveTask(task.id)
    if (!result.success) {
      toast.error(result.error || "Failed to restore task")
      return
    }

    setTasks((currentTasks: any[]) => currentTasks.map((currentTask) => (
      currentTask.id === result.task.id ? result.task : currentTask
    )))
    toast.success("Task restored")
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold">Archive</h3>
          <p className="text-sm text-muted-foreground">
            Keep the active workspace clean without losing historical context.
          </p>
        </div>
        <div className="w-full max-w-xs">
          <Select value={cycleFilter} onValueChange={setCycleFilter}>
            <SelectTrigger className="h-10 rounded-2xl border-border/50 bg-muted/20">
              <SelectValue placeholder="Filter by workspace" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all" className="rounded-lg">All workspaces</SelectItem>
              {workCycles.map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id} className="rounded-lg">
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="rounded-2xl border-0 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-blue">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{archivedProjects.length}</p>
              <p className="text-xs text-muted-foreground">Archived projects</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-purple">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{archivedEfrs.length}</p>
              <p className="text-xs text-muted-foreground">Archived EFRs</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-2xl border-0 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-emerald">
              <CheckSquare2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{archivedTasks.length}</p>
              <p className="text-xs text-muted-foreground">Archived tasks</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="rounded-2xl bg-muted/30 p-1.5">
          <TabsTrigger value="all" className="rounded-xl">All</TabsTrigger>
          <TabsTrigger value="projects" className="rounded-xl">Projects</TabsTrigger>
          <TabsTrigger value="efrs" className="rounded-xl">EFRs</TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-xl">Tasks</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-5 space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers3 className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Recently archived</h4>
              <Badge variant="secondary" className="rounded-full text-[10px]">
                {archivedProjects.length + archivedEfrs.length + archivedTasks.length}
              </Badge>
            </div>
            {[...archivedProjects, ...archivedEfrs, ...archivedTasks]
              .sort((a, b) => new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime())
              .slice(0, 12)
              .map((item) => {
                if ("assessmentType" in item) {
                  return (
                    <ArchiveCard
                      key={item.id}
                      title={item.engagementName}
                      subtitle={item.clientName}
                      meta={`Archived ${formatDate(item.archivedAt)}`}
                      reason={item.archivedReason}
                      onRestore={() => void handleRestoreProject(item)}
                    />
                  )
                }

                if ("quarter" in item) {
                  return (
                    <ArchiveCard
                      key={item.id}
                      title={item.title}
                      subtitle={item.engagement}
                      meta={`${item.quarter} • Archived ${formatDate(item.archivedAt)}`}
                      reason={item.archivedReason}
                      onRestore={() => void handleRestoreEfr(item)}
                    />
                  )
                }

                return (
                  <ArchiveCard
                    key={item.id}
                    title={item.title}
                    subtitle={item.project?.engagementName ?? "Standalone task"}
                    meta={`Archived ${formatDate(item.archivedAt)}`}
                    reason={item.archivedReason}
                    onRestore={() => void handleRestoreTask(item)}
                  />
                )
              })}
          </div>
        </TabsContent>

        <TabsContent value="projects" className="mt-5 space-y-3">
          {archivedProjects.map((project) => (
            <ArchiveCard
              key={project.id}
              title={project.engagementName}
              subtitle={`${project.clientName} • ${project.assessmentType}`}
              meta={`Archived ${formatDate(project.archivedAt)}`}
              reason={project.archivedReason}
              onRestore={() => void handleRestoreProject(project)}
            />
          ))}
        </TabsContent>

        <TabsContent value="efrs" className="mt-5 space-y-3">
          {archivedEfrs.map((efr) => (
            <ArchiveCard
              key={efr.id}
              title={efr.title}
              subtitle={efr.engagement}
              meta={`${efr.quarter} • Archived ${formatDate(efr.archivedAt)}`}
              reason={efr.archivedReason}
              onRestore={() => void handleRestoreEfr(efr)}
            />
          ))}
        </TabsContent>

        <TabsContent value="tasks" className="mt-5 space-y-3">
          {archivedTasks.map((task) => (
            <ArchiveCard
              key={task.id}
              title={task.title}
              subtitle={task.project?.engagementName ?? "Standalone task"}
              meta={`Archived ${formatDate(task.archivedAt)}`}
              reason={task.archivedReason}
              onRestore={() => void handleRestoreTask(task)}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}
