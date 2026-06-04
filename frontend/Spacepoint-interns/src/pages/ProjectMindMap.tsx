import { useState, useCallback, useRef } from "react"
import { useParams, useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  Handle, Position, type NodeProps,
  type Node, type Edge,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import type { Epic, WorkStatus } from "@/types"
import { getProjectApi } from "@/api/projects"
import { getProjectEpicsApi } from "@/api/epics"

// ── Status styling ────────────────────────────────────────────────────────────
const STATUS: Record<WorkStatus, { badge: string; dot: string }> = {
  todo:        { badge: "bg-gray-100 text-gray-500",    dot: "bg-gray-300"   },
  in_progress: { badge: "bg-[#d6c7e1] text-[#643f83]", dot: "bg-[#a880ff]"  },
  done:        { badge: "bg-black text-white",           dot: "bg-black"      },
}

// ── Node types ────────────────────────────────────────────────────────────────

function ProjectNode({ data }: NodeProps) {
  return (
    <div className="bg-black text-white rounded-2xl px-10 py-6 min-w-[260px] text-center shadow-2xl select-none">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-2">Project</p>
      <p className="text-lg font-bold leading-snug">{String(data.label)}</p>
      <p className="text-[11px] text-gray-400 mt-2">
        {String(data.epicCount)} epic{Number(data.epicCount) !== 1 ? "s" : ""} &middot; {String(data.taskCount)} task{Number(data.taskCount) !== 1 ? "s" : ""}
      </p>
      <Handle type="source" position={Position.Bottom} style={{ background: "#643f83", width: 10, height: 10 }} />
    </div>
  )
}

function EpicNode({ data }: NodeProps) {
  return (
    <div className="bg-[#643f83] text-white rounded-2xl px-6 py-4 min-w-[200px] text-center shadow-xl select-none">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[#d6c7e1] mb-1">Epic</p>
      <p className="text-sm font-bold leading-snug">{String(data.label)}</p>
      <div className="flex items-center justify-center gap-1.5 mt-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS[data.status as WorkStatus]?.dot ?? "bg-gray-300")} />
        <span className="text-[10px] text-[#d6c7e1]">{String(data.status).replace("_", " ")}</span>
      </div>
      <Handle type="target" position={Position.Top}    style={{ background: "#a880ff", width: 8, height: 8 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#a880ff", width: 8, height: 8 }} />
    </div>
  )
}

function ModuleNode({ data }: NodeProps) {
  return (
    <div className="bg-white border-2 border-[#643f83] rounded-xl px-4 py-3 min-w-[160px] max-w-[220px] shadow-md select-none">
      <p className="text-[8px] font-bold uppercase tracking-widest text-[#643f83] mb-1 text-center">Module</p>
      <p className="text-xs font-bold text-black text-center leading-snug">{String(data.label)}</p>
      <Handle type="target" position={Position.Top}    style={{ background: "#643f83", width: 7, height: 7 }} />
      <Handle type="source" position={Position.Bottom} style={{ background: "#643f83", width: 7, height: 7 }} />
    </div>
  )
}

function TaskNode({ data }: NodeProps) {
  const s = STATUS[data.status as WorkStatus] ?? STATUS.todo
  return (
    <div className="bg-white rounded-xl px-3 py-2.5 min-w-[160px] shadow-sm select-none border border-gray-200">
      <Handle type="target" position={Position.Top} style={{ background: "#d6c7e1", width: 7, height: 7 }} />
      <p className="text-[8px] font-bold uppercase tracking-widest text-gray-400 mb-1">Task</p>
      <p className="text-xs font-semibold text-black leading-snug mb-1.5">{String(data.label)}</p>
      <span className={cn("text-[8px] font-bold px-1.5 py-0.5 rounded-full", s.badge)}>
        {String(data.status).replace("_", " ")}
      </span>
    </div>
  )
}

const nodeTypes = { projectNode: ProjectNode, epicNode: EpicNode, moduleNode: ModuleNode, taskNode: TaskNode }

// ── Auto-layout ───────────────────────────────────────────────────────────────

const TASK_W   = 200
const TASK_GAP = 30
const MOD_GAP  = 50
const EPIC_GAP = 100

const ROW_EPIC = 280
const ROW_MOD  = 220
const ROW_TASK = 190

function buildProjectGraph(
  projectId: string,
  projectTitle: string,
  epics: Epic[],
  saved: Record<string, { x: number; y: number }>
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Calculate width each epic subtree needs
  const epicMetas = epics.map((epic) => {
    const modWidths = epic.modules.map((mod) => {
      const tc = Math.max(1, mod.tasks.length)
      return tc * (TASK_W + TASK_GAP) - TASK_GAP
    })
    const totalMod = modWidths.length > 0
      ? modWidths.reduce((a, b) => a + b + MOD_GAP, 0) - MOD_GAP
      : TASK_W
    return { epic, modWidths, totalWidth: Math.max(220, totalMod) }
  })

  const totalWidth = epicMetas.length > 0
    ? epicMetas.reduce((a, b) => a + b.totalWidth + EPIC_GAP, 0) - EPIC_GAP
    : 400

  const totalTasks = epics.reduce((a, e) => a + e.modules.reduce((b, m) => b + m.tasks.length, 0), 0)

  // Project node (centered)
  nodes.push({
    id: `project-${projectId}`,
    type: "projectNode",
    position: saved[`project-${projectId}`] ?? { x: totalWidth / 2 - 130, y: 0 },
    data: { label: projectTitle, epicCount: epics.length, taskCount: totalTasks },
  })

  let epicX = 0
  for (const { epic, modWidths, totalWidth: epicW } of epicMetas) {
    const epicCx = epicX + epicW / 2 - 100

    nodes.push({
      id: `epic-${epic.id}`,
      type: "epicNode",
      position: saved[`epic-${epic.id}`] ?? { x: epicCx, y: ROW_EPIC },
      data: { label: epic.title, status: epic.status },
    })
    edges.push({
      id: `e-proj-${epic.id}`,
      source: `project-${projectId}`,
      target: `epic-${epic.id}`,
      type: "smoothstep",
      style: { stroke: "#643f83", strokeWidth: 2 },
    })

    let modX = epicX
    for (let mi = 0; mi < epic.modules.length; mi++) {
      const mod = epic.modules[mi]
      const mw  = modWidths[mi]
      const modCx = modX + mw / 2 - 80

      nodes.push({
        id: `module-${mod.id}`,
        type: "moduleNode",
        position: saved[`module-${mod.id}`] ?? { x: modCx, y: ROW_EPIC + ROW_MOD },
        data: { label: mod.title },
      })
      edges.push({
        id: `e-epic-mod-${mod.id}`,
        source: `epic-${epic.id}`,
        target: `module-${mod.id}`,
        type: "smoothstep",
        style: { stroke: "#a880ff", strokeWidth: 1.5 },
      })

      const totalTaskW = mod.tasks.length > 0
        ? mod.tasks.length * (TASK_W + TASK_GAP) - TASK_GAP
        : 0
      let taskX = modX + mw / 2 - totalTaskW / 2 - 80

      for (const task of mod.tasks) {
        nodes.push({
          id: `task-${task.id}`,
          type: "taskNode",
          position: saved[`task-${task.id}`] ?? { x: taskX, y: ROW_EPIC + ROW_MOD + ROW_TASK },
          data: { label: task.title, status: task.status },
        })
        edges.push({
          id: `e-mod-task-${task.id}`,
          source: `module-${mod.id}`,
          target: `task-${task.id}`,
          type: "smoothstep",
          style: { stroke: "#d6c7e1", strokeWidth: 1.5 },
        })
        taskX += TASK_W + TASK_GAP
      }

      modX += mw + MOD_GAP
    }

    epicX += epicW + EPIC_GAP
  }

  return { nodes, edges }
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectMindMap() {
  const { projectId } = useParams({ strict: false }) as { projectId: string }
  const navigate      = useNavigate()
  const { currentUser } = useAuth()
  const canEdit       = currentUser?.role !== "intern"
  const saveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const STORAGE_KEY   = `project-map-${projectId}`

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [initialised, setInitialised]    = useState(false)

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn:  () => getProjectApi(projectId),
  })

  const { data: epics = [], isLoading } = useQuery<Epic[]>({
    queryKey: ["epics", projectId],
    queryFn:  () => getProjectEpicsApi(projectId),
    enabled:  !!project,
  })

  if (project && !isLoading && !initialised) {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
    const { nodes: n, edges: e } = buildProjectGraph(projectId, project.title, epics, saved)
    setNodes(n)
    setEdges(e)
    setInitialised(true)
  }

  const saveLayout = useCallback(() => {
    if (!canEdit) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setNodes((curr) => {
        const pos: Record<string, { x: number; y: number }> = {}
        curr.forEach((n) => { pos[n.id] = n.position })
        localStorage.setItem(STORAGE_KEY, JSON.stringify(pos))
        return curr
      })
    }, 800)
  }, [canEdit, STORAGE_KEY, setNodes])

  const totalTasks = epics.reduce((a, e) => a + e.modules.reduce((b, m) => b + m.tasks.length, 0), 0)

  if (isLoading || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="p-2 rounded-xl border border-gray-200 text-gray-500 hover:text-black hover:border-gray-400 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#643f83] mb-0.5">Project map</p>
            <h1 className="text-xl font-bold text-black tracking-tight leading-none">{project.title}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {epics.length} epic{epics.length !== 1 ? "s" : ""} &middot; {totalTasks} task{totalTasks !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {canEdit && (
          <p className="text-xs text-gray-400 italic">Drag nodes to rearrange — saved to browser</p>
        )}
      </div>

      {/* Canvas */}
      <div style={{ height: "calc(100vh - 13rem)" }} className="rounded-2xl border border-gray-100 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={saveLayout}
          nodesDraggable={canEdit}
          fitView
          fitViewOptions={{ padding: 0.12 }}
        >
          <Background color="#f3f4f6" gap={20} />
          <Controls showInteractive={false} />
          <MiniMap
            nodeColor={(n) =>
              n.type === "projectNode" ? "#000" :
              n.type === "epicNode"    ? "#643f83" :
              n.type === "moduleNode"  ? "#a880ff" : "#e5e7eb"
            }
            maskColor="rgba(255,255,255,0.7)"
            style={{ borderRadius: 12 }}
          />
        </ReactFlow>
      </div>
    </div>
  )
}
