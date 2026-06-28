"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { FiGrid, FiBriefcase, FiFileText, FiClock, FiSettings, FiLogOut } from "react-icons/fi"
import { useAuth } from "@/context/AuthContext"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: FiGrid },
  { label: "Companies", href: "/companies", icon: FiBriefcase },
  { label: "Quotation", href: "/quotation", icon: FiFileText },
  { label: "Activity", href: "/activity", icon: FiClock },
  { label: "Settings", href: "/settings", icon: FiSettings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  return (
    <>
      <aside className="fixed top-0 left-0 z-40 h-full w-64 bg-slate-900 text-white flex-col hidden lg:flex">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold tracking-tight">Popular Roadways</h1>
          <p className="text-sm text-slate-400 mt-0.5">Logistics Manager</p>
        </div>

        <nav className="flex-1 py-4 space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-slate-700 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-xs font-medium">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full px-1"
          >
            <FiLogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 text-white flex lg:hidden safe-area-bottom">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center justify-center py-2 text-[10px] font-medium transition-colors ${
                active ? "text-white" : "text-slate-400"
              }`}
            >
              <Icon size={20} className={active ? "text-white" : "text-slate-400"} />
              <span className="mt-0.5">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="fixed bottom-16 right-4 z-40 lg:hidden">
        <button
          onClick={logout}
          className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-full shadow-lg transition-colors"
          title="Sign out"
        >
          <FiLogOut size={16} />
        </button>
      </div>
    </>
  )
}
