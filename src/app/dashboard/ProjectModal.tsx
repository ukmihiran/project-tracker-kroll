"use client"

import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ProjectSchema } from "@/lib/schemas"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "react-toastify"
import { createProject, updateProject } from "@/app/actions/projectActions"
import { Briefcase, User, Hash, Shield, Users, Link2, Clock, CalendarDays, CalendarRange } from "lucide-react"

export default function ProjectModal({
  isOpen,
  onClose,
  project,
  onSave,
  workCycles,
  selectedCycleId,
}: {
  isOpen: boolean
  onClose: () => void
  project: any
  onSave: (p: any) => void
  workCycles: any[]
  selectedCycleId?: string
}) {
  const { register, handleSubmit, reset, formState: { errors }, setValue, control } = useForm<any>({
    resolver: zodResolver(ProjectSchema),
    defaultValues: {
      status: 'Active',
      billable: true,
      shadowing: false,
      effortTimeHours: 0,
      isMultiPerson: false,
      isLeadConsultant: false,
      workCycleId: selectedCycleId ?? "",
    },
  })

  useEffect(() => {
    if (project) {
      Object.keys(project).forEach((key: any) => setValue(key, project[key]));
      if(project.timelineStart) setValue('timelineStart', new Date(project.timelineStart).toISOString().split('T')[0] as any)
      if(project.timelineEnd) setValue('timelineEnd', new Date(project.timelineEnd).toISOString().split('T')[0] as any)
    } else {
      reset({
        status: 'Active',
        billable: true,
        shadowing: false,
        effortTimeHours: 0,
        isMultiPerson: false,
        isLeadConsultant: false,
        workCycleId: selectedCycleId ?? "",
      })
    }
  }, [project, isOpen, setValue, reset, selectedCycleId])

  const onSubmit = async (data: any) => {
    const res = project ? await updateProject(project.id, data) : await createProject(data);
    
    if (res.success) {
      toast.success(
        <div><div className="font-medium">{project ? "Project updated successfully" : "Project created successfully"}</div><div className="text-xs opacity-75 mt-0.5">{data.engagementName}</div></div>
      )
      onSave(res.project)
      onClose()
    } else {
      toast.error(res.error || "Failed to save project")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-border/50 shadow-2xl bg-card">
        <DialogHeader className="pb-4 border-b border-border/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-indigo">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            {project ? 'Edit Project' : 'Add New Project'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {project ? 'Update the project details below.' : 'Fill in the details to create a new project assessment.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {/* Engagement Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engagement Name</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input {...register("engagementName")} placeholder="Project name" className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
              {errors.engagementName && <p className="text-destructive text-xs mt-1">{errors.engagementName.message as string}</p>}
            </div>
            {/* Client Name */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Client Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input {...register("clientName")} placeholder="Client name" className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
              {errors.clientName && <p className="text-destructive text-xs mt-1">{errors.clientName.message as string}</p>}
            </div>
            {/* Project ID */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project ID</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input {...register("projectID")} placeholder="e.g. PRJ-123" className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
            </div>
            {/* Assessment Type */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assessment Type</Label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input {...register("assessmentType")} placeholder="e.g. Pentest, Audit" className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
              {errors.assessmentType && <p className="text-destructive text-xs mt-1">{errors.assessmentType.message as string}</p>}
            </div>
            {/* EM */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Engagement Manager</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input {...register("EM")} placeholder="EM Name" className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
            </div>
            {/* PM */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Manager</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input {...register("PM")} placeholder="PM Name" className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
            </div>
            {/* Consultants */}
            <div className="space-y-2 col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consultant/s</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input {...register("consultants")} placeholder="Comma separated names" className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
            </div>
            {/* Report Link */}
            <div className="space-y-2 col-span-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Project Report Link</Label>
              <div className="relative">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input type="url" {...register("projectReportLink")} placeholder="https://..." className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
              {errors.projectReportLink && <p className="text-destructive text-xs mt-1">{errors.projectReportLink.message as string}</p>}
            </div>
            {/* Status - shadcn Select */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Workspace</Label>
              <Controller
                name="workCycleId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10 rounded-xl border-border/50 bg-muted/30 focus:ring-primary/50">
                      <CalendarRange className="h-4 w-4 text-muted-foreground/60 mr-2" />
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
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-10 rounded-xl border-border/50 bg-muted/30 focus:ring-primary/50">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border/50">
                      <SelectItem value="Active" className="rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </SelectItem>
                      <SelectItem value="Placeholder" className="rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Placeholder
                        </span>
                      </SelectItem>
                      <SelectItem value="Delivered" className="rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-blue-500" />
                          Delivered
                        </span>
                      </SelectItem>
                      <SelectItem value="Cancelled" className="rounded-lg">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-500" />
                          Cancelled
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {/* Effort Hours */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Effort (Hours)</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input type="number" {...register("effortTimeHours")} className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
            </div>
            {/* Start Date */}
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input type="date" {...register("timelineStart")} className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
            </div>
            {/* End Date */}
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">End Date</Label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input type="date" {...register("timelineEnd")} className="pl-10 h-10 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors" />
              </div>
            </div>
            {/* Toggle switches area */}
            <div className="col-span-2 mt-2 p-5 bg-muted/30 rounded-xl border border-border/30 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Project Options</p>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="billable"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                      <Label htmlFor="billable" className="text-sm font-medium cursor-pointer">Billable</Label>
                      <Switch
                        id="billable"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-indigo-500"
                      />
                    </div>
                  )}
                />
                <Controller
                  name="shadowing"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                      <Label htmlFor="shadowing" className="text-sm font-medium cursor-pointer">Shadowing</Label>
                      <Switch
                        id="shadowing"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-indigo-500"
                      />
                    </div>
                  )}
                />
                <Controller
                  name="isMultiPerson"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                      <Label htmlFor="isMultiPerson" className="text-sm font-medium cursor-pointer">Multi-Person</Label>
                      <Switch
                        id="isMultiPerson"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-indigo-500"
                      />
                    </div>
                  )}
                />
                <Controller
                  name="isLeadConsultant"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-border/30">
                      <Label htmlFor="isLeadConsultant" className="text-sm font-medium cursor-pointer">Lead Consultant</Label>
                      <Switch
                        id="isLeadConsultant"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-indigo-500"
                      />
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border/50">
            <Button type="button" variant="outline" className="rounded-xl px-6" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="rounded-xl gradient-indigo border-0 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all px-6">
              {project ? 'Update Project' : 'Save Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
