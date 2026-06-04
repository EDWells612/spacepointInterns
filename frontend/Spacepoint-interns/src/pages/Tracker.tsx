import { useState, useRef } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download, Clock, CheckCircle, TrendingUp, Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import type { Task, User } from "@/types"
import { getUsersApi } from "@/api/users"
import { getAdminTrackerApi, getLeaderTrackerApi, getInternTrackerApi } from "@/api/tracker"
import { getLeaderTeamMembersApi } from "@/api/teams"

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "—"
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtHours(h: number | null) {
  if (h == null) return "—"
  return `${Number(h)}h`
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    todo:        "bg-gray-100 text-gray-500",
    in_progress: "bg-[#d6c7e1] text-[#643f83]",
    done:        "bg-black text-white",
  }
  return map[status] ?? "bg-gray-100 text-gray-500"
}

function computeStats(tasks: Task[]) {
  const total     = tasks.length
  const done      = tasks.filter((t) => t.status === "done").length
  const pctDone   = total ? Math.round((done / total) * 100) : 0

  const withDue   = tasks.filter((t) => t.due_date && t.status === "done")
  const onTime    = withDue.filter((t) => {
    const sub = t.submissions?.[t.submissions.length - 1]
    if (!sub) return false
    return new Date(sub.submitted_at) <= new Date(t.due_date!)
  }).length
  const pctOnTime = withDue.length ? Math.round((onTime / withDue.length) * 100) : null

  const withTime  = tasks.filter((t) => t.expected_time != null && t.actual_time != null)
  const avgDelta  = withTime.length
    ? withTime.reduce((acc, t) => acc + (Number(t.actual_time) - Number(t.expected_time)), 0) / withTime.length
    : null

  const totalActual   = tasks.reduce((acc, t) => acc + (t.actual_time   ? Number(t.actual_time)   : 0), 0)
  const totalExpected = tasks.reduce((acc, t) => acc + (t.expected_time ? Number(t.expected_time) : 0), 0)

  return { total, done, pctDone, pctOnTime, avgDelta, totalActual, totalExpected }
}

// ── main component ────────────────────────────────────────────────────────────

