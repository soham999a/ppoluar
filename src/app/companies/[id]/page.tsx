"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter, useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { doc, getDoc, collection, onSnapshot, getDocs, addDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "@/components/Sidebar"
import Link from "next/link"
import { FiArrowLeft, FiPlus, FiEdit2, FiChevronDown, FiChevronRight, FiX } from "react-icons/fi"

interface Company {
  id: string
  name: string
  gst: string
  contact: string
  email: string
  number: string
}

interface Bill {
  id: string
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
  mode: string
  date: string
  account: string
  amount: string
  createdAt?: any
}

const statusOptions = ["Paid", "Not Paid", "Partial Paid"]

export default function CompanyDetailPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<Record<string, Payment[]>>({})
  const [expandedBills, setExpandedBills] = useState<Record<string, boolean>>({})
  const [totalPending, setTotalPending] = useState(0)

  const [showBillForm, setShowBillForm] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [billForm, setBillForm] = useState({ billNumber: "", invoiceNumber: "", loadingDate: "", trucks: "", goods: "", amount: "", status: "Not Paid" })

  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<{ billId: string; payment: Payment } | null>(null)
  const [paymentForm, setPaymentForm] = useState({ mode: "", date: "", account: "", amount: "" })

  const [dataLoading, setDataLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!user || !companyId) return
    let destroyed = false

    async function loadPayments(billList: Bill[]) {
      const payResults = await Promise.all(
        billList.map(async (bill) => {
          const paySnap = await getDocs(collection(db, "companies", companyId, "bills", bill.id, "payments"))
          return { billId: bill.id, payments: paySnap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)) }
        }),
      )
      let pending = 0
      const paymentsMap: Record<string, Payment[]> = {}
      for (const r of payResults) {
        paymentsMap[r.billId] = r.payments
        const bill = billList.find((b) => b.id === r.billId)
        const billAmt = Number(bill?.amount) || 0
        const paid = r.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
        pending += billAmt - paid
      }
      if (!destroyed) {
        setPayments(paymentsMap)
        setTotalPending(pending)
      }
    }

    const unsub = onSnapshot(collection(db, "companies", companyId, "bills"), (snap) => {
      const billList = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Bill))
      setBills(billList)
      loadPayments(billList)
      setDataLoading(false)
    })

    getDoc(doc(db, "companies", companyId)).then((compSnap) => {
      if (compSnap.exists() && !destroyed) {
        setCompany({ id: compSnap.id, ...compSnap.data() } as Company)
      }
    })

    return () => { destroyed = true; unsub() }
  }, [user, companyId])

  function resetBillForm() {
    setBillForm({ billNumber: "", invoiceNumber: "", loadingDate: "", trucks: "", goods: "", amount: "", status: "Not Paid" })
    setEditingBill(null)
    setShowBillForm(false)
  }

  function resetPaymentForm() {
    setPaymentForm({ mode: "", date: "", account: "", amount: "" })
    setEditingPayment(null)
    setShowPaymentForm(null)
  }

  async function handleBillSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const optimisticId = "temp-" + Date.now()
    if (editingBill) {
      try {
        await updateDoc(doc(db, "companies", companyId, "bills", editingBill.id), billForm)
        resetBillForm()
      } catch (err) {
        console.error(err)
      }
    } else {
      const optimistic = { id: optimisticId, ...billForm }
      setBills((prev) => [...prev, optimistic])
      resetBillForm()
      try {
        await addDoc(collection(db, "companies", companyId, "bills"), { ...billForm, createdAt: serverTimestamp() })
      } catch (err) {
        console.error(err)
        setBills((prev) => prev.filter((b) => b.id !== optimisticId))
      }
    }
    setSaving(false)
  }

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!showPaymentForm) return
    setSaving(true)
    const optimisticId = "temp-" + Date.now()
    if (editingPayment) {
      try {
        await updateDoc(
          doc(db, "companies", companyId, "bills", editingPayment.billId, "payments", editingPayment.payment.id),
          paymentForm,
        )
        resetPaymentForm()
      } catch (err) {
        console.error(err)
      }
    } else {
      const optimistic = { id: optimisticId, ...paymentForm }
      setPayments((prev) => ({
        ...prev,
        [showPaymentForm]: [...(prev[showPaymentForm] || []), optimistic],
      }))
      resetPaymentForm()
      try {
        await addDoc(collection(db, "companies", companyId, "bills", showPaymentForm, "payments"), {
          ...paymentForm,
          createdAt: serverTimestamp(),
        })
      } catch (err) {
        console.error(err)
      }
    }
    setSaving(false)
  }

  function openEditBill(bill: Bill) {
    setBillForm({
      billNumber: bill.billNumber,
      invoiceNumber: bill.invoiceNumber,
      loadingDate: bill.loadingDate,
      trucks: bill.trucks,
      goods: bill.goods,
      amount: bill.amount,
      status: bill.status,
    })
    setEditingBill(bill)
    setShowBillForm(true)
  }

  function openEditPayment(billId: string, payment: Payment) {
    setPaymentForm({
      mode: payment.mode,
      date: payment.date,
      account: payment.account,
      amount: payment.amount,
    })
    setEditingPayment({ billId, payment })
    setShowPaymentForm(billId)
  }

  function toggleBill(billId: string) {
    setExpandedBills((prev) => ({ ...prev, [billId]: !prev[billId] }))
  }

  if (loading || !user) return null
  if (dataLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0">
          <div className="h-4 bg-slate-100 rounded w-16 mb-4 animate-pulse" />
          <div className="h-7 bg-slate-100 rounded w-48 mb-1 animate-pulse" />
          <div className="h-4 bg-slate-100 rounded w-64 mb-4 animate-pulse" />
          <div className="h-10 bg-slate-100 rounded w-28 mb-6 animate-pulse" />
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse mb-3">
            <div className="h-5 bg-slate-50 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-50 rounded w-1/2" />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 animate-pulse">
            <div className="h-5 bg-slate-50 rounded w-3/4 mb-2" />
            <div className="h-3 bg-slate-50 rounded w-1/2" />
          </div>
        </main>
      </div>
    )
  }
  if (!company) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0">
          <p className="text-slate-500">Company not found.</p>
          <Link href="/companies" className="text-blue-600 hover:underline text-sm mt-2 inline-block">Back to companies</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0 animate-fade-in">
        <Link href="/companies" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 lg:mb-4 transition-colors">
          <FiArrowLeft size={14} />
          Back
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between mb-6 gap-3">
          <div className="min-w-0">
            <h1 className="text-xl lg:text-2xl font-bold text-slate-900">{company.name}</h1>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs lg:text-sm text-slate-500">
              {company.gst && <span>GST: {company.gst}</span>}
              {company.contact && <span>{company.contact}</span>}
              {company.email && <span>{company.email}</span>}
              {company.number && <span>{company.number}</span>}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 lg:px-5 lg:py-3 shrink-0">
            <p className="text-xs text-red-600 font-medium">Overall Pending</p>
            <p className="text-xl lg:text-2xl font-bold text-red-600">₹{totalPending.toLocaleString()}</p>
          </div>
        </div>

        <button
          onClick={() => { resetBillForm(); setShowBillForm(true) }}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 lg:py-2.5 px-4 lg:px-4 rounded-xl transition-colors active:scale-95 mb-6"
        >
          <FiPlus size={18} className="lg:hidden" />
          <FiPlus size={16} className="hidden lg:block" />
          <span>Add Bill</span>
        </button>

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
                  <input value={billForm.billNumber} onChange={(e) => setBillForm({ ...billForm, billNumber: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Bill number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Invoice number</label>
                  <input value={billForm.invoiceNumber} onChange={(e) => setBillForm({ ...billForm, invoiceNumber: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Invoice number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Loading date</label>
                  <input type="date" value={billForm.loadingDate} onChange={(e) => setBillForm({ ...billForm, loadingDate: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">How many trucks</label>
                  <input value={billForm.trucks} onChange={(e) => setBillForm({ ...billForm, trucks: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Number of trucks" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Which goods</label>
                  <input value={billForm.goods} onChange={(e) => setBillForm({ ...billForm, goods: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Type of goods" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Bill amount (₹)</label>
                  <input value={billForm.amount} onChange={(e) => setBillForm({ ...billForm, amount: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Amount" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
                  <select value={billForm.status} onChange={(e) => setBillForm({ ...billForm, status: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent bg-white">
                    {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={resetBillForm} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors">Cancel</button>
                  <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95">
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bills.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">No bills yet. Add one to get started.</p>
            </div>
          ) : (
            bills.map((bill) => {
              const billPayments = payments[bill.id] || []
              const billAmt = Number(bill.amount) || 0
              const paidAmt = billPayments.reduce((s, p) => s + (Number(p.amount) || 0), 0)
              const isExpanded = expandedBills[bill.id]

              return (
                <div key={bill.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleBill(bill.id)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleBill(bill.id) }}
                    className="cursor-pointer"
                  >
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isExpanded ? <FiChevronDown className="text-slate-300 shrink-0 mt-0.5" size={16} /> : <FiChevronRight className="text-slate-300 shrink-0 mt-0.5" size={16} />}
                          <div className="min-w-0">
                            <span className="font-bold text-lg text-slate-900">{bill.billNumber || "Bill #" + bill.id.slice(0, 6)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-xl font-bold text-slate-800">₹{billAmt.toLocaleString()}</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEditBill(bill) }}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <FiEdit2 size={14} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                        {bill.invoiceNumber && (
                          <div className="bg-slate-50 rounded-xl p-3 col-span-1">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Invoice</span>
                            <span className="text-sm font-medium text-slate-900 break-all">{bill.invoiceNumber}</span>
                          </div>
                        )}
                        {bill.loadingDate && (
                          <div className="bg-slate-50 rounded-xl p-3 col-span-1">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Loading</span>
                            <span className="text-sm font-medium text-slate-900">{bill.loadingDate}</span>
                          </div>
                        )}
                        {bill.trucks && (
                          <div className="bg-slate-50 rounded-xl p-3 col-span-1">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Trucks</span>
                            <span className="text-sm font-medium text-slate-900">{bill.trucks}</span>
                          </div>
                        )}
                        {bill.goods && (
                          <div className="bg-slate-50 rounded-xl p-3 col-span-1">
                            <span className="text-[10px] text-slate-400 block uppercase tracking-wide mb-0.5">Goods</span>
                            <span className="text-sm font-medium text-slate-900">{bill.goods}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          bill.status === "Paid" ? "bg-green-100 text-green-700" :
                          bill.status === "Partial Paid" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>{bill.status}</span>
                        <span className="text-xs text-slate-400">
                          Paid: <span className="font-medium text-slate-600">₹{paidAmt.toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-100 animate-fade-in">
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-slate-700">Payments</h4>
                          <button
                            onClick={() => { resetPaymentForm(); setShowPaymentForm(bill.id) }}
                            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium active:scale-95"
                          >
                            <FiPlus size={14} />
                            <span className="hidden lg:inline">Add Payment</span>
                          </button>
                        </div>

                        {showPaymentForm === bill.id && (
                          <div className="fixed inset-0 bg-black/40 z-50 flex items-end lg:items-center justify-center">
                            <div className="bg-white rounded-t-2xl lg:rounded-2xl shadow-xl w-full lg:max-w-md lg:m-4 max-h-[90vh] overflow-y-auto animate-slide-up lg:animate-none">
                              <div className="sticky top-0 bg-white border-b border-slate-100 flex items-center justify-between p-4 lg:p-6 lg:border-b-0 z-10">
                                <h2 className="text-lg font-semibold text-slate-900">{editingPayment ? "Edit Payment" : "Add Payment"}</h2>
                                <button onClick={resetPaymentForm} className="p-2 hover:bg-slate-100 rounded-lg transition-colors lg:hidden"><FiX size={20} /></button>
                              </div>
                              <form onSubmit={handlePaymentSubmit} className="p-4 lg:p-6 pt-0 lg:pt-0 space-y-4">
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Mode of payment</label>
                                  <input value={paymentForm.mode} onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Cash, Bank Transfer, etc." />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Date of payment</label>
                                  <input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1.5">In which account payment received</label>
                                  <input value={paymentForm.account} onChange={(e) => setPaymentForm({ ...paymentForm, account: e.target.value })} className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Bank account name" />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-slate-700 mb-1.5">How much amount (₹)</label>
                                  <input value={paymentForm.amount} onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} type="number" className="w-full border border-slate-200 rounded-xl px-4 py-3 lg:py-2.5 text-base lg:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Amount" />
                                </div>
                                <div className="flex gap-3 pt-2">
                                  <button type="button" onClick={resetPaymentForm} className="flex-1 lg:flex-none px-4 py-3 lg:py-2 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl lg:rounded-lg transition-colors">Cancel</button>
                                  <button type="submit" disabled={saving} className="flex-1 lg:flex-none bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-3 lg:py-2 px-6 rounded-xl lg:rounded-lg transition-colors disabled:opacity-50 active:scale-95">
                                    {saving ? "Saving..." : "Save"}
                                  </button>
                                </div>
                              </form>
                            </div>
                          </div>
                        )}

                        {billPayments.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2 text-center">No payments yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {billPayments.map((payment) => (
                              <div key={payment.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl text-sm">
                                <div className="flex-1 min-w-0 grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs lg:text-sm">
                                  <div>
                                    <span className="text-slate-400 block lg:inline">Mode: </span>
                                    <span className="text-slate-900 font-medium">{payment.mode || "—"}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block lg:inline">Date: </span>
                                    <span className="text-slate-900">{payment.date || "—"}</span>
                                  </div>
                                  <div className="col-span-2 lg:col-span-1">
                                    <span className="text-slate-400 block lg:inline">Account: </span>
                                    <span className="text-slate-900 truncate block">{payment.account || "—"}</span>
                                  </div>
                                  <div className="col-span-2 lg:col-span-1 flex items-center justify-between lg:justify-start lg:gap-3">
                                    <div>
                                      <span className="text-slate-400 lg:hidden">Amount: </span>
                                      <span className="font-semibold text-slate-900">₹{(Number(payment.amount) || 0).toLocaleString()}</span>
                                    </div>
                                    <button
                                      onClick={() => openEditPayment(bill.id, payment)}
                                      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors active:scale-90"
                                    >
                                      <FiEdit2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
