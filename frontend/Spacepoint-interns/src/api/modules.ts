import api from "./client"
import type { Module } from "@/types"

type Role = "admin" | "leader"

export const createModuleApi = (
  epicId: string,
  data: { title: string; description?: string },
  role: Role
) => api.post<Module>(`/${role}/epics/${epicId}/modules`, data).then((r) => r.data)

export const updateModuleApi = (
  moduleId: string,
  data: Partial<{ title: string; description: string }>,
  role: Role
) => api.patch<Module>(`/${role}/modules/${moduleId}`, data).then((r) => r.data)

export const deleteModuleApi = (moduleId: string, role: Role) =>
  api.delete(`/${role}/modules/${moduleId}`).then((r) => r.data)
