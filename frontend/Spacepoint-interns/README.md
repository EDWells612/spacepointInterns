# SpacePoint Interns — Frontend

React SPA built with Vite, TypeScript, TanStack Router, and Tailwind CSS.

## Requirements

- Node.js 18+

## Setup

```bash
npm install
cp .env.example .env        # set VITE_API_URL
npm run dev                 # http://localhost:5173
```

## Environment Variables

```env
VITE_API_URL=http://localhost:8000
```

For production (Vercel): add in **Project → Settings → Environment Variables**.

## Build & Deploy

```bash
npm run build               # outputs to dist/
```

Vercel deployment:
1. Push repo to GitHub
2. Import at vercel.com — set Root Directory to `frontend/Spacepoint-interns`
3. Add `VITE_API_URL` pointing to hosted backend
4. Backend CORS must allow the Vercel domain

## Project Structure

```
src/
├── api/                    # Axios API functions, one file per resource
│   ├── client.ts           # Axios instance + JWT interceptor + refresh logic
│   ├── auth.ts, users.ts, teams.ts
│   ├── projects.ts, epics.ts, modules.ts, tasks.ts
│   ├── proposals.ts        # intern/leader/admin proposal endpoints
│   ├── tracker.ts, mindmap.ts
│   └── notifications.ts
├── assets/                 # logo.svg, icons
├── components/
│   ├── kanban/
│   │   ├── KanbanBoard.tsx         # multi-role board (intern/leader/admin)
│   │   ├── EpicDetailModal.tsx     # epic detail + edit (portaled, NOT Radix Dialog)
│   │   ├── TaskModal.tsx           # task detail + edit + assign + review + submit
│   │   ├── TaskCard.tsx, Column.tsx
│   │   └── CreateSubtaskModal.tsx  # leader "New task" modal (legacy name)
│   ├── mindmap/
│   │   └── SharedNodes.tsx         # shared ReactFlow node components for both map pages
│   ├── layout/
│   │   ├── Navbar.tsx              # bell (polls 30s), mobile menu, logout
│   │   └── Layout.tsx
│   ├── ui/                         # shadcn primitives (button, card, dialog)
│   ├── ManageModulesModal.tsx      # module CRUD — view/edit/delete open stacked dialogs
│   ├── ModuleDetailDialog.tsx      # shared module detail dialog (portaled)
│   └── ProposalDetailDialog.tsx    # shared proposal detail dialog (portaled)
├── context/
│   └── AuthContext.tsx             # currentUser, login, logout
├── pages/
│   ├── Dashboard.tsx               # admin: project columns + ProjectTasksPanel
│   ├── Tracker.tsx                 # work tracker table + stat cards + Excel + PDF export
│   ├── MindMap.tsx                 # per-epic ReactFlow mind map
│   ├── ProjectMindMap.tsx          # full project map (project→epics→modules→tasks)
│   ├── Admin.tsx                   # user & team management
│   ├── Calendar.tsx, Leaderboard.tsx, Login.tsx, Profile.tsx
├── lib/utils.ts                    # cn() helper
├── routeTree.tsx                   # all route definitions
└── types.ts                        # TypeScript types (User, Epic, Module, Task, Proposal, …)
```

## Routes

| Path | Who | Page |
|------|-----|------|
| `/` | all | Admin dashboard or KanbanBoard |
| `/tracker` | all | Work tracker |
| `/mind-map/$epicId` | all | Per-epic mind map |
| `/mind-map/project/$projectId` | admin/leader | Full project mind map |
| `/calendar` | all | Calendar |
| `/leaderboard` | all | Leaderboard |
| `/admin` | admin | User & team management |
| `/profile` | all | Profile |
| `/login` | public | Login |

## Key Libraries

| Library | Purpose |
|---------|---------|
| TanStack Router v1 | Type-safe client-side routing |
| TanStack Query v5 | Server state, caching, mutations |
| dnd-kit | Drag-and-drop for kanban |
| @xyflow/react | Mind map canvas (ReactFlow) |
| xlsx (SheetJS) | Excel export in Tracker |
| Axios | HTTP client + JWT interceptor |
| Tailwind CSS v3 | Styling |
| Lucide React | Icons |

