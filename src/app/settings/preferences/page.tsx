"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "@/components/Sidebar"
import Link from "next/link"
import { FiArrowLeft, FiPlus } from "react-icons/fi"

export default function PreferencesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [fields, setFields] = useState<string[]>([])
  const [newField, setNewField] = useState("")

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    async function fetchFields() {
      const snap = await getDocs(collection(db, "businessFields"))
      setFields(snap.docs.map((d) => d.data().name as string))
    }
    fetchFields()
  }, [user])

  async function addField() {
    if (!newField.trim()) return
    await addDoc(collection(db, "businessFields"), { name: newField.trim(), createdAt: serverTimestamp() })
    setFields((prev) => [...prev, newField.trim()])
    setNewField("")
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0 animate-fade-in">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 lg:mb-4 transition-colors">
          <FiArrowLeft size={14} />
          Back
        </Link>

        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">User preference</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">Manage the list of business fields available across the app.</p>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5">
          <h2 className="text-xs font-semibold text-slate-500 mb-4 uppercase tracking-wide">Business field list</h2>

          <div className="flex gap-2 mb-4">
            <input
              value={newField}
              onChange={(e) => setNewField(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addField()}
              className="flex-1 border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Add a field..."
            />
            <button onClick={addField} className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 lg:py-2 px-4 rounded-xl lg:rounded-lg transition-colors flex items-center gap-1.5 active:scale-95 shrink-0">
              <FiPlus size={16} />
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {["Steel", "Cement", "Textile", "FMCG"].map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-sm font-medium px-3 py-1.5 rounded-full">{f}</span>
            ))}
            {fields.filter((f) => !["Steel", "Cement", "Textile", "FMCG"].includes(f)).map((f) => (
              <span key={f} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1.5 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
