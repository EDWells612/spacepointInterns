import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import {
  Plus, X, Pencil, Clock, ExternalLink, ChevronRight, Trash2, Check, RotateCcw,
} from "lucide-react"
import KanbanBoard from "@/components/kanban/KanbanBoard"
import { useAuth } from "@/context/AuthContext"
import type { Project, ProjectStatus, Task, Team, Subtask, WorkStatus } from "@/types"
import { getProjectsApi, createProjectApi, updateProjectApi, deleteProjectApi } from "@/api/projects"
import { getAllTasksApi, createTaskApi, updateTaskApi, deleteTaskApi } from "@/api/tasks"
import { getTeamsApi } from "@/api/teams"
import { getTaskSubtasksApi } from "@/api/subtasks"
import { cn } from "@/lib/utils"

/* ── styling ─────────────────────────────────────────────────────────── */
const TASK_STATUS: Record<WorkStatus, { dot: string; badge: string }> = {
  todo:        { dot: "bg-gray-300",  badge: "bg-gray-100 text-gray-500" },
  in_progress: { dot: "bg-[#a880ff]", badge: "bg-[#d6c7e1] text-[#643f83]" },
  done:        { dot: "bg-black",     badge: "bg-black text-white" },
}

const PROJ_COL: Record<string, { label: string; dot: string; badge: string; id: string }> = {
  active:    { label: "Active",       dot: "bg-[#a880ff]", badge: "bg-[#d6c7e1] text-[#643f83]", id: "proj_active" },
  completed: { label: "Done",        dot: "bg-black",     badge: "bg-black text-white",           id: "proj_completed" },
}

const TASK_COLS: { title: string; status: WorkStatus }[] = [
  { title: "To do",       status: "todo" },
  { title: "In progress", status: "in_progress" },
  { title: "Done",        status: "done" },
]

/* ================================================================== */
/* Entry point                                                         */
/* ================================================================== */
export default function Dashboard() {
  const { currentUser } = useAuth()
  if (!currentUser) return null
  if (currentUser.role === "admin") return <AdminDashboard />
  return <KanbanBoard />
}

