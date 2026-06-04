import { createRootRoute, createRoute, redirect, Outlet } from "@tanstack/react-router"
import Layout from "./components/layout/Layout"
import Dashboard from "./pages/Dashboard"
import Calendar from "./pages/Calendar"
import Leaderboard from "./pages/Leaderboard"
import Login from "./pages/Login"
import Profile from "./pages/Profile"
import Admin from "./pages/Admin"
import Tracker from "./pages/Tracker"
import MindMap from "./pages/MindMap"
import ProjectMindMap from "./pages/ProjectMindMap"

const rootRoute = createRootRoute({ component: Outlet })

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
})

const layoutRoute = createRoute({
  id: "_layout",
  getParentRoute: () => rootRoute,
  component: Layout,
  beforeLoad: () => {
    if (!localStorage.getItem("access_token")) {
      throw redirect({ to: "/login" })
    }
  },
})

const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/",
  component: Dashboard,
})

const calendarRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/calendar",
  component: Calendar,
})

const leaderboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/leaderboard",
  component: Leaderboard,
})

const profileRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/profile",
  component: Profile,
})

const adminRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/admin",
  component: Admin,
})

const trackerRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/tracker",
  component: Tracker,
})

const mindMapRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/mind-map/$epicId",
  component: MindMap,
})

const projectMindMapRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: "/mind-map/project/$projectId",
  component: ProjectMindMap,
})

export const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutRoute.addChildren([
    dashboardRoute,
    calendarRoute,
    leaderboardRoute,
    profileRoute,
    adminRoute,
    trackerRoute,
    mindMapRoute,
    projectMindMapRoute,
  ]),
])
