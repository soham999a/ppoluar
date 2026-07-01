"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit as fsLimit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "@/components/Sidebar"
import Pagination from "@/components/Pagination"
import PullToRefresh from "@/components/PullToRefresh"
import jsPDF from "jspdf"
import { FiDownload, FiEye, FiTrash2, FiX, FiTruck, FiMapPin } from "react-icons/fi"

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

function calcTotal(q: Quotation) {
  return (
    (Number(q.truckFreight) || 0) +
    (Number(q.detention) || 0) +
    (Number(q.slotBooking) || 0) +
    (Number(q.loadingCharges) || 0) +
    (Number(q.unloadingCharges) || 0) +
    (Number(q.cwcParking) || 0)
  )
}

function formatDate(ts: any) {
  return ts?.toDate?.()?.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) || ""
}

function downloadPdf(q: Quotation) {
  const total = calcTotal(q)
  const date = formatDate(q.createdAt)
  const lineH = 7
  let y = 20

  const pdf = new jsPDF("p", "mm", "a4")
  const pw = pdf.internal.pageSize.getWidth()
  const ml = 20
  const mr = 20
  const c1 = ml
  const c2 = pw - mr

  function text(label: string, value: string, isBold = false) {
    pdf.setFont("helvetica", isBold ? "bold" : "normal")
    pdf.setFontSize(isBold ? 11 : 10)
    pdf.text(label, c1, y)
    pdf.setFont("helvetica", "normal")
    pdf.text(value, c2, y, { align: "right" })
    y += lineH
  }

  function header(textStr: string, fontSize: number) {
    pdf.setFont("helvetica", "bold")
    pdf.setFontSize(fontSize)
    pdf.text(textStr, c1, y)
    y += lineH + 2
  }

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(18)
  pdf.text("POPULAR ROADWAYS", c1, y)
  y += lineH
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(10)
  pdf.text("Freight Quotation", c1, y)
  y += 2
  pdf.setFontSize(8)
  pdf.setTextColor(100)
  pdf.text(date ? `Date: ${date}` : "", c1, y)
  pdf.setTextColor(0)
  y += lineH + 3

  pdf.setDrawColor(0)
  pdf.setLineWidth(0.8)
  pdf.line(ml, y, pw - mr, y)
  y += 5

  header("Route", 12)
  pdf.setFontSize(10)
  pdf.setFont("helvetica", "bold")
  pdf.text(`From: ${q.from || "—"}`, c1, y)
  y += 6
  pdf.text(`To: ${q.to || "—"}`, c1, y)
  y += lineH + 3

  if (q.truckCategory) {
    pdf.setFont("helvetica", "normal")
    pdf.setFontSize(9)
    pdf.setTextColor(80)
    pdf.text(`Truck: ${q.truckCategory}`, c1, y)
    pdf.setTextColor(0)
    y += lineH + 2
  }

  pdf.setDrawColor(200)
  pdf.setLineWidth(0.3)
  pdf.line(ml, y, pw - mr, y)
  y += 4

  header("Charge Breakdown", 11)

  const charges = [
    { label: "Truck Freight", value: q.truckFreight },
    { label: "Detention / Day", value: q.detention },
    { label: "W.B. GOVT Slot Booking", value: q.slotBooking },
    { label: "Loading Charges", value: q.loadingCharges },
    { label: "Unloading Charges", value: q.unloadingCharges },
    { label: "C.W.C Parking", value: q.cwcParking },
  ]

  for (const c of charges) {
    text(c.label, `Rs. ${(Number(c.value) || 0).toLocaleString("en-IN")}`)
  }

  pdf.setDrawColor(0)
  pdf.setLineWidth(0.6)
  pdf.line(ml, y, pw - mr, y)
  y += 3

  text("Total", `Rs. ${total.toLocaleString("en-IN")}`, true)

  pdf.save(`quotation-${q.from || "unknown"}-${q.to || "unknown"}.pdf`)
}

