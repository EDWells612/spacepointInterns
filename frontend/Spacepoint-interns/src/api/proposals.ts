import api from "./client"
import type { Proposal } from "@/types"

export const createProposalApi = (
  epicId: string,
  data: { title: string; description?: string }
) => api.post<Proposal>(`/intern/epics/${epicId}/proposals`, data).then((r) => r.data)

export const getEpicProposalsApi = (epicId: string, role: "admin" | "leader") =>
  api.get<Proposal[]>(`/${role}/epics/${epicId}/proposals`).then((r) => r.data)

export const getLeaderAllProposalsApi = () =>
  api.get<Proposal[]>("/leader/proposals").then((r) => r.data)

export const reviewProposalApi = (
  proposalId: string,
  data: { status: string; review_note?: string },
  role: "admin" | "leader"
) => api.patch<Proposal>(`/${role}/proposals/${proposalId}`, data).then((r) => r.data)