## Feature Notes

### Dashboard (admin)
- Project columns with drag-and-drop (dnd-kit). Each column = a project status.
- **ProjectCard** — shows "Map" + "Manage" buttons inline. Map → `/mind-map/project/$id`.
- **ProjectTasksPanel** — slide-in panel, Screen 1 = epic list, Screen 2 = epic tasks + proposals tab.
- Epic rows in the list each have an inline "Mind map" button.
- All modals are `createPortal(…, document.body)` — required because dnd-kit transforms break `position: fixed`.

### Kanban (leader / intern)
- Leader view: epic columns (drag by status) → drill into epic → task columns.
- Intern view: flat task columns.
- **TaskModal** — leaders can edit title/description/deadline/expected hours, manage assignees (add/remove from team), review submissions. Interns can start/submit tasks.
- **EpicDetailModal** — leaders can edit epic title/description/status inline.
- **LeaderProposalsModal** — click any proposal card → ProposalDetailDialog with Accept/Reject.
- **InternProposalsModal** — "My proposals" button with badge (clears on open, persisted in localStorage). Pending = purple, reviewed = green/red.

### Mind maps
- **Per-epic map** (`MindMap.tsx`) — Epic → Module → Task nodes. Drag to reposition (saved to backend). Click module → edit description. Click task → edit note (intern) or read note (leader/admin).
- **Project map** (`ProjectMindMap.tsx`) — Project → Epics → Modules → Tasks. Auto-layout. Drag to reposition (saved to localStorage). Click any node → side panel with full description + edit controls (module description editable by admin/leader, task notes by intern).
- **`SharedNodes.tsx`** — single source of truth for EpicNode, ModuleNode, TaskNode, ProjectNode. Both map pages import from here.

### Work Tracker
- Table columns: Task · Module · Epic · Start date · Deadline · Status · Expected · Actual · Submitted · Score · Submission link
- Stat cards: Completed · On time · Total hours · Avg time delta · Score (avg across reviewed tasks)
- **Export sheet** → `.xlsx` with Tasks sheet + Summary sheet (SheetJS)
- **Export PDF** → `@media print` reveals a hidden `#pdf-report` div (A4 landscape):
  - Logo + SpacePoint branding
  - Certification paragraph (name, team name, date range, task counts)
  - 4 stat boxes (Completed, On time, Hours, Score)
  - Clean table (no submission links), header repeats every page, rows don't split
  - Team name fetched from `/intern/team`, `/leader/team`, or matched from admin's allTeams

### Proposals flow
- **Intern** submits via "Propose idea" button → `POST /intern/epics/{id}/proposals`
- **Intern** views status via "My proposals" button → `GET /intern/proposals` (polls 30s)
- **Leader** reviews via "Proposals" button → accept or reject → notification sent to intern automatically
- **Admin** reviews from the proposals tab inside the epic panel

### Notifications
- Bell in Navbar polls every 30s (`refetchInterval: 30_000`)
- Backend sends notifications on: task assigned, proposal accepted, proposal rejected

### Modal / portal pattern
All custom modals use `createPortal(…, document.body)`. This is critical — dnd-kit applies CSS transforms which break `position: fixed` inside transformed parents.

**Never use Radix `Dialog`** for modals that need to layer above React Flow or dnd-kit canvases. Use custom fixed divs with portals instead.

z-index layers:
- `z-50` — standard modals (LeaderProposalsModal, InternProposalsModal)
- `z-[9990]` — EpicDetailModal
- `z-[9998]` — ManageModulesModal
- `z-[9999]` — ModuleDetailDialog, ProposalDetailDialog, ModuleEditDialog, mind map NodeDetailDialog

Always add `onClick={e => e.stopPropagation()}` on the inner card when the backdrop has `onClick={onClose}`.
