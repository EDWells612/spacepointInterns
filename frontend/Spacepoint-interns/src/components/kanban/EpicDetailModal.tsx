import { useState } from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X, Eye } from "lucide-react"
import type { Epic, Module } from "@/types"
import ModuleDetailDialog from "@/components/ModuleDetailDialog"

const STATUS_LABEL: Record<string, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
}

const STATUS_STYLE: Record<string, string> = {
  todo: "bg-gray-100 text-gray-500",
  in_progress: "bg-[#d6c7e1] text-[#643f83]",
  done: "bg-black text-white",
}

interface Props {
  epic: Epic | null
  projectName: string
  open: boolean
  onClose: () => void
}

export default function EpicDetailModal({ epic, projectName, open, onClose }: Props) {
  const [viewModule, setViewModule] = useState<Module | null>(null)

  if (!epic || !open) return null

  const totalTasks = epic.modules.reduce((acc, m) => acc + m.tasks.length, 0)
  const doneTasks  = epic.modules.reduce(
    (acc, m) => acc + m.tasks.filter((t) => t.status === "done").length,
    0
  )

  const nonEmptyModules = epic.modules.filter((m) => m.tasks.length > 0)

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/40 z-[9990] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md bg-white border border-gray-100 shadow-xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
            <div className="min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#643f83]">Epic</span>
              <p className="text-base font-semibold text-black leading-snug mt-0.5">{epic.title}</p>
              {projectName && (
                <p className="text-xs text-gray-400 mt-0.5">{projectName}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn(
                "text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap",
                STATUS_STYLE[epic.status] ?? STATUS_STYLE.todo
              )}>
                {STATUS_LABEL[epic.status] ?? epic.status}
              </span>
              <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-black transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* body */}
          <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-4">

            {epic.description ? (
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{epic.description}</p>
            ) : (
              <p className="text-sm text-gray-300 italic">No description provided.</p>
            )}

            {/* progress */}
            <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="font-medium text-black">{doneTasks}/{totalTasks}</span>
              tasks done
              {totalTasks > 0 && (
                <>
                  <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#643f83] rounded-full transition-all"
                      style={{ width: `${Math.round((doneTasks / totalTasks) * 100)}%` }}
                    />
                  </div>
                  <span>{Math.round((doneTasks / totalTasks) * 100)}%</span>
                </>
              )}
            </div>

            {/* modules */}
            {nonEmptyModules.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Modules</p>
                <div className="flex flex-col gap-1.5">
                  {nonEmptyModules.map((m) => {
                    const mDone = m.tasks.filter((t) => t.status === "done").length
                    return (
                      <div key={m.id} className="flex items-center justify-between px-3 py-2 rounded-xl border border-gray-100 bg-gray-50/60 gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-black font-medium truncate">{m.title}</p>
                          <p className="text-[11px] text-gray-400">{mDone}/{m.tasks.length} done</p>
                        </div>
                        <button
                          onClick={() => setViewModule(m)}
                          title="View module details"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#643f83] hover:bg-purple-50 transition-colors flex-shrink-0"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <p className="text-[11px] text-gray-300">
              Created {new Date(epic.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {viewModule && (
        <ModuleDetailDialog
          module={viewModule}
          onClose={() => setViewModule(null)}
        />
      )}
    </>,
    document.body
  )
}
