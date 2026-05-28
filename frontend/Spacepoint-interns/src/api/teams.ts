import api from "./client"
import type { Team, User } from "@/types"

export const getTeamsApi = () =>
  api.get<Team[]>("/admin/teams").then((r) => r.data)

export const createTeamApi = (data: { name: string; leader_id?: string }) =>
  api.post<Team>("/admin/teams", data).then((r) => r.data)

export const updateTeamApi = (id: string, data: Partial<{ name: string; leader_id: string }>) =>
  api.patch<Team>(`/admin/teams/${id}`, data).then((r) => r.data)

export const getTeamMembersApi = (teamId: string) =>
  api.get<User[]>(`/teams/${teamId}/members`).then((r) => r.data)

export const addTeamMemberApi = (teamId: string, userId: string) =>
  api.post<Team>(`/admin/teams/${teamId}/members`, null, { params: { user_id: userId } }).then((r) => r.data)

export const removeTeamMemberApi = (teamId: string, userId: string) =>
  api.delete<Team>(`/admin/teams/${teamId}/members/${userId}`).then((r) => r.data)
