# SpacePoint Interns — Backend

FastAPI REST API with async SQLAlchemy and PostgreSQL.

## Requirements

- Python 3.11+
- PostgreSQL database (Supabase recommended)

## Setup

```bash
# 1. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment variables
cp .env.example .env
# Fill in the values (see Environment Variables below)

# 4. Run the v2 schema SQL against your database (see Database below)

# 5. Start the server
uvicorn app.main:app --reload
```

API at `http://localhost:8000` · Docs at `http://localhost:8000/docs`

## Environment Variables

```env
DATABASE_URL=postgresql+asyncpg://user:password@host:port/dbname
SECRET_KEY=your-jwt-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720
REFRESH_TOKEN_EXPIRE_DAYS=7
```

## Project Structure

```
app/
├── main.py          # App entry point, CORS, router registration
├── core/            # Config, security (JWT, hashing), dependencies
├── db/              # Database session setup
├── models/          # SQLAlchemy ORM models
├── schemas/         # Pydantic request/response schemas
├── routers/         # Route handlers (admin, leader, intern, shared, auth, notifications)
└── services/        # Business logic layer (no HTTP, pure DB operations)
```

## Data Hierarchy

```
Project
  └── Epic  (team-scoped, status: todo / in_progress / done)
        └── Module  (scope/description shown to interns)
              └── Task  (assignees, due date, expected_time)
                    └── Submission  (link, actual_time, score 0-100, review_comment)

Team ←→ Epic  (team owns the epic)
Team ←→ User  (team_members join table)
Proposal  (intern → leader/admin review → optionally creates task)
Notification  (sent on proposal review, task assignment)
```

## API Routes

| Prefix | Role | Description |
|--------|------|-------------|
| `/auth` | Public | Login, token refresh |
| `/admin/*` | Admin | Full CRUD on all resources |
| `/leader/*` | Leader | Own team's epics, tasks, proposals, tracker |
| `/intern/*` | Intern | Own tasks, proposals, mind-map notes, team |
| `/users/me`, `/teams/{id}/members` | All | Shared profile + team endpoints |
| `/notifications/*` | All | Notification inbox |

### Full endpoint list by feature

| Feature | Admin | Leader | Intern |
|---------|-------|--------|--------|
| Projects | GET/POST/PATCH/DELETE `/admin/projects` | GET `/leader/projects` | GET `/intern/projects` |
| Epics | GET/POST `/admin/projects/{id}/epics`, PATCH/DELETE `/admin/epics/{id}` | GET/PATCH `/leader/epics/{id}` | GET `/intern/epics/{id}` |
| Modules | POST/PATCH/DELETE `/admin/(epics\|modules)/…` | POST/PATCH/DELETE `/leader/(epics\|modules)/…` | — |
| Tasks | POST/PATCH/DELETE `/admin/(modules\|tasks)/…` | POST/PATCH/DELETE `/leader/(modules\|tasks)/…` | PATCH `/intern/tasks/{id}/status` |
| Assign | POST `/admin/tasks/{id}/assign` | POST/DELETE `/leader/tasks/{id}/assign[/{user_id}]` | — |
| Submit | — | — | POST `/intern/tasks/{id}/submit` |
| Review | PATCH `/admin/submissions/{id}/review` | PATCH `/leader/submissions/{id}/review` | — |
| Proposals | GET `/admin/epics/{id}/proposals`, PATCH `/admin/proposals/{id}` | GET `/leader/proposals`, GET `/leader/epics/{id}/proposals`, PATCH `/leader/proposals/{id}` | GET `/intern/proposals`, POST `/intern/epics/{id}/proposals` |
| Team | — | GET `/leader/team`, GET `/leader/team/members` | GET `/intern/team` |
| Tracker | GET `/admin/tracker/{user_id}` | GET `/leader/tracker/{user_id}` | GET `/intern/tasks` |
| Mind map | GET/PATCH `/admin/epics/{id}/mind-map`, GET `/admin/tasks/{id}/mind-map-note` | GET/PATCH `/leader/epics/{id}/mind-map`, GET `/leader/tasks/{id}/mind-map-note` | GET `/intern/epics/{id}/mind-map`, GET/PATCH `/intern/tasks/{id}/mind-map-note` |

## Key Service Behaviours

- **`assign_task`** — appends to assignees, sends "New task assigned" notification to each new intern
- **`unassign_task(db, task_id, user_id)`** — removes one assignee from a task
- **`review_proposal`** — sets status + reviewer + reviewed_at, sends "Proposal accepted/rejected" notification to proposer
- **`get_proposals_by_user(db, user_id)`** — returns all proposals submitted by a specific intern (powers `/intern/proposals`)
- **`get_proposals_by_team`** — joins through Epic to find team's proposals (powers `/leader/proposals`)
- Cascades flow down the hierarchy: deleting a project/epic/module removes everything beneath it

## Database

Tables: `users`, `teams`, `team_members`, `projects`, `project_teams`, `epics`, `modules`,
`tasks`, `task_assignees`, `task_submissions`, `proposals`, `mind_map_layouts`,
`task_mind_map_notes`, `notifications`.

Enums: `user_role` (admin/leader/intern), `work_status` (todo/in_progress/done), `submission_status` (submitted/reviewed).

- All PKs are UUIDs
- Passwords hashed with bcrypt
- Relationships eagerly loaded with `selectinload`; Pydantic `model_validator(mode="before")` reads loaded state for async safety
- Alembic is configured but schema changes currently applied via raw SQL on Supabase

## Auth

JWT HS256. Access tokens expire in 12h, refresh tokens in 7d.
`require_admin` / `require_leader` / `require_intern` FastAPI dependencies enforce role on every protected route.
