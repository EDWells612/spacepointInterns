import api from "./client"
import type { Task } from "@/types"

export const getAllTasksApi = () =>
  api.get<Task[]>("/admin/tasks").then((r) => r.data)

export const getProjectTasksApi = (projectId: string) =>
  api.get<Task[]>(`/admin/projects/${projectId}/tasks`).then((r) => r.data)

export const getLeaderTasksApi = () =>
  api.get<Task[]>("/leader/tasks").then((r) => r.data)

export const createTaskApi = (
  projectId: string,
  data: { title: string; description?: string; due_date?: string; team_id: string; project_id: string }
) => api.post<Task>(`/admin/projects/${projectId}/tasks`, data).then((r) => r.data)

// Admin: full task update
export const updateTaskApi = (
  taskId: string,
  data: Partial<{ title: string; description: string; due_date: string; status: string; team_id: string }>
) => api.patch<Task>(`/admin/tasks/${taskId}`, data).then((r) => r.data)

// Leader: update own team's task (status only)
export const updateLeaderTaskApi = (
  taskId: string,
  data: Partial<{ status: string }>
) => api.patch<Task>(`/leader/tasks/${taskId}`, data).then((r) => r.data)

export const deleteTaskApi = (taskId: string) =>
  api.delete(`/admin/tasks/${taskId}`).then((r) => r.data)

export const reviewTaskApi = (taskId: string, data: { review_comment: string }) =>
  api.patch<Task>(`/admin/tasks/${taskId}/review`, data).then((r) => r.data)

export const submitTaskApi = (taskId: string, data: { link: string; note?: string }) =>
  api.patch<Task>(`/leader/tasks/${taskId}/submit`, data).then((r) => r.data)
