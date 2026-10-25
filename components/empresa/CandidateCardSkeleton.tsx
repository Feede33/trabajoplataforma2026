import React from 'react'

export function CandidateCardSkeleton() {
  return (
    <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 sm:p-5 flex flex-col justify-between space-y-4">
      <div className="space-y-3">
        {/* Top Header: Avatar, Name & Status Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar skeleton */}
            <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />

            <div className="min-w-0 space-y-1.5">
              <div className="h-4 w-28 sm:w-32 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
              <div className="h-3 w-24 sm:w-28 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
            </div>
          </div>

          {/* Status Badge */}
          <div className="h-6 w-20 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0" />
        </div>

        {/* Job Applied Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1.5">
          <div className="h-2.5 w-16 bg-slate-200 dark:bg-slate-700/60 rounded animate-pulse" />
          <div className="h-3.5 w-44 max-w-full bg-slate-200 dark:bg-slate-700/60 rounded animate-pulse" />
        </div>

        {/* Cover letter presentation snippet */}
        <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
          <div className="h-2.5 w-28 bg-slate-200 dark:bg-slate-700/60 rounded animate-pulse" />
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-700/40 rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-700/40 rounded animate-pulse" />
        </div>

        {/* CV Button skeleton */}
        <div className="h-9 w-full rounded-xl bg-slate-100 dark:bg-slate-800/70 animate-pulse" />
      </div>

      {/* Footer: Date, Modal trigger & Status selector */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-8.5 w-full rounded-xl bg-slate-100 dark:bg-slate-800/80 animate-pulse mt-0.5" />
      </div>
    </div>
  )
}
