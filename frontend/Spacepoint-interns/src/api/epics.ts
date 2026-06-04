import api from "./client"
import type { Epic } from "@/types"

// Admin
export const getAllEpicsApi = () =>
  api.get<Epic[]>("/admin/epics").then((r) => r.data)

export const getProjectEpicsApi = (projectId: string) =>
  api.get<Epic[]>(`/admin/projects/${projectId}/epics`).then((r) => r.data)

export const createEpicApi = (
  projectId: string,
  data: { title: string; description?: string; team_id: string }
) => api.post<Epic>(`/admin/projects/${projectId}/epics`, data).then((r) => r.data)

export const updateEpicApi = (
  epicId: string,
  data: Partial<{ title: string; description: string; status: string }>
) => api.patch<Epic>(`/admin/epics/${epicId}`, data).then((r) => r.data)

export const deleteEpicApi = (epicId: string) =>
  api.delete(`/admin/epics/${epicId}`).then((r) => r.data)

// Leader
export const getLeaderEpicsApi = () =>
  api.get<Epic[]>("/leader/epics").then((r) => r.data)

export const updateLeaderEpicApi = (
  epicId: string,
  data: Partial<{ title: string; description: string; status: string }>
) => api.patch<Epic>(`/leader/epics/${epicId}`, data).then((r) => r.data)