export default function Tracker() {
  const { currentUser } = useAuth()
  const printRef        = useRef<HTMLDivElement>(null)
  const isAdmin   = currentUser?.role === "admin"
  const isLeader  = currentUser?.role === "leader"
  const isIntern  = currentUser?.role === "intern"

  const [selectedUserId, setSelectedUserId] = useState<string>("")

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: getUsersApi,
    enabled: isAdmin,
  })

  const { data: teamInterns = [] } = useQuery<User[]>({
    queryKey: ["leader", "team", "members"],
    queryFn: getLeaderTeamMembersApi,
    enabled: isLeader,
  })

  // admin sees all interns
  const adminInterns  = allUsers.filter((u) => u.role === "intern")

  const interns: User[] = isAdmin ? adminInterns : isLeader ? teamInterns : []

  // which user's tasks to fetch
  const targetId = isIntern ? currentUser?.id : selectedUserId

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tracker", targetId],
    queryFn: () => {
      if (isIntern)       return getInternTrackerApi()
      if (isAdmin)        return getAdminTrackerApi(targetId!)
      return getLeaderTrackerApi(targetId!)
    },
    enabled: !!targetId,
  })

  const selectedUser  = isIntern
    ? currentUser
    : interns.find((u) => u.id === selectedUserId) ?? null

  const stats = computeStats(tasks)

  // ── print ──────────────────────────────────────────────────────────────────
  const handlePrint = () => window.print()

  if (!currentUser) return null

  return (
    <div className="flex flex-col gap-6">

      {/* ── print styles ────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #tracker-print, #tracker-print * { visibility: visible; }
          #tracker-print { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between no-print">
        <div>
          <h1 className="text-xl font-bold text-black tracking-tight">Work Tracker</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {isIntern ? "Your task history and time log" : "View intern progress and time accuracy"}
          </p>
        </div>
        {targetId && tasks.length > 0 && (
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 h-9 px-4 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={14} /> Export PDF
          </button>
        )}
      </div>

      {/* ── Intern selector (admin / leader only) ───────────────────────── */}
      {(isAdmin || isLeader) && (
        <div className="no-print">
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {isAdmin ? "Select intern" : "Team member"}
          </label>
          {interns.length === 0 ? (
            <p className="text-sm text-gray-400">
              {isLeader ? "No interns in your team yet." : "No intern accounts found."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {interns.map((u) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className={cn(
                    "flex items-center gap-2 h-9 px-4 rounded-xl text-sm font-medium border transition-colors",
                    selectedUserId === u.id
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full text-[9px] font-bold flex items-center justify-center flex-shrink-0",
                    selectedUserId === u.id ? "bg-white text-black" : "bg-[#d6c7e1] text-[#643f83]"
                  )}>
                    {u.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  {u.full_name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Empty / loading state ────────────────────────────────────────── */}
      {!targetId && (isAdmin || isLeader) && (
        <div className="flex items-center justify-center h-40 border border-dashed border-gray-200 rounded-2xl">
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <Users size={16} /> Select an intern to view their tracker
          </p>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Main printable area ──────────────────────────────────────────── */}
      {targetId && !isLoading && (
        <div id="tracker-print" ref={printRef}>

          {/* Print header */}
          <div className="hidden print:block mb-6">
            <h1 className="text-2xl font-bold text-black">Work Tracker Report</h1>
            <p className="text-sm text-gray-500 mt-1">
              {selectedUser?.full_name} · Generated {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          </div>

          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-40 border border-dashed border-gray-200 rounded-2xl">
              <p className="text-sm text-gray-400">No tasks assigned yet</p>
            </div>
          ) : (
            <>
              {/* ── Stats ─────────────────────────────────────────────── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard
                  icon={<CheckCircle size={16} className="text-black" />}
                  label="Completed"
                  value={`${stats.done}/${stats.total}`}
                  sub={`${stats.pctDone}%`}
                  highlight={stats.pctDone >= 80}
                />
                <StatCard
                  icon={<Clock size={16} className="text-[#643f83]" />}
                  label="On time"
                  value={stats.pctOnTime != null ? `${stats.pctOnTime}%` : "—"}
                  sub={stats.pctOnTime != null ? "of done tasks" : "no data yet"}
                  highlight={stats.pctOnTime != null && stats.pctOnTime >= 70}
                />
                <StatCard
                  icon={<TrendingUp size={16} className="text-gray-500" />}
                  label="Total hours"
                  value={stats.totalActual > 0 ? `${stats.totalActual}h` : "—"}
                  sub={stats.totalExpected > 0 ? `of ${stats.totalExpected}h expected` : "no estimates yet"}
                />
                <StatCard
                  icon={<TrendingUp size={16} className="text-gray-500" />}
                  label="Avg time delta"
                  value={stats.avgDelta != null ? `${stats.avgDelta > 0 ? "+" : ""}${stats.avgDelta.toFixed(1)}h` : "—"}
                  sub={stats.avgDelta != null
                    ? stats.avgDelta > 0 ? "over estimate" : stats.avgDelta < 0 ? "under estimate" : "on point"
                    : "no data yet"}
                  highlight={stats.avgDelta != null && stats.avgDelta <= 0}
                />
              </div>

              {/* ── Table ─────────────────────────────────────────────── */}
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Task", "Epic", "Start date", "Due date", "Status", "Expected", "Actual", "Δ", "Submissions", "Latest link"].map((h) => (
                        <th key={h} className="text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((task, i) => {
                      const latestSub    = task.submissions?.[task.submissions.length - 1]
                      const delta        = task.expected_time != null && task.actual_time != null
                        ? Number(task.actual_time) - Number(task.expected_time)
                        : null
                      const isOverdue    = task.due_date && new Date(task.due_date) < new Date() && task.status !== "done"
                      return (
                        <tr key={task.id} className={cn(
                          "border-b border-gray-50 transition-colors hover:bg-gray-50/50",
                          i % 2 === 1 ? "bg-gray-50/30" : "bg-white"
                        )}>
                          {/* Task */}
                          <td className="px-4 py-3 font-medium text-black max-w-[180px]">
                            <p className="truncate">{task.title}</p>
                          </td>
                          {/* Epic */}
                          <td className="px-4 py-3">
                            {task.epic_title
                              ? <span className="text-[11px] font-semibold text-[#643f83] bg-[#d6c7e1]/40 px-2 py-0.5 rounded-full whitespace-nowrap">{task.epic_title}</span>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          {/* Start date */}
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(task.created_at)}</td>
                          {/* Due date */}
                          <td className={cn("px-4 py-3 whitespace-nowrap", isOverdue ? "text-red-500 font-medium" : "text-gray-500")}>
                            {fmtDate(task.due_date)}
                          </td>
                          {/* Status */}
                          <td className="px-4 py-3">
                            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap", statusBadge(task.status))}>
                              {task.status.replace("_", " ")}
                            </span>
                          </td>
                          {/* Expected */}
                          <td className="px-4 py-3 text-gray-500 text-right">{fmtHours(task.expected_time)}</td>
                          {/* Actual */}
                          <td className="px-4 py-3 text-gray-500 text-right">{fmtHours(task.actual_time)}</td>
                          {/* Delta */}
                          <td className={cn("px-4 py-3 font-medium text-right whitespace-nowrap", delta == null ? "text-gray-300" : delta > 0 ? "text-red-500" : delta < 0 ? "text-green-600" : "text-gray-500")}>
                            {delta == null ? "—" : delta === 0 ? "on time" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}h`}
                          </td>
                          {/* Submissions */}
                          <td className="px-4 py-3 text-gray-500 text-center">
                            {task.submissions?.length > 0 ? (
                              <div className="flex items-center justify-center gap-1">
                                <span>{task.submissions.length}</span>
                                {latestSub?.status === "reviewed" && latestSub.score != null && (
                                  <span className="text-[10px] font-bold bg-black text-white px-1.5 py-0.5 rounded-full">
                                    {latestSub.score}/100
                                  </span>
                                )}
                              </div>
                            ) : <span className="text-gray-300">—</span>}
                          </td>
                          {/* Latest link */}
                          <td className="px-4 py-3 max-w-[140px]">
                            {latestSub?.link
                              ? <a href={latestSub.link} target="_blank" rel="noreferrer"
                                  className="text-[#643f83] hover:underline text-xs truncate block">
                                  {latestSub.link}
                                </a>
                              : <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Print footer */}
              <div className="hidden print:block mt-8 pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-400 text-center">
                  SpacePoint Interns · Work Tracker · {selectedUser?.full_name}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, highlight }: {
  icon: React.ReactNode; label: string; value: string; sub: string; highlight?: boolean
}) {
  return (
    <div className={cn(
      "rounded-2xl border p-4 flex flex-col gap-1",
      highlight ? "border-black bg-black text-white" : "border-gray-100 bg-white"
    )}>
      <div className="flex items-center gap-2 mb-1">
        <span className={highlight ? "text-white" : ""}>{icon}</span>
        <span className={cn("text-xs font-semibold uppercase tracking-wider", highlight ? "text-gray-300" : "text-gray-400")}>
          {label}
        </span>
      </div>
      <p className={cn("text-2xl font-bold", highlight ? "text-white" : "text-black")}>{value}</p>
      <p className={cn("text-xs", highlight ? "text-gray-400" : "text-gray-400")}>{sub}</p>
    </div>
  )
}
