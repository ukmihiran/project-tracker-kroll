"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "react-toastify"
import {
  Bell, Check, CheckCheck, Trash2, X, Clock,
  AlertTriangle, FileText, Calendar, Info, CheckSquare2,
} from "lucide-react"
import {
  getNotifications, getUnreadCount, markAsRead, markAllAsRead,
  deleteNotification, clearAllNotifications, generateNotifications,
} from "@/app/actions/notificationActions"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  createdAt: Date
}

interface NotificationDropdownProps {
  onNavigate?: (tab: string) => void
}

export default function NotificationDropdown({ onNavigate }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load unread count on mount and periodically
  useEffect(() => {
    let cancelled = false
    getUnreadCount().then((res) => {
      if (!cancelled && res.success) setUnreadCount(res.count ?? 0)
    })

    const interval = setInterval(() => {
      getUnreadCount().then((res) => {
        if (!cancelled && res.success) setUnreadCount(res.count ?? 0)
      })
    }, 300000)

    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  // Load full list when dropdown opens
  useEffect(() => {
    if (!open) return

    let cancelled = false

    async function loadNotifications() {
      setLoading(true)

      const generationResult = await generateNotifications()
      if (!cancelled && generationResult.error) {
        toast.error(generationResult.error)
      }

      const [notificationsResult, unreadCountResult] = await Promise.all([
        getNotifications(),
        getUnreadCount(),
      ])

      if (cancelled) return

      if (notificationsResult.success && notificationsResult.notifications) {
        setNotifications(notificationsResult.notifications as Notification[])
      }

      if (unreadCountResult.success) {
        setUnreadCount(unreadCountResult.count ?? 0)
      }

      setLoading(false)
    }

    loadNotifications()
    return () => { cancelled = true }
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const handleMarkRead = async (id: string) => {
    const res = await markAsRead(id)
    if (!res.success) {
      toast.error(res.error || "Failed to mark notification as read")
      return
    }

    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    const res = await markAllAsRead()
    if (!res.success) {
      toast.error(res.error || "Failed to mark notifications as read")
      return
    }

    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    toast.success("All notifications marked as read")
  }

  const handleDelete = async (id: string) => {
    const n = notifications.find(n => n.id === id)
    const res = await deleteNotification(id)
    if (!res.success) {
      toast.error(res.error || "Failed to delete notification")
      return
    }

    setNotifications(prev => prev.filter(n => n.id !== id))
    if (n && !n.read) setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const handleClearAll = async () => {
    const res = await clearAllNotifications()
    if (!res.success) {
      toast.error(res.error || "Failed to clear notifications")
      return
    }

    setNotifications([])
    setUnreadCount(0)
    toast.success("All notifications cleared")
  }

  const handleNotificationClick = (n: Notification) => {
    if (!n.read) handleMarkRead(n.id)
    if (n.link && onNavigate) {
      onNavigate(n.link)
      setOpen(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "project_ending": return <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
      case "assessment_due": return <Calendar className="h-3.5 w-3.5 text-rose-500" />
      case "efr_reminder": return <FileText className="h-3.5 w-3.5 text-indigo-500" />
      case "task_due": return <CheckSquare2 className="h-3.5 w-3.5 text-amber-500" />
      case "task_overdue": return <CheckSquare2 className="h-3.5 w-3.5 text-rose-500" />
      default: return <Info className="h-3.5 w-3.5 text-blue-500" />
    }
  }

  const getTypeBg = (type: string) => {
    switch (type) {
      case "project_ending": return "bg-amber-500/10"
      case "assessment_due": return "bg-rose-500/10"
      case "efr_reminder": return "bg-indigo-500/10"
      case "task_due": return "bg-amber-500/10"
      case "task_overdue": return "bg-rose-500/10"
      default: return "bg-blue-500/10"
    }
  }

  const formatTime = (date: Date) => {
    const now = new Date()
    const d = new Date(date)
    const diffMs = now.getTime() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9 rounded-xl"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1 animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-background border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Notifications</span>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5 rounded-full px-1.5">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg"
                  onClick={handleMarkAllRead}
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-500"
                  onClick={handleClearAll}
                  title="Clear all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Bell className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">No notifications</p>
                <p className="text-[11px]">You&apos;re all caught up!</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors hover:bg-muted/50 ${
                    !n.read ? "bg-indigo-500/5" : ""
                  }`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-lg mt-0.5 ${getTypeBg(n.type)}`}>
                    {getTypeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs font-medium truncate ${!n.read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {!n.read && (
                          <button
                            className="p-0.5 rounded hover:bg-muted"
                            onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id) }}
                            title="Mark as read"
                          >
                            <Check className="h-3 w-3 text-indigo-500" />
                          </button>
                        )}
                        <button
                          className="p-0.5 rounded hover:bg-muted"
                          onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                          title="Delete"
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-red-500" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock className="h-2.5 w-2.5 text-muted-foreground/60" />
                      <span className="text-[10px] text-muted-foreground/60">{formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
