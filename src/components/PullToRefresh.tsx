"use client"

import { useState, useRef, type TouchEvent, type ReactNode } from "react"

interface Props {
  onRefresh: () => void
  children: ReactNode
}

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pulling, setPulling] = useState(false)
  const [pullDist, setPullDist] = useState(0)
  const startY = useRef(0)
  const pullingRef = useRef(false)
  const threshold = 80

  function onTouchStart(e: TouchEvent) {
    if (window.scrollY === 0) {
      startY.current = e.touches[0].clientY
      pullingRef.current = true
    }
  }

  function onTouchMove(e: TouchEvent) {
    if (!pullingRef.current) return
    const dist = Math.max(0, e.touches[0].clientY - startY.current)
    if (dist > 10) setPulling(true)
    setPullDist(Math.min(dist * 0.5, threshold * 1.2))
  }

  function onTouchEnd() {
    if (pullDist >= threshold) {
      onRefresh()
    }
    pullingRef.current = false
    setPulling(false)
    setPullDist(0)
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="relative"
    >
      {pulling && (
        <div
          className="flex items-center justify-center transition-all"
          style={{ height: pullDist }}
        >
          <div
            className={`w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full ${pullDist >= threshold ? "" : "animate-spin"}`}
            style={{ transform: `rotate(${pullDist * 3}deg)` }}
          />
        </div>
      )}
      {children}
    </div>
  )
}
