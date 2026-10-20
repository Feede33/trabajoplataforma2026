'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { fetchJobs } from '@/lib/data'
import { JobWithEmpresa } from '@/lib/supabase/database.types'
import { JobCard } from '@/components/jobs/JobCard'
import { JobFilters, FilterState } from '@/components/jobs/JobFilters'
import { Briefcase, SlidersHorizontal, ArrowUpDown } from 'lucide-react'

function EmpleosContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [allJobs, setAllJobs] = useState<JobWithEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [sortBy, setSortBy] = useState<'recientes' | 'antiguos'>('recientes')

  const [filters, setFilters] = useState<FilterState>({
    q: searchParams.get('q') || '',
    rubro: searchParams.get('rubro') || '',
    modalidad: searchParams.get('modalidad') || '',
    tipo_contrato: searchParams.get('tipo_contrato') || '',
    zona: searchParams.get('zona') || '',
  })

  useEffect(() => {
    async function load() {
      const data = await fetchJobs()
      setAllJobs(data)
      setLoading(false)
    }
    load()
  }, [])

  // Sync URL search params
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
    const params = new URLSearchParams()
    if (newFilters.q) params.set('q', newFilters.q)
    if (newFilters.rubro) params.set('rubro', newFilters.rubro)
    if (newFilters.modalidad) params.set('modalidad', newFilters.modalidad)
    if (newFilters.tipo_contrato) params.set('tipo_contrato', newFilters.tipo_contrato)
    if (newFilters.zona) params.set('zona', newFilters.zona)
    router.replace(`/empleos?${params.toString()}`)
  }

  const handleReset = () => {
    const emptyFilters: FilterState = {
      q: '',
      rubro: '',
      modalidad: '',
      tipo_contrato: '',
      zona: '',
    }
    setFilters(emptyFilters)
    router.replace('/empleos')
  }

  // Filter jobs
  const filteredJobs = allJobs.filter((job) => {
    if (filters.q) {
      const q = filters.q.toLowerCase()
      const matchTitle = job.titulo.toLowerCase().includes(q)
      const matchEmpresa = job.empresa?.nombre?.toLowerCase().includes(q)
      const matchTags = job.tags?.some((t) => t.toLowerCase().includes(q))
      if (!matchTitle && !matchEmpresa && !matchTags) return false
    }

    if (filters.rubro && job.rubro !== filters.rubro) {
      return false
    }

    if (filters.modalidad && job.modalidad !== filters.modalidad) {
      return false
    }

    if (filters.tipo_contrato && job.tipo_contrato !== filters.tipo_contrato) {
      return false
    }

    if (filters.zona) {
      const z = filters.zona.toLowerCase()
      if (!job.zona.toLowerCase().includes(z)) return false
    }

    return true
  })

  // Sort
  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortBy === 'recientes' ? dateB - dateA : dateA - dateB
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Title & Mobile Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Explorador de Empleos
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Encontrá las oportunidades laborales más relevantes para tu perfil
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-semibold shadow-sm"
          >
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span>Filtros ({filteredJobs.length})</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-sm">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-700 font-medium text-xs sm:text-sm focus:outline-none cursor-pointer"
            >
              <option value="recientes">Más recientes</option>
              <option value="antiguos">Más antiguos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters Desktop */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24">
            <JobFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
              totalCount={filteredJobs.length}
            />
          </div>
        </aside>

        {/* Mobile Filters Drawer */}
        {mobileFiltersOpen && (
          <div className="lg:hidden col-span-1">
            <JobFilters
              filters={filters}
              onChange={handleFilterChange}
              onReset={handleReset}
              totalCount={filteredJobs.length}
            />
          </div>
        )}

        {/* Jobs List */}
        <main className="lg:col-span-3 space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
              ))}
            </div>
          ) : sortedJobs.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Briefcase className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                No encontramos empleos con esos filtros
              </h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Probá buscando por otro término, cambiando la modalidad o limpiando los filtros para ver todas las vacantes disponibles.
              </p>
              <button
                onClick={handleReset}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Ver todos los empleos
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {sortedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default function EmpleosPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400">Cargando empleos...</div>}>
      <EmpleosContent />
    </Suspense>
  )
}
