# SpacePoint Interns

An internship management platform for organising intern teams, projects, tasks, and submissions under one workspace.

## Structure

```
interns/
├── backend/        # FastAPI REST API
└── frontend/       # React SPA (Vite)
```

## Roles

| Role | Access |
|------|--------|
| **Admin** | Creates all user accounts. Manages users, teams, and projects. Full dashboard visibility. |
| **Leader** | Manages tasks and subtasks for their team. Reviews and scores intern submissions. |
| **Intern** | Views assigned subtasks and submits work. |

> There is no self-registration. All accounts are created by the admin.

## Tech Stack

- **Backend** — FastAPI, SQLAlchemy (async), PostgreSQL (Supabase), JWT auth
- **Frontend** — React 18, TypeScript, TanStack Router, TanStack Query, dnd-kit, Tailwind CSS
- **Hosting** — Frontend on Vercel, Backend on your preferred platform

## Quick Start

See individual READMEs:
- [`backend/README.md`](./backend/README.md)
- [`frontend/README.md`](./frontend/README.md)
