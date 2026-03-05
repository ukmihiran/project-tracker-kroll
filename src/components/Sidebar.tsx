"use client"

import { useState, useEffect } from "react"
import { useTheme } from "next-themes"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  ClipboardList,
  FileText,
  UserCircle,
  Calendar,
  Moon,
  Sun,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Menu,
  X,
} from "lucide-react"

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
  userName?: string | null
  userEmail?: string | null
}

export default function Sidebar({ activeTab, onTabChange, userName, userEmail }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Close mobile sidebar on tab change
  const handleTabChange = (tab: string) => {
    onTabChange(tab)
    setMobileOpen(false)
  }

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileOpen])

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "assessments", label: "Assessments", icon: ClipboardList },
    { id: "efr", label: "EFR Submissions", icon: FileText },
    { id: "calendar", label: "Calendar", icon: Calendar },
    { id: "profile", label: "Profile", icon: UserCircle },
  ]

  const initials = userName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U"

  const sidebarContent = (
    <>
      {/* Logo Section */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border/50">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg gradient-indigo shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
        {!collapsed && (
          <span className="font-bold text-base tracking-tight text-white truncate">
            ProjectTracker
          </span>
        )}
        {/* Mobile close button */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden ml-auto p-1.5 rounded-lg text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-sidebar-primary text-white shadow-lg shadow-indigo-500/25"
                  : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent"
              }`}
            >
              <Icon className={`h-5 w-5 shrink-0 ${isActive ? "text-white" : ""}`} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="px-3 pb-4 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent transition-all duration-200"
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5 shrink-0" />
          ) : (
            <Moon className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        {/* Sign Out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {/* User Profile */}
        <div className="border-t border-sidebar-border/50 pt-3 mt-2">
          <button
            onClick={() => handleTabChange("profile")}
            className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-200 hover:bg-sidebar-accent ${
              activeTab === "profile" ? "bg-sidebar-accent" : ""
            }`}
            title="Profile Settings"
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate text-left">{userName}</p>
                <p className="text-xs text-sidebar-foreground/50 truncate text-left">{userEmail}</p>
              </div>
            )}
          </button>
        </div>

        {/* Collapse Toggle - desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center py-2 rounded-xl text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-sidebar text-white shadow-lg hover:bg-sidebar-accent transition-all"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-screen z-50 flex flex-col bg-sidebar text-sidebar-foreground w-72 transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen z-40 flex-col bg-sidebar text-sidebar-foreground transition-all duration-300 ease-in-out ${
          collapsed ? "w-18" : "w-65"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  )
}
