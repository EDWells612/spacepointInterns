import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Subtask, Task, User } from "@/types"
import { createSubtaskApi, assignSubtaskApi } from "@/api/subtasks"
import { getTeamMembersApi } from "@/api/teams"

interface Props {
  tasks: Task[]
  open: boolean
  onClose: () => void
  subtasksKey: string[]
}

export default function CreateSubtaskModal({ tasks, open, onClose, subtasksKey }: Props) {
  const queryClient = useQueryClient()
  const [taskId, setTaskId] = useState(tasks[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [members, setMembers] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const selectedTask = tasks.find((t) => t.id === taskId)

  useEffect(() => {
    if (!selectedTask?.team_id) return
    getTeamMembersApi(selectedTask.team_id).then(setMembers).catch(() => {})
    setSelectedUsers([])
  }, [selectedTask?.team_id])

  const createMutation = useMutation({
    mutationFn: async () => {
      const sub = await createSubtaskApi(taskId, {
        title,
        description: description || undefined,
        due_date: dueDate ? new Date(dueDate).toISOString() : undefined,
      })
      if (selectedUsers.length > 0) {
        return assignSubtaskApi(sub.id, selectedUsers)
      }
      return sub
    },
    onSuccess: (created: Subtask) => {
      queryClient.setQueryData<Subtask[]>(subtasksKey, (old = []) => [...old, created])
      queryClient.invalidateQueries({ queryKey: subtasksKey })
      onClose()
    },
  })

  const toggleUser = (id: string) =>
    setSelectedUsers((prev) => prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id])

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white border border-gray-100 rounded-2xl p-0 overflow-hidden">
        <div className="p-6 flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-black">New subtask</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Parent task</label>
              <select value={taskId} onChange={(e) => setTaskId(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm text-black bg-white focus:outline-none focus:border-black transition-colors">
                {tasks.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional details…" rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm text-black focus:outline-none focus:border-black transition-colors" />
            </div>

            {members.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Assign to</label>
                <div className="flex flex-col gap-1">
                  {members.map((u) => (
                    <label key={u.id} className="flex items-center gap-3 cursor-pointer p-2 rounded-xl hover:bg-gray-50 transition-colors">
                      <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={() => toggleUser(u.id)} className="rounded" />
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#d6c7e1] text-[#643f83] text-xs font-semibold flex items-center justify-center flex-shrink-0">
                          {u.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm text-black">{u.full_name}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={() => createMutation.mutate()} disabled={!title.trim() || !taskId || createMutation.isPending}
              className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
              {createMutation.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
