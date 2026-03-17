"use client"

import { useMemo, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { archiveProject, deleteProject } from "@/app/actions/projectActions"
import { toast } from "react-toastify"
import { useConfirm } from "@/components/ConfirmDialog"
import {
  Pencil, Trash2, FolderOpen, Search, Filter, X, Archive,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown,
} from "lucide-react"

interface ProjectListProps {
  projects: any[]
  setProjects: any
  onEdit: (p: any) => void
  searchQuery: string
  onSearchChange: (q: string) => void
  statusFilter: string
  onStatusFilterChange: (s: string) => void
  typeFilter: string
  onTypeFilterChange: (t: string) => void
  assessmentTypes: string[]
}

type SortField = "engagementName" | "clientName" | "assessmentType" | "timelineStart" | "effortTimeHours" | "status"
type SortDirection = "asc" | "desc"

const PAGE_SIZE_OPTIONS = [10, 25, 50]

export default function ProjectList({
  projects,
  setProjects,
  onEdit,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  assessmentTypes,
}: ProjectListProps) {
  const confirm = useConfirm()
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")

  // Sort projects
  const sortedProjects = useMemo(() => {
    if (!sortField) return projects
    return [...projects].sort((a, b) => {
      let aVal = a[sortField]
      let bVal = b[sortField]
      if (sortField === "effortTimeHours") {
        aVal = Number(aVal) || 0
        bVal = Number(bVal) || 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      }
      if (sortField === "timelineStart") {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal
      }
      aVal = String(aVal || "").toLowerCase()
      bVal = String(bVal || "").toLowerCase()
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1
      return 0
    })
  }, [projects, sortField, sortDirection])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / pageSize))
  const effectivePage = Math.min(currentPage, totalPages)
  const paginatedProjects = useMemo(() => {
    const start = (effectivePage - 1) * pageSize
    return sortedProjects.slice(start, start + pageSize)
  }, [sortedProjects, effectivePage, pageSize])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("asc")
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" />
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Project",
      description: "Are you sure you want to delete this project? All associated data will be permanently removed.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!confirmed) return
    const res = await deleteProject(id)
    if (res.success) {
      toast.success("Project deleted successfully")
      setProjects((currentProjects: any[]) => currentProjects.filter((p: any) => p.id !== id))
    } else {
      toast.error(res.error)
    }
  }

  const handleArchive = async (id: string) => {
    const confirmed = await confirm({
      title: "Archive Project",
      description: "This will move the project out of the active workspace and keep it available in Archive.",
      confirmText: "Archive",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    const res = await archiveProject(id)
    if (res.success) {
      toast.success("Project archived")
      setProjects((currentProjects: any[]) => currentProjects.map((p: any) => p.id === id ? res.project : p))
    } else {
      toast.error(res.error)
    }
  }

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      Active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/20",
      Placeholder: "bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20",
      Delivered: "bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20",
      Cancelled: "bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-red-500/20",
    }
    return styles[status] || "bg-gray-500/10 text-gray-600 dark:text-gray-400 ring-1 ring-gray-500/20"
  }

  const getStatusDot = (status: string) => {
    const colors: Record<string, string> = {
      Active: "bg-emerald-500",
      Placeholder: "bg-amber-500",
      Delivered: "bg-blue-500",
      Cancelled: "bg-red-500",
    }
    return colors[status] || "bg-gray-500"
  }

  const hasActiveFilters = searchQuery || statusFilter !== "all" || typeFilter !== "all"

  const clearFilters = () => {
    onSearchChange("")
    onStatusFilterChange("all")
    onTypeFilterChange("all")
  }

  const formatDate = (date: string | null) => {
    if (!date) return "—"
    return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search projects, clients, consultants..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 h-9 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground/60" />
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-36 h-9 rounded-xl border-border/50 bg-muted/30 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all" className="rounded-lg">All Statuses</SelectItem>
              <SelectItem value="Active" className="rounded-lg">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" />Active</span>
              </SelectItem>
              <SelectItem value="Placeholder" className="rounded-lg">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" />Placeholder</span>
              </SelectItem>
              <SelectItem value="Delivered" className="rounded-lg">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" />Delivered</span>
              </SelectItem>
              <SelectItem value="Cancelled" className="rounded-lg">
                <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" />Cancelled</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        {assessmentTypes.length > 0 && (
          <Select value={typeFilter} onValueChange={onTypeFilterChange}>
            <SelectTrigger className="w-40 h-9 rounded-xl border-border/50 bg-muted/30 text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-border/50">
              <SelectItem value="all" className="rounded-lg">All Types</SelectItem>
              {assessmentTypes.map((type) => (
                <SelectItem key={type} value={type} className="rounded-lg">{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="border border-border/40 shadow-sm overflow-hidden rounded-xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
                <TableHead className="w-[24%] py-2 px-3">
                  <button onClick={() => handleSort("engagementName")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    Project {getSortIcon("engagementName")}
                  </button>
                </TableHead>
                <TableHead className="w-[14%] py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Team
                </TableHead>
                <TableHead className="w-[10%] py-2 px-3">
                  <button onClick={() => handleSort("assessmentType")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    Type {getSortIcon("assessmentType")}
                  </button>
                </TableHead>
                <TableHead className="w-[18%] py-2 px-3">
                  <button onClick={() => handleSort("timelineStart")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    Timeline {getSortIcon("timelineStart")}
                  </button>
                </TableHead>
                <TableHead className="w-[10%] py-2 px-3">
                  <button onClick={() => handleSort("effortTimeHours")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    Effort {getSortIcon("effortTimeHours")}
                  </button>
                </TableHead>
                <TableHead className="w-[10%] py-2 px-3">
                  <button onClick={() => handleSort("status")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                    Status {getSortIcon("status")}
                  </button>
                </TableHead>
                <TableHead className="w-[14%] py-2 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProjects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/50">
                        <FolderOpen className="h-6 w-6 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {hasActiveFilters ? "No matching projects found" : "No projects yet"}
                      </p>
                      <p className="text-xs text-muted-foreground/60">
                        {hasActiveFilters ? "Try adjusting your filters" : "Add your first project to get started"}
                      </p>
                      {hasActiveFilters && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl mt-1 text-xs">
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProjects.map((project: any, index: number) => (
                  <TableRow
                    key={project.id}
                    className={`hover:bg-muted/30 transition-colors border-b border-border/20 ${
                      index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    }`}
                  >
                    <TableCell className="py-1.5 px-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          {project.projectID && (
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/60 px-1 py-px rounded shrink-0">
                              {project.projectID}
                            </span>
                          )}
                          {project.tasks?.length > 0 && (
                            <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-300 bg-indigo-500/10 px-1 py-px rounded shrink-0">
                              {project.tasks.length} task{project.tasks.length !== 1 ? "s" : ""}
                            </span>
                          )}
                          {project.projectReportLink ? (
                            <a
                              href={project.projectReportLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="hover:underline text-primary font-medium text-xs truncate"
                            >
                              {project.engagementName}
                            </a>
                          ) : (
                            <span className="font-medium text-xs truncate">{project.engagementName}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{project.clientName}</p>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <div className="text-[11px] space-y-px min-w-0">
                        {project.EM && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-semibold text-muted-foreground bg-muted/50 px-1 rounded shrink-0">EM</span>
                            <span className="text-foreground truncate">{project.EM}</span>
                          </div>
                        )}
                        {project.PM && (
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-semibold text-muted-foreground bg-muted/50 px-1 rounded shrink-0">PM</span>
                            <span className="text-foreground truncate">{project.PM}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <Badge variant="secondary" className="rounded-md border-0 font-medium text-[10px] bg-primary/10 text-primary whitespace-nowrap">
                        {project.assessmentType}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <div className="flex items-center gap-1 text-[11px]">
                        <span className="text-foreground whitespace-nowrap">{formatDate(project.timelineStart)}</span>
                        <span className="text-muted-foreground/50">→</span>
                        <span className="text-foreground whitespace-nowrap">{formatDate(project.timelineEnd)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold tabular-nums">{project.effortTimeHours}h</span>
                        {project.billable ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Billable" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-400 shrink-0" title="Non-Billable" />
                        )}
                        {project.shadowing && (
                          <span className="text-[9px] text-purple-500 font-medium" title="Shadowing">S</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <Badge
                        variant="secondary"
                        className={`rounded-md border-0 font-medium text-[11px] whitespace-nowrap ${getStatusBadge(project.status)}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${getStatusDot(project.status)}`} />
                        {project.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right py-1.5 px-3">
                      <div className="flex justify-end gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors"
                          onClick={() => onEdit(project)}
                          title="Edit project"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                          onClick={() => handleArchive(project.id)}
                          title="Archive project"
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                          onClick={() => handleDelete(project.id)}
                          title="Delete project"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {sortedProjects.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/30 bg-muted/10">
            <div className="flex items-center gap-4">
              <p className="text-xs text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground">
                  {Math.min((effectivePage - 1) * pageSize + 1, sortedProjects.length)}
                </span>
                {" "}to{" "}
                <span className="font-medium text-foreground">
                  {Math.min(effectivePage * pageSize, sortedProjects.length)}
                </span>
                {" "}of{" "}
                <span className="font-medium text-foreground">{sortedProjects.length}</span>
                {" "}results
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Rows:</span>
                <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                  <SelectTrigger className="w-16 h-7 text-xs rounded-lg border-border/50 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-lg min-w-16">
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage === 1} onClick={() => setCurrentPage(1)} title="First page">
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage === 1} onClick={() => setCurrentPage(Math.max(1, effectivePage - 1))} title="Previous page">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page <span className="font-medium text-foreground">{effectivePage}</span> of{" "}
                <span className="font-medium text-foreground">{totalPages || 1}</span>
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage >= totalPages} onClick={() => setCurrentPage(effectivePage + 1)} title="Next page">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage >= totalPages} onClick={() => setCurrentPage(totalPages)} title="Last page">
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
