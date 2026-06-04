import api from "./client"
import type { Task } from "@/types"

/** Admin: view any user's task tracker */
export const getAdminTrackerApi = (userId: string) =>
  api.get<Task[]>(`/admin/tracker/${userId}`).then((r) => r.data)

/** Leader: view a team member's task tracker */
export const getLeaderTrackerApi = (userId: string) =>
  api.get<Task[]>(`/leader/tracker/${userId}`).then((r) => r.data)

/** Intern: own tracker — reuses the assigned-tasks endpoint */
export const getInternTrackerApi = () =>
  api.get<Task[]>("/intern/tasks").then((r) => r.data)
