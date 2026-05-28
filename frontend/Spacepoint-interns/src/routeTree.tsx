import { createRootRoute, createRoute, redirect, Outlet } from "@tanstack/react-router"
import Layout from "./components/layout/Layout"
import Dashboard from "./pages/Dashboard"
import Calendar from "./pages/Calendar"
import Leaderboard from "./pages/Leaderboard"
import Login from "./pages/Login"
import Profile from "./pages/Profile"
import Admin from "./pages/Admin"

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

export const routeTree = rootRoute.addChildren([
  loginRoute,
  layoutRoute.addChildren([
    dashboardRoute,
    calendarRoute,
    leaderboardRoute,
    profileRoute,
    adminRoute,
  ]),
])
