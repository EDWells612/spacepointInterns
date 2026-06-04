import api from "./client"
import type { Task, Submission } from "@/types"

// ── Admin ─────────────────────────────────────────────────────────────────────

export const getAllTasksApi = () =>
  api.get<Task[]>("/admin/tasks").then((r) => r.data)

export const createAdminTaskApi = (
  moduleId: string,
  data: { title: string; description?: string; due_date?: string; expected_time?: number }
) => api.post<Task>(`/admin/modules/${moduleId}/tasks`, data).then((r) => r.data)

export const updateTaskApi = (
  taskId: string,
  data: Partial<{ title: string; description: string; due_date: string; status: string; expected_time: number; actual_time: number }>
) => api.patch<Task>(`/admin/tasks/${taskId}`, data).then((r) => r.data)

export const deleteTaskApi = (taskId: string) =>
  api.delete(`/admin/tasks/${taskId}`).then((r) => r.data)

export const assignAdminTaskApi = (taskId: string, userIds: string[]) =>
  api.post<Task>(`/admin/tasks/${taskId}/assign`, { user_ids: userIds }).then((r) => r.data)

export const adminReviewSubmissionApi = (
  submissionId: string,
  data: { score: number; review_comment: string }
) => api.patch<Submission>(`/admin/submissions/${submissionId}/review`, data).then((r) => r.data)

// ── Leader ────────────────────────────────────────────────────────────────────

export const getLeaderTasksApi = () =>
  api.get<Task[]>("/leader/tasks").then((r) => r.data)

export const createLeaderTaskApi = (
  moduleId: string,
  data: { title: string; description?: string; due_date?: string; expected_time?: number }
) => api.post<Task>(`/leader/modules/${moduleId}/tasks`, data).then((r) => r.data)

export const updateLeaderTaskApi = (
  taskId: string,
  data: Partial<{ title: string; description: string; due_date: string; status: string; expected_time: number }>
) => api.patch<Task>(`/leader/tasks/${taskId}`, data).then((r) => r.data)

export const deleteLeaderTaskApi = (taskId: string) =>
  api.delete(`/leader/tasks/${taskId}`).then((r) => r.data)

export const assignLeaderTaskApi = (taskId: string, userIds: string[]) =>
  api.post<Task>(`/leader/tasks/${taskId}/assign`, { user_ids: userIds }).then((r) => r.data)

export const unassignLeaderTaskApi = (taskId: string, userId: string) =>
  api.delete<Task>(`/leader/tasks/${taskId}/assign/${userId}`).then((r) => r.data)

export const leaderReviewSubmissionApi = (
  submissionId: string,
  data: { score: number; review_comment: string }
) => api.patch<Submission>(`/leader/submissions/${submissionId}/review`, data).then((r) => r.data)

// ── Intern ────────────────────────────────────────────────────────────────────

export const getInternTasksApi = () =>
  api.get<Task[]>("/intern/tasks").then((r) => r.data)

export const updateInternTaskStatusApi = (taskId: string, status: string) =>
  api.patch<Task>(`/intern/tasks/${taskId}/status`, { status }).then((r) => r.data)

export const submitTaskWorkApi = (
  taskId: string,
  data: { link: string; note?: string; actual_time?: number }
) => api.post<Submission>(`/intern/tasks/${taskId}/submit`, data).then((r) => r.data)
