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

export interface Task {
  id: string
  project_id: string
  team_id: string
  title: string
  description: string | null
  due_date: string | null
  status: WorkStatus
  created_by: string | null
  submission_link: string | null
  submission_note: string | null
  submitted_at: string | null
  reviewed_at: string | null
  review_comment: string | null
  created_at: string
}

export interface Submission {
  id: string
  subtask_id: string
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

export interface Subtask {
  id: string
  task_id: string
  task_title: string | null
  project_id: string | null
  created_by: string | null
  title: string
  description: string | null
  due_date: string | null
  status: WorkStatus
  created_at: string
  assignees: User[]
  submissions: Submission[]
}

export interface Notification {
  id: string
  user_id: string
  title: string
  body: string | null
  is_read: boolean
  created_at: string
}

/** Unified card shown on the kanban board — wraps either a Task or a Subtask */
export interface BoardCard {
  id: string
  kind: "task" | "subtask"
  title: string
  /** For subtasks: the parent task name */
  task_title: string | null
  /** Project name (resolved on the client) */
  project_title: string | null
  status: WorkStatus
  due_date: string | null
  description: string | null
  assignees: User[]
  submissions: Submission[]
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}
