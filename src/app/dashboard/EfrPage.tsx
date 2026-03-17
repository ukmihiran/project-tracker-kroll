"use client"

import { useState, useMemo, Fragment } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { archiveEfr, deleteEfr } from "@/app/actions/efrActions"
import { toast } from "react-toastify"
import { useConfirm } from "@/components/ConfirmDialog"
import {
  PlusCircle, Trash2, FileText, Search, Filter, X, Archive,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUp, ArrowDown, ArrowUpDown, MessageSquare, Pencil,
} from "lucide-react"

interface EfrPageProps {
  efrs: any[]
  setEfrs: any
  onAddEfr: () => void
  onEditEfr: (efr: any) => void
}

const PAGE_SIZE_OPTIONS = [10, 25, 50]
type SortField = "title" | "evaluator" | "engagement" | "engagementStart" | "duration" | "quarter" | "submittedAt"
type SortDir = "asc" | "desc"

function SortIcon({ field, sortField, sortDir }: { field: SortField; sortField: SortField; sortDir: SortDir }) {
  if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />
  return sortDir === "asc"
    ? <ArrowUp className="ml-1 h-3 w-3 text-primary" />
    : <ArrowDown className="ml-1 h-3 w-3 text-primary" />
}

export default function EfrPage({ efrs, setEfrs, onAddEfr, onEditEfr }: EfrPageProps) {
  const confirm = useConfirm()
  const [searchQuery, setSearchQuery] = useState("")
  const [quarterFilter, setQuarterFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<SortField>("submittedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const quarters = useMemo(() => {
    const qs = new Set(efrs.map((e: any) => e.quarter).filter(Boolean))
    return Array.from(qs).sort() as string[]
  }, [efrs])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDir("asc")
    }
  }

  const filteredAndSortedEfrs = useMemo(() => {
    const filtered = efrs.filter((e: any) => {
      const matchesSearch = searchQuery === "" ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.evaluator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.engagement?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.role?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesQuarter = quarterFilter === "all" || e.quarter === quarterFilter
      return matchesSearch && matchesQuarter
    })

    return [...filtered].sort((a: any, b: any) => {
      let aVal = a[sortField] ?? ""
      let bVal = b[sortField] ?? ""
      if (sortField === "engagementStart" || sortField === "submittedAt") {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase()
        bVal = (bVal as string).toLowerCase()
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1
      return 0
    })
  }, [efrs, searchQuery, quarterFilter, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredAndSortedEfrs.length / pageSize))
  const effectivePage = Math.min(currentPage, totalPages)
  const paginatedEfrs = useMemo(() => {
    const start = (effectivePage - 1) * pageSize
    return filteredAndSortedEfrs.slice(start, start + pageSize)
  }, [filteredAndSortedEfrs, effectivePage, pageSize])

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete EFR Submission",
      description: "Are you sure you want to delete this EFR submission? This action cannot be undone.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })
    if (!confirmed) return
    const res = await deleteEfr(id)
    if (res.success) {
      toast.success("EFR deleted")
      setEfrs((currentEfrs: any[]) => currentEfrs.filter((e: any) => e.id !== id))
    } else {
      toast.error(res.error || "Failed to delete")
    }
  }

  const handleArchive = async (id: string) => {
    const confirmed = await confirm({
      title: "Archive EFR Submission",
      description: "This will move the EFR out of the active workspace but keep it in Archive.",
      confirmText: "Archive",
      cancelText: "Cancel",
    })
    if (!confirmed) return

    const res = await archiveEfr(id)
    if (res.success) {
      toast.success("EFR archived")
      setEfrs((currentEfrs: any[]) => currentEfrs.map((e: any) => e.id === id ? res.efr : e))
    } else {
      toast.error(res.error || "Failed to archive")
    }
  }

  const hasActiveFilters = searchQuery || quarterFilter !== "all"
  const clearFilters = () => { setSearchQuery(""); setQuarterFilter("all") }

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getDurationColor = (d: string) => {
    if (d === "Less than a week") return "bg-blue-500/10 text-blue-600 dark:text-blue-400"
    if (d === "1 week") return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
    if (d === "2 weeks") return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    return "bg-purple-500/10 text-purple-600 dark:text-purple-400"
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="text-xl font-semibold">EFR Submissions</h3>
          <p className="text-sm text-muted-foreground">
            Track your engagement feedback and evaluations
            {filteredAndSortedEfrs.length !== efrs.length && (
              <span className="ml-1 text-primary">
                &middot; Showing {filteredAndSortedEfrs.length} of {efrs.length}
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={onAddEfr}
          className="rounded-xl gradient-indigo border-0 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Add EFR
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0 sm:min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search by title, evaluator, engagement, role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-9 rounded-xl border-border/50 bg-muted/30 focus-visible:ring-primary/50 focus-visible:bg-background transition-colors text-sm"
          />
        </div>
        {quarters.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground/60" />
            <Select value={quarterFilter} onValueChange={setQuarterFilter}>
              <SelectTrigger className="w-36 h-9 rounded-xl border-border/50 bg-muted/30 text-sm">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                <SelectItem value="all" className="rounded-lg">All Quarters</SelectItem>
                {quarters.map((q) => (
                  <SelectItem key={q} value={q} className="rounded-lg">{q}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 rounded-xl text-xs text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* EFR Table */}
      <Card className="border border-border/40 shadow-sm rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/50">
              <TableHead className="w-[20%] py-2 px-3">
                <button onClick={() => handleSort("title")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  Title <SortIcon field="title" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-[12%] py-2 px-3">
                <button onClick={() => handleSort("quarter")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  Quarter <SortIcon field="quarter" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-[14%] py-2 px-3">
                <button onClick={() => handleSort("evaluator")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  Evaluator <SortIcon field="evaluator" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-[18%] py-2 px-3">
                <button onClick={() => handleSort("engagement")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  Engagement <SortIcon field="engagement" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-[10%] py-2 px-3">
                <button onClick={() => handleSort("engagementStart")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  Start Date <SortIcon field="engagementStart" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-[10%] py-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Role
              </TableHead>
              <TableHead className="w-[10%] py-2 px-3">
                <button onClick={() => handleSort("duration")} className="flex items-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
                  Duration <SortIcon field="duration" sortField={sortField} sortDir={sortDir} />
                </button>
              </TableHead>
              <TableHead className="w-[6%] py-2 px-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedEfrs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-14">
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/50">
                      <FileText className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {hasActiveFilters ? "No matching EFR submissions found" : "No EFR submissions yet"}
                    </p>
                    <p className="text-xs text-muted-foreground/60">
                      {hasActiveFilters ? "Try adjusting your filters" : "Click \"Add EFR\" to submit your first engagement feedback"}
                    </p>
                    {hasActiveFilters && (
                      <Button variant="outline" size="sm" onClick={clearFilters} className="rounded-xl mt-1 text-xs">Clear Filters</Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedEfrs.map((efr: any, index: number) => (
                <Fragment key={efr.id}>
                  <TableRow
                    key={efr.id}
                    className={`hover:bg-muted/30 transition-colors border-b border-border/20 cursor-pointer ${
                      index % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    } ${expandedRow === efr.id ? "bg-primary/5" : ""}`}
                    onClick={() => setExpandedRow(expandedRow === efr.id ? null : efr.id)}
                  >
                    <TableCell className="py-1.5 px-3">
                      <div className="min-w-0">
                        <span className="font-medium text-xs truncate block">{efr.title}</span>
                        {efr.description && (
                          <span className="text-[11px] text-muted-foreground truncate block">{efr.description}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <Badge variant="secondary" className="rounded-md border-0 font-medium text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        {efr.quarter}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <span className="text-xs truncate block">{efr.evaluator}</span>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <span className="text-xs truncate block">{efr.engagement}</span>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <span className="text-[11px] text-foreground whitespace-nowrap">{formatDate(efr.engagementStart)}</span>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <span className="text-xs truncate block">{efr.role}</span>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <Badge variant="secondary" className={`rounded-md border-0 font-medium text-[10px] whitespace-nowrap ${getDurationColor(efr.duration)}`}>
                        {efr.duration}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5 px-3 text-right">
                      <div className="flex justify-end gap-0.5">
                        {efr.contextComment && (
                          <span className="inline-flex items-center justify-center h-7 w-7" title="Has comment">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); onEditEfr(efr) }}
                          title="Edit EFR"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleArchive(efr.id) }}
                          title="Archive EFR"
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleDelete(efr.id) }}
                          title="Delete EFR"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {/* Expanded Row for Context/Comment */}
                  {expandedRow === efr.id && efr.contextComment && (
                    <TableRow className="bg-muted/20 hover:bg-muted/20">
                      <TableCell colSpan={8} className="py-2 px-6">
                        <div className="flex items-start gap-2 text-xs">
                          <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-foreground">Comment: </span>
                            <span className="text-muted-foreground">{efr.contextComment}</span>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </Card>

      {/* Pagination */}
      {filteredAndSortedEfrs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-4">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{Math.min((effectivePage - 1) * pageSize + 1, filteredAndSortedEfrs.length)}</span>
              {" "}to{" "}
              <span className="font-medium text-foreground">{Math.min(effectivePage * pageSize, filteredAndSortedEfrs.length)}</span>
              {" "}of{" "}
              <span className="font-medium text-foreground">{filteredAndSortedEfrs.length}</span>
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Per page:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1) }}>
                <SelectTrigger className="w-16 h-7 text-xs rounded-lg border-border/50 bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-lg min-w-16">
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={String(s)} className="text-xs">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage === 1} onClick={() => setCurrentPage(1)}>
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage === 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page <span className="font-medium text-foreground">{effectivePage}</span> of <span className="font-medium text-foreground">{totalPages}</span>
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage >= totalPages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" disabled={effectivePage >= totalPages} onClick={() => setCurrentPage(totalPages)}>
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
