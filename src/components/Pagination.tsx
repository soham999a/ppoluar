"use client"

import { FiChevronLeft, FiChevronRight } from "react-icons/fi"

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
      >
        <FiChevronLeft size={14} />
        <span className="hidden lg:inline">Previous</span>
      </button>
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          let pageNum: number
          if (totalPages <= 7) {
            pageNum = i + 1
          } else if (currentPage <= 4) {
            pageNum = i + 1
          } else if (currentPage >= totalPages - 3) {
            pageNum = totalPages - 6 + i
          } else {
            pageNum = currentPage - 3 + i
          }
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[36px] px-3 py-2 text-sm font-medium rounded-xl transition-colors active:scale-95 ${
                pageNum === currentPage
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {pageNum}
            </button>
          )
        })}
      </div>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-95"
      >
        <span className="hidden lg:inline">Next</span>
        <FiChevronRight size={14} />
      </button>
    </div>
  )
}
