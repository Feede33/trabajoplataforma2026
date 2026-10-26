import { JobCardSkeleton } from '@/components/jobs/JobCardSkeleton'

export default function CandidatoGuardadosLoading() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
      <div className="h-6 w-36 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      <div className="h-10 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <JobCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
