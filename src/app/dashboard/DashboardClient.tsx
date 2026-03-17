"use client"

import { useMemo, useState } from "react"
import { toast } from "react-toastify"
import { PlusCircle, Search, Download, FileSpreadsheet, FileText, CalendarRange, Sparkles, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import Sidebar from "@/components/Sidebar"
import ProjectList from "./ProjectList"
import ProjectModal from "./ProjectModal"
import GoalDashboard from "./GoalDashboard"
import EfrModal from "./EfrModal"
import EfrPage from "./EfrPage"
import CalendarView from "./CalendarView"
import ProfilePage from "./ProfilePage"
import NotificationDropdown from "./NotificationDropdown"
import TaskPage from "./TaskPage"
import TaskModal from "./TaskModal"
import ArchivePage from "./ArchivePage"
import WorkCycleModal from "./WorkCycleModal"
import { exportProjectsPDF, exportProjectsExcel } from "@/lib/exportUtils"
import { buildDashboardStats } from "@/lib/dashboard-utils"
import { createNextYearWorkspace, deleteWorkCycle, getWorkCycles } from "@/app/actions/workCycleActions"
import { getProjects } from "@/app/actions/projectActions"
import { getEfrs } from "@/app/actions/efrActions"
import { getTasks } from "@/app/actions/taskActions"

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

function sortCycles(cycles: any[]) {
  return [...cycles].sort((a, b) => b.year - a.year)
}

function upsertById(items: any[], nextItem: any) {
  const exists = items.some((item) => item.id === nextItem.id)
  if (!exists) return [nextItem, ...items]
  return items.map((item) => item.id === nextItem.id ? nextItem : item)
}

export default function DashboardClient({
  initialProjects,
  initialEfrs,
  initialTasks,
  initialWorkCycles,
  initialCycleId,
  currentUser,
  initialProfile,
}: {
  initialProjects: any[]
  initialEfrs: any[]
  initialTasks: any[]
  initialWorkCycles: any[]
  initialCycleId?: string
  currentUser?: User
  initialProfile?: any
}) {
  const [projects, setProjects] = useState(initialProjects)
  const [efrs, setEfrs] = useState(initialEfrs)
  const [tasks, setTasks] = useState(initialTasks)
  const [workCycles, setWorkCycles] = useState(sortCycles(initialWorkCycles))
  const [activeTab, setActiveTab] = useState("dashboard")
  const [selectedCycleId, setSelectedCycleId] = useState(initialCycleId ?? initialWorkCycles[0]?.id)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [efrModalOpen, setEfrModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [workCycleModalOpen, setWorkCycleModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [selectedEfr, setSelectedEfr] = useState<any>(null)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [selectedWorkCycle, setSelectedWorkCycle] = useState<any>(null)
  const [welcomeBannerVisible, setWelcomeBannerVisible] = useState(true)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const currentYear = new Date().getFullYear()
  const nextYear = currentYear + 1

  const selectedCycle = useMemo(
    () => workCycles.find((cycle) => cycle.id === selectedCycleId) ?? workCycles[0],
    [workCycles, selectedCycleId]
  )
  const currentYearCycle = useMemo(
    () => workCycles.find((cycle) => cycle.year === currentYear) ?? null,
    [currentYear, workCycles]
  )
  const nextYearCycle = useMemo(
    () => workCycles.find((cycle) => cycle.year === nextYear) ?? null,
    [nextYear, workCycles]
  )

  const activeCycleProjects = useMemo(
    () => projects.filter((project) => project.workCycleId === selectedCycle?.id && !project.archivedAt),
    [projects, selectedCycle]
  )
  const activeCycleEfrs = useMemo(
    () => efrs.filter((efr) => efr.workCycleId === selectedCycle?.id && !efr.archivedAt),
    [efrs, selectedCycle]
  )
  const activeCycleTasks = useMemo(
    () => tasks.filter((task) => task.workCycleId === selectedCycle?.id && !task.archivedAt),
    [tasks, selectedCycle]
  )

  const dashboardStats = useMemo(() => {
    if (!selectedCycle) return null
    return buildDashboardStats({
      cycle: selectedCycle,
      projects: activeCycleProjects,
      efrs: activeCycleEfrs,
      tasks: activeCycleTasks,
    })
  }, [selectedCycle, activeCycleProjects, activeCycleEfrs, activeCycleTasks])

  const assessmentTypes = useMemo(() => {
    const types = new Set(activeCycleProjects.map((p: any) => p.assessmentType).filter(Boolean))
    return Array.from(types) as string[]
  }, [activeCycleProjects])

  const filteredProjects = useMemo(() => {
    return activeCycleProjects.filter((p: any) => {
      const matchesSearch = searchQuery === "" ||
        p.engagementName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.consultants?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || p.status === statusFilter
      const matchesType = typeFilter === "all" || p.assessmentType === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [activeCycleProjects, searchQuery, statusFilter, typeFilter])

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const isAssessmentTab = activeTab === "assessments"

  const handleSelectCycle = (cycleId: string) => {
    setSelectedCycleId(cycleId)
    setWelcomeBannerVisible(true)
  }

  const refreshWorkspaceData = async () => {
    const [nextProjects, nextEfrs, nextTasks, nextCycles] = await Promise.all([
      getProjects({ includeArchived: true, allCycles: true }),
      getEfrs({ includeArchived: true, allCycles: true }),
      getTasks({ includeArchived: true, allCycles: true }),
      getWorkCycles(),
    ])

    const sortedCycles = sortCycles(nextCycles)

    setProjects(nextProjects)
    setEfrs(nextEfrs)
    setTasks(nextTasks)
    setWorkCycles(sortedCycles)

    return {
      projects: nextProjects,
      efrs: nextEfrs,
      tasks: nextTasks,
      workCycles: sortedCycles,
    }
  }

  const handlePrepareNextYear = async () => {
    if (nextYearCycle) {
      handleSelectCycle(nextYearCycle.id)
      toast.info(`${nextYear} workspace is already ready`)
      return true
    }

    const result = await createNextYearWorkspace(currentYearCycle?.id)
    if (!result.success) {
      toast.error(result.error || "Failed to prepare next year workspace")
      return false
    }

    await refreshWorkspaceData()
    handleSelectCycle(result.cycle.id)
    toast.success(`Next year workspace ready. Carried ${result.carriedProjects} project(s) and ${result.carriedTasks} task(s).`)
    return true
  }

  const handleDeleteWorkspace = async (cycle: any) => {
    const result = await deleteWorkCycle(cycle.id)
    if (!result.success) {
      toast.error(result.error || "Failed to delete workspace")
      return false
    }

    const nextData = await refreshWorkspaceData()
    if (cycle.id === selectedCycleId) {
      handleSelectCycle(nextData.workCycles[0]?.id)
    }
    toast.success("Workspace deleted")
    return true
  }

  const dismissWelcomeBanner = () => setWelcomeBannerVisible(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={currentUser?.name}
        userEmail={currentUser?.email}
      />

      <div className="lg:pl-65 transition-all duration-300">
        <header className="sticky top-0 z-30 glass h-16 flex items-center justify-between px-4 sm:px-8 border-b border-border/50">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-lg font-semibold text-foreground">
              {activeTab === "dashboard"
                ? "Dashboard"
                : activeTab === "tasks"
                ? "Tasks"
                : activeTab === "assessments"
                ? "Assessments"
                : activeTab === "efr"
                ? "EFR Submissions"
                : activeTab === "calendar"
                ? "Calendar"
                : activeTab === "archive"
                ? "Archive"
                : "Profile"}
            </h1>
            <p className="text-xs text-muted-foreground">{todayDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2">
              <Select value={selectedCycle?.id} onValueChange={handleSelectCycle}>
                <SelectTrigger className="w-48 h-9 rounded-xl border-border/50 bg-muted/40 text-sm">
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
            </div>
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isAssessmentTab ? "Search assessments..." : "Search available in Assessments"}
                value={isAssessmentTab ? searchQuery : ""}
                onChange={(event) => {
                  if (!isAssessmentTab) return
                  setSearchQuery(event.target.value)
                }}
                disabled={!isAssessmentTab}
                className="pl-9 w-48 md:w-64 h-9 bg-muted/50 border-0 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
            <NotificationDropdown onNavigate={setActiveTab} />
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8">
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {welcomeBannerVisible && selectedCycle && (
                <Card className="relative overflow-hidden rounded-3xl border border-border/50 shadow-sm bg-[radial-gradient(circle_at_top_right,_rgba(79,70,229,0.12),_transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,242,255,0.9))] dark:bg-[radial-gradient(circle_at_top_right,_rgba(99,102,241,0.16),_transparent_30%),linear-gradient(135deg,rgba(21,24,41,0.96),rgba(17,24,39,0.94))]">
                  <div className="p-5 sm:p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl gradient-indigo shadow-lg shadow-indigo-500/15">
                          <Sparkles className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-full border-0 bg-primary/10 text-primary">
                              {selectedCycle.name}
                            </Badge>
                            <Badge variant="secondary" className="rounded-full border-0 bg-muted/80 text-muted-foreground">
                              {activeCycleProjects.length} active projects
                            </Badge>
                            <Badge variant="secondary" className="rounded-full border-0 bg-muted/80 text-muted-foreground">
                              {dashboardStats?.taskCounts.dueToday ?? 0} due today
                            </Badge>
                          </div>
                          <h2 className="mt-3 text-xl font-semibold tracking-tight">
                            Welcome back, {currentUser?.name?.split(" ")[0] || "there"}.
                          </h2>
                          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                            Your dashboard is trimmed down for {selectedCycle.year}. Workspace planning now lives in Profile, while this view stays focused on delivery, deadlines, and momentum.
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground"
                        onClick={dismissWelcomeBanner}
                        aria-label="Dismiss welcome banner"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {dashboardStats ? (
                <GoalDashboard stats={dashboardStats} efrs={activeCycleEfrs} />
              ) : (
                <p className="text-muted-foreground">Loading workspace stats...</p>
              )}
            </div>
          )}

          {activeTab === "tasks" && selectedCycle && (
            <TaskPage
              tasks={activeCycleTasks}
              setTasks={setTasks}
              selectedCycle={selectedCycle}
              onAddTask={() => { setSelectedTask(null); setTaskModalOpen(true) }}
              onEditTask={(task: any) => { setSelectedTask(task); setTaskModalOpen(true) }}
            />
          )}

          {activeTab === "assessments" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xl font-semibold">Projects & Assessments</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage project delivery inside {selectedCycle?.name}
                    {filteredProjects.length !== activeCycleProjects.length && (
                      <span className="ml-1 text-primary">
                        &middot; Showing {filteredProjects.length} of {activeCycleProjects.length}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="rounded-xl border-border/50 text-sm h-9"
                      >
                        <Download className="mr-2 h-4 w-4" /> Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-xl w-48">
                      <DropdownMenuItem onClick={() => exportProjectsPDF(filteredProjects)} className="rounded-lg cursor-pointer">
                        <FileText className="mr-2 h-4 w-4 text-red-500" />
                        Export as PDF
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => exportProjectsExcel(filteredProjects)} className="rounded-lg cursor-pointer">
                        <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" />
                        Export as Excel
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    onClick={() => { setSelectedProject(null); setProjectModalOpen(true) }}
                    className="rounded-xl gradient-indigo border-0 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Project
                  </Button>
                </div>
              </div>
              <ProjectList
                projects={filteredProjects}
                setProjects={setProjects as any}
                onEdit={(p: any) => { setSelectedProject(p); setProjectModalOpen(true) }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                assessmentTypes={assessmentTypes}
              />
            </div>
          )}

          {activeTab === "efr" && (
            <EfrPage
              efrs={activeCycleEfrs}
              setEfrs={setEfrs as any}
              onAddEfr={() => { setSelectedEfr(null); setEfrModalOpen(true) }}
              onEditEfr={(efr: any) => { setSelectedEfr(efr); setEfrModalOpen(true) }}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              projects={activeCycleProjects}
              efrs={activeCycleEfrs}
              tasks={activeCycleTasks}
            />
          )}

          {activeTab === "archive" && (
            <ArchivePage
              projects={projects}
              setProjects={setProjects}
              efrs={efrs}
              setEfrs={setEfrs}
              tasks={tasks}
              setTasks={setTasks}
              workCycles={workCycles}
              selectedCycleId={selectedCycle?.id}
            />
          )}

          {activeTab === "profile" && (
            <ProfilePage
              userName={currentUser?.name}
              initialProfile={initialProfile}
              onDataRefresh={refreshWorkspaceData}
              workCycles={workCycles}
              selectedCycleId={selectedCycle?.id}
              projects={projects}
              efrs={efrs}
              tasks={tasks}
              onSelectCycle={handleSelectCycle}
              onCreateWorkspace={() => {
                setSelectedWorkCycle(null)
                setWorkCycleModalOpen(true)
              }}
              onEditWorkspace={(cycle: any) => {
                setSelectedWorkCycle(cycle)
                setWorkCycleModalOpen(true)
              }}
              onPrepareNextYear={handlePrepareNextYear}
              onDeleteWorkspace={handleDeleteWorkspace}
            />
          )}
        </main>
      </div>

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={selectedProject}
        onSave={(newProject: any) => {
          setProjects((currentProjects) => upsertById(currentProjects, newProject))
        }}
        workCycles={workCycles}
        selectedCycleId={selectedCycle?.id}
      />
      <EfrModal
        isOpen={efrModalOpen}
        onClose={() => { setEfrModalOpen(false); setSelectedEfr(null) }}
        onSave={(savedEfr: any) => {
          setEfrs((currentEfrs) => upsertById(currentEfrs, savedEfr))
        }}
        projects={projects}
        workCycles={workCycles}
        selectedCycleId={selectedCycle?.id}
        efr={selectedEfr}
      />
      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setSelectedTask(null) }}
        onSave={(savedTask: any) => {
          setTasks((currentTasks) => upsertById(currentTasks, savedTask))
        }}
        task={selectedTask}
        projects={projects}
        workCycles={workCycles}
        selectedCycleId={selectedCycle?.id}
      />
      <WorkCycleModal
        isOpen={workCycleModalOpen}
        onClose={() => { setWorkCycleModalOpen(false); setSelectedWorkCycle(null) }}
        cycle={selectedWorkCycle}
        onSave={async (savedCycle: any) => {
          await refreshWorkspaceData()
          handleSelectCycle(savedCycle.id)
        }}
      />
    </div>
  )
}
