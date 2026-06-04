export type Role = "admin" | "leader" | "intern"
export type WorkStatus = "todo" | "in_progress" | "done"
export type SubmissionStatus = "submitted" | "reviewed"

export interface User {
  id: string
  full_name: string
  email: string
  role: Role
  phone: string | null
  created_at: string
}

export interface Team {
  id: string
  name: string
  leader_id: string
  members: User[]
}

export type ProjectStatus = "active" | "completed"

export interface Project {
  id: string
  title: string
  description: string | null
  status: ProjectStatus
  created_by: string | null
  created_at: string
}

// ── Task hierarchy ────────────────────────────────────────────────────────────

export interface TaskBrief {
  id: string
  title: string
  status: WorkStatus
  due_date: string | null
  expected_time: number | null
  actual_time: number | null
  assignee_count: number
}

export interface Module {
  id: string
  epic_id: string
  title: string
  description: string | null
  created_at: string
  tasks: TaskBrief[]
}

export interface Epic {
  id: string
  project_id: string
  team_id: string
  title: string
  description: string | null
  status: WorkStatus
  created_by: string | null
  created_at: string
  modules: Module[]
}

export interface Submission {
  id: string
  task_id: string
  submitted_by: string
  submitter_name: string | null
  link: string
  note: string | null
  status: SubmissionStatus
  score: number | null
  review_comment: string | null
  submitted_at: string
  reviewed_at: string | null
}

/** Intern-level work item — belongs to a Module → Epic → Project */
export interface Task {
  id: string
  module_id: string
  title: string
  description: string | null
  status: WorkStatus
  due_date: string | null
  expected_time: number | null
  actual_time: number | null
  created_by: string | null
  created_at: string
  assignees: User[]
  submissions: Submission[]
  // derived by backend from module → epic chain
  module_title: string | null
  module_description: string | null
  epic_id: string | null
  epic_title: string | null
  epic_description: string | null
  project_id: string | null
}

export interface Proposal {
  id: string
  epic_id: string
  proposed_by: string
  proposer_name: string | null
  title: string
  description: string | null
  status: "pending" | "accepted" | "rejected"
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

/** Unified card shown on the kanban board */
export interface BoardCard {
  id: string
  title: string
  epic_id: string | null
  epic_title: string | null
  epic_description: string | null
  module_title: string | null
  module_description: string | null
  project_title: string | null
  status: WorkStatus
  due_date: string | null
  description: string | null
  expected_time: number | null
  actual_time: number | null
  assignees: User[]
  submissions: Submission[]
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}
