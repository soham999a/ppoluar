"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import Link from "next/link"
import { FiChevronRight, FiSliders, FiHeadphones } from "react-icons/fi"

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">Settings</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">Preferences and support.</p>

        <div className="space-y-3">
          <Link href="/settings/preferences" className="flex items-center gap-4 bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5 active:bg-slate-50 transition-colors">
            <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <FiSliders size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-medium text-slate-900 text-sm lg:text-base">User preference</h2>
              <p className="text-xs lg:text-sm text-slate-500 truncate">Set up the business field lists used across the app.</p>
            </div>
            <FiChevronRight className="text-slate-300 shrink-0" size={18} />
          </Link>

          <Link href="/settings/support" className="flex items-center gap-4 bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5 active:bg-slate-50 transition-colors">
            <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <FiHeadphones size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-medium text-slate-900 text-sm lg:text-base">IT Support</h2>
              <p className="text-xs lg:text-sm text-slate-500 truncate">Chat with the NiceCare support team.</p>
            </div>
            <FiChevronRight className="text-slate-300 shrink-0" size={18} />
          </Link>
        </div>
      </main>
    </div>
  )
}
