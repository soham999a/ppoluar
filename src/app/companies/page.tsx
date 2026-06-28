"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getCached, setCache, clearCache } from "@/lib/data-cache"
import Sidebar from "@/components/Sidebar"
import Link from "next/link"
import { FiPlus, FiChevronRight, FiX } from "react-icons/fi"

interface Company {
  id: string
  name: string
  gst: string
  contact: string
  email: string
  number: string
  createdAt?: any
}

export default function CompaniesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", gst: "", contact: "", email: "", number: "" })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    async function fetchCompanies() {
      const cached = getCached<Company[]>("companies")
      if (cached) { setCompanies(cached); setDataLoading(false); return }
      const snap = await getDocs(collection(db, "companies"))
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Company))
      setCompanies(list)
      setCache("companies", list)
      setDataLoading(false)
    }
    fetchCompanies()
  }, [user])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const docRef = await addDoc(collection(db, "companies"), {
        ...form,
        createdAt: serverTimestamp(),
      })
      setCompanies((prev) => [...prev, { id: docRef.id, ...form }])
      clearCache("companies")
      clearCache("dashboard")
      setForm({ name: "", gst: "", contact: "", email: "", number: "" })
      setShowForm(false)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) return null

  if (dataLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0">
          <div className="h-7 bg-slate-100 rounded w-32 mb-1 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-64 mb-6 animate-pulse" />
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 bg-slate-50 rounded animate-pulse" />)}
            </div>
          </div>
          <div className="block lg:hidden space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse">
                <div className="h-4 bg-slate-100 rounded w-40 mb-2" />
                <div className="h-3 bg-slate-50 rounded w-24" />
              </div>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0">
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0 flex-1 mr-3">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Companies</h1>
            <p className="text-slate-500 text-xs lg:text-sm mt-0.5 truncate">All client companies, their bills and payment history.</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="shrink-0 flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 px-4 lg:py-2.5 lg:px-4 rounded-xl transition-colors active:scale-95"
          >
            <FiPlus size={18} className="lg:hidden" />
            <FiPlus size={16} className="hidden lg:block" />
            <span className="hidden lg:inline">Add company</span>
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center">
            <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-xl w-full lg:max-w-lg lg:m-4 max-h-[90vh] overflow-y-auto animate-slide-up lg:animate-none">
              <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-4 lg:p-6 lg:border-b-0">
                <h2 className="text-lg font-semibold text-slate-900">Add company</h2>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"
                >
                  <FiX size={20} />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-4 lg:p-6 pt-0 lg:pt-0 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" placeholder="Enter company name" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">GST</label>
                  <input value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" placeholder="GST number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact</label>
                  <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" placeholder="Contact person" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" placeholder="Email address" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Number</label>
                  <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} type="tel" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-shadow" placeholder="Phone number" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">GST</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Contact</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Number</th>
                  <th className="text-center py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Open</th>
                </tr>
              </thead>
              <tbody>
                {companies.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-slate-400">No companies yet. Click &ldquo;Add company&rdquo; to create your first one.</td></tr>
                ) : (
                  companies.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{c.name}</td>
                      <td className="py-3 px-4 text-slate-600">{c.gst || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{c.contact || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{c.email || "—"}</td>
                      <td className="py-3 px-4 text-slate-600">{c.number || "—"}</td>
                      <td className="py-3 px-4 text-center">
                        <Link href={`/companies/${c.id}`} className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"><FiChevronRight size={18} /></Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="block lg:hidden space-y-3">
          {companies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">No companies yet. Tap &ldquo;+&rdquo; to add one.</p>
            </div>
          ) : (
            companies.map((c) => (
              <Link
                key={c.id}
                href={`/companies/${c.id}`}
                className="block bg-white rounded-xl shadow-sm border border-slate-200 p-4 active:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 text-base">{c.name}</h3>
                  <FiChevronRight className="text-slate-300 shrink-0" size={18} />
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  {c.gst && <span>GST: {c.gst}</span>}
                  {c.contact && <span>{c.contact}</span>}
                  {c.email && <span>{c.email}</span>}
                  {c.number && <span>{c.number}</span>}
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </div>
  )
}
