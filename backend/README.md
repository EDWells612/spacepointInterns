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

API will be available at `http://localhost:8000`  
Interactive docs at `http://localhost:8000/docs`

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
├── core/            # Config, security (JWT, hashing)
├── db/              # Database session setup
├── models/          # SQLAlchemy ORM models
├── schemas/         # Pydantic request/response schemas
├── routers/         # Route handlers (admin, leader, intern, auth)
└── services/        # Business logic layer
```

## Work Hierarchy

```
Project → Epic → Module → Task → Submission
```

- **Project** — owned by admin
- **Epic** — a workstream assigned to a team (auto-creates a "General" module)
- **Module** — groups tasks within an epic; leaders/admins can add more
- **Task** — intern-level work item with `expected_time` / `actual_time`
- **Submission** — work link + actual time, scored on review

## API Routes

| Prefix | Role | Description |
|--------|------|-------------|
| `/auth` | Public | Login, token refresh |
| `/admin` | Admin | Users, teams, projects, epics, modules, tasks, submissions review, proposals, mind map, tracker |
| `/leader` | Leader | Team epics & tasks, assign tasks, review submissions, proposals, mind map, tracker |
| `/intern` | Intern | Assigned tasks, submit work, propose features, mind-map notes |
| `/profile` | All | Current user profile |
| `/notifications` | All | Notifications |

### Key endpoints by feature

| Feature | Endpoints |
|---------|-----------|
| Epics | `POST/GET /admin/projects/{id}/epics`, `GET /admin/epics` (all), `GET /leader/epics` (team), `GET/PATCH/DELETE /{role}/epics/{id}` |
| Modules | `POST /{admin,leader}/epics/{id}/modules`, `PATCH/DELETE /{admin,leader}/modules/{id}` |
| Tasks | `POST /{role}/modules/{id}/tasks`, `PATCH/DELETE /{role}/tasks/{id}`, `POST /{role}/tasks/{id}/assign` |
| Submissions | `POST /intern/tasks/{id}/submit`, `PATCH /{role}/submissions/{id}/review` |
| Proposals | `POST /intern/epics/{id}/proposals`, `GET /leader/proposals`, `PATCH /{role}/proposals/{id}` |
| Mind map | `GET/PATCH /{role}/epics/{id}/mind-map`, `GET/PATCH /intern/tasks/{id}/mind-map-note` |
| Tracker | `GET /{admin,leader}/tracker/{user_id}`, intern uses `GET /intern/tasks` |

## Database

The v2 schema is one SQL migration run against Supabase. Tables:
`users`, `teams`, `team_members`, `projects`, `project_teams`, `epics`, `modules`,
`tasks`, `task_assignees`, `task_submissions`, `proposals`, `mind_map_layouts`,
`task_mind_map_notes`, `notifications`.

Enums: `user_role`, `work_status`, `submission_status`.

## Notes

- All primary keys are UUIDs (`gen_random_uuid()`)
- Passwords are hashed with bcrypt
- JWT access tokens are short-lived; refresh tokens are long-lived and rotated on use
- Relationships are eagerly loaded with `selectinload` / `joinedload`; Pydantic `model_validator(mode="before")` reads loaded state to stay async-safe
- Cascades flow down the hierarchy: deleting a project/epic/module removes everything beneath it
- Alembic is set up but not yet in active use — schema changes are currently applied via raw SQL
