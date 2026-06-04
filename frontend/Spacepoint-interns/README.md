# SpacePoint Interns — Frontend

React SPA built with Vite, TypeScript, TanStack Router, and Tailwind CSS.

## Requirements

- Node.js 18+

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure environment variables
cp .env.example .env
# Set the API base URL (see Environment Variables below)

# 3. Start the dev server
npm run dev
```

App will be available at `http://localhost:5173`

## Environment Variables

```env
VITE_API_URL=http://localhost:8000
```

For production (Vercel), add this in the Vercel dashboard under **Project → Settings → Environment Variables**.

## Build

```bash
npm run build
```

Output goes to `dist/`. This is what Vercel deploys.

## Deploying to Vercel

1. Push the repo to GitHub
2. Import the project at [vercel.com](https://vercel.com)
3. Set **Root Directory** to `frontend/Spacepoint-interns` if deploying from the monorepo
4. Add the `VITE_API_URL` environment variable pointing to your hosted backend
5. Deploy — Vercel auto-detects Vite

> Make sure your backend has CORS configured to allow your Vercel domain.

## Project Structure

```
src/
├── api/             # Axios API functions (one file per resource:
│                    #   epics, tasks, proposals, tracker, mindmap, …)
├── assets/          # Static assets (logo, icons)
├── components/
│   ├── kanban/      # Kanban board, task cards, modals, proposal modals
│   ├── layout/      # Navbar, Layout wrapper
│   └── ui/          # Shared UI primitives
├── context/         # AuthContext (current user, login/logout)
├── pages/           # Route-level pages (Dashboard, Tracker, MindMap, …)
├── lib/             # Utilities (cn, etc.)
├── routeTree.tsx    # Route definitions
└── types.ts         # Shared TypeScript types
```

## Pages

| Route | Who | Purpose |
|-------|-----|---------|
| `/` | all | Admin dashboard (projects/epics/tasks) or kanban board (leader/intern) |
| `/tracker` | all | Work tracker table + PDF export (print) |
| `/mind-map/$epicId` | all | Per-epic ReactFlow mind map |
| `/calendar` | all | Calendar |
| `/leaderboard` | all | Leaderboard |
| `/admin` | admin | User & team management |
| `/profile` | all | Current user profile |

## Key Libraries

| Library | Purpose |
|---------|---------|
| TanStack Router | Client-side routing (type-safe) |
| TanStack Query | Data fetching, caching, optimistic updates |
| dnd-kit | Drag-and-drop for kanban boards |
| @xyflow/react | ReactFlow — the epic mind map canvas |
| Axios | HTTP client with JWT interceptor + token refresh |
| Tailwind CSS | Styling |
| Lucide React | Icons |

## Notes

- **Board model** — admin & leader dashboards are an epic→task drill-down. The board
  shows draggable **epic cards** first; clicking one drills into its **task cards**
  (also draggable). Modules are not shown on the board. Interns get a flat task board.
- **`CreateSubtaskModal.tsx`** is a legacy filename — it actually exports the leader's
  **`CreateTaskModal`** (epic + module picker, inline "+ New module", assignment).
- **Module creation** — leaders create modules from the New Task modal. Admin task
  modals (`CreateTaskForEpicModal`, `CreateTaskModal` in `Dashboard.tsx`) currently
  auto-use the epic's default module (no admin module picker yet).
- **MindMap** reads its route param with `useParams({ strict: false })` — the `{ from }`
  form throws with the manually-defined pathless `_layout` route tree.
- **PDF export** on the Tracker page uses the browser's print dialog scoped to a printable region (no extra dependency).
- **Optimistic updates** are used for all kanban drag-and-drop status changes (rollback on error).
- **Roles** drive the UI: the Dashboard renders `AdminDashboard` for admins and `KanbanBoard` for leaders/interns; the navbar shows the Admin link only to admins.
