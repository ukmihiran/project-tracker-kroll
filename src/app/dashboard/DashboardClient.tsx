"use client"

import { useState, useMemo } from "react"
import { PlusCircle, Search, Download, FileSpreadsheet, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Components
import Sidebar from "@/components/Sidebar"
import ProjectList from "./ProjectList"
import ProjectModal from "./ProjectModal"
import GoalDashboard from "./GoalDashboard"
import EfrModal from "./EfrModal"
import EfrPage from "./EfrPage"
import CalendarView from "./CalendarView"
import ProfilePage from "./ProfilePage"
import NotificationDropdown from "./NotificationDropdown"
import { exportProjectsPDF, exportProjectsExcel } from "@/lib/exportUtils"

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export default function DashboardClient({ initialProjects, initialEfrs, dashboardStats, currentUser }: { initialProjects: any[], initialEfrs: any[], dashboardStats: any, currentUser?: User }) {
  const [projects, setProjects] = useState(initialProjects)
  const [efrs, setEfrs] = useState(initialEfrs)
  const [activeTab, setActiveTab] = useState("dashboard")
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [efrModalOpen, setEfrModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [selectedEfr, setSelectedEfr] = useState<any>(null)

  // Assessment filters
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Derive unique assessment types for filter
  const assessmentTypes = useMemo(() => {
    const types = new Set(projects.map((p: any) => p.assessmentType).filter(Boolean))
    return Array.from(types) as string[]
  }, [projects])

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p: any) => {
      const matchesSearch = searchQuery === "" ||
        p.engagementName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.clientName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectID?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.consultants?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || p.status === statusFilter
      const matchesType = typeFilter === "all" || p.assessmentType === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [projects, searchQuery, statusFilter, typeFilter])
  
  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        userName={currentUser?.name}
        userEmail={currentUser?.email}
      />

      {/* Main Content */}
      <div className="lg:pl-65 transition-all duration-300">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 glass h-16 flex items-center justify-between px-4 sm:px-8 border-b border-border/50">
          <div className="pl-12 lg:pl-0">
            <h1 className="text-lg font-semibold text-foreground">
              {activeTab === "dashboard" ? "Dashboard" : activeTab === "assessments" ? "Assessments" : activeTab === "efr" ? "EFR Submissions" : activeTab === "calendar" ? "Calendar" : "Profile"}
            </h1>
            <p className="text-xs text-muted-foreground">{todayDate}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="pl-9 w-48 md:w-64 h-9 bg-muted/50 border-0 rounded-xl text-sm focus-visible:ring-1 focus-visible:ring-primary/50"
              />
            </div>
            <NotificationDropdown onNavigate={setActiveTab} />
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 sm:p-6 lg:p-8">
          {activeTab === "dashboard" && (
            <>
              {/* Welcome Banner - Dashboard only */}
              <div className="mb-8 relative overflow-hidden rounded-2xl gradient-indigo p-6 text-white shadow-xl shadow-indigo-500/10">
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold mb-1">
                    Welcome back, {currentUser?.name?.split(" ")[0]} 👋
                  </h2>
                  <p className="text-indigo-100 text-sm">
                    Here&apos;s an overview of your projects and career goals progress.
                  </p>
                </div>
                <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
                <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
              </div>
              {dashboardStats ? (
                <GoalDashboard
                  stats={dashboardStats}
                  efrs={efrs}
                />
              ) : (
                <p className="text-muted-foreground">Loading stats...</p>
              )}
            </>
          )}

          {activeTab === "assessments" && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xl font-semibold">Projects & Assessments</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage your project engagements
                    {filteredProjects.length !== projects.length && (
                      <span className="ml-1 text-primary">
                        &middot; Showing {filteredProjects.length} of {projects.length}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {/* Export Dropdown */}
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
                allProjects={projects}
                setProjects={setProjects}
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
              efrs={efrs}
              setEfrs={setEfrs}
              onAddEfr={() => { setSelectedEfr(null); setEfrModalOpen(true) }}
              onEditEfr={(efr: any) => { setSelectedEfr(efr); setEfrModalOpen(true) }}
            />
          )}

          {activeTab === "calendar" && (
            <CalendarView
              projects={projects}
              efrs={efrs}
            />
          )}

          {activeTab === "profile" && (
            <ProfilePage
              userName={currentUser?.name}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <ProjectModal 
        isOpen={projectModalOpen} 
        onClose={() => setProjectModalOpen(false)} 
        project={selectedProject} 
        onSave={(newProj: any) => {
          if (selectedProject) {
            setProjects(projects.map((p: any) => p.id === newProj.id ? newProj : p))
          } else {
            setProjects([newProj, ...projects])
          }
        }} 
      />
      <EfrModal
        isOpen={efrModalOpen}
        onClose={() => { setEfrModalOpen(false); setSelectedEfr(null) }}
        onSave={(savedEfr: any) => {
          if (selectedEfr) {
            setEfrs(efrs.map((e: any) => e.id === savedEfr.id ? savedEfr : e))
          } else {
            setEfrs([savedEfr, ...efrs])
          }
        }}
        projects={projects}
        efr={selectedEfr}
      />
    </div>
  )
}
