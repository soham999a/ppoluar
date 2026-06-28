"use client"

import { useAuth } from "@/context/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"
import Sidebar from "@/components/Sidebar"
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

  useEffect(() => {
    if (!loading && !user) router.replace("/")
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    async function fetchData() {
      try {
        const companiesSnap = await getDocs(collection(db, "companies"))
        const comps = companiesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Company))
        setCompanies(comps)

        const billResults = await Promise.all(
          comps.map(async (comp) => {
            const billsSnap = await getDocs(collection(db, "companies", comp.id, "bills"))
            const payResults = await Promise.all(
              billsSnap.docs.map(async (billDoc) => {
                const amount = Number(billDoc.data().amount) || 0
                const paymentsSnap = await getDocs(collection(db, "companies", comp.id, "bills", billDoc.id, "payments"))
                let paid = 0
                paymentsSnap.forEach((p) => { paid += Number(p.data().amount) || 0 })
                return { amount, paid }
              }),
            )
            return {
              billCount: billsSnap.size,
              received: payResults.reduce((s, r) => s + r.paid, 0),
              outstanding: payResults.reduce((s, r) => s + r.amount - r.paid, 0),
            }
          }),
        )
        setStats({
          companies: comps.length,
          bills: billResults.reduce((s, r) => s + r.billCount, 0),
          received: billResults.reduce((s, r) => s + r.received, 0),
          outstanding: billResults.reduce((s, r) => s + r.outstanding, 0),
        })
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
      } finally {
        setDataLoading(false)
      }
    }
    fetchData()
  }, [user])

  if (loading || !user) return null
  if (dataLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center ml-64 max-lg:ml-0 p-4 pb-24 lg:pb-0">
          <div className="animate-spin w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 ml-64 max-lg:ml-0 p-4 lg:p-8 pt-4 lg:pt-8 pb-24 lg:pb-0">
        <h1 className="text-xl lg:text-2xl font-bold text-slate-900 mb-1">Dashboard</h1>
        <p className="text-slate-500 text-sm mb-5 lg:mb-6">A quick look at your business today.</p>

        <div className="grid grid-cols-2 gap-3 lg:gap-4 mb-6 lg:mb-8">
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
      </main>
    </div>
  )
}
