"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { collection, query, orderBy, limit, startAfter, getDocs, addDoc, serverTimestamp, type DocumentSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "@/components/Sidebar"
import Pagination from "@/components/Pagination"

interface Quotation {
  id: string
  from: string
  to: string
  truckFreight: string
  truckCategory: string
  detention: string
  slotBooking: string
  loadingCharges: string
  unloadingCharges: string
  cwcParking: string
  createdAt?: any
}

export default function QuotationPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const PAGE_SIZE = 10
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const cursors = useRef<(DocumentSnapshot | null)[]>([null])
  const [form, setForm] = useState({
    from: "", to: "", truckFreight: "", truckCategory: "", detention: "",
    slotBooking: "", loadingCharges: "", unloadingCharges: "", cwcParking: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  async function loadPage(pageIndex: number) {
    if (!user) return
    setDataLoading(true)
    const cursorVal = cursors.current[pageIndex] ?? null
    const q = cursorVal
      ? query(collection(db, "quotations"), orderBy("createdAt"), limit(PAGE_SIZE), startAfter(cursorVal))
      : query(collection(db, "quotations"), orderBy("createdAt"), limit(PAGE_SIZE))
    const snap = await getDocs(q)
    const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quotation))
    setQuotations(list)
    setHasMore(snap.docs.length === PAGE_SIZE)
    cursors.current[pageIndex + 1] = snap.docs[snap.docs.length - 1] || null
    setDataLoading(false)
  }

  useEffect(() => {
    loadPage(0)
  }, [user])

  function goNext() {
    const next = page + 1
    setPage(next)
    loadPage(next)
  }

  function goPrev() {
    const prev = page - 1
    setPage(prev)
    loadPage(prev)
  }

  function resetForm() {
    setForm({
      from: "", to: "", truckFreight: "", truckCategory: "", detention: "",
      slotBooking: "", loadingCharges: "", unloadingCharges: "", cwcParking: "",
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const docRef = await addDoc(collection(db, "quotations"), { ...form, createdAt: serverTimestamp() })
      setQuotations((prev) => [...prev, { id: docRef.id, ...form }])
      resetForm()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">Quotation</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">Build a freight quotation, save it, print or share.</p>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5 mb-6">
          <h2 className="text-base lg:text-lg font-semibold text-slate-900 mb-4">New quotation</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
              <input value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Origin" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
              <input value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Destination" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Truck freight (₹)</label>
              <input value={form.truckFreight} onChange={(e) => setForm({ ...form, truckFreight: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Truck category</label>
              <input value={form.truckCategory} onChange={(e) => setForm({ ...form, truckCategory: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="e.g. 12-wheeler" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Detention / day (₹)</label>
              <input value={form.detention} onChange={(e) => setForm({ ...form, detention: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">W.B. GOVT slot booking</label>
              <input value={form.slotBooking} onChange={(e) => setForm({ ...form, slotBooking: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Slot booking charge" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Loading charges (₹)</label>
              <input value={form.loadingCharges} onChange={(e) => setForm({ ...form, loadingCharges: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Unloading charges (₹)</label>
              <input value={form.unloadingCharges} onChange={(e) => setForm({ ...form, unloadingCharges: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">C.W.C parking (₹)</label>
              <input value={form.cwcParking} onChange={(e) => setForm({ ...form, cwcParking: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="0" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3 pt-2">
              <button type="button" onClick={resetForm} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors active:scale-95">Reset</button>
              <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95">
                {saving ? "Saving..." : "Save quotation"}
              </button>
            </div>
          </form>
        </div>

        <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">From → To</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Freight</th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Created</th>
                </tr>
              </thead>
              <tbody>
                {quotations.length === 0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-slate-400">No quotations yet.</td></tr>
                ) : (
                  quotations.map((q) => (
                    <tr key={q.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 font-medium text-slate-900">{q.from || "?"} → {q.to || "?"}</td>
                      <td className="py-3 px-4 text-slate-600">₹{q.truckFreight || "0"}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs">{q.createdAt?.toDate?.()?.toLocaleDateString() || "Just now"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} hasMore={hasMore} onPrev={goPrev} onNext={goNext} />
        </div>

        <div className="block lg:hidden space-y-3">
          {quotations.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">No quotations yet.</p>
            </div>
          ) : (
            quotations.map((q) => (
              <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-900 text-sm">{q.from || "?"} → {q.to || "?"}</h3>
                  <span className="text-sm font-medium text-slate-700">₹{q.truckFreight || "0"}</span>
                </div>
                {q.truckCategory && <p className="text-xs text-slate-500">{q.truckCategory}</p>}
                <p className="text-xs text-slate-400 mt-1">{q.createdAt?.toDate?.()?.toLocaleDateString() || "Just now"}</p>
              </div>
            ))
          )}
          <Pagination page={page} hasMore={hasMore} onPrev={goPrev} onNext={goNext} />
        </div>
      </main>
    </div>
  )
}
