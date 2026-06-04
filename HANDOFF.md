# SpacePoint Interns — Handoff (v2, mid-testing)

## Goal
Internship management platform. Frontend on Vercel (https://spacepoint-interns.vercel.app), backend to deploy on Railway.
GitHub: `EDWells612/spacepointInterns` (branch `main`).

## Status: v2 feature work COMPLETE + board redesigned. USER IS MID-MANUAL-TESTING (not finished).
TypeScript clean (`npx tsc --noEmit` passes). Backend syntax verified. Expect more bug reports as testing continues.

---

## Project Structure
```
interns/
├── backend/        # FastAPI + async SQLAlchemy + PostgreSQL (Supabase)
└── frontend/Spacepoint-interns/   # React 18 SPA — Vite + TS + TanStack Router/Query
```

## v2 Work Hierarchy (replaced old Project→Task→Subtask)
```
Project (admin) → Epic (team) → Module (auto "General", 1+ per epic) → Task (intern) → Submission
```
- Old `Task` → became **Epic**; old `Subtask` → became **Task**; submissions hang off tasks.
- Tasks have `expected_time` (leader sets) + `actual_time` (intern logs on submit).

## Roles
- **Admin**: full CRUD incl. epics/modules/tasks, reviews submissions, views any tracker. Account creation only by admin (no self-register).
- **Leader**: manages team epics/tasks/modules, assigns tasks, reviews submissions, handles proposals, views team trackers.
- **Intern**: assigned tasks, submits work + time, proposes features, edits own mind-map task notes.

---

## Dashboard / Board model (REDESIGNED — important)
Both admin and leader boards are now an **epic→task drill-down** in status columns (To do / In progress / Done):
- **Project cards** show **epic count only** (no task count). Header reads "N projects · M epics".
- **Board level 1 = Epic cards** (draggable between status columns → changes epic status). Each epic card has a **"Mind map"** button (Network icon, footer) + click-card-body to expand.
- **Click an epic** → drills into **that epic's Task cards** (also draggable) with a back breadcrumb.
- **Modules are SKIPPED on the board** (decision): epic → tasks directly. Modules still exist in DB + creation UI; tasks attach to a chosen module (defaults to "General").
- Admin has a **project filter** dropdown on the epic level.
- Intern board = flat **task cards** with breadcrumb (project › epic › module › title; module hidden if "General").

Drag rules: **epic + task levels draggable** to change status. Modules click-only.

---

## v2 Features (ALL BUILT)
1. **Hierarchy restructure** — epics/modules/tasks across DB, backend, frontend.
2. **Work Tracker** (`/tracker`) — per-intern table (task/epic/dates/status/expected/actual/Δ/submissions), stats cards, **PDF export via browser print** (no dep). Admin/leader pick an intern; intern sees own.
3. **Feature Proposals** — intern "Propose idea" on KanbanBoard; leader "Proposals" button (badge w/ pending count) + admin epic "Proposals" tab. Accept→convert to task (pre-fills create-task form).
4. **Mind Map** (`/mind-map/$epicId`) — ReactFlow (`@xyflow/react`). Auto-builds Epic→Modules→Tasks. Admin/leader drag nodes (positions persist, debounced save); intern clicks own task node → edits approach note.
   - Entry points: epic card "Mind map" button (admin + leader boards), Manage-panel epic header "Mind map" button, Network icon in TaskModal.
5. **Module creation** — leader "New task" modal has a Module picker + inline "+ New module" creator (POST /leader/epics/{id}/modules). Admin auto-uses default module (no picker yet — see Pending).

---

## Recent fixes (this/last session)
- Board redesigned to epic drill-down (above).
- `routeTree.tsx` was corrupted (duplicate addChildren + stray ``` fences) — rewritten clean.
- `GET /admin/epics` + `getAllEpicsApi` added (project card epic counts + admin board).
- `PATCH /leader/epics/{id}` added (leader epic drag).
- MindMap crash "Could not find active match" — fixed: `useParams({ strict: false })` instead of `{ from: "/mind-map/$epicId" }`.
- Epic detail header in Manage panel restructured to 2 rows (title row + wrapping action-button row) — buttons were crowding the task count.
- Project dialog title/description mobile fixes (break-words, line-clamp, px-4 sm:px-6).
- `CreateSubtaskModal.tsx` (leader "New task" modal): fixed broken `defaultModule`→`targetModule` refs; added module picker + inline create.

---

## Key Files
**Backend** (`backend/app/`):
- models: `epic.py`, `module.py`, `task.py` (+`task_assignees`), `submission.py`, `proposal.py`, `mind_map.py` (MindMapLayout + TaskMindMapNote). `subtask.py` stub.
- schemas: `epic.py`, `module.py`, `task.py`, `submission.py`, `proposal.py`, `mind_map.py`. `subtask.py` stub.
- services: `epic.py` (has `get_all_epics`), `module.py`, `task.py`, `proposal.py`, `mind_map.py`. `subtask.py` stub.
- routers: `admin.py`, `leader.py`, `intern.py`. Leader has epic/module/task CRUD + `_verify_epic_access` helper. Admin has `/epics` (all), `/tracker/{user_id}`. Intern has `/epics/{id}` + mind-map read.

**Frontend** (`src/`):
- types.ts — Epic, Module, Task, TaskBrief, Proposal, BoardCard (has epic_id + project_title).
- api/: `epics.ts` (getAllEpicsApi, getProjectEpicsApi, getLeaderEpicsApi, create/update/delete, updateLeaderEpicApi), `tasks.ts`, `modules.ts` (create/update/delete, role param), `proposals.ts`, `tracker.ts`, `mindmap.ts`. `subtasks.ts` empty stub.
- pages/: `Dashboard.tsx` (AdminDashboard: epic-drilldown board + ProjectTasksPanel w/ epic mgmt + proposals tab; AdminEpicColumn/AdminEpicCard; CreateTaskForEpicModal, CreateEpicModal, CreateTaskModal — NOTE these admin modals still use `defaultModule`, working but no module picker), `Tracker.tsx`, `MindMap.tsx`.
- components/kanban/: `KanbanBoard.tsx` (leader epic-drilldown + EpicColumn/EpicCard, intern flat board, CreateProposalModal, LeaderProposalsModal, SubmitDialog), `TaskModal.tsx`, `TaskCard.tsx` (breadcrumb), `CreateSubtaskModal.tsx` (= leader CreateTaskModal w/ module picker + inline create).
- routeTree.tsx — `/`, `/tracker`, `/mind-map/$epicId`, `/calendar`, `/leaderboard`, `/admin`, `/profile`, `/login`.

---

## Env Vars
Backend `.env`: `DATABASE_URL` (postgresql+asyncpg://...), `SECRET_KEY`, `ALGORITHM=HS256`, `ACCESS_TOKEN_EXPIRE_MINUTES=720`, `REFRESH_TOKEN_EXPIRE_DAYS=7`
Frontend `.env`: `VITE_API_URL` (NOT `VITE_API_BASE_URL` — matches src/api/client.ts)

## DB
v2 schema already migrated in Supabase. Tables: users, teams, team_members, projects, project_teams, epics, modules, tasks, task_assignees, task_submissions, proposals, mind_map_layouts, task_mind_map_notes, notifications. Enums: user_role, work_status, submission_status. No migration pending.

---

## Before testing
1. Restart backend (routes change frequently). 2. Frontend `npm run dev`. 3. DB already migrated.

## Test path
Admin: create project→Manage→Add epic(pick team)→drill in→Add task(expected hrs)→open task→assign interns. Board: drag epic between columns, click epic→tasks, drag task, Mind map button. Intern: drag task→Done→submit w/ actual time; Propose idea. Leader: New task→pick epic→+New module→assign; Proposals→accept/reject; drag epics; drill into epic. Tracker: pick intern→stats→Export PDF. Mind map: intern clicks own task→note→leader/admin sees it.

## Known edge cases / not-yet-verified (testing ongoing)
- Mind-map note: intern clicking a task node NOT assigned to them → 403 on note fetch (backend guards). Map still renders; side-panel note errors silently.
- Admin "New task" modals (CreateTaskForEpicModal, CreateTaskModal in Dashboard.tsx) still auto-use `defaultModule` (epic.modules[0]) — NO module picker on admin side yet. Leader side HAS the picker. Mirror to admin if user wants.
- Task assignment is from inside the task modal, not at creation (admin side). Leader create-task modal DOES allow assignment.
- User is still testing — more issues likely.

## Pending (roadmap, not started)
- **Deploy backend to Railway** (root dir `backend`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`), set `VITE_API_URL` in Vercel + add Vercel domain to backend CORS (currently `allow_origins=["*"]`).
- Calendar meeting scheduling (Google Calendar API + OAuth, real Meet links + email invites).
- Alembic migrations (once schema stable). Leaderboard aggregation, file attachments (Supabase Storage), real-time notifications, mobile pass.

## Gotchas learned
- `VITE_API_URL` not `_BASE_URL`.
- `tsconfig.app.json` needs `"ignoreDeprecations": "6.0"` for Vercel build.
- `vercel.json` SPA rewrite rule exists (fixes direct-URL 404s).
- `import type { ReactNode }` required (verbatimModuleSyntax).
- MindMap: use `useParams({ strict: false })` — the `{ from }` form throws "Could not find active match" with the manual pathless `_layout` route tree.
- Two separate DndContext on admin dashboard (proj_* vs task/epic col IDs) — don't merge.
- `model_validator(mode="before")` reads `_sa_instance_state.dict` for async-safe relationship reads.
- `email-validator` in requirements.txt (Railway build needs it).
- After ANY edit run `npx tsc --noEmit` in frontend dir + `python -m py_compile` on changed backend files.
