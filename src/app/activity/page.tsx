"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import { FiClock } from "react-icons/fi"

export default function ActivityPage() {
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
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">Today&apos;s Activity</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">Everything that happened today, in order.</p>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5 mb-4 lg:mb-6">
          <h2 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Today</h2>
          <div className="flex flex-col items-center py-8 text-slate-300">
            <FiClock size={32} className="mb-2" />
            <p className="text-sm text-slate-400">No activity yet today.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5">
          <h2 className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide">Earlier</h2>
          <div className="flex flex-col items-center py-8 text-slate-300">
            <FiClock size={32} className="mb-2" />
            <p className="text-sm text-slate-400">Nothing earlier.</p>
          </div>
        </div>
      </main>
    </div>
  )
}
