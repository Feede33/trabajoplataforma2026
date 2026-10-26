import React from 'react'
import { JobCardSkeleton } from '@/components/jobs/JobCardSkeleton'

export function CandidatoDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-3.5 w-32 bg-indigo-100 dark:bg-indigo-950/60 rounded animate-pulse" />
          <div className="h-8 sm:h-9 w-60 sm:w-72 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse mt-1" />
          <div className="h-4 w-72 sm:w-96 max-w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse mt-1" />
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          {/* Editar mi Perfil button skeleton */}
          <div className="h-10 flex-1 sm:flex-initial sm:w-36 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse" />
          {/* Buscar Empleos button skeleton */}
          <div className="h-10 flex-1 sm:flex-initial sm:w-36 rounded-xl bg-indigo-600/30 dark:bg-indigo-600/20 animate-pulse" />
        </div>
      </div>

      {/* Stats Cards (4 cards) Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        {/* Postulaciones Realizadas */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Entrevistas Conseguidas */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-7 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* Empleos Guardados */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-7 w-10 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
          </div>
        </div>

        {/* CV Adjunto */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 dark:bg-violet-950/40 animate-pulse shrink-0" />
          <div className="space-y-2">
            <div className="h-3.5 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Recent Applications Section Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1.5">
            <div className="h-5 w-52 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-3.5 w-72 max-w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
          <div className="h-4 w-16 bg-indigo-100 dark:bg-indigo-950/60 rounded animate-pulse shrink-0" />
        </div>

        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 gap-3"
            >
              <div className="space-y-1.5">
                <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
              </div>
              <div className="h-6 w-24 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Saved Jobs Section Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-blue-100 dark:bg-blue-950/60 animate-pulse" />
              <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-5 w-8 bg-blue-100 dark:bg-blue-950/60 rounded-full animate-pulse" />
            </div>
            <div className="h-3 w-80 max-w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
          <div className="h-4 w-20 bg-blue-100 dark:bg-blue-950/60 rounded animate-pulse shrink-0 hidden sm:block" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>

      {/* Recommended Jobs Skeleton */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1.5">
            <div className="h-6 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-3.5 w-56 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
          <div className="h-4 w-28 bg-indigo-100 dark:bg-indigo-950/60 rounded animate-pulse shrink-0" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