export default function QuotationPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [page, setPage] = useState(1)
  const DISPLAY_PAGE_SIZE = 15
  const [detailQuotation, setDetailQuotation] = useState<Quotation | null>(null)
  const [form, setForm] = useState({
    from: "", to: "", truckFreight: "", truckCategory: "", detention: "",
    slotBooking: "", loadingCharges: "", unloadingCharges: "", cwcParking: "",
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    const unsub = onSnapshot(
      query(collection(db, "quotations"), orderBy("createdAt", "desc"), fsLimit(200)),
      (snap) => {
        setQuotations(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Quotation)))
        setDataLoading(false)
      },
    )
    return unsub
  }, [user])

  function resetForm() {
    setForm({
      from: "", to: "", truckFreight: "", truckCategory: "", detention: "",
      slotBooking: "", loadingCharges: "", unloadingCharges: "", cwcParking: "",
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const optimistic = { id: "temp-" + Date.now(), ...form }
    setQuotations((prev) => [optimistic, ...prev])
    resetForm()
    try {
      await addDoc(collection(db, "quotations"), { ...form, createdAt: serverTimestamp() })
    } catch (err) {
      console.error(err)
      setQuotations((prev) => prev.filter((q) => q.id !== optimistic.id))
    }
    setSaving(false)
  }

  async function handleDelete(q: Quotation) {
    if (q.id.startsWith("temp-")) return
    setQuotations((prev) => prev.filter((x) => x.id !== q.id))
    setDetailQuotation(null)
    try {
      await deleteDoc(doc(db, "quotations", q.id))
    } catch (err) {
      console.error(err)
    }
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0 animate-fade-in">
        <PullToRefresh onRefresh={() => window.location.reload()}>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">Quotation</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">Build a freight quotation, save it, download PDF or share.</p>

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

        {dataLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <div className="h-4 bg-slate-100 rounded w-40" />
                  <div className="h-4 bg-slate-100 rounded w-16" />
                </div>
                <div className="h-3 bg-slate-100 rounded w-24 mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">From → To</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Freight</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Created</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500 text-xs uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                      {quotations.length === 0 ? (
                        <tr><td colSpan={4} className="text-center py-8 text-slate-400">No quotations yet.</td></tr>
                      ) : (
                        (() => {
                          const start = (page - 1) * DISPLAY_PAGE_SIZE
                          return quotations.slice(start, start + DISPLAY_PAGE_SIZE).map((q) => (
                        <tr key={q.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-900">{q.from || "?"} → {q.to || "?"}</td>
                          <td className="py-3 px-4 text-slate-600">₹{(Number(q.truckFreight) || 0).toLocaleString()}</td>
                          <td className="py-3 px-4 text-slate-400 text-xs">{formatDate(q.createdAt)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setDetailQuotation(q)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                title="View details"
                              >
                                <FiEye size={15} />
                              </button>
                              <button
                                onClick={() => downloadPdf(q)}
                                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                                title="Download PDF"
                              >
                                <FiDownload size={15} />
                              </button>
                              <button
                                onClick={() => { if (confirm("Delete this quotation?")) handleDelete(q) }}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <FiTrash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                        })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="hidden lg:block">
              <Pagination currentPage={page} totalPages={Math.ceil(quotations.length / DISPLAY_PAGE_SIZE) || 1} onPageChange={setPage} />
            </div>

            <div className="block lg:hidden space-y-3">
              {quotations.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                  <p className="text-sm text-slate-400">No quotations yet.</p>
                </div>
              ) : (
                (() => {
                  const start = (page - 1) * DISPLAY_PAGE_SIZE
                  return quotations.slice(start, start + DISPLAY_PAGE_SIZE).map((q) => (
                  <div key={q.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-slate-900 text-sm">{q.from || "?"} → {q.to || "?"}</h3>
                      <span className="text-sm font-medium text-slate-700">₹{(Number(q.truckFreight) || 0).toLocaleString()}</span>
                    </div>
                    {q.truckCategory && <p className="text-xs text-slate-500">{q.truckCategory}</p>}
                    <p className="text-xs text-slate-400 mt-1">{formatDate(q.createdAt)}</p>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setDetailQuotation(q)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <FiEye size={13} /> View
                      </button>
                      <button
                        onClick={() => downloadPdf(q)}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-slate-600 py-2 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <FiDownload size={13} /> PDF
                      </button>
                      <button
                        onClick={() => { if (confirm("Delete this quotation?")) handleDelete(q) }}
                        className="flex items-center justify-center gap-1.5 text-xs font-medium text-red-500 py-2 px-3 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
                  })()
              )}
              <Pagination currentPage={page} totalPages={Math.ceil(quotations.length / DISPLAY_PAGE_SIZE) || 1} onPageChange={setPage} />
            </div>
          </>
        )}
        </PullToRefresh>
      </main>

      {detailQuotation && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center" onClick={() => setDetailQuotation(null)}>
          <div
            className="bg-white rounded-t-2xl lg:rounded-2xl shadow-xl w-full lg:max-w-2xl lg:m-4 max-h-[90vh] overflow-y-auto animate-slide-up lg:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-4 lg:p-6 z-10">
              <h2 className="text-lg font-semibold text-slate-900">Quotation Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => downloadPdf(detailQuotation)}
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2 px-4 rounded-xl transition-colors active:scale-95"
                >
                  <FiDownload size={14} />
                  Download PDF
                </button>
                <button onClick={() => setDetailQuotation(null)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 lg:p-8">
              <div className="border-b-2 border-slate-900 pb-4 mb-6">
                <h3 className="text-xl font-bold text-slate-900">POPULAR ROADWAYS</h3>
                <p className="text-sm text-slate-500 mt-0.5">Freight Quotation</p>
                <p className="text-xs text-slate-400 mt-0.5">Date: {formatDate(detailQuotation.createdAt)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <FiMapPin size={12} /> Origin
                  </div>
                  <p className="text-base font-semibold text-slate-900">{detailQuotation.from || "—"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <FiMapPin size={12} /> Destination
                  </div>
                  <p className="text-base font-semibold text-slate-900">{detailQuotation.to || "—"}</p>
                </div>
              </div>

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Charge Description</th>
                    <th className="text-right py-2.5 font-semibold text-slate-700 text-xs uppercase tracking-wide">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "Truck Freight", value: detailQuotation.truckFreight },
                    { label: "Detention / Day", value: detailQuotation.detention },
                    { label: "W.B. GOVT Slot Booking", value: detailQuotation.slotBooking },
                    { label: "Loading Charges", value: detailQuotation.loadingCharges },
                    { label: "Unloading Charges", value: detailQuotation.unloadingCharges },
                    { label: "C.W.C Parking", value: detailQuotation.cwcParking },
                  ].map((item) => (
                    <tr key={item.label} className="border-b border-slate-50">
                      <td className="py-2.5 text-slate-600">{item.label}</td>
                      <td className="py-2.5 text-right font-medium text-slate-900">₹{(Number(item.value) || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-slate-900">
                    <td className="py-3 font-bold text-slate-900 text-base">Total</td>
                    <td className="py-3 text-right font-bold text-slate-900 text-base">₹{calcTotal(detailQuotation).toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>

              {detailQuotation.truckCategory && (
                <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-50 rounded-xl px-4 py-3">
                  <FiTruck size={16} className="text-slate-400" />
                  <span>Truck category: <strong className="text-slate-700">{detailQuotation.truckCategory}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
