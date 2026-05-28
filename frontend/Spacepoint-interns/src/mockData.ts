import type { Subtask, User, Project, Task, Team } from "./types";

export const mockAdmin: User = {
  id: "admin-1",
  name: "Sarah Admin",
  email: "admin@space.com",
  role: "admin",
  whatsapp_number: "+201000000001",
  team_id: null,
};

export const mockLeader: User = {
  id: "leader-1",
  name: "John Leader",
  email: "leader@space.com",
  role: "leader",
  whatsapp_number: "+201000000002",
  team_id: "team-1",
};

export const mockIntern: User = {
  id: "intern-1",
  name: "Ahmed Intern",
  email: "intern@space.com",
  role: "intern",
  whatsapp_number: "+201001234567",
  team_id: "team-1",
};

export const mockTeam: Team = {
  id: "team-1",
  name: "Frontend Team",
  leader_id: "leader-1",
  members: [mockIntern],
};

export const mockProjects: Project[] = [
  {
    id: "proj-1",
    name: "SPACE Interns Portal",
    description: "The main portal for managing internships.",
    created_at: "2025-05-01",
  },
  {
    id: "proj-2",
    name: "Marketing Website",
    description: "Public facing marketing website for SPACE.",
    created_at: "2025-05-10",
  },
];

export const mockTasks: Task[] = [
  {
    id: "task-1",
    project_id: "proj-1",
    team_id: "team-1",
    title: "Implement Dashboard UI",
    description: "Create the main dashboard layout and kanban board.",
    due_date: "2025-06-15",
    status: "in_progress",
  },
  {
    id: "task-2",
    project_id: "proj-1",
    team_id: "team-1",
    title: "Setup Authentication",
    description: "Implement JWT based authentication.",
    due_date: "2025-06-01",
    status: "done",
  },
];

export const mockSubtasks: Subtask[] = [
  {
    id: "sub-1",
    task_id: "task-1",
    title: "Redesign onboarding flow",
    description: "Update the onboarding screens based on the new brand guidelines.",
    status: "todo",
    due_date: "2025-06-01",
    assigned_to: [mockIntern],
  },
  {
    id: "sub-2",
    task_id: "task-1",
    title: "Fix navbar responsiveness",
    description: "The navbar breaks on mobile, fix it.",
    status: "in_progress",
    due_date: "2025-05-28",
    assigned_to: [mockIntern],
  },
  {
    id: "sub-3",
    task_id: "task-2",
    title: "Write API docs",
    description: "Document all intern-facing endpoints.",
    status: "done",
    due_date: "2025-05-25",
    assigned_to: [mockIntern],
    submission: {
      id: "s1",
      subtask_id: "sub-3",
      submitted_by: "intern-1",
      link: "https://github.com/...",
      note: "Done and deployed",
      status: "reviewed",
      submitted_at: "2025-05-24",
    },
  },
  {
    id: "sub-4",
    task_id: "task-2",
    title: "Setup Tailwind config",
    description: "Configure Tailwind with brand colors.",
    status: "done",
    due_date: "2025-05-20",
    assigned_to: [mockIntern],
    submission: {
      id: "s2",
      subtask_id: "sub-4",
      submitted_by: "intern-1",
      link: "https://github.com/...",
      note: "Configured and tested",
      status: "submitted",
      submitted_at: "2025-05-22",
    },
  },
  {
    id: "sub-5",
    task_id: "task-1",
    title: "Create profile page",
    description: "Implement user profile page with task stats.",
    status: "todo",
    due_date: "2025-06-05",
    assigned_to: [mockIntern],
  }
];
