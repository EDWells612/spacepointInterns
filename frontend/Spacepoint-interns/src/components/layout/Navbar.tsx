import { useState, useRef, useEffect } from "react"
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { Menu, X, Bell, LogOut } from "lucide-react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/AuthContext"
import { getNotificationsApi, markAllReadApi } from "@/api/notifications"
import type { Notification } from "@/types"
import logoImg from "@/assets/logo.svg"

const baseLinks = [
  { label: "Dashboard",   to: "/" },
  { label: "Calendar",    to: "/calendar" },
  { label: "Leaderboard", to: "/leaderboard" },
]

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const queryClient = useQueryClient()
  const navLinks = currentUser?.role === "admin"
    ? [...baseLinks, { label: "Admin", to: "/admin" }]
    : baseLinks
  const [menuOpen, setMenuOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: getNotificationsApi,
    enabled: !!currentUser,
    staleTime: 60_000,
  })

  const markAllMutation = useMutation({
    mutationFn: markAllReadApi,
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(["notifications"], (old = []) =>
        old.map((n) => ({ ...n, is_read: true }))
      )
    },
  })

  const unread = notifications.filter((n) => !n.is_read).length

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleBellClick = () => {
    const wasOpen = bellOpen
    setBellOpen((v) => !v)
    if (!wasOpen && unread > 0) markAllMutation.mutate()
  }

  const handleLogout = () => {
    logout()
    navigate({ to: "/login" })
  }

  const initials = currentUser?.full_name
    ? currentUser.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?"

  return (
    <nav className="relative bg-white border-b border-gray-100">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-28">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden p-2.5 rounded-xl text-gray-500 hover:bg-gray-50" aria-label="Menu">
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/" className="flex items-center">
            <img src={logoImg} alt="Space Interns" className="h-16 w-auto object-contain mt-3" />
          </Link>
        </div>

        {/* Center nav */}
        <div className="hidden sm:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to}
              className={cn(
                "px-5 py-2.5 rounded-xl text-lg font-semibold transition-colors",
                location.pathname === link.to
                  ? "bg-black text-white"
                  : "text-gray-500 hover:bg-gray-50 hover:text-black"
              )}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Bell */}
          <div ref={bellRef} className="relative">
            <button onClick={handleBellClick}
              className="relative p-3 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors" aria-label="Notifications">
              <Bell size={28} />
              {unread > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-[#a880ff] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-black">Notifications</p>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-400 px-4 py-6 text-center">No notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={cn("px-4 py-3 border-b border-gray-50 last:border-0", !n.is_read && "bg-[#d6c7e1]/20")}>
                        <p className="text-sm font-medium text-black">{n.title}</p>
                        {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                        <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <Link to="/profile"
            className="w-11 h-11 rounded-full bg-black text-white text-sm font-bold flex items-center justify-center hover:bg-gray-800 transition-colors flex-shrink-0 tracking-wide">
            {initials}
          </Link>

          {/* Logout */}
          <button onClick={handleLogout}
            className="hidden sm:flex p-3 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-colors" aria-label="Logout">
            <LogOut size={26} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="sm:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 shadow-lg z-50 py-2 px-4">
          {navLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={() => setMenuOpen(false)}
              className={cn(
                "block px-3 py-2.5 rounded-lg text-sm font-medium mb-1 transition-colors",
                location.pathname === link.to ? "bg-black text-white" : "text-gray-700 hover:bg-gray-50"
              )}>
              {link.label}
            </Link>
          ))}
          <button onClick={handleLogout}
            className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}
