# SpacePoint Interns — v2

An internship management platform for organising intern teams around a structured work hierarchy, with time tracking, feature proposals, and a per-epic mind map.

## Structure

```
interns/
├── backend/        # FastAPI REST API
└── frontend/       # React SPA (Vite)
```

## Work Hierarchy (v2)

v2 introduces a four-level structure. Each level rolls up into the one above it:

```
Project        (owned by admin)
  └── Epic        (a workstream, owned by a team)
        └── Module   (groups tasks — a "General" module is auto-created; leaders can add more)
              └── Task    (the intern-level work item, with time tracking)
                    └── Submission   (work link + actual time, reviewed & scored)
```

### Board model

The admin and leader dashboards use an **epic → task drill-down** across status
columns (To do / In progress / Done):

- **Project cards** show an epic count.
- The board first shows **epic cards** (draggable to change epic status). Each has a
  "Mind map" button; clicking the card body drills into that epic's **task cards**
  (also draggable).
- **Modules are not shown on the board** — epic drills straight to tasks. Modules
  still exist for organising tasks and grouping them on the mind map.
- Interns see a flat **task board** with a `project › epic › module › task` breadcrumb.

## Roles

| Role | Access |
|------|--------|
| **Admin** | Creates all user accounts. Manages users, teams, projects, epics, modules, and tasks. Full dashboard visibility, reviews submissions, views any intern's tracker. |
| **Leader** | Manages epics and tasks for their team. Assigns tasks to interns, reviews & scores submissions, handles feature proposals, views team members' trackers. |
| **Intern** | Views assigned tasks, submits work (with time spent), proposes features on epics, and adds approach notes to their task nodes on the mind map. |

> There is no self-registration. All accounts are created by the admin.

## Features (v2)

- **Structured hierarchy** — Project → Epic → Module → Task, with status rollups
- **Time tracking** — leaders set *expected hours* per task; interns log *actual hours* on submission. The Tracker page surfaces accuracy, on-time rate, and totals.
- **Work Tracker + PDF export** — per-intern table of tasks, dates, status, time, and submissions. Admins/leaders can view any intern and export a PDF report.
- **Feature proposals** — interns propose ideas on an epic; leaders/admins review and can convert an accepted proposal directly into a task.
- **Mind map** — a ReactFlow canvas per epic showing Epic → Modules → Tasks. Admins/leaders drag to arrange (positions persist); interns annotate their own task nodes with their approach.
- **Submissions & review** — interns submit work links; leaders/admins score (0–100) and comment.
- **Notifications** — task assignment, submission ready, review done, proposal reviewed.

## Tech Stack

- **Backend** — FastAPI, SQLAlchemy (async), PostgreSQL (Supabase), JWT auth
- **Frontend** — React 18, TypeScript, TanStack Router, TanStack Query, dnd-kit, ReactFlow (`@xyflow/react`), Tailwind CSS
- **Hosting** — Frontend on Vercel, Backend on Railway (or any ASGI host)

## Pages

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | all | Admin: project/epic/task dashboard. Leader/Intern: task kanban board. |
| `/tracker` | all | Work tracker table + PDF export |
| `/mind-map/$epicId` | all | Per-epic mind map |
| `/calendar` | all | Calendar (meeting scheduling planned) |
| `/leaderboard` | all | Leaderboard |
| `/admin` | admin | User & team management |
| `/profile` | all | Current user profile |

## Quick Start

See individual READMEs:
- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)

## Database

The v2 schema is created by a single SQL migration (run against Supabase). Tables:
`users`, `teams`, `team_members`, `projects`, `project_teams`, `epics`, `modules`,
`tasks`, `task_assignees`, `task_submissions`, `proposals`, `mind_map_layouts`,
`task_mind_map_notes`, `notifications`.

> Migrations are currently applied via raw SQL. Alembic will be adopted once the
> schema stabilises (see roadmap).

## Roadmap

- Meeting scheduling on the Calendar page (Google Calendar API + OAuth, real Meet links + email invites)
- Alembic migrations
- Leaderboard score aggregation & time-range filters
- File attachments on submissions (Supabase Storage)
- Real-time notifications (WebSocket / Supabase Realtime)
- Mobile responsiveness pass