/* ================================================================== */
/* Admin dashboard                                                     */
/* ================================================================== */
function AdminDashboard() {
  const queryClient = useQueryClient()

  /* modal / selection state */
  const [selectedTask,      setSelectedTask]      = useState<Task | null>(null)
  const [activeProject,     setActiveProject]     = useState<Project | null>(null)
  const [createProjectOpen, setCreateProjectOpen] = useState(false)

  /* drag state — separate for projects vs tasks */
  const [dragProject, setDragProject] = useState<Project | null>(null)
  const [dragTask,    setDragTask]    = useState<Task | null>(null)
  const [projectFilter, setProjectFilter] = useState("all")

  /* data */
  const { data: tasks    = [], isLoading } = useQuery<Task[]>({    queryKey: ["tasks", "admin"], queryFn: getAllTasksApi })
  const { data: teams    = [] }            = useQuery<Team[]>({    queryKey: ["teams"],          queryFn: getTeamsApi })
  const { data: projects = [] }            = useQuery<Project[]>({ queryKey: ["projects"],       queryFn: getProjectsApi })

  /* sensors */
  const projSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const taskSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  /* ── project move mutation ─────────────────────────────────────── */
  const moveProjectMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProjectStatus }) =>
      updateProjectApi(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["projects"] })
      const prev = queryClient.getQueryData<Project[]>(["projects"])
      queryClient.setQueryData<Project[]>(["projects"], (old) =>
        (old ?? []).map((p) => (p.id === id ? { ...p, status } : p))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(["projects"], ctx.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["projects"] }),
  })

  /* ── delete project mutation ──────────────────────────────────── */
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => deleteProjectApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] })
      queryClient.invalidateQueries({ queryKey: ["tasks", "admin"] })
      setActiveProject(null)
    },
  })

  /* ── task move mutation ────────────────────────────────────────── */
  const moveTaskMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: WorkStatus }) => updateTaskApi(id, { status }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", "admin"] })
      const prev = queryClient.getQueryData<Task[]>(["tasks", "admin"])
      queryClient.setQueryData<Task[]>(["tasks", "admin"], (old) =>
        (old ?? []).map((t) => (t.id === id ? { ...t, status } : t))
      )
      return { prev }
    },
    onError: (_e, _v, ctx) => { if (ctx?.prev) queryClient.setQueryData(["tasks", "admin"], ctx.prev) },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks", "admin"] }),
  })

  /* helpers */
  const teamName    = (id: string) => teams.find((t) => t.id === id)?.name    ?? "—"
  const projectName = (id: string) => projects.find((p) => p.id === id)?.title ?? "—"

  const activeProjects    = projects.filter((p) => (p.status ?? "active") === "active")
  const completedProjects = projects.filter((p) => (p.status ?? "active") === "completed")
  const filteredTasks     = projectFilter === "all" ? tasks : tasks.filter((t) => t.project_id === projectFilter)

  /* ── project dnd handlers ──────────────────────────────────────── */
  const onProjDragStart = (e: DragStartEvent) =>
    setDragProject(projects.find((p) => p.id === String(e.active.id)) ?? null)

  const onProjDragEnd = (e: DragEndEvent) => {
    setDragProject(null)
    const { active, over } = e
    if (!over) return
    const colId = String(over.id)
    const newStatus: ProjectStatus = colId === "proj_completed" ? "completed" : "active"
    const proj = projects.find((p) => p.id === String(active.id))
    if (!proj || proj.status === newStatus) return
    moveProjectMutation.mutate({ id: proj.id, status: newStatus })
  }

  /* ── task dnd handlers ─────────────────────────────────────────── */
  const onTaskDragStart = (e: DragStartEvent) =>
    setDragTask(filteredTasks.find((t) => t.id === String(e.active.id)) ?? null)

  const onTaskDragEnd = (e: DragEndEvent) => {
    setDragTask(null)
    const { active, over } = e
    if (!over) return
    const ns = String(over.id) as WorkStatus
    if (!["todo", "in_progress", "done"].includes(ns)) return
    const task = tasks.find((t) => t.id === String(active.id))
    if (!task || task.status === ns) return
    moveTaskMutation.mutate({ id: task.id, status: ns })
  }

  if (isLoading) return <PageSpinner />

  return (
    <div className="flex flex-col gap-10">

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => setCreateProjectOpen(true)}
          className="flex items-center gap-1.5 h-9 px-4 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition-colors"
        >
          <Plus size={14} /> New project
        </button>
      </div>

      {/* ── Projects kanban (draggable) ───────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Projects</p>

        <DndContext sensors={projSensors} onDragStart={onProjDragStart} onDragEnd={onProjDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectColumn
              colKey="active"
              projects={activeProjects}
              taskCounts={tasks}
              onManage={setActiveProject}
            />
            <ProjectColumn
              colKey="completed"
              projects={completedProjects}
              taskCounts={tasks}
              onManage={setActiveProject}
            />
          </div>

          <DragOverlay>
            {dragProject && (
              <ProjectCardOverlay
                project={dragProject}
                taskCount={tasks.filter((t) => t.project_id === dragProject.id).length}
              />
            )}
          </DragOverlay>
        </DndContext>
      </section>

      {/* ── All tasks kanban ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Tasks
            {projectFilter !== "all" && (
              <span className="ml-2 font-normal normal-case text-gray-400">
                · {projectName(projectFilter)}
              </span>
            )}
          </p>
          <div className="relative">
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 pl-3 pr-8 text-xs border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-black transition-colors appearance-none cursor-pointer"
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <ChevronRight size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none rotate-90" />
          </div>
        </div>

        <DndContext sensors={taskSensors} onDragStart={onTaskDragStart} onDragEnd={onTaskDragEnd}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {TASK_COLS.map((col) => (
              <AdminTaskColumn
                key={col.status}
                title={col.title} status={col.status}
                tasks={filteredTasks.filter((t) => t.status === col.status)}
                teamName={teamName} projectName={projectName}
                onTaskClick={setSelectedTask}
              />
            ))}
          </div>
          <DragOverlay>
            {dragTask && (
              <AdminTaskCard
                task={dragTask}
                teamName={teamName(dragTask.team_id)}
                projectName={projectName(dragTask.project_id)}
                onClick={() => {}} isDragOverlay
              />
            )}
          </DragOverlay>
        </DndContext>
      </section>

      {/* ── Project manage panel ─────────────────────────────────────── */}
      {activeProject && (
        <ProjectTasksPanel
          project={activeProject}
          tasks={tasks.filter((t) => t.project_id === activeProject.id)}
          teams={teams}
          teamName={teamName}
          onTaskClick={setSelectedTask}
          onClose={() => setActiveProject(null)}
          onTaskCreated={() => queryClient.invalidateQueries({ queryKey: ["tasks", "admin"] })}
          onToggleStatus={() =>
            moveProjectMutation.mutate({
              id: activeProject.id,
              status: (activeProject.status ?? "active") === "active" ? "completed" : "active",
            })
          }
          onDelete={() => {
            if (confirm(`Delete "${activeProject.title}" and all its tasks?`))
              deleteProjectMutation.mutate(activeProject.id)
          }}
        />
      )}

      {/* ── Task detail modal ─────────────────────────────────────────── */}
      {selectedTask && (
        <AdminTaskModal
          key={selectedTask.id}
          task={selectedTask}
          teams={teams}
          projectName={projectName(selectedTask.project_id)}
          elevated={!!activeProject}
          onClose={() => setSelectedTask(null)}
          onSaved={(updated) => {
            queryClient.setQueryData<Task[]>(["tasks", "admin"], (old) =>
              (old ?? []).map((t) => (t.id === updated.id ? updated : t))
            )
            setSelectedTask(updated)
          }}
          onDeleted={(id) => {
            queryClient.setQueryData<Task[]>(["tasks", "admin"], (old) =>
              (old ?? []).filter((t) => t.id !== id)
            )
            setSelectedTask(null)
          }}
        />
      )}

      {/* ── Create project modal ─────────────────────────────────────── */}
      {createProjectOpen && (
        <CreateProjectModal
          onClose={() => setCreateProjectOpen(false)}
          onCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["projects"] })
            setCreateProjectOpen(false)
          }}
        />
      )}
    </div>
  )
}

