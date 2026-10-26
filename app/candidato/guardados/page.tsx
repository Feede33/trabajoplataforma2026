'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Bookmark,
  ArrowLeft,
  Search,
  Briefcase,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import { useSavedJobs } from '@/lib/context/SavedJobsContext'
import { JobCard } from '@/components/jobs/JobCard'
import { JobCardSkeleton } from '@/components/jobs/JobCardSkeleton'
import { fetchApplicationsForCandidate } from '@/lib/data'
import { ApplicationWithDetails } from '@/lib/supabase/database.types'

export default function CandidatoGuardadosPage() {
  const { profile, isLoading } = useAuth()
  const { savedJobs, loading: loadingSaved } = useSavedJobs()
  const [searchTerm, setSearchTerm] = useState('')
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])

  useEffect(() => {
    let active = true
    async function loadApps() {
      if (!profile || profile.role !== 'candidato') return
      try {
        const apps = await fetchApplicationsForCandidate(profile.id)
        if (active) setApplications(apps)
      } catch (err) {
        console.warn('Error fetching candidate applications:', err)
      }
    }
    loadApps()
    return () => {
      active = false
    }
  }, [profile?.id, profile?.role])

  const filteredJobs = savedJobs.filter((job) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const matchTitle = job.titulo?.toLowerCase().includes(term)
    const matchEmpresa = job.empresa?.nombre?.toLowerCase().includes(term)
    const matchZona = job.zona?.toLowerCase().includes(term)
    const matchRubro = job.rubro?.toLowerCase().includes(term)
    return matchTitle || matchEmpresa || matchZona || matchRubro
  })

  if (isLoading || loadingSaved) {
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

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Iniciá sesión para ver tus guardados</h2>
          <p className="text-sm text-slate-500 mt-2">
            Necesitás identificarte con tu cuenta de candidato para ver los empleos guardados y gestionarlos.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login?redirect=/candidato/guardados"
            className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>Iniciar Sesión</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/registro?tipo=candidato"
            className="w-full py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Crear Cuenta de Candidato
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/candidato/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a mi panel</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Bookmark className="w-5 h-5 fill-blue-500 text-blue-500" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Empleos Guardados
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Tus vacantes marcadas para revisar con calma o postularte cuando quieras
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/empleos"
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5"
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Explorar más vacantes</span>
          </Link>
        </div>
      </div>

      {/* Search & Filter Bar */}
      {savedJobs.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar entre tus guardados por título, empresa o rubro..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>

          <div className="text-xs font-semibold text-slate-500 px-2 shrink-0 text-center sm:text-right">
            Mostrando {filteredJobs.length} de {savedJobs.length} {savedJobs.length === 1 ? 'guardado' : 'guardados'}
          </div>
        </div>
      )}

      {/* Content */}
      {savedJobs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto shadow-sm">
            <Bookmark className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Aún no tenés ningún empleo guardado
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Cuando estés explorando empleos y veas una oportunidad que te guste, hacé clic en el botón de guardar (marcador) para tenerla lista en este apartado.
          </p>
          <div className="pt-2">
            <Link
              href="/empleos"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-100"
            >
              <span>Ir a Explorar Empleos</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
          <Search className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No se encontraron coincidencias para &quot;{searchTerm}&quot;
          </h3>
          <p className="text-xs text-slate-500">
            Probá con otro término o limpiá la búsqueda para ver todos tus empleos guardados.
          </p>
          <button
            onClick={() => setSearchTerm('')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 underline"
          >
            Limpiar búsqueda
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isApplied={applications.some((a) => a.job_id === job.id || a.job?.slug === job.slug)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
