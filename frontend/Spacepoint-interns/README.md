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
├── api/             # Axios API functions (one file per resource)
├── assets/          # Static assets (logo, icons)
├── components/
│   ├── kanban/      # Kanban board, task cards, modals
│   ├── layout/      # Navbar, Layout wrapper
│   └── ui/          # Shared UI primitives
├── context/         # AuthContext (current user, login/logout)
├── pages/           # Route-level page components
├── lib/             # Utilities (cn, etc.)
└── types.ts         # Shared TypeScript types
```

## Key Libraries

| Library | Purpose |
|---------|---------|
| TanStack Router | Client-side routing (file-based, type-safe) |
| TanStack Query | Data fetching, caching, optimistic updates |
| dnd-kit | Drag-and-drop for kanban boards |
| Axios | HTTP client with JWT interceptor |
| Tailwind CSS | Styling |
| Lucide React | Icons |
