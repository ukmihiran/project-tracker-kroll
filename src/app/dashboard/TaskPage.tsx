"use client"

import { useMemo, useState, type Dispatch, type DragEvent, type SetStateAction } from "react"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { toast } from "react-toastify"
import {
  Archive,
  CalendarClock,
  CheckCircle2,
  CheckSquare2,
  CircleDashed,
  FolderKanban,
  GripVertical,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react"

import {
  archiveTask,
  deleteTask,
  updateTaskPriority,
  updateTaskStatus,
} from "@/app/actions/taskActions"
import { useConfirm } from "@/components/ConfirmDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getTaskFocusGroups } from "@/lib/dashboard-utils"

const STATUS_OPTIONS = [
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "BLOCKED", label: "Blocked" },
  { value: "DONE", label: "Done" },
] as const

const PRIORITY_OPTIONS = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const

const BOARD_LANES = [
  { value: "TODO", label: "To do", icon: CheckSquare2 },
  { value: "IN_PROGRESS", label: "In progress", icon: CalendarClock },
  { value: "BLOCKED", label: "Blocked", icon: ShieldAlert },
  { value: "DONE", label: "Done", icon: CheckCircle2 },
] as const

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "No due date"
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function getPriorityBadge(priority: string) {
  switch (priority) {
    case "URGENT":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-400"
    case "HIGH":
      return "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    case "LOW":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-400"
    default:
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
  }
}

function getStatusAccent(status: string) {
  switch (status) {
    case "IN_PROGRESS":
      return "border-indigo-500/20 bg-indigo-500/5"
    case "BLOCKED":
      return "border-rose-500/20 bg-rose-500/5"
    case "DONE":
      return "border-emerald-500/20 bg-emerald-500/5"
    default:
      return "border-border/50 bg-background/95"
  }
}

function getDueTone(task: any) {
  if (!task.dueDate) return "bg-muted/40 text-muted-foreground"

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)
  const dueDate = new Date(task.dueDate)

  if (task.status !== "DONE" && dueDate < startOfToday) {
    return "bg-rose-500/10 text-rose-600 dark:text-rose-300"
  }

  if (dueDate.toDateString() === new Date().toDateString()) {
    return "bg-amber-500/10 text-amber-600 dark:text-amber-300"
  }

  return "bg-muted/40 text-muted-foreground"
}

