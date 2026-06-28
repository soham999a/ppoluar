"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { FcGoogle } from "react-icons/fc"

export default function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
      </div>
    )
  }

  if (user) return null

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="w-full max-w-sm lg:max-w-md">
        <div className="bg-white rounded-2xl lg:rounded-2xl shadow-2xl p-6 lg:p-8 text-center">
          <div className="mb-5 lg:mb-6">
            <div className="w-14 h-14 lg:w-16 lg:h-16 bg-slate-900 rounded-xl flex items-center justify-center mx-auto mb-3 lg:mb-4">
              <span className="text-white text-xl lg:text-2xl font-bold">PR</span>
            </div>
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Popular Roadways</h1>
            <p className="text-slate-500 text-sm lg:text-base mt-0.5">Logistics Manager</p>
          </div>

          <p className="text-slate-600 text-xs lg:text-sm mb-6 lg:mb-8 leading-relaxed">
            Manage your transportation business — companies, bills, payments, and quotations.
          </p>

          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3.5 lg:py-3 px-4 rounded-xl lg:rounded-xl transition-all shadow-sm active:scale-[0.98] active:shadow-md"
          >
            <FcGoogle size={22} />
            Sign in with Google
          </button>

          <p className="text-[11px] lg:text-xs text-slate-400 mt-6">
            By signing in, you agree to our terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
