import { useState } from "react"
import { createPortal } from "react-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { X, Plus, Trash2, Check, Pencil, Eye } from "lucide-react"
import type { Epic, Module } from "@/types"
import { getEpicForMapApi } from "@/api/mindmap"
import { createModuleApi, updateModuleApi, deleteModuleApi } from "@/api/modules"
import ModuleDetailDialog from "@/components/ModuleDetailDialog"

export default function ManageModulesModal({ epic, role, onClose }: {
  epic: Epic
  role: "admin" | "leader"
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [newTitle,   setNewTitle]   = useState("")
  const [newDesc,    setNewDesc]    = useState("")
  const [editId,     setEditId]     = useState<string | null>(null)
  const [editTitle,  setEditTitle]  = useState("")
  const [editDesc,   setEditDesc]   = useState("")
  const [viewModule, setViewModule] = useState<Module | null>(null)
  const [error,      setError]      = useState("")

  const { data: fullEpic, isLoading } = useQuery<Epic>({
    queryKey: ["epic", epic.id, role],
    queryFn: () => getEpicForMapApi(epic.id, role),
  })
  const modules: Module[] = fullEpic?.modules ?? epic.modules ?? []

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["epic", epic.id, role] })
    qc.invalidateQueries({ queryKey: ["epics"] })
    qc.invalidateQueries({ queryKey: ["tasks"] })
  }

  const createMut = useMutation({
    mutationFn: () => createModuleApi(epic.id, { title: newTitle.trim(), description: newDesc.trim() || undefined }, role),
    onSuccess: () => { setNewTitle(""); setNewDesc(""); refresh() },
    onError: (e: any) => setError(e?.response?.data?.detail ?? "Failed to add module"),
  })

  const updateMut = useMutation({
    mutationFn: () => updateModuleApi(editId!, { title: editTitle.trim() || undefined, description: editDesc.trim() || undefined }, role),
    onSuccess: () => { setEditId(null); setEditTitle(""); setEditDesc(""); refresh() },
  })

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteModuleApi(id, role),
    onSuccess: refresh,
  })

  const startEdit = (m: Module) => {
    setEditId(m.id)
    setEditTitle(m.title)
    setEditDesc(m.description ?? "")
  }

  return createPortal(
    <>
      <div className="fixed inset-0 bg-black/40 z-[9998] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">

          {/* header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
            <div className="min-w-0">
              <p className="text-base font-semibold text-black">Modules</p>
              <p className="text-xs text-gray-400 truncate">{epic.title}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-black transition-colors flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* add module */}
          <div className="px-5 py-3 border-b border-gray-50 flex-shrink-0 flex flex-col gap-2">
            <input
              value={newTitle}
              onChange={(e) => { setNewTitle(e.target.value); setError("") }}
              placeholder="New module name"
              className="w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Scope / description (optional) — interns will see this"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => createMut.mutate()}
                disabled={!newTitle.trim() || createMut.isPending}
                className="flex items-center gap-1 h-9 px-4 bg-black text-white text-xs font-medium rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50 ml-auto"
              >
                <Plus size={13} /> Add module
              </button>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          {/* module list */}
          <div className="overflow-y-auto flex-1 p-3 flex flex-col gap-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : modules.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No modules yet</p>
            ) : (
              modules.map((m) => (
                <div key={m.id} className="border border-gray-100 rounded-xl overflow-hidden">
                  {editId === m.id ? (
                    <div className="p-3 flex flex-col gap-2 bg-gray-50">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Module name"
                        autoFocus
                        className="w-full h-9 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black bg-white"
                      />
                      <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        placeholder="Scope / description — interns will see this"
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black bg-white"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateMut.mutate()}
                          disabled={!editTitle.trim() || updateMut.isPending}
                          className="flex items-center gap-1 h-8 px-3 bg-black text-white text-xs font-medium rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
                        >
                          <Check size={12} /> Save
                        </button>
                        <button
                          onClick={() => { setEditId(null); setEditTitle(""); setEditDesc("") }}
                          className="h-8 px-3 border border-gray-200 text-gray-500 text-xs rounded-xl hover:bg-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-black">{m.title}</p>
                          {m.description ? (
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{m.description}</p>
                          ) : (
                            <p className="text-xs text-gray-300 mt-0.5 italic">No description — interns won't see scope context</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => setViewModule(m)}
                            title="View details"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#643f83] hover:bg-purple-50 transition-colors"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => startEdit(m)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete module "${m.title}"? Its tasks will be deleted too.`)) deleteMut.mutate(m.id) }}
                            disabled={deleteMut.isPending}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* stacked detail dialog */}
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
