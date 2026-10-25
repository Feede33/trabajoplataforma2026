import React from 'react'
import { CandidateCardSkeleton } from './CandidateCardSkeleton'

export function EmpresaDashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 bg-indigo-100 dark:bg-indigo-950/60 rounded animate-pulse" />
          <div className="h-8 w-72 sm:w-80 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse mt-1" />
          <div className="h-4 w-52 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse mt-1" />
        </div>

        <div className="h-11 w-48 bg-indigo-100 dark:bg-indigo-950/40 rounded-2xl animate-pulse shrink-0" />
      </div>

      {/* Metrics Row (3 cards) Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-16 bg-slate-100 dark:bg-slate-800 rounded animate-pulse hidden sm:block" />
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-3.5 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-7 w-14 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="h-6 w-24 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl animate-pulse" />
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 animate-pulse shrink-0" />
            <div className="space-y-2">
              <div className="h-3.5 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-7 w-12 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          </div>
          <div className="h-4 w-14 bg-slate-100 dark:bg-slate-800 rounded animate-pulse hidden sm:block" />
        </div>
      </div>

      {/* Candidatos y Postulaciones Recibidas Section Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-5.5 w-64 sm:w-72 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
              <div className="h-5 w-8 bg-indigo-100 dark:bg-indigo-950/60 rounded-full animate-pulse" />
            </div>
            <div className="h-3 w-72 sm:w-[420px] max-w-full bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>

          <div className="flex items-center gap-3">
            <div className="h-8.5 w-36 bg-purple-100 dark:bg-purple-950/40 rounded-xl animate-pulse shrink-0" />
            <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse shrink-0 hidden sm:block" />
          </div>
        </div>

        {/* Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Empleo selector */}
            <div className="h-9 w-48 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />

            {/* Status pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
              {['w-16', 'w-20', 'w-24', 'w-24', 'w-24'].map((width, idx) => (
                <div
                  key={idx}
                  className={`h-8 ${width} bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse shrink-0`}
                />
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="h-9 w-full lg:w-64 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        </div>

        {/* Candidate Cards Grid */}
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <CandidateCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>

      {/* Tus Publicaciones (Jobs table) Section Skeleton */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Section Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-1.5">
            <div className="h-5.5 w-40 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
          <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse shrink-0" />
        </div>

        {/* Mobile cards view skeleton */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2].map((i) => (
            <div key={i} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-16 bg-indigo-50 dark:bg-indigo-950/40 rounded-md animate-pulse" />
                <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse" />
              </div>
              <div className="h-8.5 w-full bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-8 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-8 flex-[2] bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                <div className="h-8 flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table skeleton */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Puesto</th>
                <th className="px-6 py-4 font-semibold">Rubro / Modalidad</th>
                <th className="px-6 py-4 font-semibold">Candidatos</th>
                <th className="px-6 py-4 font-semibold">Publicado</th>
                <th className="px-6 py-4 font-semibold">Estado</th>
                <th className="px-6 py-4 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[1, 2, 3].map((i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <div className="space-y-1.5">
                      <div className="h-4 w-44 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      <div className="h-3 w-28 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="h-5 w-20 bg-indigo-50 dark:bg-indigo-950/40 rounded-md animate-pulse" />
                      <div className="h-5 w-16 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-7 w-28 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3.5 w-20 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-5.5 w-16 bg-emerald-50 dark:bg-emerald-950/40 rounded-full animate-pulse" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-7.5 w-24 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl animate-pulse" />
                      <div className="h-7.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                      <div className="h-7.5 w-16 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                      <div className="h-7.5 w-8 bg-slate-100 dark:bg-slate-800 rounded-xl animate-pulse" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
