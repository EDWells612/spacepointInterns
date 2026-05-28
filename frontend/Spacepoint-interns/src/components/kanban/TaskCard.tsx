import { useDraggable } from "@dnd-kit/core"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { BoardCard } from "@/types"

interface TaskCardProps {
  card: BoardCard
  onClick: () => void
}

function formatDue(dateStr: string | null) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  const diff = Math.ceil((date.getTime() - Date.now()) / 86400000)
  if (diff < 0) return { label: "Overdue", urgent: true }
  if (diff === 0) return { label: "Today", urgent: true }
  if (diff === 1) return { label: "Tomorrow", urgent: false }
  return { label: `${diff}d`, urgent: false }
}

export default function TaskCard({ card, onClick }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id })
  const due = formatDue(card.due_date)
  const latestSub = card.submissions?.[card.submissions.length - 1]
  const isTask = card.kind === "task"

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        "bg-white rounded-xl p-3 cursor-pointer select-none transition-all",
        isTask
          ? "border-2 border-black hover:shadow-md"
          : "border border-gray-100 hover:border-gray-300 hover:shadow-sm",
        isDragging && "shadow-lg"
      )}
    >
      {/* Kind badge */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={cn(
          "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
          isTask
            ? "bg-black text-white"
            : "bg-[#d6c7e1]/60 text-[#643f83]"
        )}>
          {isTask ? "Task" : "Subtask"}
        </span>

        {/* Parent task label (subtasks only) */}
        {!isTask && card.task_title && (
          <span className="text-[10px] text-gray-400 truncate ml-2 max-w-[120px]">
            {card.task_title}
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-black leading-snug mb-1">{card.title}</p>

      {/* Project label */}
      {card.project_title && (
        <p className="text-[10px] text-gray-400 mb-2 truncate">{card.project_title}</p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        {due ? (
          <span className={cn(
            "text-[11px] font-medium px-2 py-0.5 rounded-full",
            due.urgent ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500"
          )}>
            {due.label}
          </span>
        ) : <span />}

        <div className="flex items-center gap-2">
          {/* Submission badge (subtasks only) */}
          {latestSub && (
            <span className={cn(
              "text-[10px] font-medium px-2 py-0.5 rounded-full",
              latestSub.status === "reviewed"
                ? "bg-black text-white"
                : "bg-[#d6c7e1] text-[#643f83]"
            )}>
              {latestSub.status === "reviewed" ? "Reviewed" : "Submitted"}
            </span>
          )}

          {/* Assignee avatars (subtasks only) */}
          {card.assignees.length > 0 && (
            <div className="flex -space-x-1.5">
              {card.assignees.slice(0, 3).map((u) => (
                <div key={u.id} title={u.full_name}
                  className="w-6 h-6 rounded-full bg-[#d6c7e1] text-[#643f83] text-[9px] font-bold flex items-center justify-center border-2 border-white flex-shrink-0">
                  {u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
              ))}
              {card.assignees.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 text-[9px] font-bold flex items-center justify-center border-2 border-white flex-shrink-0">
                  +{card.assignees.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
