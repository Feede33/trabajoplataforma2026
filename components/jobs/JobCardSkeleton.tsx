import React from 'react'

export function JobCardSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex flex-col justify-between space-y-4 shadow-sm">
      <div className="space-y-4">
        {/* Top Header: Company Avatar + Name / Location + Time / Bookmark */}
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar skeleton */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
            <div className="min-w-0 space-y-1.5">
              <div className="h-4 w-28 sm:w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-20 sm:w-24 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse hidden sm:block" />
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
          </div>
        </div>

        {/* Job Title */}
        <div className="space-y-1.5 pt-1">
          <div className="h-5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
          <div className="h-5 w-24 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
        </div>

        {/* Description lines */}
        <div className="space-y-2 pt-1">
          <div className="h-3.5 w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          <div className="h-3.5 w-3/4 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
        </div>
      </div>

      {/* Footer: Salary / Action */}
      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between gap-3">
        <div className="h-5 w-28 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="h-4 w-20 bg-indigo-100 dark:bg-indigo-950/40 rounded animate-pulse" />
      </div>
    </div>
  )
}
