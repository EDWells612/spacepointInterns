import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ExternalLink, Clock, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { BoardCard, User } from "@/types"
import { useAuth } from "@/context/AuthContext"
import { updateSubtaskApi, deleteSubtaskApi, updateInternStatusApi, reviewSubmissionApi, submitWorkApi } from "@/api/subtasks"
import { updateLeaderTaskApi } from "@/api/tasks"

interface Props {
  card: BoardCard | null
  open: boolean
  onClose: () => void
  subtasksKey: string[]
  tasksKey: string[]
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function AssigneeRow({ user }: { user: User }) {
  const initials = user.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-[#d6c7e1] text-[#643f83] text-xs font-semibold flex items-center justify-center flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-black">{user.full_name}</p>
          <p className="text-xs text-gray-400">{user.email}</p>
        </div>
      </div>
      {user.phone && (
        <a href={`https://wa.me/${user.phone.replace(/\D/g, "")}`}
          target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 text-xs text-[#25d366] hover:text-[#1da851] font-medium transition-colors">
          <WhatsAppIcon className="w-4 h-4" />
          <span className="hidden sm:inline">WhatsApp</span>
        </a>
      )}
    </div>
  )
}

export default function TaskModal({ card, open, onClose, subtasksKey, tasksKey }: Props) {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const isIntern = currentUser?.role === "intern"
  const isLeader = currentUser?.role === "leader"

  const [view, setView] = useState<"detail" | "submit" | "review">("detail")
  const [submitLink, setSubmitLink] = useState("")
  const [submitNote, setSubmitNote] = useState("")
  const [reviewScore, setReviewScore] = useState("")
  const [reviewComment, setReviewComment] = useState("")
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)

  const resetClose = () => {
    setView("detail")
    setSubmitLink("")
    setSubmitNote("")
    setReviewScore("")
    setReviewComment("")
    setSelectedSubmissionId(null)
    onClose()
  }

  const startMutation = useMutation({
    mutationFn: () => isIntern
      ? updateInternStatusApi(card!.id, "in_progress")
      : updateSubtaskApi(card!.id, { status: "in_progress" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: subtasksKey }); resetClose() },
  })

