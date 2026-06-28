"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Sidebar from "@/components/Sidebar"
import Link from "next/link"
import { FiArrowLeft, FiExternalLink, FiHeadphones } from "react-icons/fi"

export default function SupportPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0 animate-fade-in">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 lg:mb-4 transition-colors">
          <FiArrowLeft size={14} />
          Back
        </Link>

        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">IT Support</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">Need a hand? Chat with the NiceCare team.</p>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-6 lg:p-6 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FiHeadphones size={28} className="text-slate-600" />
          </div>
          <h2 className="text-base lg:text-lg font-semibold text-slate-900 mb-2">NiceCare Support Chat</h2>
          <p className="text-sm text-slate-500 mb-6">Opens the support chat in a new tab.</p>
          <a
            href="https://support.nicecare.co/chat"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 lg:py-2.5 px-6 rounded-xl lg:rounded-xl transition-colors active:scale-95"
          >
            <FiExternalLink size={16} />
            Open support chat
          </a>
        </div>
      </main>
    </div>
  )
}
