export default function CandidatoPostulacionesLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="h-3 w-28 bg-indigo-100 dark:bg-indigo-950/60 rounded animate-pulse" />
          <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
          <div className="h-3.5 w-72 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
        </div>
        <div className="h-9 w-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
      </div>
      <div className="space-y-4 pt-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="h-5 w-52 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
              </div>
              <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
            </div>
            <div className="h-12 w-full bg-slate-50 dark:bg-slate-800/40 rounded-2xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}
