import { useState } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Column from "./Column"
import TaskCard from "./TaskCard"
import TaskModal from "./TaskModal"
import CreateSubtaskModal from "./CreateSubtaskModal"
import type { BoardCard, Project, Subtask, Task, WorkStatus } from "@/types"
import { useAuth } from "@/context/AuthContext"
import {
  getLeaderSubtasksApi,
  getInternSubtasksApi,
  updateSubtaskApi,
  updateInternStatusApi,
  submitWorkApi,
} from "@/api/subtasks"
import { getLeaderTasksApi, updateLeaderTaskApi } from "@/api/tasks"
import { getLeaderProjectsApi, getInternProjectsApi } from "@/api/projects"

const COLUMNS: { title: string; status: WorkStatus }[] = [
  { title: "To do",       status: "todo" },
  { title: "In progress", status: "in_progress" },
  { title: "Done",        status: "done" },
]

// ── component ──────────────────────────────────────────────────────────
export default function KanbanBoard() {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const isIntern = currentUser?.role === "intern"
  const isLeader = currentUser?.role === "leader"
  const role = currentUser?.role ?? "intern"

  const subtasksKey = ["subtasks", role]
  const tasksKey    = ["tasks", "leader"]

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const [activeCard,   setActiveCard]   = useState<BoardCard | null>(null)
  const [selectedCard, setSelectedCard] = useState<BoardCard | null>(null)
  const [pendingDrop,  setPendingDrop]  = useState<BoardCard | null>(null)
  const [createOpen,   setCreateOpen]   = useState(false)

  // ── queries ────────────────────────────────────────────────────────
  const { data: subtasks = [], isLoading: subtasksLoading } = useQuery({
    queryKey: subtasksKey,
    queryFn: isIntern ? getInternSubtasksApi : getLeaderSubtasksApi,
    enabled: !!currentUser,
  })

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<Task[]>({
    queryKey: tasksKey,
    queryFn: getLeaderTasksApi,
    enabled: isLeader,
  })

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects", role],
    queryFn: isIntern ? getInternProjectsApi : getLeaderProjectsApi,
    enabled: !!currentUser,
  })

  const isLoading = subtasksLoading || (isLeader && tasksLoading)

  // ── helpers (depend on projects so defined inside component) ────────
  const resolveProjectTitle = (projectId: string | null): string | null => {
    if (!projectId) return null
    return projects.find((p) => p.id === projectId)?.title ?? null
  }

  const taskToCard = (t: Task): BoardCard => ({
    id: t.id,
    kind: "task",
    title: t.title,
    task_title: null,
    project_title: resolveProjectTitle(t.project_id),
    status: t.status,
    due_date: t.due_date,
    description: t.description,
    assignees: [],
    submissions: [],
  })

  const subtaskToCard = (s: Subtask): BoardCard => ({
    id: s.id,
    kind: "subtask",
    title: s.title,
    task_title: s.task_title ?? null,
    project_title: resolveProjectTitle(s.project_id ?? null),
    status: s.status,
    due_date: s.due_date,
    description: s.description,
    assignees: s.assignees,
    submissions: s.submissions,
  })

  // Merge tasks + subtasks into a unified board card list
  const allCards: BoardCard[] = isLeader
    ? [...tasks.map(taskToCard), ...subtasks.map(subtaskToCard)]
    : subtasks.map(subtaskToCard)

  // ── move mutations (optimistic) ─────────────────────────────────────
  const moveSubtaskMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: WorkStatus }) =>
      isIntern
        ? updateInternStatusApi(id, newStatus)
        : updateSubtaskApi(id, { status: newStatus }),
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: subtasksKey })
      const previous = queryClient.getQueryData<Subtask[]>(subtasksKey)
      queryClient.setQueryData<Subtask[]>(subtasksKey, (old = []) =>
        old.map((s) => (s.id === id ? { ...s, status: newStatus } : s))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(subtasksKey, ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: subtasksKey }),
  })

  const moveTaskMutation = useMutation({
    mutationFn: ({ id, newStatus }: { id: string; newStatus: WorkStatus }) =>
      updateLeaderTaskApi(id, { status: newStatus }),
    onMutate: async ({ id, newStatus }) => {
      await queryClient.cancelQueries({ queryKey: tasksKey })
      const previous = queryClient.getQueryData<Task[]>(tasksKey)
      queryClient.setQueryData<Task[]>(tasksKey, (old = []) =>
        old.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(tasksKey, ctx.previous)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: tasksKey }),
  })

  // ── dnd handlers ────────────────────────────────────────────────────
  const handleDragStart = (event: DragStartEvent) => {
    setActiveCard(allCards.find((c) => c.id === String(event.active.id)) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null)
    const { active, over } = event
    if (!over) return

    const cardId    = String(active.id)
    const newStatus = String(over.id) as WorkStatus
    if (!["todo", "in_progress", "done"].includes(newStatus)) return

    const card = allCards.find((c) => c.id === cardId)
    if (!card || card.status === newStatus) return

    if (card.kind === "task") {
      moveTaskMutation.mutate({ id: cardId, newStatus })
      return
    }

    // Subtask: intern must submit to move to done
    if (newStatus === "done" && isIntern) {
      setPendingDrop(card)
      return
    }
    moveSubtaskMutation.mutate({ id: cardId, newStatus })
  }

  const getByStatus = (status: WorkStatus) => allCards.filter((c) => c.status === status)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">Task Board</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isLeader
              ? `${tasks.length} task${tasks.length !== 1 ? "s" : ""} · ${subtasks.length} subtask${subtasks.length !== 1 ? "s" : ""}`
              : `${subtasks.length} subtask${subtasks.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        {isLeader && (
          <button
            onClick={() => setCreateOpen(true)}
            className="h-9 px-4 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition-colors"
          >
            + New subtask
          </button>
        )}
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.status}
              title={col.title}
              status={col.status}
              cards={getByStatus(col.status)}
              onCardClick={setSelectedCard}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard && <TaskCard card={activeCard} onClick={() => {}} />}
        </DragOverlay>
      </DndContext>

      {/* Intern drag-to-done submission dialog */}
      {pendingDrop && (
        <SubmitDialog
          card={pendingDrop}
          subtasksKey={subtasksKey}
          onDone={() => setPendingDrop(null)}
        />
      )}

      <TaskModal
        card={selectedCard}
        open={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        subtasksKey={subtasksKey}
        tasksKey={tasksKey}
      />

      {isLeader && createOpen && (
        <CreateSubtaskModal
          tasks={tasks}
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          subtasksKey={subtasksKey}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Intern submit dialog                                                 */
/* ------------------------------------------------------------------ */
function SubmitDialog({
  card,
  subtasksKey,
  onDone,
}: {
  card: BoardCard
  subtasksKey: string[]
  onDone: () => void
}) {
  const queryClient = useQueryClient()
  const [link, setLink] = useState("")
  const [note, setNote] = useState("")

  const submitMutation = useMutation({
    mutationFn: () => submitWorkApi(card.id, { link, note: note || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subtasksKey })
      onDone()
    },
  })

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-6 flex flex-col gap-4 shadow-2xl">
        <div>
          <p className="text-base font-semibold text-black">Submit work</p>
          <p className="text-sm text-gray-500 mt-0.5">{card.title}</p>
        </div>
        <input value={link} onChange={(e) => setLink(e.target.value)}
          placeholder="Link (GitHub, Figma, Drive…)" autoFocus
          className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
        <textarea value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)" rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors" />
        <div className="flex gap-2">
          <button onClick={onDone}
            className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => submitMutation.mutate()}
            disabled={!link.trim() || submitMutation.isPending}
            className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
            {submitMutation.isPending ? "Submitting…" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  )
}
