interface PaginationProps {
  page: number
  hasMore: boolean
  onPrev: () => void
  onNext: () => void
}

export default function Pagination({ page, hasMore, onPrev, onNext }: PaginationProps) {
  if (page === 0 && !hasMore) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <span className="text-xs text-slate-400">Page {page + 1}</span>
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={!hasMore}
          className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors disabled:opacity-30 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  )
}
