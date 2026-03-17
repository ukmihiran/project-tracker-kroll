"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "react-toastify"
import { signOut } from "next-auth/react"
import {
  User, Mail, Shield, Calendar, FolderOpen, FileText,
  Pencil, Lock, Trash2, Eye, EyeOff, Check, X, AlertTriangle, Loader2,
  Download, Upload, Database,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  getProfile, updateProfile, changePassword, deleteAccount,
} from "@/app/actions/profileActions"
import { createBackup, restoreBackup } from "@/app/actions/backupActions"
import WorkspaceSettingsPanel from "./WorkspaceSettingsPanel"

interface ProfilePageProps {
  userName?: string | null
  initialProfile?: any
  onProfileUpdate?: (name: string, email: string) => void
  onDataRefresh?: () => Promise<unknown>
  workCycles?: any[]
  selectedCycleId?: string
  projects?: any[]
  efrs?: any[]
  tasks?: any[]
  onSelectCycle?: (cycleId: string) => void
  onCreateWorkspace?: () => void
  onEditWorkspace?: (cycle: any) => void
  onPrepareNextYear?: () => Promise<boolean>
  onDeleteWorkspace?: (cycle: any) => Promise<boolean>
}

export default function ProfilePage({
  userName,
  initialProfile,
  onProfileUpdate,
  onDataRefresh,
  workCycles = [],
  selectedCycleId,
  projects = [],
  efrs = [],
  tasks = [],
  onSelectCycle,
  onCreateWorkspace,
  onEditWorkspace,
  onPrepareNextYear,
  onDeleteWorkspace,
}: ProfilePageProps) {
  // Profile data
  const [profile, setProfile] = useState<any>(initialProfile ?? null)
  const [loading, setLoading] = useState(false)

  // Edit profile state
  const [editMode, setEditMode] = useState(false)
  const [editName, setEditName] = useState(initialProfile?.name || "")
  const [editEmail, setEditEmail] = useState(initialProfile?.email || "")
  const [profileSaving, setProfileSaving] = useState(false)

  // Change password state
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)

  // Delete account state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletePassword, setDeletePassword] = useState("")
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  // Backup state
  const [backingUp, setBackingUp] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    const res = await getProfile()
    if (res.success && res.user) {
      setProfile(res.user)
      setEditName(res.user.name || "")
      setEditEmail(res.user.email || "")
    } else {
      toast.error(res.error || "Failed to load profile")
    }
    setLoading(false)
  }, [])

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      toast.error("Name is required")
      return
    }
    if (!editEmail.trim()) {
      toast.error("Email is required")
      return
    }

    setProfileSaving(true)
    const res = await updateProfile(editName, editEmail)
    if (res.success && res.user) {
      setProfile({ ...profile, name: res.user.name, email: res.user.email })
      setEditMode(false)
      onProfileUpdate?.(res.user.name || "", res.user.email || "")
      toast.success("Profile updated successfully")
    } else {
      toast.error(res.error || "Failed to update")
    }
    setProfileSaving(false)
  }

  const handleCancelEdit = () => {
    setEditName(profile?.name || "")
    setEditEmail(profile?.email || "")
    setEditMode(false)
  }

  const handleChangePassword = async () => {
    if (!currentPassword) {
      toast.error("Current password is required")
      return
    }
    if (!newPassword) {
      toast.error("New password is required")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setPasswordSaving(true)
    const res = await changePassword(currentPassword, newPassword, confirmPassword)
    if (res.success) {
      toast.success("Password changed successfully")
      resetPasswordForm()
      setPasswordDialogOpen(false)
    } else {
      toast.error(res.error || "Failed to change password")
    }
    setPasswordSaving(false)
  }

  const resetPasswordForm = () => {
    setCurrentPassword("")
    setNewPassword("")
    setConfirmPassword("")
    setShowCurrentPassword(false)
    setShowNewPassword(false)
    setShowConfirmPassword(false)
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm")
      return
    }
    if (!deletePassword) {
      toast.error("Password is required")
      return
    }

    setDeleting(true)
    const res = await deleteAccount(deletePassword)
    if (res.success) {
      toast.success("Account deleted")
      signOut({ callbackUrl: "/login" })
    } else {
      toast.error(res.error || "Failed to delete account")
    }
    setDeleting(false)
  }

  // Backup handlers
  const handleDownloadBackup = async () => {
    setBackingUp(true)
    try {
      const res = await createBackup()
      if (res.success && res.data) {
        const blob = new Blob([res.data], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = res.filename || "backup.json"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success("Backup downloaded successfully")
      } else {
        toast.error(res.error || "Failed to create backup")
      }
    } catch {
      toast.error("Failed to create backup")
    }
    setBackingUp(false)
  }

  const handleRestoreBackup = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setRestoring(true)
      try {
        const text = await file.text()
        const res = await restoreBackup(text)
        if (res.success) {
          await Promise.all([
            loadProfile(),
            onDataRefresh?.(),
          ])
          toast.success(res.message || "Backup restored successfully")
        } else {
          toast.error(res.error || "Failed to restore backup")
        }
      } catch {
        toast.error("Failed to read backup file")
      }
      setRestoring(false)
    }
    input.click()
  }

  // Password strength indicator
  const getPasswordStrength = (pw: string) => {
    let score = 0
    if (pw.length >= 8) score++
    if (pw.length >= 12) score++
    if (/[A-Z]/.test(pw)) score++
    if (/[a-z]/.test(pw)) score++
    if (/[0-9]/.test(pw)) score++
    if (/[^A-Za-z0-9]/.test(pw)) score++
    if (score <= 2) return { label: "Weak", color: "bg-red-500", width: "w-1/4" }
    if (score <= 3) return { label: "Fair", color: "bg-amber-500", width: "w-2/4" }
    if (score <= 4) return { label: "Good", color: "bg-blue-500", width: "w-3/4" }
    return { label: "Strong", color: "bg-emerald-500", width: "w-full" }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  const initials = (profile?.name || userName || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const formatDate = (d: string | null) => {
    if (!d) return "—"
    return new Date(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-semibold">Profile & Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your account, workspace flow, security, and backups in one place
        </p>
      </div>

      {/* Profile Card */}
      <Card className="border border-border/40 shadow-sm rounded-xl overflow-hidden">
        {/* Profile Header */}
        <div className="relative gradient-indigo p-6 pb-14">
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -right-4 -bottom-12 w-32 h-32 rounded-full bg-white/5" />
        </div>

        <div className="px-6 pb-6 -mt-10 relative z-10">
          {/* Avatar */}
          <div className="flex items-end gap-4 mb-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-white text-2xl font-bold shadow-lg border-4 border-background">
              {initials}
            </div>
            <div className="pb-1">
              <h4 className="text-lg font-semibold">{profile?.name || userName}</h4>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="rounded-md text-[11px] font-medium bg-primary/10 text-primary border-0">
                  {profile?.role || "CONSULTANT"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Joined {formatDate(profile?.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Stats Row */}
          <div className={`grid gap-4 mb-6 ${workCycles.length > 0 ? "grid-cols-2 lg:grid-cols-3" : "grid-cols-2"}`}>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10">
                <FolderOpen className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-semibold">{profile?.projectCount ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Projects</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-500/10">
                <FileText className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-lg font-semibold">{profile?.efrCount ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">EFR Submissions</p>
              </div>
            </div>
            {workCycles.length > 0 && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 col-span-2 lg:col-span-1">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/10">
                  <Calendar className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold">{workCycles.length}</p>
                  <p className="text-[11px] text-muted-foreground">Workspaces</p>
                </div>
              </div>
            )}
          </div>

          {/* Profile Info Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-sm font-semibold">Account Information</h5>
              {!editMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-8"
                  onClick={() => setEditMode(true)}
                >
                  <Pencil className="h-3 w-3 mr-1.5" /> Edit
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs h-8"
                    onClick={handleCancelEdit}
                    disabled={profileSaving}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-xl text-xs h-8 gradient-indigo border-0 text-white"
                    onClick={handleSaveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? (
                      <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3 mr-1.5" />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {/* Name */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Full Name</p>
                  {editMode ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8 text-sm rounded-lg border-border/50"
                      placeholder="Your name"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{profile?.name || "—"}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Email Address</p>
                  {editMode ? (
                    <Input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="h-8 text-sm rounded-lg border-border/50"
                      placeholder="your@email.com"
                    />
                  ) : (
                    <p className="text-sm font-medium truncate">{profile?.email || "—"}</p>
                  )}
                </div>
              </div>

              {/* Role */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Role</p>
                  <p className="text-sm font-medium">{profile?.role || "CONSULTANT"}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/20">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground mb-0.5">Member Since</p>
                  <p className="text-sm font-medium">{formatDate(profile?.createdAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {workCycles.length > 0 && onSelectCycle && onCreateWorkspace && onEditWorkspace && onPrepareNextYear && onDeleteWorkspace && (
        <WorkspaceSettingsPanel
          workCycles={workCycles}
          selectedCycleId={selectedCycleId}
          projects={projects}
          efrs={efrs}
          tasks={tasks}
          onSelectCycle={onSelectCycle}
          onCreateWorkspace={onCreateWorkspace}
          onEditWorkspace={onEditWorkspace}
          onPrepareNextYear={onPrepareNextYear}
          onDeleteWorkspace={onDeleteWorkspace}
        />
      )}

      {/* Security Section */}
      <Card className="border border-border/40 shadow-sm rounded-xl overflow-hidden">
        <div className="p-6 space-y-4">
          <h5 className="text-sm font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4" /> Security
          </h5>

          {/* Change Password */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-500/10">
                <Lock className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Password</p>
                <p className="text-[11px] text-muted-foreground">Change your account password</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8"
              onClick={() => { resetPasswordForm(); setPasswordDialogOpen(true) }}
            >
              Change Password
            </Button>
          </div>

          {/* Data & Backup */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 px-1">
              <Database className="h-3.5 w-3.5 text-indigo-500" />
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data & Backup</p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-indigo-500/10">
                  <Download className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Export Data (JSON)</p>
                  <p className="text-[11px] text-muted-foreground">Download all your projects and EFRs as JSON</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                onClick={handleDownloadBackup}
                disabled={backingUp}
              >
                {backingUp ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Download className="h-3 w-3 mr-1.5" />}
                Export
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10">
                  <Upload className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Restore from Backup</p>
                  <p className="text-[11px] text-muted-foreground">Import data from a JSON backup file</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl text-xs h-8"
                onClick={handleRestoreBackup}
                disabled={restoring}
              >
                {restoring ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Upload className="h-3 w-3 mr-1.5" />}
                Restore
              </Button>
            </div>

          </div>

          {/* Delete Account */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400">Delete Account</p>
                <p className="text-[11px] text-muted-foreground">Permanently remove your account and all data</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8 border-red-500/30 text-red-600 hover:bg-red-500/10 hover:text-red-700"
              onClick={() => { setDeletePassword(""); setDeleteConfirmText(""); setDeleteDialogOpen(true) }}
            >
              Delete Account
            </Button>
          </div>
        </div>
      </Card>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={(open) => { if (!open) resetPasswordForm(); setPasswordDialogOpen(open) }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Lock className="h-4 w-4" /> Change Password
            </DialogTitle>
            <DialogDescription className="text-xs">
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Current Password</Label>
              <div className="relative">
                <Input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="h-9 text-sm rounded-lg pr-9"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">New Password</Label>
              <div className="relative">
                <Input
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-9 text-sm rounded-lg pr-9"
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {/* Password Strength Meter */}
              {newPassword && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color} ${passwordStrength.width}`} />
                    </div>
                    <span className={`text-[10px] font-medium ${
                      passwordStrength.label === "Weak" ? "text-red-500" :
                      passwordStrength.label === "Fair" ? "text-amber-500" :
                      passwordStrength.label === "Good" ? "text-blue-500" : "text-emerald-500"
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <ul className="text-[10px] text-muted-foreground space-y-0.5">
                    <li className={newPassword.length >= 8 ? "text-emerald-500" : ""}>
                      {newPassword.length >= 8 ? "✓" : "○"} At least 8 characters
                    </li>
                    <li className={/[A-Z]/.test(newPassword) ? "text-emerald-500" : ""}>
                      {/[A-Z]/.test(newPassword) ? "✓" : "○"} One uppercase letter
                    </li>
                    <li className={/[a-z]/.test(newPassword) ? "text-emerald-500" : ""}>
                      {/[a-z]/.test(newPassword) ? "✓" : "○"} One lowercase letter
                    </li>
                    <li className={/[0-9]/.test(newPassword) ? "text-emerald-500" : ""}>
                      {/[0-9]/.test(newPassword) ? "✓" : "○"} One number
                    </li>
                  </ul>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Confirm New Password</Label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-9 text-sm rounded-lg pr-9"
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[10px] text-red-500">Passwords do not match</p>
              )}
              {confirmPassword && newPassword === confirmPassword && (
                <p className="text-[10px] text-emerald-500">✓ Passwords match</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => { resetPasswordForm(); setPasswordDialogOpen(false) }}
              disabled={passwordSaving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl text-xs gradient-indigo border-0 text-white"
              onClick={handleChangePassword}
              disabled={passwordSaving || !currentPassword || !newPassword || newPassword !== confirmPassword}
            >
              {passwordSaving ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Lock className="h-3 w-3 mr-1.5" />
              )}
              Change Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base text-red-600">
              <AlertTriangle className="h-4 w-4" /> Delete Account
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action is <strong>permanent and irreversible</strong>. All your projects, EFR submissions, and account data will be deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-600 dark:text-red-400">
                You will lose all your data including {profile?.projectCount ?? 0} projects and {profile?.efrCount ?? 0} EFR submissions.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Type <span className="font-mono text-red-500">DELETE</span> to confirm</Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="h-9 text-sm rounded-lg font-mono"
                placeholder="DELETE"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Enter your password</Label>
              <Input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="h-9 text-sm rounded-lg"
                placeholder="Your password"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl text-xs"
              onClick={handleDeleteAccount}
              disabled={deleting || deleteConfirmText !== "DELETE" || !deletePassword}
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3 mr-1.5" />
              )}
              Delete My Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
