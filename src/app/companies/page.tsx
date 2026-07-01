"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, collectionGroup, doc, onSnapshot, addDoc, updateDoc, serverTimestamp, orderBy, query } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "@/components/Sidebar"
import { FiPlus, FiChevronRight, FiChevronDown, FiX, FiTruck, FiDollarSign, FiAlertCircle, FiCheckCircle, FiClock, FiEdit2 } from "react-icons/fi"

interface Company {
  id: string
  name: string
  gst: string
  contact: string
  email: string
  number: string
  createdAt?: any
}

interface Bill {
  id: string
  companyId: string
  billNumber: string
  invoiceNumber: string
  loadingDate: string
  trucks: string
  goods: string
  amount: string
  status: string
  createdAt?: any
}

interface Payment {
  id: string
  companyId: string
  billId: string
  mode: string
  date: string
  account: string
  amount: string
  createdAt?: any
}

const statusOptions = ["Paid", "Not Paid", "Partial Paid"]

export default function CompaniesPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyFinance, setCompanyFinance] = useState<Record<string, { totalBilled: number; totalPaid: number }>>({})
  const [billsByCompany, setBillsByCompany] = useState<Record<string, Bill[]>>({})
  const [paymentsByBill, setPaymentsByBill] = useState<Record<string, Payment[]>>({})
  const [dataLoading, setDataLoading] = useState(true)

  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: "", gst: "", contact: "", email: "", number: "" })
  const [saving, setSaving] = useState(false)

  const [showBillForm, setShowBillForm] = useState<string | null>(null)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [billForm, setBillForm] = useState({ billNumber: "", invoiceNumber: "", loadingDate: "", trucks: "", goods: "", amount: "", status: "Not Paid" })

  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState({ mode: "", date: "", account: "", amount: "" })
  const [paymentCompanyId, setPaymentCompanyId] = useState<string>("")

  const [showCollectPayment, setShowCollectPayment] = useState(false)
  const [collectForm, setCollectForm] = useState({ companyId: "", billId: "", mode: "", date: "", account: "", amount: "" })

  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    let destroyed = false
    const financeByCompany: Record<string, { totalBilled: number; totalPaid: number }> = {}
    const billsMap: Record<string, Bill[]> = {}
    const paymentsMap: Record<string, Payment[]> = {}
    let paymentsList: Payment[] = []

    function recompute() {
      if (destroyed) return
      setCompanyFinance({ ...financeByCompany })
      setBillsByCompany({ ...billsMap })
      setPaymentsByBill({ ...paymentsMap })
      setRecentPayments([...paymentsList])
      setDataLoading(false)
    }

    const unsubCompanies = onSnapshot(query(collection(db, "companies"), orderBy("createdAt")), (snap) => {
      setCompanies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Company)))
    })

    const unsubBills = onSnapshot(collectionGroup(db, "bills"), (snap) => {
      financeByCompany["_totalBills"] = { totalBilled: 0, totalPaid: 0 }
      Object.keys(billsMap).forEach((k) => delete billsMap[k])
      snap.forEach((d) => {
        const pathSegments = d.ref.path.split("/")
        const companyId = pathSegments[1]
        const amount = Number(d.data().amount) || 0
        if (!financeByCompany[companyId]) financeByCompany[companyId] = { totalBilled: 0, totalPaid: 0 }
        financeByCompany[companyId].totalBilled += amount
        financeByCompany["_totalBills"].totalBilled += amount
        if (!billsMap[companyId]) billsMap[companyId] = []
        billsMap[companyId].push({ id: d.id, companyId, ...d.data() } as Bill)
      })
      recompute()
    }, (err) => { console.error("Bills listener error:", err); setDataLoading(false) })

    const unsubPayments = onSnapshot(collectionGroup(db, "payments"), (snap) => {
      financeByCompany["_totalPaid"] = { totalBilled: 0, totalPaid: 0 }
      Object.keys(paymentsMap).forEach((k) => delete paymentsMap[k])
      paymentsList = []
      snap.forEach((d) => {
        const pathSegments = d.ref.path.split("/")
        const companyId = pathSegments[1]
        const billId = pathSegments[3]
        const amount = Number(d.data().amount) || 0
        if (!financeByCompany[companyId]) financeByCompany[companyId] = { totalBilled: 0, totalPaid: 0 }
        financeByCompany[companyId].totalPaid += amount
        financeByCompany["_totalPaid"].totalPaid += amount
        const key = `${companyId}__${billId}`
        if (!paymentsMap[key]) paymentsMap[key] = []
        paymentsMap[key].push({ id: d.id, companyId, billId, ...d.data() } as Payment)
        paymentsList.push({ id: d.id, companyId, billId, ...d.data() } as Payment)
      })
      paymentsList.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      recompute()
    }, (err) => { console.error("Payments listener error:", err); setDataLoading(false) })

    return () => { destroyed = true; unsubCompanies(); unsubBills(); unsubPayments() }
  }, [user])

  async function handleCompanySubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const optimisticId = "temp-" + Date.now()
    setCompanies((prev) => [...prev, { id: optimisticId, ...form }])
    setForm({ name: "", gst: "", contact: "", email: "", number: "" })
    setShowForm(false)
    try {
      await addDoc(collection(db, "companies"), { ...form, createdAt: serverTimestamp() })
    } catch (err) {
      console.error(err)
      setCompanies((prev) => prev.filter((c) => c.id !== optimisticId))
    } finally {
      setSaving(false)
    }
  }

  async function handleBillSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!showBillForm) return
    setSaving(true)
    const companyId = showBillForm
    const optimisticId = "temp-" + Date.now()
    if (editingBill) {
      try {
        await updateDoc(doc(db, "companies", editingBill.companyId, "bills", editingBill.id), billForm)
        resetBillForm()
      } catch (err) { console.error(err) }
    } else {
      setBillsByCompany((prev) => ({
        ...prev,
        [companyId]: [...(prev[companyId] || []), { id: optimisticId, companyId, ...billForm }],
      }))
      resetBillForm()
      try {
        await addDoc(collection(db, "companies", companyId, "bills"), { ...billForm, createdAt: serverTimestamp() })
      } catch (err) { console.error(err) }
    }
    setSaving(false)
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!showPaymentForm) return
    setSaving(true)
    const [companyId, billId] = showPaymentForm.split("__")
    const optimisticId = "temp-" + Date.now()
    const key = showPaymentForm
    setPaymentsByBill((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), { id: optimisticId, companyId, billId, ...paymentForm }],
    }))
    setPaymentForm({ mode: "", date: "", account: "", amount: "" })
    setShowPaymentForm(null)
    try {
      await addDoc(collection(db, "companies", companyId, "bills", billId, "payments"), {
        ...paymentForm, createdAt: serverTimestamp(),
      })
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  async function handleCollectPaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!collectForm.companyId || !collectForm.billId) return
    setSaving(true)
    const { companyId, billId, mode, date, account, amount } = collectForm
    const key = `${companyId}__${billId}`
    const optimisticId = "temp-" + Date.now()
    setPaymentsByBill((prev) => ({
      ...prev,
      [key]: [...(prev[key] || []), { id: optimisticId, companyId, billId, mode, date, account, amount }],
    }))
    setCollectForm({ companyId: "", billId: "", mode: "", date: "", account: "", amount: "" })
    setShowCollectPayment(false)
    try {
      await addDoc(collection(db, "companies", companyId, "bills", billId, "payments"), {
        mode, date, account, amount, createdAt: serverTimestamp(),
      })
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  function resetBillForm() {
    setBillForm({ billNumber: "", invoiceNumber: "", loadingDate: "", trucks: "", goods: "", amount: "", status: "Not Paid" })
    setEditingBill(null)
    setShowBillForm(null)
  }

  function openEditBill(bill: Bill) {
    setBillForm({
      billNumber: bill.billNumber, invoiceNumber: bill.invoiceNumber, loadingDate: bill.loadingDate,
      trucks: bill.trucks, goods: bill.goods, amount: bill.amount, status: bill.status,
    })
    setEditingBill(bill)
    setShowBillForm(bill.companyId)
  }

  function getCompanyFinance(companyId: string) {
    return companyFinance[companyId] || { totalBilled: 0, totalPaid: 0 }
  }

  function getPaymentStatus(finance: { totalBilled: number; totalPaid: number }) {
    if (finance.totalBilled === 0) return { label: "No Bills", color: "bg-slate-100 text-slate-500" }
    const balance = finance.totalBilled - finance.totalPaid
    if (balance <= 0) return { label: "Paid", color: "bg-green-100 text-green-700" }
    if (finance.totalPaid > 0) return { label: "Partial", color: "bg-yellow-100 text-yellow-700" }
    return { label: "Pending", color: "bg-red-100 text-red-700" }
  }

  function getBillPayments(billId: string, companyId: string): Payment[] {
    return paymentsByBill[`${companyId}__${billId}`] || []
  }

  const totals = companyFinance["_totalBills"]
  const totalPaidAgg = companyFinance["_totalPaid"]
  const totalBilled = totals?.totalBilled || 0
  const totalPaid = totalPaidAgg?.totalPaid || 0
  const outstandingBalance = totalBilled - totalPaid
  const pendingBillsCount = companies.reduce((count, c) => {
    const f = getCompanyFinance(c.id)
    return count + (f.totalBilled > 0 && f.totalBilled - f.totalPaid > 0 ? 1 : 0)
  }, 0)

  function getAvailableBills(companyId: string) {
    return (billsByCompany[companyId] || []).filter((b) => {
      const paid = getBillPayments(b.id, companyId).reduce((s, p) => s + (Number(p.amount) || 0), 0)
      return (Number(b.amount) || 0) - paid > 0
    })
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 bg-slate-50 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0 animate-fade-in min-h-screen">
        {dataLoading ? (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse">
                  <div className="h-3 bg-slate-100 rounded w-16 mb-2" />
                  <div className="h-6 bg-slate-100 rounded w-20" />
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-pulse">
              <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-10 bg-slate-50 rounded" />)}</div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Orders</span>
                  <FiTruck size={16} className="text-slate-300" />
                </div>
                <p className="text-xl lg:text-2xl font-bold text-slate-900">{totalBilled > 0 ? companies.length : 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Collected</span>
                  <FiDollarSign size={16} className="text-green-400" />
                </div>
                <p className="text-lg lg:text-2xl font-bold text-slate-900">₹{totalPaid.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Outstanding</span>
                  <FiAlertCircle size={16} className="text-red-400" />
                </div>
                <p className="text-lg lg:text-2xl font-bold text-red-600">₹{outstandingBalance.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending Bills</span>
                  <FiClock size={16} className="text-yellow-400" />
                </div>
                <p className="text-xl lg:text-2xl font-bold text-slate-900">{pendingBillsCount}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-slate-900">Company Management</h1>
                <p className="text-slate-500 text-xs lg:text-sm mt-0.5">Track companies, bills and payments.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setCollectForm({ companyId: "", billId: "", mode: "", date: "", account: "", amount: "" }); setShowCollectPayment(true) }}
                  className="shrink-0 flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 px-4 lg:py-2.5 lg:px-4 rounded-xl transition-colors active:scale-95 shadow-sm"
                >
                  <FiDollarSign size={16} />
                  <span className="hidden lg:inline">Collect Payment</span>
                </button>
                <button
                  onClick={() => setShowForm(true)}
                  className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 px-4 lg:py-2.5 lg:px-4 rounded-xl transition-colors active:scale-95 shadow-sm"
                >
                  <FiPlus size={16} />
                  <span className="hidden lg:inline">Add Company</span>
                </button>
              </div>
            </div>

            {showForm && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center">
                <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-xl w-full lg:max-w-lg lg:m-4 max-h-[90vh] overflow-y-auto animate-slide-up lg:animate-none">
                  <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-4 lg:p-6 lg:border-b-0">
                    <h2 className="text-lg font-semibold text-slate-900">Add Company</h2>
                    <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"><FiX size={20} /></button>
                  </div>
                  <form onSubmit={handleCompanySubmit} className="p-4 lg:p-6 pt-0 lg:pt-0 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Company name *</label>
                      <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Enter company name" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">GST</label>
                      <input value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="GST number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Contact</label>
                      <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Contact person" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                      <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Email address" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Number</label>
                      <input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} type="tel" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Phone number" />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowForm(false)} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors">Cancel</button>
                      <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95 shadow-sm">
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showCollectPayment && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center">
                <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-xl w-full lg:max-w-md lg:m-4 max-h-[90vh] overflow-y-auto animate-slide-up lg:animate-none">
                  <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-4 lg:p-6 lg:border-b-0">
                    <h2 className="text-lg font-semibold text-slate-900">Collect Payment</h2>
                    <button onClick={() => setShowCollectPayment(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"><FiX size={20} /></button>
                  </div>
                  <form onSubmit={handleCollectPaymentSubmit} className="p-4 lg:p-6 pt-0 lg:pt-0 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Company</label>
                      <select value={collectForm.companyId} onChange={(e) => { setCollectForm({ ...collectForm, companyId: e.target.value, billId: "" }) }} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white" required>
                        <option value="">Select company</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill</label>
                      <select value={collectForm.billId} onChange={(e) => setCollectForm({ ...collectForm, billId: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white" required>
                        <option value="">Select bill</option>
                        {collectForm.companyId && getAvailableBills(collectForm.companyId).map((b) => {
                          const paid = getBillPayments(b.id, collectForm.companyId).reduce((s, p) => s + (Number(p.amount) || 0), 0)
                          const balance = (Number(b.amount) || 0) - paid
                          return (
                            <option key={b.id} value={b.id}>{b.billNumber || "Bill"} — ₹{balance.toLocaleString()} remaining</option>
                          )
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Payment mode</label>
                      <input value={collectForm.mode} onChange={(e) => setCollectForm({ ...collectForm, mode: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Cash, Bank Transfer, etc." required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date</label>
                      <input type="date" value={collectForm.date} onChange={(e) => setCollectForm({ ...collectForm, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Account</label>
                      <input value={collectForm.account} onChange={(e) => setCollectForm({ ...collectForm, account: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Bank account name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹)</label>
                      <input value={collectForm.amount} onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" required />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => setShowCollectPayment(false)} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors">Cancel</button>
                      <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95 shadow-sm">
                        {saving ? "Saving..." : "Save Payment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showBillForm && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center">
                <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-xl w-full lg:max-w-lg lg:m-4 max-h-[90vh] overflow-y-auto animate-slide-up lg:animate-none">
                  <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-4 lg:p-6 lg:border-b-0 z-10">
                    <h2 className="text-lg font-semibold text-slate-900">{editingBill ? "Edit Bill" : "Add Bill"}</h2>
                    <button onClick={resetBillForm} className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"><FiX size={20} /></button>
                  </div>
                  <form onSubmit={handleBillSubmit} className="p-4 lg:p-6 pt-0 lg:pt-0 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill number</label>
                      <input value={billForm.billNumber} onChange={(e) => setBillForm({ ...billForm, billNumber: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Bill number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice number</label>
                      <input value={billForm.invoiceNumber} onChange={(e) => setBillForm({ ...billForm, invoiceNumber: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Invoice number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Loading date</label>
                      <input type="date" value={billForm.loadingDate} onChange={(e) => setBillForm({ ...billForm, loadingDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">How many trucks</label>
                      <input value={billForm.trucks} onChange={(e) => setBillForm({ ...billForm, trucks: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Number of trucks" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Which goods</label>
                      <input value={billForm.goods} onChange={(e) => setBillForm({ ...billForm, goods: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Type of goods" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill amount (₹)</label>
                      <input value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Amount" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                      <select value={billForm.status} onChange={(e) => setBillForm({ ...billForm, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={resetBillForm} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors">Cancel</button>
                      <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95 shadow-sm">
                        {saving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {showPaymentForm && (
              <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center">
                <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-xl w-full lg:max-w-md lg:m-4 max-h-[90vh] overflow-y-auto animate-slide-up lg:animate-none">
                  <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-4 lg:p-6 lg:border-b-0 z-10">
                    <h2 className="text-lg font-semibold text-slate-900">Add Payment</h2>
                    <button onClick={() => { setPaymentForm({ mode: "", date: "", account: "", amount: "" }); setShowPaymentForm(null) }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"><FiX size={20} /></button>
                  </div>
                  <form onSubmit={handlePaymentSubmit} className="p-4 lg:p-6 pt-0 lg:pt-0 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode of payment</label>
                      <input value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Cash, Bank Transfer, etc." required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of payment</label>
                      <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Account</label>
                      <input value={paymentForm.account} onChange={(e) => setPaymentForm({ ...paymentForm, account: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Bank account name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1.5">Amount (₹)</label>
                      <input value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="0" required />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => { setPaymentForm({ mode: "", date: "", account: "", amount: "" }); setShowPaymentForm(null) }} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors">Cancel</button>
                      <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95 shadow-sm">
                        {saving ? "Saving..." : "Save Payment"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Company</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">GST</th>
                      <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Contact</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Total Billed</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Total Paid</th>
                      <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Balance</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide">Status</th>
                      <th className="text-center py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wide"></th>
                    </tr>
                  </thead>
                  {companies.length === 0 ? (
                    <tbody>
                      <tr><td colSpan={8} className="text-center py-8 text-slate-400">No companies yet. Click "Add Company" to create your first one.</td></tr>
                    </tbody>
                  ) : (
                    companies.map((c) => {
                      const finance = getCompanyFinance(c.id)
                      const balance = finance.totalBilled - finance.totalPaid
                      const status = getPaymentStatus(finance)
                      const isExpanded = expandedCompany === c.id
                      const companyBills = billsByCompany[c.id] || []

                      return (
                        <tbody key={c.id}>
                          <tr className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setExpandedCompany(isExpanded ? null : c.id)}>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                                  <FiTruck size={15} />
                                </div>
                                <span className="font-medium text-slate-900">{c.name}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-slate-500">{c.gst || "—"}</td>
                            <td className="py-3.5 px-4">
                              <div className="text-slate-700">{c.contact || "—"}</div>
                              {c.number && <div className="text-xs text-slate-400">{c.number}</div>}
                            </td>
                            <td className="py-3.5 px-4 text-right font-medium text-slate-900">₹{finance.totalBilled.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-right font-medium text-emerald-600">₹{finance.totalPaid.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-right font-medium">
                              {balance > 0 ? <span className="text-red-600">₹{balance.toLocaleString()}</span> : <span className="text-emerald-600">₹0</span>}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${status.color}`}>
                                {status.label === "Paid" ? <FiCheckCircle size={12} /> : status.label === "Partial" ? <FiClock size={12} /> : status.label === "Pending" ? <FiAlertCircle size={12} /> : null}
                                {status.label}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-400">
                              {isExpanded ? <FiChevronDown size={16} className="mx-auto" /> : <FiChevronRight size={16} className="mx-auto" />}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="border-b border-slate-50">
                              <td colSpan={8} className="p-0">
                                <div className="bg-slate-50/50 p-4 lg:p-5 animate-fade-in">
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                      {c.gst && <span>GST: {c.gst}</span>}
                                      {c.email && <span>· {c.email}</span>}
                                      {c.number && <span>· {c.number}</span>}
                                    </div>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); resetBillForm(); setShowBillForm(c.id) }}
                                      className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium active:scale-95"
                                    >
                                      <FiPlus size={14} />
                                      <span className="hidden lg:inline">Add Bill</span>
                                    </button>
                                  </div>

                                  {companyBills.length === 0 ? (
                                    <p className="text-sm text-slate-400 py-6 text-center">No bills yet. Add one to get started.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                                      {companyBills.map((bill) => {
                                        const billPayments = getBillPayments(bill.id, c.id)
                                        const billAmt = Number(bill.amount) || 0
                                        const paidAmt = billPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
                                        const billBalance = billAmt - paidAmt
                                        return (
                                          <div key={bill.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                            <div className="p-4">
                                              <div className="flex items-start justify-between mb-2">
                                                <span className="font-semibold text-slate-900">{bill.billNumber || "Bill #" + bill.id.slice(0, 6)}</span>
                                                <span className="text-base font-bold text-slate-800">₹{billAmt.toLocaleString()}</span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 mb-3">
                                                {bill.invoiceNumber && (
                                                  <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-[10px] text-slate-400 block">Invoice</span>
                                                    <span className="text-xs font-medium text-slate-900 break-all">{bill.invoiceNumber}</span>
                                                  </div>
                                                )}
                                                {bill.loadingDate && (
                                                  <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-[10px] text-slate-400 block">Loading</span>
                                                    <span className="text-xs font-medium text-slate-900">{bill.loadingDate}</span>
                                                  </div>
                                                )}
                                                {bill.trucks && (
                                                  <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-[10px] text-slate-400 block">Trucks</span>
                                                    <span className="text-xs font-medium text-slate-900">{bill.trucks}</span>
                                                  </div>
                                                )}
                                                {bill.goods && (
                                                  <div className="bg-slate-50 rounded-lg p-2">
                                                    <span className="text-[10px] text-slate-400 block">Goods</span>
                                                    <span className="text-xs font-medium text-slate-900">{bill.goods}</span>
                                                  </div>
                                                )}
                                              </div>
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                                    bill.status === "Paid" ? "bg-green-100 text-green-700" :
                                                    bill.status === "Partial Paid" ? "bg-yellow-100 text-yellow-700" :
                                                    "bg-red-100 text-red-700"
                                                  }`}>{bill.status}</span>
                                                  <button
                                                    onClick={(e) => { e.stopPropagation(); openEditBill(bill) }}
                                                    className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                                                  >
                                                    <FiEdit2 size={12} />
                                                  </button>
                                                </div>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    setPaymentForm({ mode: "", date: "", account: "", amount: "" })
                                                    setShowPaymentForm(`${c.id}__${bill.id}`)
                                                  }}
                                                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium active:scale-95"
                                                >
                                                  + Add Payment
                                                </button>
                                              </div>

                                              {billPayments.length > 0 && (
                                                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
                                                  <p className="text-xs text-slate-400 font-medium">Payment History</p>
                                                  {billPayments.map((p) => (
                                                    <div key={p.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2.5 py-1.5">
                                                      <div className="flex items-center gap-2 min-w-0">
                                                        <span className="text-slate-600 truncate">{p.mode || "—"}</span>
                                                        <span className="text-slate-400 shrink-0">{p.date || ""}</span>
                                                      </div>
                                                      <span className="font-semibold text-emerald-600 shrink-0 ml-2">₹{(Number(p.amount) || 0).toLocaleString()}</span>
                                                    </div>
                                                  ))}
                                                  <div className="flex items-center justify-between text-xs px-2.5 py-1">
                                                    <span className="text-slate-500">Balance</span>
                                                    <span className={`font-semibold ${billBalance > 0 ? "text-red-600" : "text-emerald-600"}`}>
                                                      ₹{billBalance.toLocaleString()}
                                                    </span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      )
                    })
                  )}
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setExpandedSection(expandedSection === "snapshots" ? null : "snapshots")}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
              >
                <h3 className="text-base font-semibold text-slate-900">Payment Snapshots</h3>
                {expandedSection === "snapshots" ? <FiChevronDown size={18} className="text-slate-400" /> : <FiChevronRight size={18} className="text-slate-400" />}
              </button>
              {expandedSection === "snapshots" && (
                <div className="border-t border-slate-100 animate-fade-in">
                  {recentPayments.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">No payments recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {recentPayments.slice(0, 10).map((payment) => {
                        const company = companies.find((co) => co.id === payment.companyId)
                        return (
                          <div key={payment.id} className="flex items-center justify-between px-4 py-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-900 truncate">{payment.mode || "Payment"}</p>
                              <p className="text-xs text-slate-400 truncate">{company?.name || "Unknown"} {payment.date && `· ${payment.date}`}</p>
                            </div>
                            <span className="text-sm font-semibold text-emerald-600 ml-3">₹{(Number(payment.amount) || 0).toLocaleString()}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
