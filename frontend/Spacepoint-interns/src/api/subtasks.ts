import api from "./client"
import type { Subtask, Submission } from "@/types"

// Leader
export const getLeaderSubtasksApi = () =>
  api.get<Subtask[]>("/leader/subtasks").then((r) => r.data)

export const getTaskSubtasksApi = (taskId: string) =>
  api.get<Subtask[]>(`/leader/tasks/${taskId}/subtasks`).then((r) => r.data)

export const createSubtaskApi = (
  taskId: string,
  data: { title: string; description?: string; due_date?: string }
) => api.post<Subtask>(`/leader/tasks/${taskId}/subtasks`, data).then((r) => r.data)

export const updateSubtaskApi = (
  subtaskId: string,
  data: Partial<{ title: string; description: string; due_date: string; status: string }>
) => api.patch<Subtask>(`/leader/subtasks/${subtaskId}`, data).then((r) => r.data)

export const deleteSubtaskApi = (subtaskId: string) =>
  api.delete(`/leader/subtasks/${subtaskId}`).then((r) => r.data)

export const assignSubtaskApi = (subtaskId: string, userIds: string[]) =>
  api.post<Subtask>(`/leader/subtasks/${subtaskId}/assign`, { user_ids: userIds }).then((r) => r.data)

export const reviewSubmissionApi = (submissionId: string, data: { score: number; review_comment: string }) =>
  api.patch<Submission>(`/leader/submissions/${submissionId}/review`, data).then((r) => r.data)

// Intern
export const getInternSubtasksApi = () =>
  api.get<Subtask[]>("/intern/subtasks").then((r) => r.data)

export const updateInternStatusApi = (subtaskId: string, status: string) =>
  api.patch<Subtask>(`/intern/subtasks/${subtaskId}/status`, { status }).then((r) => r.data)

export const submitWorkApi = (subtaskId: string, data: { link: string; note?: string }) =>
  api.post<Submission>(`/intern/subtasks/${subtaskId}/submit`, data).then((r) => r.data)
