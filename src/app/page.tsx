"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback, useRef } from "react"
import { FcGoogle } from "react-icons/fc"
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiArrowLeft, FiCheck, FiAlertCircle, FiTruck } from "react-icons/fi"
import { FirebaseError } from "firebase/app"

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?w=1920&q=80",
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&q=80",
  "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80",
  "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1920&q=80",
  "https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?w=1920&q=80",
]

const QUOTES = [
  { line: "Your freight, our commitment", by: "Popular Roadways" },
  { line: "Moving goods across India", by: "Reliable. Fast. Safe." },
  { line: "Logistics simplified", by: "Track. Manage. Deliver." },
  { line: "Every mile matters", by: "Powered by Popular Roadways" },
]

type Mode = "signin" | "signup" | "forgot"

const strengthLabels = ["Weak", "Fair", "Good", "Strong"] as const
const strengthColors = ["bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-emerald-500"] as const

function getPasswordStrength(pw: string) {
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10) score++
  if (/[A-Z]/.test(pw)) score++
  if (/[0-9]/.test(pw)) score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return Math.min(score, 3)
}

function getFirebaseMessage(code: string) {
  const map: Record<string, string> = {
    "auth/user-not-found": "No account found with this email",
    "auth/wrong-password": "Incorrect password",
    "auth/invalid-credential": "Invalid email or password",
    "auth/email-already-in-use": "An account with this email already exists",
    "auth/weak-password": "Password must be at least 6 characters",
    "auth/invalid-email": "Please enter a valid email address",
    "auth/too-many-requests": "Too many attempts. Please try again later",
    "auth/network-request-failed": "Network error. Check your connection",
    "auth/popup-closed-by-user": "Sign in cancelled",
  }
  return map[code] || "Something went wrong. Please try again"
}

