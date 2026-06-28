"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, collectionGroup, onSnapshot } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "@/components/Sidebar"
import PullToRefresh from "@/components/PullToRefresh"
import Link from "next/link"
import { FiTruck, FiFileText, FiDollarSign, FiAlertCircle } from "react-icons/fi"

interface Company {
  id: string
  name: string
  gst?: string
  contact?: string
  email?: string
  number?: string
  createdAt?: any
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [stats, setStats] = useState({ companies: 0, bills: 0, received: 0, outstanding: 0 })
  const [dataLoading, setDataLoading] = useState(true)
  const [listenerError, setListenerError] = useState("")

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    let destroyed = false
    const companiesData: Company[] = []
    let billAmountByPath: Record<string, number> = {}
    let paidByBillPath: Record<string, number> = {}

    function recompute() {
      let totalBills = 0, totalReceived = 0, totalOutstanding = 0
      for (const [billPath, amount] of Object.entries(billAmountByPath)) {
        totalBills++
        const paid = paidByBillPath[billPath] || 0
        totalReceived += paid
        totalOutstanding += amount - paid
      }
      if (!destroyed) {
        setCompanies([...companiesData])
        setStats({ companies: companiesData.length, bills: totalBills, received: totalReceived, outstanding: totalOutstanding })
        setDataLoading(false)
      }
    }

    const unsubCompanies = onSnapshot(collection(db, "companies"), (snap) => {
      companiesData.length = 0
      snap.forEach((d) => companiesData.push({ id: d.id, ...d.data() } as Company))
      recompute()
    }, (err) => { console.error(err); setDataLoading(false) })

    const unsubBills = onSnapshot(collectionGroup(db, "bills"), (snap) => {
      billAmountByPath = {}
      snap.forEach((d) => { billAmountByPath[d.ref.path] = Number(d.data().amount) || 0 })
      recompute()
    }, (err) => {
      console.error("Bills listener error:", err)
      setListenerError("Failed to load bills. Check Firestore indexes and rules.")
    })

    const unsubPayments = onSnapshot(collectionGroup(db, "payments"), (snap) => {
      paidByBillPath = {}
      snap.forEach((d) => {
        const billPath = d.ref.parent.parent?.parent?.path || ""
        paidByBillPath[billPath] = (paidByBillPath[billPath] || 0) + (Number(d.data().amount) || 0)
      })
      recompute()
    }, (err) => {
      console.error("Payments listener error:", err)
      setListenerError("Failed to load payments. Check Firestore indexes and rules.")
    })

    return () => {
      destroyed = true
      unsubCompanies()
      unsubBills()
      unsubPayments()
    }
  }, [user])

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0 animate-fade-in">
        <PullToRefresh onRefresh={() => window.location.reload()}>
        {listenerError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">
            {listenerError}
          </div>
        )}
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">A quick look at your business today.</p>

        <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
          {dataLoading ? (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 animate-pulse">
                  <div className="h-3 bg-slate-100 rounded w-16 mb-3" />
                  <div className="h-7 bg-slate-100 rounded w-20" />
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs lg:text-sm font-medium text-slate-500">Companies</span>
                  <FiTruck className="text-slate-300" size={16} />
                </div>
                <p className="text-xl lg:text-3xl font-bold text-slate-900">{stats.companies}</p>
              </div>
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs lg:text-sm font-medium text-slate-500">Bills</span>
                  <FiFileText className="text-slate-300" size={16} />
                </div>
                <p className="text-xl lg:text-3xl font-bold text-slate-900">{stats.bills}</p>
              </div>
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs lg:text-sm font-medium text-slate-500">Received</span>
                  <FiDollarSign className="text-green-400" size={16} />
                </div>
                <p className="text-lg lg:text-3xl font-bold text-slate-900 truncate">₹{stats.received.toLocaleString()}</p>
              </div>
              <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs lg:text-sm font-medium text-slate-500">Outstanding</span>
                  <FiAlertCircle className="text-red-400" size={16} />
                </div>
                <p className="text-lg lg:text-3xl font-bold text-red-600 truncate">₹{stats.outstanding.toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base lg:text-lg font-semibold text-slate-900">Recent companies</h2>
            <Link href="/companies" className="text-sm text-blue-600 hover:text-blue-700 font-medium active:text-blue-800">View all</Link>
          </div>
          {companies.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No companies yet. Add one to get started.</p>
          ) : (
            <div className="divide-y divide-slate-100 -mx-4 lg:-mx-5">
              {companies.slice(0, 5).map((c) => (
                <Link key={c.id} href={`/companies/${c.id}`} className="flex items-center justify-between px-4 lg:px-5 py-3 active:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-900 text-sm">{c.name}</span>
                  <span className="text-xs text-slate-400">→</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 p-4 lg:p-5">
          <h2 className="text-base lg:text-lg font-semibold text-slate-900 mb-4">Recent activity</h2>
          <p className="text-sm text-slate-400 py-6 text-center">No activity yet.</p>
        </div>
        </PullToRefresh>
      </main>
    </div>
  )
}
