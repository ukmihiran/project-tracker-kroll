"use client"

import { useEffect } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EfrSchema } from "@/lib/schemas"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "react-toastify"
import { createEfr, updateEfr } from "@/app/actions/efrActions"
import { FileText, User, Briefcase, Calendar, Clock, MessageSquare, Shield, CalendarRange, Link2 } from "lucide-react"

// Generate quarter options for the current year
function getQuarterOptions() {
  const year = new Date().getFullYear()
  return [
    `Q1-${year}`,
    `Q2-${year}`,
    `Q3-${year}`,
    `Q4-${year}`,
  ]
}

const DURATION_OPTIONS = [
  "Less than a week",
  "1 week",
  "2 weeks",
  "3 weeks or more",
] as const

interface EfrModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (efr: any) => void
  projects?: any[]
  workCycles: any[]
  selectedCycleId?: string
  efr?: any // If provided, we're in edit mode
}

export default function EfrModal({
  isOpen,
  onClose,
  onSave,
  projects = [],
  workCycles,
  selectedCycleId,
  efr,
}: EfrModalProps) {
  const isEditMode = !!efr
  const { register, handleSubmit, reset, formState: { errors }, control, setValue } = useForm<any>({
    resolver: zodResolver(EfrSchema),
  })
  const activeCycleId = useWatch({ control, name: "workCycleId" }) || selectedCycleId
  const cycleProjects = projects.filter((project) => project.workCycleId === activeCycleId && !project.archivedAt)

  // Pre-fill form when editing
  useEffect(() => {
    if (efr && isOpen) {
      reset({
        workCycleId: efr.workCycleId || selectedCycleId || "",
        projectId: efr.projectId || "none",
        title: efr.title || "",
        description: efr.description || "",
        quarter: efr.quarter || "",
        evaluator: efr.evaluator || "",
        engagement: efr.engagement || "",
        engagementStart: efr.engagementStart ? new Date(efr.engagementStart).toISOString().split("T")[0] : "",
        role: efr.role || "",
        duration: efr.duration || "",
        contextComment: efr.contextComment || "",
      })
    } else if (!efr && isOpen) {
      reset({
        workCycleId: selectedCycleId || "",
        projectId: "none",
      })
    }
  }, [efr, isOpen, reset, selectedCycleId])

  const engagementOptions = cycleProjects.map((p) => ({ value: `${p.clientName} - ${p.engagementName}`, projectId: p.id }))

  const onSubmit = async (data: any) => {
    const payload = {
      ...data,
      workCycleId: data.workCycleId || selectedCycleId,
      projectId: data.projectId === "none" ? undefined : data.projectId,
    }

    if (isEditMode) {
      const res = await updateEfr(efr.id, payload)
      if (res.success) {
        toast.success(
          <div><div className="font-medium">EFR updated successfully</div><div className="text-xs opacity-75 mt-0.5">{data.title}</div></div>
        )
        onSave(res.efr)
        reset()
        onClose()
      } else {
        toast.error(res.error || "Failed to update EFR")
      }
    } else {
      const res = await createEfr(payload)
      if (res.success) {
        toast.success(
          <div><div className="font-medium">EFR submitted successfully</div><div className="text-xs opacity-75 mt-0.5">{data.title}</div></div>
        )
        onSave(res.efr)
        reset()
        onClose()
      } else {
        toast.error(res.error || "Failed to submit EFR")
      }
    }
  }

  const fieldClass = "h-9 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors text-sm"
  const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60"

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg rounded-2xl border border-border/50 shadow-2xl bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b border-border/50">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-purple">
              <FileText className="h-4 w-4 text-white" />
            </div>
            {isEditMode ? "Edit EFR" : "Submit EFR"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEditMode ? "Update your engagement feedback and evaluation details." : "Record your engagement feedback and evaluation details."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-3">
          {/* Row 1: Title + Quarter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">EFR Title</Label>
              <div className="relative">
                <FileText className={iconClass} />
                <Input {...register("title")} placeholder="EFR title" className={`pl-9 ${fieldClass}`} />
              </div>
              {errors.title && <p className="text-destructive text-[11px]">{errors.title.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quarter</Label>
              <Controller
                name="quarter"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={`w-full ${fieldClass}`}>
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/60 mr-2" />
                      <SelectValue placeholder="Select quarter" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {getQuarterOptions().map((q) => (
                        <SelectItem key={q} value={q} className="rounded-lg text-sm">{q}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.quarter && <p className="text-destructive text-[11px]">{errors.quarter.message as string}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace</Label>
              <Controller
                name="workCycleId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={`w-full ${fieldClass}`}>
                      <CalendarRange className="h-3.5 w-3.5 text-muted-foreground/60 mr-2" />
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      {workCycles.map((cycle) => (
                        <SelectItem key={cycle.id} value={cycle.id} className="rounded-lg text-sm">
                          {cycle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Link to Project</Label>
              <Controller
                name="projectId"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(value) => {
                      field.onChange(value)
                      const selectedOption = engagementOptions.find((option) => option.projectId === value)
                      if (selectedOption) {
                        setValue("engagement", selectedOption.value, { shouldDirty: true })
                      }
                    }}
                  >
                    <SelectTrigger className={`w-full ${fieldClass}`}>
                      <Link2 className="h-3.5 w-3.5 text-muted-foreground/60 mr-2" />
                      <SelectValue placeholder="Optional project link" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 max-h-48">
                      <SelectItem value="none" className="rounded-lg text-sm">No linked project</SelectItem>
                      {cycleProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="rounded-lg text-sm">
                          {project.engagementName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Row 2: Evaluator */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Who Evaluated You?</Label>
            <div className="relative">
              <User className={iconClass} />
              <Input {...register("evaluator")} placeholder="e.g. John Smith (EM / PM)" className={`pl-9 ${fieldClass}`} />
            </div>
            {errors.evaluator && <p className="text-destructive text-[11px]">{errors.evaluator.message as string}</p>}
          </div>

          {/* Row 3: Engagement */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Engagement (Client - Project)</Label>
            {engagementOptions.length > 0 ? (
              <Controller
                name="engagement"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className={`w-full ${fieldClass}`}>
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground/60 mr-2" />
                      <SelectValue placeholder="Select engagement" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50 max-h-48">
                      {engagementOptions.map((option) => (
                        <SelectItem key={option.projectId} value={option.value} className="rounded-lg text-sm">{option.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            ) : (
              <div className="relative">
                <Briefcase className={iconClass} />
                <Input {...register("engagement")} placeholder="e.g. Acme Corp - Security Assessment" className={`pl-9 ${fieldClass}`} />
              </div>
            )}
            {errors.engagement && <p className="text-destructive text-[11px]">{errors.engagement.message as string}</p>}
          </div>

          {/* Row 4: Start Date + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Engagement Start Date</Label>
              <div className="relative">
                <Calendar className={iconClass} />
                <Input type="date" {...register("engagementStart")} className={`pl-9 ${fieldClass}`} />
              </div>
              {errors.engagementStart && <p className="text-destructive text-[11px]">{errors.engagementStart.message as string}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Your Role</Label>
              <div className="relative">
                <Shield className={iconClass} />
                <Input {...register("role")} placeholder="e.g. Lead Consultant" className={`pl-9 ${fieldClass}`} />
              </div>
              {errors.role && <p className="text-destructive text-[11px]">{errors.role.message as string}</p>}
            </div>
          </div>

          {/* Row 5: Duration */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Approximate Duration of Engagement</Label>
            <Controller
              name="duration"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={`w-full ${fieldClass}`}>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/60 mr-2" />
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border/50">
                    {DURATION_OPTIONS.map((d) => (
                      <SelectItem key={d} value={d} className="rounded-lg text-sm">{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.duration && <p className="text-destructive text-[11px]">{errors.duration.message as string}</p>}
          </div>

          {/* Row 6: Description */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Description (optional)</Label>
            <div className="relative">
              <Input {...register("description")} placeholder="Brief description of the EFR" className={fieldClass} />
            </div>
          </div>

          {/* Row 7: Context/Comment */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Context / Comment Received</Label>
            <div className="relative">
              <MessageSquare className={iconClass} />
              <Input {...register("contextComment")} placeholder="Feedback context or comments received" className={`pl-9 ${fieldClass}`} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border/50">
            <Button type="button" variant="outline" className="rounded-xl px-5 h-9 text-sm" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" className="rounded-xl gradient-indigo border-0 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all px-5 h-9 text-sm">{isEditMode ? "Update EFR" : "Submit EFR"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