export default function LandingPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth()
  const router = useRouter()

  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)

  const [imgIndex, setImgIndex] = useState(0)
  const [quoteIndex, setQuoteIndex] = useState(0)
  const [nextImgLoaded, setNextImgLoaded] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setNextImgLoaded(false)
      setImgIndex((i) => (i + 1) % BG_IMAGES.length)
      setQuoteIndex((i) => (i + 1) % QUOTES.length)
    }, 6000)
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    if (!loading && user) router.replace("/dashboard")
  }, [user, loading, router])

  const switchMode = useCallback((m: Mode) => {
    setMode(m)
    setError("")
    setForgotSent(false)
  }, [])

  function clearError() { if (error) setError("") }

  async function handleGoogle() {
    setBusy(true)
    try { await signInWithGoogle() } catch (e) {
      if (e instanceof FirebaseError) setError(getFirebaseMessage(e.code))
    }
    setBusy(false)
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setBusy(true)
    try {
      if (mode === "signin") {
        await signInWithEmail(email, password)
      } else if (mode === "signup") {
        await signUpWithEmail(name, email, password)
      } else {
        await resetPassword(email)
        setForgotSent(true)
      }
    } catch (e) {
      if (e instanceof FirebaseError) setError(getFirebaseMessage(e.code))
      else setError("Something went wrong")
    }
    setBusy(false)
  }

  const canSubmit = mode === "forgot"
    ? email.includes("@")
    : mode === "signup"
      ? name.trim().length > 0 && email.includes("@") && password.length >= 6
      : email.includes("@") && password.length > 0

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a]">
      <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (user) return null

  return (
    <div className="min-h-screen flex bg-[#0a0f1a] relative overflow-hidden">
      {BG_IMAGES.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
          style={{ opacity: i === imgIndex ? 1 : 0 }}
        >
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            onLoad={() => setNextImgLoaded(true)}
          />
        </div>
      ))}

      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1a]/95 via-[#0a0f1a]/80 to-[#0a0f1a]/40" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1a]/60 via-transparent to-transparent" />

      <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
        <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
          <FiTruck size={18} className="text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm">Popular Roadways</p>
          <p className="text-white/40 text-[10px]">Logistics Manager</p>
        </div>
      </div>

      <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
        <div className="max-w-md text-center px-12">
          <p className="text-white/20 text-[200px] font-bold leading-none select-none">
            PR
          </p>
          <p className="text-white text-3xl font-light leading-relaxed -mt-8 transition-all duration-700">
            &ldquo;{QUOTES[quoteIndex].line}&rdquo;
          </p>
          <p className="text-white/40 text-sm mt-3 transition-all duration-700">
            {QUOTES[quoteIndex].by}
          </p>

          <div className="flex items-center justify-center gap-2 mt-10">
            {BG_IMAGES.map((_, i) => (
              <button
                key={i}
                onClick={() => { setImgIndex(i); setQuoteIndex(i) }}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  i === imgIndex ? "w-8 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[480px] min-h-screen flex items-center justify-center p-4 lg:p-8 relative z-10">
        <div className="w-full max-w-[420px]">
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/10">
              <FiTruck size={22} className="text-white" />
            </div>
            <h1 className="text-white text-xl font-bold">Popular Roadways</h1>
            <p className="text-white/40 text-sm mt-0.5">Logistics Manager</p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 lg:p-10 shadow-2xl">
            <div className="flex mb-7 bg-white/5 rounded-xl p-1 border border-white/5">
              <button
                onClick={() => switchMode("signin")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  mode === "signin"
                    ? "bg-white text-[#0a0f1a] shadow-lg"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  mode === "signup"
                    ? "bg-white text-[#0a0f1a] shadow-lg"
                    : "text-white/50 hover:text-white/80"
                }`}
              >
                Sign Up
              </button>
            </div>

            {mode === "forgot" ? (
              <div className="animate-fade-in">
                <button
                  onClick={() => switchMode("signin")}
                  className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-4 transition-colors"
                >
                  <FiArrowLeft size={14} /> Back
                </button>

                {forgotSent ? (
                  <div className="text-center py-4 animate-fade-in">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
                      <FiCheck size={22} className="text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-white">Check your email</p>
                    <p className="text-xs text-white/40 mt-1">
                      Reset link sent to <span className="text-white/70">{email}</span>
                    </p>
                    <button
                      onClick={() => switchMode("signin")}
                      className="mt-4 text-sm text-blue-400 hover:text-blue-300 font-medium"
                    >
                      Return to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-white/50 mb-5">
                      Enter your email and we&apos;ll send a reset link.
                    </p>
                    <form onSubmit={handleEmailSubmit} className="space-y-4">
                      <Input
                        icon={FiMail}
                        type="email"
                        value={email}
                        onChange={(v) => { setEmail(v); clearError() }}
                        placeholder="Email address"
                      />
                      {error && <ErrorMessage message={error} />}
                      <button
                        type="submit"
                        disabled={busy || !email.includes("@")}
                        className="w-full bg-white hover:bg-white/90 disabled:bg-white/20 text-[#0a0f1a] font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-sm disabled:cursor-not-allowed"
                      >
                        {busy ? <Spinner /> : "Send reset link"}
                      </button>
                    </form>
                  </>
                )}
              </div>
            ) : (
              <div key={mode} className="transition-all duration-300">
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {mode === "signup" && (
                    <Input
                      icon={FiUser}
                      type="text"
                      value={name}
                      onChange={(v) => { setName(v); clearError() }}
                      placeholder="Full name"
                    />
                  )}

                  <Input
                    icon={FiMail}
                    type="email"
                    value={email}
                    onChange={(v) => { setEmail(v); clearError() }}
                    placeholder="Email address"
                  />

                  <div className="relative group">
                    <FiLock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none group-focus-within:text-white/60 transition-colors z-10" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError() }}
                      placeholder="Password"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-10 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors z-10"
                      tabIndex={-1}
                    >
                      {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>

                  {mode === "signup" && password.length > 0 && (
                    <div className="animate-fade-in">
                      <div className="flex gap-1 mb-1.5">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                              i <= getPasswordStrength(password)
                                ? strengthColors[getPasswordStrength(password)]
                                : "bg-white/10"
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium ${
                        getPasswordStrength(password) < 2 ? "text-white/40" : "text-emerald-400"
                      }`}>
                        {strengthLabels[getPasswordStrength(password)]}
                      </p>
                    </div>
                  )}

                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => switchMode("forgot")}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium -mt-1 block text-right transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}

                  {error && <ErrorMessage message={error} />}

                  <button
                    type="submit"
                    disabled={busy || !canSubmit}
                    className="w-full bg-white hover:bg-white/90 disabled:bg-white/20 text-[#0a0f1a] font-semibold py-3 rounded-xl transition-all active:scale-[0.98] text-sm disabled:cursor-not-allowed mt-1"
                  >
                    {busy ? <Spinner /> : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#0a0f1a] px-3 text-white/30">or continue with</span>
                  </div>
                </div>

                <button
                  onClick={handleGoogle}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2.5 bg-white/5 hover:bg-white/10 disabled:bg-white/[0.02] border border-white/10 text-white font-medium py-3 rounded-xl transition-all active:scale-[0.98] text-sm disabled:cursor-not-allowed"
                >
                  <FcGoogle size={18} />
                  Google
                </button>

                <p className="text-[11px] text-white/20 text-center mt-6 leading-relaxed">
                  By continuing, you agree to our{" "}
                  <span className="text-white/40 hover:text-white/60 cursor-pointer">Terms</span>
                  {" "}and{" "}
                  <span className="text-white/40 hover:text-white/60 cursor-pointer">Privacy Policy</span>.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Input({ icon: Icon, type, value, onChange, placeholder }: {
  icon: any; type: string; value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <div className="relative group">
      <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none group-focus-within:text-white/60 transition-colors z-10" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30 focus:bg-white/[0.07] transition-all"
        required
      />
    </div>
  )
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3.5 py-2.5 animate-fade-in">
      <FiAlertCircle size={14} className="text-red-400 mt-0.5 shrink-0" />
      <p className="text-xs text-red-300">{message}</p>
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-[#0a0f1a]/30 border-t-[#0a0f1a] rounded-full animate-spin" />
    </div>
  )
}
