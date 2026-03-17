"use client"

import { useEffect } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"
import { CheckSquare2, Clock3, Flag, FolderKanban } from "lucide-react"

import { createTask, updateTask } from "@/app/actions/taskActions"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskSchema } from "@/lib/schemas"

const STATUS_OPTIONS = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
] as const

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: any
  onSave: (task: any) => void
  workCycles: any[]
  selectedCycleId?: string
  projects: any[]
}

function getDefaultValues(selectedCycleId?: string) {
  return {
    title: "",
    description: "",
    status: "TODO",
    priority: "MEDIUM",
    dueDate: "",
    reminderAt: "",
    estimateHours: 0,
    workCycleId: selectedCycleId ?? "",
    projectId: "none",
  }
}

export default function TaskModal({
  isOpen,
  onClose,
  task,
  onSave,
  workCycles,
  selectedCycleId,
  projects,
}: TaskModalProps) {
  const isEditMode = Boolean(task)
  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<any>({
    resolver: zodResolver(TaskSchema),
    defaultValues: getDefaultValues(selectedCycleId),
  })

  const activeCycleId = useWatch({ control, name: "workCycleId" })
  const cycleProjects = projects.filter((project) => project.workCycleId === activeCycleId && !project.archivedAt)

  useEffect(() => {
    if (task && isOpen) {
      reset({
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
        reminderAt: task.reminderAt ? new Date(task.reminderAt).toISOString().split("T")[0] : "",
        estimateHours: task.estimateHours ?? 0,
        workCycleId: task.workCycleId ?? selectedCycleId ?? "",
        projectId: task.projectId ?? "none",
      })
      return
    }

    if (isOpen) {
      reset(getDefaultValues(selectedCycleId))
    }
  }, [task, isOpen, reset, selectedCycleId])

  const fieldClass = "h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors"

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      projectId: data.projectId === "none" ? undefined : data.projectId,
      workCycleId: data.workCycleId || selectedCycleId,
    }

    const result = isEditMode
      ? await updateTask(task.id, payload)
      : await createTask(payload)

    if (!result.success) {
      toast.error(result.error || "Failed to save task")
      return
    }

    toast.success(isEditMode ? "Task updated" : "Task created")
    onSave(result.task)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-2xl border border-border/50 shadow-2xl bg-card">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-indigo">
              <CheckSquare2 className="h-4 w-4 text-white" />
            </div>
            {isEditMode ? "Edit Task" : "Add Task"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Keep work moving with due dates, focus flags, and project links.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task Title</Label>
              <Input {...register("title")} className={fieldClass} placeholder="Draft assessment summary" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message as string}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</Label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Optional context, handoff notes, or next steps"
                className="w-full rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30"
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</Label>
              <Controller
                name="workCycleId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={fieldClass}>
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {workCycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id} className="rounded-lg">
                          {cycle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Linked Project</Label>
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? "none"} onValueChange={field.onChange}>
                    <SelectTrigger className={fieldClass}>
                      <FolderKanban className="h-4 w-4 text-muted-foreground/60 mr-2" />
                      <SelectValue placeholder="Optional project" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 max-h-60">
                      <SelectItem value="none" className="rounded-lg">No linked project</SelectItem>
                      {cycleProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="rounded-lg">
                          {project.engagementName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={fieldClass}>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status.value} value={status.value} className="rounded-lg">
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={fieldClass}>
                      <Flag className="h-4 w-4 text-muted-foreground/60 mr-2" />
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {PRIORITY_OPTIONS.map((priority) => (
                        <SelectItem key={priority.value} value={priority.value} className="rounded-lg">
                          {priority.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due Date</Label>
              <Input type="date" {...register("dueDate")} className={fieldClass} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reminder Date</Label>
              <Input type="date" {...register("reminderAt")} className={fieldClass} />
              {errors.reminderAt && <p className="text-xs text-destructive">{errors.reminderAt.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimate (hours)</Label>
              <div className="relative">
                <Clock3 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input type="number" {...register("estimateHours")} className={`${fieldClass} pl-10`} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
            <Button type="button" variant="outline" className="rounded-xl px-6" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="rounded-xl gradient-indigo border-0 text-white px-6">
              {isEditMode ? "Update Task" : "Save Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