  const submitMutation = useMutation({
    mutationFn: () => submitWorkApi(card!.id, { link: submitLink, note: submitNote || undefined }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: subtasksKey }); resetClose() },
  })

  const reviewMutation = useMutation({
    mutationFn: () => reviewSubmissionApi(selectedSubmissionId!, {
      score: Number(reviewScore) || 0,
      review_comment: reviewComment,
    }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: subtasksKey }); resetClose() },
  })

  const deleteSubtaskMutation = useMutation({
    mutationFn: () => deleteSubtaskApi(card!.id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: subtasksKey }); resetClose() },
  })

  // Leader updating a parent task status directly from modal
  const updateTaskStatusMutation = useMutation({
    mutationFn: (status: string) => updateLeaderTaskApi(card!.id, { status }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: tasksKey }); resetClose() },
  })

  if (!card) return null

  const isTask = card.kind === "task"
  const pendingSubs = card.submissions?.filter((s) => s.status === "submitted") ?? []

  const formattedDue = card.due_date
    ? new Date(card.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

  return (
    <Dialog open={open} onOpenChange={resetClose}>
      <DialogContent className="max-w-md w-full bg-white border border-gray-100 shadow-xl rounded-2xl p-0 overflow-hidden">
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded",
                isTask ? "bg-black text-white" : "bg-[#d6c7e1]/60 text-[#643f83]"
              )}>
                {isTask ? "Task" : "Subtask"}
              </span>
              {!isTask && card.task_title && (
                <span className="text-xs text-gray-400">{card.task_title}</span>
              )}
            </div>
            <DialogTitle className="text-base font-semibold text-black leading-snug pr-6">
              {card.title}
            </DialogTitle>
          </DialogHeader>

          {/* ── Detail view ─────────────────────────────────────────── */}
          {view === "detail" && (
            <div className="mt-4 flex flex-col gap-4">
              {card.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{card.description}</p>
              )}

              {formattedDue && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock size={13} />
                  <span>Due {formattedDue}</span>
                </div>
              )}

              {/* Assignees (subtasks only) */}
              {!isTask && card.assignees.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Assigned to</p>
                  <div className="divide-y divide-gray-50">
                    {card.assignees.map((u) => <AssigneeRow key={u.id} user={u} />)}
                  </div>
                </div>
              )}

              {/* All submissions (subtasks only) */}
              {!isTask && card.submissions.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                    Submissions ({card.submissions.length})
                  </p>
                  {[...card.submissions].reverse().map((sub, i) => (
                    <div key={sub.id} className={cn(
                      "rounded-xl p-3 border",
                      i === 0 ? "bg-gray-50 border-gray-200" : "bg-white border-gray-100 opacity-70"
                    )}>
                      <div className="flex items-center justify-between mb-1.5">
                        {i === 0
                          ? <p className="text-[9px] font-bold uppercase tracking-widest text-[#643f83]">Latest</p>
                          : <span />
                        }
                        {sub.submitter_name && (
                          <span className="text-[10px] font-medium text-gray-500">
                            by {sub.submitter_name}
                          </span>
                        )}
                      </div>
                      <a href={sub.link} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 text-sm text-[#643f83] hover:underline">
                        <ExternalLink size={13} />
                        {sub.link}
                      </a>
                      {sub.note && <p className="text-xs text-gray-500 mt-1">{sub.note}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                          sub.status === "reviewed" ? "bg-black text-white" : "bg-[#d6c7e1] text-[#643f83]"
                        )}>
                          {sub.status === "reviewed" ? "Reviewed" : "Pending review"}
                        </span>
                        <div className="flex items-center gap-2">
                          {sub.score != null && (
                            <span className="text-xs font-semibold text-black">{sub.score}/100</span>
                          )}
                          <span className="text-[10px] text-gray-400">
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {sub.review_comment && (
                        <p className="text-xs text-gray-500 mt-1.5 italic">"{sub.review_comment}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1">
                {/* Intern actions (subtasks only) */}
                {isIntern && !isTask && card.status === "todo" && (
                  <button onClick={() => startMutation.mutate()} disabled={startMutation.isPending}
                    className="w-full h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
                    {startMutation.isPending ? "Updating…" : "Start working"}
                  </button>
                )}
                {isIntern && !isTask && card.status === "in_progress" && (
                  <button onClick={() => setView("submit")}
                    className="w-full h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors">
                    Submit work
                  </button>
                )}

                {/* Leader delete subtask */}
                {isLeader && !isTask && (
                  <button
                    onClick={() => { if (confirm(`Delete "${card.title}"?`)) deleteSubtaskMutation.mutate() }}
                    disabled={deleteSubtaskMutation.isPending}
                    className="w-full h-9 flex items-center justify-center gap-1.5 border border-red-200 text-red-500 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 size={13} /> Delete subtask
                  </button>
                )}

                {/* Leader actions on subtasks */}
                {isLeader && !isTask && pendingSubs.length > 0 && (
                  <button onClick={() => {
                    // Review the most recently submitted pending one
                    const latest = [...pendingSubs].sort((a, b) =>
                      new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
                    )[0]
                    setSelectedSubmissionId(latest.id)
                    setView("review")
                  }}
                    className="w-full h-10 border border-black text-black rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
                    Review submission ({pendingSubs.length})
                  </button>
                )}

                {/* Leader actions on tasks — quick status buttons */}
                {isLeader && isTask && (
                  <div className="flex gap-2">
                    {card.status !== "in_progress" && (
                      <button onClick={() => updateTaskStatusMutation.mutate("in_progress")}
                        disabled={updateTaskStatusMutation.isPending}
                        className="flex-1 h-9 border border-[#643f83] text-[#643f83] rounded-xl text-xs font-medium hover:bg-[#d6c7e1]/30 transition-colors disabled:opacity-50">
                        Mark in progress
                      </button>
                    )}
                    {card.status !== "done" && (
                      <button onClick={() => updateTaskStatusMutation.mutate("done")}
                        disabled={updateTaskStatusMutation.isPending}
                        className="flex-1 h-9 bg-black text-white rounded-xl text-xs font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
                        Mark done
                      </button>
                    )}
                    {card.status !== "todo" && (
                      <button onClick={() => updateTaskStatusMutation.mutate("todo")}
                        disabled={updateTaskStatusMutation.isPending}
                        className="flex-1 h-9 border border-gray-200 text-gray-600 rounded-xl text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                        Reopen
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Submit view (intern) ─────────────────────────────────── */}
          {view === "submit" && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="text-sm text-gray-500">Paste a link to your work</p>
              <input value={submitLink} onChange={(e) => setSubmitLink(e.target.value)}
                placeholder="https://..."
                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
              <textarea value={submitNote} onChange={(e) => setSubmitNote(e.target.value)}
                placeholder="Add a note (optional)" rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors" />
              <div className="flex gap-2 pt-1">
                <button onClick={() => setView("detail")}
                  className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                  Back
                </button>
                <button onClick={() => submitMutation.mutate()}
                  disabled={!submitLink.trim() || submitMutation.isPending}
                  className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
                  {submitMutation.isPending ? "Submitting…" : "Submit"}
                </button>
              </div>
            </div>
          )}

          {/* ── Review view (leader) ─────────────────────────────────── */}
          {view === "review" && selectedSubmissionId && (() => {
            const sub = card.submissions.find((s) => s.id === selectedSubmissionId)
            if (!sub) return null
            return (
              <div className="mt-4 flex flex-col gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <a href={sub.link} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#643f83] hover:underline">
                    <ExternalLink size={13} />{sub.link}
                  </a>
                  {sub.note && <p className="text-xs text-gray-500 mt-1">{sub.note}</p>}
                </div>
                <input type="number" value={reviewScore} onChange={(e) => setReviewScore(e.target.value)}
                  placeholder="Score (0–100)" min={0} max={100}
                  className="w-full h-10 px-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-black transition-colors" />
                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Feedback…" rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-black transition-colors" />
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setView("detail")}
                    className="flex-1 h-10 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                    Back
                  </button>
                  <button onClick={() => reviewMutation.mutate()}
                    disabled={!reviewComment.trim() || reviewMutation.isPending}
                    className="flex-1 h-10 bg-black text-white rounded-xl text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50">
                    {reviewMutation.isPending ? "Saving…" : "Submit review"}
                  </button>
                </div>
              </div>
            )
          })()}
        </div>
      </DialogContent>
    </Dialog>
  )
}
