import React from 'react'
import { CandidateCardSkeleton } from './CandidateCardSkeleton'

export function PostulacionesPageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-3.5 w-24 bg-indigo-100 dark:bg-indigo-950/60 rounded animate-pulse" />
            <div className="h-5 w-24 bg-indigo-50 dark:bg-indigo-950/40 rounded-full animate-pulse" />
          </div>
          <div className="h-8 w-64 sm:w-80 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse mt-1" />
          <div className="h-4 w-72 sm:w-96 max-w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="h-9 w-44 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl animate-pulse" />
          <div className="h-9 w-36 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Filter and Search Bar Skeleton */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 w-full sm:w-56 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />

          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
            {['w-16', 'w-20', 'w-24', 'w-24', 'w-24'].map((width, idx) => (
              <div
                key={idx}
                className={`h-8 ${width} bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse shrink-0`}
              />
            ))}
          </div>
        </div>

        <div className="h-9 w-full lg:w-64 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>

      {/* Candidates Cards Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <CandidateCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