/* ================================================================== */
/* Project column — useDroppable + scrollable card list               */
/* ================================================================== */
function ProjectColumn({ colKey, projects, taskCounts, onManage }: {
  colKey: "active" | "completed"
  projects: Project[]
  taskCounts: Task[]
  onManage: (p: Project) => void
}) {
  const col = PROJ_COL[colKey]
  const { setNodeRef, isOver } = useDroppable({ id: col.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col rounded-2xl border p-4 transition-colors",
        isOver
          ? "border-[#a880ff] bg-[#a880ff]/5"
          : colKey === "active"
            ? "border-gray-100 bg-gray-50/50"
            : "border-black/10 bg-black/[0.02]"
      )}
    >
      {/* Column header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", col.dot)} />
          <span className="text-xs font-semibold text-black uppercase tracking-widest">{col.label}</span>
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", col.badge)}>
          {projects.length}
        </span>
      </div>

      {/* Scrollable card list */}
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[320px] pr-0.5">
        {projects.map((p) => (
          <ProjectCard
            key={p.id}
            project={p}
            taskCount={taskCounts.filter((t) => t.project_id === p.id).length}
            onManage={() => onManage(p)}
          />
        ))}
        {projects.length === 0 && (
          <div className="flex items-center justify-center h-16">
            <p className="text-xs text-gray-300">Drop here</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Project card — useDraggable ─────────────────────────────────────── */
function ProjectCard({ project, taskCount, onManage }: {
  project: Project; taskCount: number; onManage: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: project.id })
  const isDone = (project.status ?? "active") === "completed"
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      {...attributes} {...listeners}
      className={cn(
        "bg-white border border-gray-100 rounded-xl p-3.5 select-none transition-all cursor-grab active:cursor-grabbing hover:border-gray-200 hover:shadow-sm",
        isDragging && "shadow-lg"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className={cn("text-sm font-semibold leading-snug truncate", isDone ? "text-gray-400 line-through" : "text-black")}>
            {project.title}
          </p>
          {project.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{project.description}</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{taskCount} task{taskCount !== 1 ? "s" : ""}</span>
        <div onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => { e.stopPropagation(); onManage() }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#643f83] hover:text-[#4a2d63] transition-colors"
          >
            Manage <ChevronRight size={10} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Drag overlay (lightweight copy, no dnd hooks) ───────────────────── */
function ProjectCardOverlay({ project, taskCount }: { project: Project; taskCount: number }) {
  return (
    <div className="bg-white border-2 border-[#a880ff] rounded-xl p-3.5 shadow-xl rotate-1 cursor-grabbing">
      <p className="text-sm font-semibold text-black leading-snug truncate">{project.title}</p>
      <p className="text-[11px] text-gray-400 mt-1">{taskCount} task{taskCount !== 1 ? "s" : ""}</p>
    </div>
  )
}

/* ================================================================== */
/* Project tasks panel (modal with Add Task)                           */
/* ================================================================== */
function ProjectTasksPanel({ project, tasks, teams, teamName, onTaskClick, onClose, onTaskCreated, onToggleStatus, onDelete }: {
  project: Project; tasks: Task[]; teams: Team[]
  teamName: (id: string) => string
  onTaskClick: (t: Task) => void; onClose: () => void; onTaskCreated: () => void
  onToggleStatus: () => void; onDelete: () => void
}) {
  const [createTaskOpen, setCreateTaskOpen] = useState(false)
  const isDone = (project.status ?? "active") === "completed"

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-base font-semibold text-black truncate">{project.title}</p>
            </div>
            {project.description && (
              <p className="text-xs text-gray-400 mb-1">{project.description}</p>
            )}
            <p className="text-xs text-gray-400">{tasks.length} task{tasks.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <button
              onClick={onToggleStatus}
              title={isDone ? "Reopen project" : "Mark project as done"}
              className={cn(
                "flex items-center gap-1 h-8 px-3 text-xs font-medium rounded-lg border transition-colors",
                isDone
                  ? "border-gray-200 text-gray-500 hover:border-black hover:text-black"
                  : "border-gray-200 text-gray-500 hover:border-black hover:bg-black hover:text-white"
              )}
            >
              {isDone ? <RotateCcw size={11} /> : <Check size={11} />}
              {isDone ? "Reopen" : "Mark done"}
            </button>
            {teams.length > 0 && (
              <button
                onClick={() => setCreateTaskOpen(true)}
                className="flex items-center gap-1.5 h-8 px-3 bg-black text-white text-xs font-medium rounded-lg hover:bg-gray-900 transition-colors"
              >
                <Plus size={12} /> Add task
              </button>
            )}
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Delete project"
            >
              <Trash2 size={15} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-black transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable task list */}
        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 gap-3">
              <p className="text-sm text-gray-400">No tasks in this project yet</p>
              {teams.length > 0 && (
                <button
                  onClick={() => setCreateTaskOpen(true)}
                  className="flex items-center gap-1.5 h-8 px-4 border border-dashed border-gray-300 rounded-xl text-xs font-medium text-gray-500 hover:border-black hover:text-black transition-colors"
                >
                  <Plus size={12} /> Add the first task
                </button>
              )}
            </div>
          ) : (
            tasks.map((task) => {
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done"
              return (
                <button
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="w-full text-left flex items-center gap-3 p-3.5 border border-gray-100 rounded-xl hover:border-gray-200 hover:bg-gray-50/50 transition-all group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] text-gray-400">{teamName(task.team_id)}</span>
                      {task.due_date && (
                        <>
                          <span className="text-gray-200">·</span>
                          <span className={cn(
                            "flex items-center gap-1 text-[11px]",
                            isOverdue ? "text-red-400" : "text-gray-400"
                          )}>
                            <Clock size={9} />
                            {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", TASK_STATUS[task.status].badge)}>
                      {task.status.replace("_", " ")}
                    </span>
                    <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {createTaskOpen && (
        <CreateTaskModal
          project={project} teams={teams}
          onClose={() => setCreateTaskOpen(false)}
          onCreated={() => { setCreateTaskOpen(false); onTaskCreated() }}
        />
      )}
    </div>
  )
}

/* ================================================================== */
/* Admin task column (useDroppable)                                    */
/* ================================================================== */
function AdminTaskColumn({ title, status, tasks, teamName, projectName, onTaskClick }: {
  title: string; status: WorkStatus; tasks: Task[]
  teamName: (id: string) => string; projectName: (id: string) => string
  onTaskClick: (t: Task) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status })
  const s = TASK_STATUS[status]
  return (
    <div ref={setNodeRef} className={cn(
      "flex flex-col gap-3 rounded-2xl border p-4 min-h-[360px] transition-colors",
      isOver ? "border-[#a880ff] bg-[#a880ff]/5" : "border-gray-100 bg-gray-50/50"
    )}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={cn("w-2 h-2 rounded-full", s.dot)} />
          <span className="text-xs font-semibold text-black uppercase tracking-widest">{title}</span>
        </div>
        <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", s.badge)}>{tasks.length}</span>
      </div>
      <div className="flex flex-col gap-2 flex-1">
        {tasks.map((task) => (
          <AdminTaskCard
            key={task.id} task={task}
            teamName={teamName(task.team_id)}
            projectName={projectName(task.project_id)}
            onClick={() => onTaskClick(task)}
          />
        ))}
      </div>
      {tasks.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-gray-300">Drop here</p>
        </div>
      )}
    </div>
  )
}

/* ── Admin task card (useDraggable) ──────────────────────────────────── */
function AdminTaskCard({ task, teamName, projectName, onClick, isDragOverlay }: {
  task: Task; teamName: string; projectName: string
  onClick: () => void; isDragOverlay?: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id })
  const due = task.due_date ? new Date(task.due_date) : null
  const isOverdue = due && due < new Date() && task.status !== "done"

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging && !isDragOverlay ? 0.4 : 1 }}
      {...attributes} {...listeners}
      onClick={onClick}
      className={cn(
        "bg-white border-2 border-black rounded-xl p-3 cursor-pointer select-none transition-all hover:shadow-md",
        isDragging && !isDragOverlay && "shadow-lg"
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <p className="text-sm font-semibold text-black leading-snug flex-1">{task.title}</p>
        <button
          onClick={(e) => { e.stopPropagation(); onClick() }}
          className="p-1 rounded text-gray-400 hover:text-black flex-shrink-0 transition-colors"
        >
          <Pencil size={11} />
        </button>
      </div>
      <p className="text-[11px] text-gray-500 mb-2">{projectName} · {teamName}</p>
      {due && (
        <div className={cn("flex items-center gap-1 text-[11px]", isOverdue ? "text-red-500" : "text-gray-400")}>
          <Clock size={10} />
          <span>{due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* Admin task modal                                                    */
/* ================================================================== */
function AdminTaskModal({ task, teams, projectName, onClose, onSaved, onDeleted, elevated = false }: {
  task: Task; teams: Team[]; projectName: string
  onClose: () => void; onSaved: (t: Task) => void; onDeleted: (id: string) => void
  elevated?: boolean
}) {
  const [editing, setEditing]         = useState(false)
  const [title, setTitle]             = useState(task.title)
  const [description, setDescription] = useState(task.description ?? "")
  const [dueDate, setDueDate]         = useState(task.due_date ? task.due_date.slice(0, 10) : "")
  const [teamId, setTeamId]           = useState(task.team_id)

  const { data: subtasks = [], isLoading: subsLoading } = useQuery<Subtask[]>({
    queryKey: ["subtasks", "task", task.id],
    queryFn: () => getTaskSubtasksApi(task.id),
  })

  const saveMutation = useMutation({
    mutationFn: () => updateTaskApi(task.id, {
      title, description: description || undefined,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      team_id: teamId,
    }),
    onSuccess: (updated) => { onSaved(updated); setEditing(false) },
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTaskApi(task.id),
    onSuccess: () => onDeleted(task.id),
  })

  return (
    <div className={cn(
      "fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-4",
      elevated ? "z-[60]" : "z-50"
    )}>
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">

        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-black text-white">Task</span>
            {!editing && (
              <button onClick={() => setEditing(true)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-50 transition-colors">
                <Pencil size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (confirm("Delete this task and all its subtasks?")) deleteMutation.mutate() }}
              disabled={deleteMutation.isPending}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-black transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">
          {editing ? (
            <div className="flex flex-col gap-3">
              <LabeledField label="Title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" autoFocus />
              </LabeledField>
              <LabeledField label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={3} className="input h-auto py-2.5 resize-none" />
              </LabeledField>
              <div className="grid grid-cols-2 gap-3">
                <LabeledField label="Due date">
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
                </LabeledField>
                <LabeledField label="Team">
                  <select value={teamId} onChange={(e) => setTeamId(e.target.value)} className="input bg-white">
                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </LabeledField>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditing(false)}
                  className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={() => saveMutation.mutate()}
                  disabled={!title.trim() || saveMutation.isPending}
                  className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
                  {saveMutation.isPending ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-black">{task.title}</h2>
              {task.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{task.description}</p>
              )}
              <div className="flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                  {projectName}
                </span>
                {task.due_date && (
                  <span className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-lg">
                    <Clock size={11} />
                    {new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                )}
                <span className={cn("text-xs font-medium px-2.5 py-1 rounded-lg", TASK_STATUS[task.status].badge)}>
                  {task.status.replace("_", " ")}
                </span>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Subtasks {!subsLoading && `(${subtasks.length})`}
            </p>
            {subsLoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
                Loading subtasks…
              </div>
            ) : subtasks.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No subtasks yet</p>
            ) : (
              <div className="flex flex-col gap-2">
                {subtasks.map((sub) => <SubtaskDetailRow key={sub.id} subtask={sub} />)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Subtask detail row ───────────────────────────────────────────────── */
function SubtaskDetailRow({ subtask }: { subtask: Subtask }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 p-3 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ChevronRight size={12} className={cn(
            "text-gray-400 flex-shrink-0 transition-transform duration-150", open && "rotate-90"
          )} />
          <p className="text-sm font-medium text-black truncate">{subtask.title}</p>
        </div>
        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0", TASK_STATUS[subtask.status].badge)}>
          {subtask.status.replace("_", " ")}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-gray-50">
          {subtask.description && (
            <p className="text-xs text-gray-500 pt-2 leading-relaxed">{subtask.description}</p>
          )}
          {subtask.due_date && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
              <Clock size={10} />
              {new Date(subtask.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
          )}
          {subtask.assignees.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Assigned to</p>
              <div className="flex flex-wrap gap-1.5">
                {subtask.assignees.map((u) => (
                  <div key={u.id} className="flex items-center gap-1.5 bg-[#d6c7e1]/40 text-[#643f83] rounded-full px-2.5 py-0.5">
                    <div className="w-4 h-4 rounded-full bg-[#643f83] text-white text-[8px] font-bold flex items-center justify-center flex-shrink-0">
                      {u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-[11px] font-medium">{u.full_name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {subtask.submissions.length > 0 ? (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                Submissions ({subtask.submissions.length})
              </p>
              <div className="flex flex-col gap-1.5">
                {[...subtask.submissions].reverse().map((sub, i) => (
                  <div key={sub.id} className={cn(
                    "rounded-lg p-2.5 border text-xs",
                    i === 0 ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100 opacity-60"
                  )}>
                    <div className="flex items-center justify-between mb-1">
                      {i === 0
                        ? <span className="text-[9px] font-bold uppercase tracking-widest text-[#643f83]">Latest</span>
                        : <span />}
                      {sub.submitter_name && (
                        <span className="text-[10px] text-gray-500">by {sub.submitter_name}</span>
                      )}
                    </div>
                    <a href={sub.link} target="_blank" rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 text-[#643f83] hover:underline">
                      <ExternalLink size={10} className="flex-shrink-0" />
                      <span className="truncate">{sub.link}</span>
                    </a>
                    {sub.note && <p className="text-gray-500 mt-1 italic">{sub.note}</p>}
                    <div className="flex items-center justify-between mt-1.5">
                      <span className={cn(
                        "text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                        sub.status === "reviewed" ? "bg-black text-white" : "bg-[#d6c7e1] text-[#643f83]"
                      )}>
                        {sub.status === "reviewed" ? "Reviewed" : "Pending"}
                      </span>
                      <div className="flex items-center gap-2">
                        {sub.score != null && <span className="font-semibold text-black">{sub.score}/100</span>}
                        <span className="text-gray-400">{new Date(sub.submitted_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {sub.review_comment && (
                      <p className="text-gray-500 mt-1 italic">"{sub.review_comment}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">No submissions yet</p>
          )}
        </div>
      )}
    </div>
  )
}

/* ================================================================== */
/* Create project modal                                                */
/* ================================================================== */
function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title,       setTitle]       = useState("")
  const [description, setDescription] = useState("")
  const [error,       setError]       = useState("")

  const mutation = useMutation({
    mutationFn: () => createProjectApi({ title, description: description || undefined }),
    onSuccess: onCreated,
    onError: (e: any) => setError(e?.response?.data?.detail ?? "Failed to create project"),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-black">New project</p>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-black transition-colors">
            <X size={16} />
          </button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && title.trim()) mutation.mutate() }}
          className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)" rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors" />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}
            className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
            {mutation.isPending ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ================================================================== */
/* Create task modal                                                   */
/* ================================================================== */
function CreateTaskModal({ project, teams, onClose, onCreated }: {
  project: Project; teams: Team[]; onClose: () => void; onCreated: () => void
}) {
  const [title,       setTitle]       = useState("")
  const [description, setDescription] = useState("")
  const [dueDate,     setDueDate]     = useState("")
  const [teamId,      setTeamId]      = useState(teams[0]?.id ?? "")
  const [error,       setError]       = useState("")

  const mutation = useMutation({
    mutationFn: () => createTaskApi(project.id, {
      title, description: description || undefined,
      due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      team_id: teamId, project_id: project.id,
    }),
    onSuccess: onCreated,
    onError: (e: any) => setError(e?.response?.data?.detail ?? "Failed to create task"),
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-[70] flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-base font-semibold text-black">New task</p>
            <p className="text-xs text-gray-400 mt-0.5">{project.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-black transition-colors">
            <X size={16} />
          </button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" autoFocus
          className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)" rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1 block">Due date</label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1 block">Team</label>
            <select value={teamId} onChange={(e) => setTeamId(e.target.value)}
              className="w-full h-9 px-2.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:border-black transition-colors">
              {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => mutation.mutate()} disabled={!title.trim() || !teamId || mutation.isPending}
            className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
            {mutation.isPending ? "Creating…" : "Create task"}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── helpers ─────────────────────────────────────────────────────────── */
function LabeledField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1 block">{label}</label>
      {children}
    </div>
  )
}

function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
