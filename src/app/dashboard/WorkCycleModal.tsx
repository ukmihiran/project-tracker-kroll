"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "react-toastify"
import { CalendarRange, Target, Sparkles } from "lucide-react"

import { createWorkCycle, updateWorkCycle } from "@/app/actions/workCycleActions"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { WorkCycleSchema } from "@/lib/schemas"

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "PLANNED", label: "Planned" },
  { value: "CLOSED", label: "Closed" },
] as const

interface WorkCycleModalProps {
  isOpen: boolean
  onClose: () => void
  cycle?: any
  onSave: (cycle: any) => void
}

function getDefaultValues(year = new Date().getFullYear()) {
  return {
    name: `${year} Workspace`,
    year,
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
    status: year > new Date().getFullYear() ? "PLANNED" : "ACTIVE",
    focusText: "Keep delivery smooth, protect deep work, and stay ahead of reminders.",
    billableTarget: 1500,
    efrTarget: 3,
    multiPersonTarget: 1,
  }
}

export default function WorkCycleModal({ isOpen, onClose, cycle, onSave }: WorkCycleModalProps) {
  const isEditMode = Boolean(cycle)
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(WorkCycleSchema),
    defaultValues: getDefaultValues(),
  })

  useEffect(() => {
    if (cycle && isOpen) {
      reset({
        name: cycle.name,
        year: cycle.year,
        startDate: new Date(cycle.startDate).toISOString().split("T")[0],
        endDate: new Date(cycle.endDate).toISOString().split("T")[0],
        status: cycle.status,
        focusText: cycle.focusText ?? "",
        billableTarget: cycle.billableTarget,
        efrTarget: cycle.efrTarget,
        multiPersonTarget: cycle.multiPersonTarget,
      })
      return
    }

    if (isOpen) {
      const nextYear = new Date().getFullYear() + 1
      reset(getDefaultValues(nextYear))
    }
  }, [cycle, isOpen, reset])

  const fieldClass = "h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors"

  const onSubmit = async (data: any) => {
    const result = isEditMode
      ? await updateWorkCycle(cycle.id, data)
      : await createWorkCycle(data)

    if (!result.success) {
      toast.error(result.error || "Failed to save workspace")
      return
    }

    toast.success(isEditMode ? "Workspace updated" : "Workspace created")
    onSave(result.cycle)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl rounded-2xl border border-border/50 shadow-2xl bg-card">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-blue">
              <CalendarRange className="h-4 w-4 text-white" />
            </div>
            {isEditMode ? "Edit Workspace" : "Create Workspace"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Configure the year, goals, and focus for the workspace you want to manage.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace Name</Label>
              <Input {...register("name")} className={fieldClass} placeholder="2027 Workspace" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</Label>
              <Input type="number" {...register("year")} className={fieldClass} />
              {errors.year && <p className="text-xs text-destructive">{errors.year.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
              <Input type="date" {...register("startDate")} className={fieldClass} />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate.message as string}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label>
              <Input type="date" {...register("endDate")} className={fieldClass} />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate.message as string}</p>}
            </div>
            <div className="space-y-2 md:col-span-2">
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
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="rounded-lg">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-border/50 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Focus for the year</h4>
            </div>
            <textarea
              {...register("focusText")}
              rows={3}
              placeholder="What should this workspace optimize for?"
              className="w-full rounded-xl border border-border/50 bg-background/80 px-3 py-2 text-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/30"
            />
            {errors.focusText && <p className="text-xs text-destructive">{errors.focusText.message as string}</p>}
          </div>

          <div className="rounded-2xl border border-border/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Targets</h4>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Billable Hours</Label>
                <Input type="number" {...register("billableTarget")} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">EFRs per Quarter</Label>
                <Input type="number" {...register("efrTarget")} className={fieldClass} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lead Projects</Label>
                <Input type="number" {...register("multiPersonTarget")} className={fieldClass} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border/50">
            <Button type="button" variant="outline" className="rounded-xl px-6" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="rounded-xl gradient-indigo border-0 text-white px-6">
              {isEditMode ? "Update Workspace" : "Create Workspace"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