function TaskCard({
  task,
  onToggleDone,
  onEdit,
  onStatusChange,
  onPriorityChange,
  onArchive,
  onDelete,
  draggable = false,
  isDragging = false,
  compact = false,
  dragHandleProps,
  innerRef,
  ...props
}: {
  task: any
  onToggleDone: (task: any) => void
  onEdit: (task: any) => void
  onStatusChange: (task: any, status: string) => void
  onPriorityChange: (task: any, priority: string) => void
  onArchive: (task: any) => void
  onDelete: (task: any) => void
  draggable?: boolean
  isDragging?: boolean
  compact?: boolean
  dragHandleProps?: any
  innerRef?: any
  [key: string]: any
}) {
  return (
    <Card
      ref={innerRef}
      {...props}
      className={`relative rounded-2xl border p-4 shadow-sm transition-all ${compact ? "hover:shadow-sm" : "hover:-translate-y-0.5 hover:shadow-md"} ${draggable ? "" : ""} ${isDragging ? "opacity-60 ring-2 ring-primary ring-opacity-50" : ""} ${getStatusAccent(task.status)} bg-background`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.status === "DONE"}
          onCheckedChange={() => onToggleDone(task)}
          className="mt-1"
          aria-label={`Mark ${task.title} as complete`}
        />
        <div className="min-w-0 flex-1">
          <button className="w-full text-left" onClick={() => onEdit(task)}>
            <div className="flex flex-wrap items-center gap-2">
              <p className={`font-medium ${task.status === "DONE" ? "line-through text-muted-foreground" : ""}`}>
                {task.title}
              </p>
              <Badge variant="secondary" className={`rounded-full border-0 text-[10px] ${getPriorityBadge(task.priority)}`}>
                {task.priority.toLowerCase()}
              </Badge>
              {draggable && (
                <div
                  {...dragHandleProps}
                  className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground cursor-grab active:cursor-grabbing hover:bg-muted/50 p-1 rounded"
                >
                  <GripVertical className="h-3.5 w-3.5" />
                  Drag
                </div>
              )}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${getDueTone(task)}`}>
                <CalendarClock className="h-3 w-3" />
                {formatDate(task.dueDate)}
              </span>
              {task.project?.engagementName && (
                <span className="inline-flex items-center gap-1 rounded-full bg-muted/40 px-2 py-1">
                  <FolderKanban className="h-3 w-3" />
                  {task.project.engagementName}
                </span>
              )}
            </div>
            {task.description && (
              <p className={`mt-3 text-sm text-muted-foreground ${compact ? "line-clamp-1" : "line-clamp-2"}`}>
                {task.description}
              </p>
            )}
          </button>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!draggable && (
              <Select value={task.status} onValueChange={(value) => onStatusChange(task, value)}>
                <SelectTrigger className="h-8 w-36 rounded-xl border-border/50 bg-background text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="rounded-lg text-xs">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={task.priority} onValueChange={(value) => onPriorityChange(task, value)}>
              <SelectTrigger className="h-8 w-32 rounded-xl border-border/50 bg-background text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border/50">
                {PRIORITY_OPTIONS.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value} className="rounded-lg text-xs">
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs" onClick={() => onArchive(task)}>
              <Archive className="mr-1 h-3.5 w-3.5" />
              Archive
            </Button>
            <Button variant="ghost" size="sm" className="h-8 rounded-xl text-xs text-red-500 hover:text-red-600" onClick={() => onDelete(task)}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

function TaskColumn({
  title,
  icon: Icon,
  tasks,
  emptyMessage,
  ...handlers
}: {
  title: string
  icon: any
  tasks: any[]
  emptyMessage: string
  onToggleDone: (task: any) => void
  onEdit: (task: any) => void
  onStatusChange: (task: any, status: string) => void
  onPriorityChange: (task: any, priority: string) => void
  onArchive: (task: any) => void
  onDelete: (task: any) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h4 className="font-semibold">{title}</h4>
        <Badge variant="secondary" className="rounded-full text-[10px]">{tasks.length}</Badge>
      </div>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </Card>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} {...handlers} />
          ))
        )}
      </div>
    </div>
  )
}

function BoardLane({
  title,
  icon: Icon,
  status,
  tasks,
  ...handlers
}: {
  title: string
  icon: any
  status: string
  tasks: any[]
  onToggleDone: (task: any) => void
  onEdit: (task: any) => void
  onStatusChange: (task: any, status: string) => void
  onPriorityChange: (task: any, priority: string) => void
  onArchive: (task: any) => void
  onDelete: (task: any) => void
}) {
  return (
    <Card className="rounded-3xl border border-border/50 bg-card p-4 shadow-sm flex flex-col h-full max-h-[800px]">
      <div className="mb-4 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">{title}</h4>
            <p className="text-[11px] text-muted-foreground">{tasks.length} task{tasks.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      </div>

      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-3 min-h-[150px] flex-1 overflow-y-auto pr-1 transition-colors rounded-xl p-1 -m-1 ${snapshot.isDraggingOver ? "bg-primary/5 border border-dashed border-primary/20" : ""}`}
          >
            {tasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/60 p-4 text-xs text-center text-muted-foreground mt-2">
                {snapshot.isDraggingOver ? "Drop to move" : `No tasks in ${title.toLowerCase()}`}
              </div>
            ) : (
              tasks.map((task, index) => (
                <Draggable key={task.id} draggableId={task.id} index={index}>
                  {(provided, snapshot) => (
                    <TaskCard
                      innerRef={provided.innerRef}
                      {...provided.draggableProps}
                      dragHandleProps={provided.dragHandleProps}
                      task={task}
                      compact
                      draggable
                      isDragging={snapshot.isDragging}
                      {...handlers}
                      style={{ ...provided.draggableProps.style }}
                    />
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </Card>
  )
}

export default function TaskPage({
  tasks,
  setTasks,
  selectedCycle,
  onAddTask,
  onEditTask,
}: {
  tasks: any[]
  setTasks: Dispatch<SetStateAction<any[]>>
  selectedCycle: any
  onAddTask: () => void
  onEditTask: (task: any) => void
}) {
  const confirm = useConfirm()
  const [view, setView] = useState("focus")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")

  // Update tasks locally on drag end for smooth UI
  const onDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result
    
    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const newStatus = destination.droppableId
    const task = tasks.find((t) => t.id === draggableId)
    
    if (!task) return

    // Optimistically update
    const updatedTask = { ...task, status: newStatus }
    setTasks((current) => 
      current.map((t) => (t.id === draggableId ? updatedTask : t))
    )

    if (task.status !== newStatus) {
      const resp = await updateTaskStatus(draggableId, newStatus)
      if (!resp.success) {
        toast.error(resp.error || "Failed to update task status")
        // Revert on failure
        setTasks((current) => 
          current.map((t) => (t.id === draggableId ? task : t))
        )
      }
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = searchQuery === "" ||
        task.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.project?.engagementName?.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === "all" || task.status === statusFilter
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter
      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [tasks, searchQuery, statusFilter, priorityFilter])

  const focusGroups = useMemo(() => getTaskFocusGroups(filteredTasks), [filteredTasks])
  const boardColumns = useMemo(() => ({
    TODO: filteredTasks.filter((task) => task.status === "TODO"),
    IN_PROGRESS: filteredTasks.filter((task) => task.status === "IN_PROGRESS"),
    BLOCKED: filteredTasks.filter((task) => task.status === "BLOCKED"),
    DONE: filteredTasks.filter((task) => task.status === "DONE"),
  }), [filteredTasks])

  const stats = {
    open: tasks.filter((task) => task.status !== "DONE").length,
    overdue: tasks.filter((task) => task.status !== "DONE" && task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))).length,
    dueToday: tasks.filter((task) => {
      if (task.status === "DONE" || !task.dueDate) return false
      const dueDate = new Date(task.dueDate)
      const today = new Date()
      return dueDate.toDateString() === today.toDateString()
    }).length,
    done: tasks.filter((task) => task.status === "DONE").length,
  }

  const replaceTask = (updatedTask: any) => {
    setTasks((currentTasks) => currentTasks.map((task) => task.id === updatedTask.id ? updatedTask : task))
  }

  const handleToggleDone = async (task: any) => {
    const nextStatus = task.status === "DONE" ? "TODO" : "DONE"
    const result = await updateTaskStatus(task.id, nextStatus)
    if (!result.success) {
      toast.error(result.error || "Failed to update task")
      return
    }
    replaceTask(result.task)
  }

  const handleStatusChange = async (task: any, status: string) => {
    const result = await updateTaskStatus(task.id, status)
    if (!result.success) {
      toast.error(result.error || "Failed to update task")
      return
    }
    replaceTask(result.task)
  }

  const handlePriorityChange = async (task: any, priority: string) => {
    const result = await updateTaskPriority(task.id, priority)
    if (!result.success) {
      toast.error(result.error || "Failed to update task priority")
      return
    }
    replaceTask(result.task)
  }

  const handleArchive = async (task: any) => {
    const confirmed = await confirm({
      title: "Archive task",
      description: "This task will move out of the active workspace but remain available in Archive.",
      confirmText: "Archive",
      cancelText: "Cancel",
    })

    if (!confirmed) return

    const result = await archiveTask(task.id)
    if (!result.success) {
      toast.error(result.error || "Failed to archive task")
      return
    }

    replaceTask(result.task)
    toast.success("Task archived")
  }

  const handleDelete = async (task: any) => {
    const confirmed = await confirm({
      title: "Delete task",
      description: "Are you sure you want to permanently delete this task?",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "danger",
    })

    if (!confirmed) return

    const result = await deleteTask(task.id)
    if (!result.success) {
      toast.error(result.error || "Failed to delete task")
      return
    }

    setTasks((currentTasks) => currentTasks.filter((currentTask) => currentTask.id !== task.id))
    toast.success("Task deleted")
  }

  const taskCardHandlers = {
    onToggleDone: handleToggleDone,
    onEdit: onEditTask,
    onStatusChange: handleStatusChange,
    onPriorityChange: handlePriorityChange,
    onArchive: handleArchive,
    onDelete: handleDelete,
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CheckSquare2 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-semibold tracking-tight">Tasks</h3>
              {selectedCycle && (
                <Badge variant="secondary" className="rounded-full border-0 bg-muted/80 text-muted-foreground font-medium text-xs">
                  {selectedCycle.name}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Manage your work and switch between focus and board views.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 rounded-xl border-border/50 text-sm hidden sm:flex" onClick={() => setView(view === "board" ? "focus" : "board")}>
            {view === "board" ? "Focus view" : "Board view"}
          </Button>
          <Button onClick={onAddTask} size="sm" className="h-9 rounded-xl gradient-indigo border-0 text-white shadow-sm font-medium">
            <Plus className="mr-1.5 h-4 w-4" />
            New task
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border border-border/40 shadow-sm flex items-center p-3 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted/30">
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Open</p>
            <p className="text-xl font-semibold leading-none">{stats.open}</p>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/40 shadow-sm flex items-center p-3 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
            <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Due today</p>
            <p className="text-xl font-semibold leading-none text-amber-600 dark:text-amber-300">{stats.dueToday}</p>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/40 shadow-sm flex items-center p-3 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500/10">
            <ShieldAlert className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Overdue</p>
            <p className="text-xl font-semibold leading-none text-rose-600 dark:text-rose-300">{stats.overdue}</p>
          </div>
        </Card>
        <Card className="rounded-2xl border border-border/40 shadow-sm flex items-center p-3 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Completed</p>
            <p className="text-xl font-semibold leading-none text-emerald-600 dark:text-emerald-300">{stats.done}</p>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl border border-border/50 p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="rounded-2xl bg-muted/30 p-1.5">
              <TabsTrigger value="focus" className="rounded-xl">Focus</TabsTrigger>
              <TabsTrigger value="board" className="rounded-xl">Board</TabsTrigger>
              <TabsTrigger value="done" className="rounded-xl">Done</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-1 flex-col gap-3 xl:flex-row xl:justify-end">
            <div className="relative xl:max-w-md xl:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tasks, notes, or linked projects..."
                className="h-10 rounded-2xl border-border/50 bg-muted/20 pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10 w-36 rounded-2xl border-border/50 bg-muted/20">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="all" className="rounded-lg">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value} className="rounded-lg">
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="h-10 w-36 rounded-2xl border-border/50 bg-muted/20">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/50">
                  <SelectItem value="all" className="rounded-lg">All priorities</SelectItem>
                  {PRIORITY_OPTIONS.map((priority) => (
                    <SelectItem key={priority.value} value={priority.value} className="rounded-lg">
                      {priority.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {view === "board" && (
          <div className="mt-3 rounded-2xl border border-border/40 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Drag tasks between lanes to change status. Click any task card to open the full editor.
          </div>
        )}
      </Card>

      <Tabs value={view} onValueChange={setView}>
        <TabsContent value="focus" className="mt-0 space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <TaskColumn
              title="Today"
              icon={CalendarClock}
              tasks={focusGroups.today}
              emptyMessage="Nothing due today yet."
              {...taskCardHandlers}
            />
            <TaskColumn
              title="Overdue"
              icon={ShieldAlert}
              tasks={focusGroups.overdue}
              emptyMessage="No overdue work. Nice."
              {...taskCardHandlers}
            />
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            <TaskColumn
              title="This week"
              icon={CircleDashed}
              tasks={focusGroups.thisWeek}
              emptyMessage="No tasks due later this week."
              {...taskCardHandlers}
            />
            <TaskColumn
              title="Backlog"
              icon={CheckSquare2}
              tasks={focusGroups.backlog}
              emptyMessage="No unscheduled backlog items."
              {...taskCardHandlers}
            />
          </div>
        </TabsContent>

        <TabsContent value="board" className="mt-0">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="grid gap-5 xl:grid-cols-4 hide-scrollbar">
              {BOARD_LANES.map((lane) => (
                <BoardLane
                  key={lane.value}
                  title={lane.label}
                  icon={lane.icon}
                  status={lane.value}
                  tasks={boardColumns[lane.value as keyof typeof boardColumns]}
                  {...taskCardHandlers}
                />
              ))}
            </div>
          </DragDropContext>
        </TabsContent>

        <TabsContent value="done" className="mt-0">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h4 className="font-semibold">Recently completed</h4>
            </div>
            {focusGroups.recentlyDone.length === 0 ? (
              <Card className="rounded-2xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
                No completed tasks in the last 7 days.
              </Card>
            ) : (
              <div className="space-y-3">
                {focusGroups.recentlyDone.map((task) => (
                  <TaskCard key={task.id} task={task} {...taskCardHandlers} />
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
