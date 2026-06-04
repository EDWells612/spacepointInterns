import { Handle, Position, type NodeProps } from "@xyflow/react"
import { cn } from "@/lib/utils"
import type { WorkStatus } from "@/types"

// ── Shared status styling ─────────────────────────────────────────────────────
export const STATUS: Record<WorkStatus, { badge: string; dot: string }> = {
  todo:        { badge: "bg-gray-100 text-gray-500",    dot: "bg-gray-300"   },
  in_progress: { badge: "bg-[#d6c7e1] text-[#643f83]", dot: "bg-[#a880ff]"  },
  done:        { badge: "bg-black text-white",           dot: "bg-black"      },
}

// ── Project node (only used in project map) ───────────────────────────────────
export function ProjectNode({ data }: NodeProps) {
  return (
    <div className="bg-black text-white rounded-2xl px-10 py-6 min-w-[260px] text-center shadow-2xl select-none cursor-pointer">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Project</p>
      <p className="text-lg font-bold leading-snug">{String(data.label)}</p>
      <p className="text-[11px] text-gray-400 mt-2">
        {String(data.epicCount)} epic{Number(data.epicCount) !== 1 ? "s" : ""} &middot; {String(data.taskCount)} task{Number(data.taskCount) !== 1 ? "s" : ""}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ background: "#643f83", width: 10, height: 10 }} />
    </div>
  )
}

// ── Epic node ─────────────────────────────────────────────────────────────────
export function EpicNode({ data }: NodeProps) {
  return (
    <div className="bg-black text-white rounded-2xl px-8 py-5 min-w-[220px] text-center shadow-2xl select-none cursor-pointer">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Epic</p>
      <p className="text-base font-bold leading-snug">{String(data.label)}</p>
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span className={cn("w-2 h-2 rounded-full", STATUS[data.status as WorkStatus]?.dot ?? "bg-gray-300")} />
        <span className="text-[10px] text-gray-400">{String(data.status).replace("_", " ")}</span>
      </div>
      <Handle type="target" position={Position.Top}    style={{ background: "#643f83", width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#643f83", width: 10, height: 10 }} />
    </div>
  )
}

// ── Module node ───────────────────────────────────────────────────────────────
export function ModuleNode({ data, selected }: NodeProps) {
  return (
    <div className={cn(
      "bg-[#643f83] text-white rounded-xl px-5 py-3.5 min-w-[180px] max-w-[240px] shadow-lg select-none transition-all cursor-pointer border-2",
      selected ? "border-white shadow-xl" : "border-transparent"
    )}>
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#d6c7e1] mb-1 text-center">Module</p>
      <p className="text-sm font-bold text-center">{String(data.label)}</p>
      {!!data.description && (
        <p className="text-[10px] text-[#d6c7e1] mt-1.5 leading-relaxed line-clamp-2 text-center opacity-80">
          {String(data.description)}
        </p>
      )}
      <Handle type="target" position={Position.Top}    style={{ background: "#a880ff", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#a880ff", width: 8, height: 8 }} />
    </div>
  )
}

// ── Task node ─────────────────────────────────────────────────────────────────
export function TaskNode({ data, selected }: NodeProps) {
  const s = STATUS[data.status as WorkStatus] ?? STATUS.todo
  return (
    <div className={cn(
      "bg-white rounded-xl px-3.5 py-3 min-w-[170px] shadow-md select-none transition-all cursor-pointer border-2",
      selected ? "border-black shadow-lg" : "border-gray-100 hover:border-gray-300"
    )}>
      <Handle type="target" position={Position.Top} style={{ background: "#d6c7e1", width: 8, height: 8 }} />
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">Task</p>
      <p className="text-sm font-semibold text-black leading-snug mb-2">{String(data.label)}</p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full", s.badge)}>
          {String(data.status).replace("_", " ")}
        </span>
        {Number(data.assigneeCount) > 0 && (
          <span className="text-[10px] text-gray-400">
            {Number(data.assigneeCount)} intern{Number(data.assigneeCount) !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      {!!data.note && (
        <p className="text-[10px] text-gray-400 mt-1.5 italic line-clamp-2">"{String(data.note)}"</p>
      )}
    </div>
  )
}

// ── nodeTypes maps ────────────────────────────────────────────────────────────
export const epicMapNodeTypes = {
  epicNode:    EpicNode,
  moduleNode:  ModuleNode,
  taskNode:    TaskNode,
}

export const projectMapNodeTypes = {
  projectNode: ProjectNode,
  epicNode:    EpicNode,
  moduleNode:  ModuleNode,
  taskNode:    TaskNode,
}
