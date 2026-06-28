"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { FcGoogle } from "react-icons/fc"

export default function LandingPage() {
  const { user, loading, signInWithGoogle, signInWithEmail } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

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

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-slate-400">or sign in with email</span></div>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); signInWithEmail(email, password) }} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full border border-slate-200 rounded-xl px-4 py-3.5 text-base focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              required
            />
            <button
              type="submit"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3.5 lg:py-3 px-4 rounded-xl transition-colors active:scale-[0.98] text-sm"
            >
              Sign in
            </button>
          </form>

          <p className="text-[11px] lg:text-xs text-slate-400 mt-6">
            By signing in, you agree to our terms and privacy policy.
          </p>
        </div>
      </div>
    </div>
  )
}
