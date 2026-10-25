'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  Users,
  FileText,
  Mail,
  ExternalLink,
  Download,
  Building2,
  ArrowRight,
  Search,
  Filter,
  Eye,
  Briefcase
} from 'lucide-react'
import {
  fetchApplicationsForEmpresa,
  fetchJobsByEmpresa,
  updateApplicationStatus
} from '@/lib/data'
import {
  ApplicationWithDetails,
  ApplicationEstado,
  JobWithEmpresa
} from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { useAuth } from '@/lib/context/AuthContext'
import { CandidateDetailsModal } from '@/components/empresa/CandidateDetailsModal'

function EmpresaPostulacionesContent() {
  const { profile, isLoading } = useAuth()
  const searchParams = useSearchParams()
  const initialJobId = searchParams.get('jobId') || 'todos'

  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [filterStatus, setFilterStatus] = useState<string>('todos')
  const [selectedJob, setSelectedJob] = useState<string>(initialJobId)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [modalApp, setModalApp] = useState<ApplicationWithDetails | null>(null)

  useEffect(() => {
    async function load() {
      if (!profile) {
        setLoadingData(false)
        return
      }
      setLoadingData(true)
      const [appsData, jobsData] = await Promise.all([
        fetchApplicationsForEmpresa(profile.id),
        fetchJobsByEmpresa(profile.id)
      ])
      setApplications(appsData)
      setJobs(jobsData)
      setLoadingData(false)
    }

    if (!isLoading) {
      load()
    }
  }, [profile?.id, isLoading])

  const handleStatusChange = async (appId: string, newStatus: ApplicationEstado) => {
    await updateApplicationStatus(appId, newStatus)
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, estado: newStatus } : a))
    )
    if (modalApp?.id === appId) {
      setModalApp((prev) => (prev ? { ...prev, estado: newStatus } : null))
    }
  }

  const filtered = applications.filter((app) => {
    if (selectedJob !== 'todos') {
      const matchJob = app.job_id === selectedJob || app.job?.slug === selectedJob
      if (!matchJob) return false
    }
    if (filterStatus !== 'todos' && app.estado !== filterStatus) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchName = app.candidato?.nombre?.toLowerCase().includes(q)
      const matchEmail = app.candidato?.email?.toLowerCase().includes(q)
      const matchJob = app.job?.titulo?.toLowerCase().includes(q)
      if (!matchName && !matchEmail && !matchJob) return false
    }
    return true
  })

  const getStatusBadge = (estado: ApplicationEstado) => {
    const map: Record<ApplicationEstado, { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }> = {
      pendiente: { variant: 'warning', label: 'Pendiente' },
      visto: { variant: 'primary', label: 'CV Visto' },
      entrevista: { variant: 'success', label: 'En Proceso' },
      rechazado: { variant: 'danger', label: 'Descartado' },
    }
    const cur = map[estado] || { variant: 'warning', label: estado }
    return <Badge variant={cur.variant} size="sm">{cur.label}</Badge>
  }

  if (isLoading || loadingData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Iniciá sesión como Empresa</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Identificate con tu cuenta de empresa para revisar los candidatos que se postularon a tus ofertas.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>Iniciar Sesión</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/registro?tipo=empresa"
            className="w-full py-3 px-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-sm transition-colors"
          >
            Crear Cuenta de Empresa
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Panel Empresa
            </span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
              {applications.length} {applications.length === 1 ? 'postulación' : 'postulaciones'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Postulaciones Recibidas
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Candidatos que aplicaron a las búsquedas de <span className="font-semibold text-slate-700 dark:text-slate-300">{profile.nombre || profile.email}</span>
          </p>
        </div>

        <Link
          href="/empresa/dashboard"
          className="text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors self-start sm:self-auto flex items-center gap-1.5"
        >
          <Briefcase className="w-4 h-4 text-indigo-600" />
          <span>Volver al Dashboard</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Job Filter Dropdown */}
          {jobs.length > 0 && (
            <div className="flex items-center gap-2 min-w-[220px]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                Aviso:
              </span>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="todos">Todos los empleos ({applications.length})</option>
                {jobs.map((j) => {
                  const count = applications.filter((a) => a.job_id === j.id || a.job?.slug === j.slug).length
                  return (
                    <option key={j.id} value={j.id}>
                      {j.titulo} ({count})
                    </option>
                  )
                })}
              </select>
            </div>
          )}

          {/* Status Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'pendiente', label: 'Pendientes' },
              { id: 'visto', label: 'Vistos' },
              { id: 'entrevista', label: 'En Proceso' },
              { id: 'rechazado', label: 'Descartados' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  filterStatus === st.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar candidato o puesto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {/* Content Grid */}
      {applications.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
            Aún no has recibido postulaciones
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Cuando los candidatos apliquen a tus avisos de empleo activos, vas a poder gestionar su proceso y ver sus CVs desde acá.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3">
          <Filter className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No hay postulaciones para mostrar
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            No se encontraron resultados con los filtros actuales.
          </p>
          <button
            onClick={() => {
              setSelectedJob('todos')
              setFilterStatus('todos')
              setSearchQuery('')
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                      {app.candidato?.nombre ? app.candidato.nombre[0].toUpperCase() : 'C'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                        {app.candidato?.nombre || 'Candidato'}
                      </h3>
                      <a
                        href={`mailto:${app.candidato?.email}`}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5 truncate"
                      >
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{app.candidato?.email || 'Sin correo'}</span>
                      </a>
                    </div>
                  </div>
                  {getStatusBadge(app.estado)}
                </div>

                {/* Job Applied For */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 dark:text-slate-500 block text-[10px] uppercase font-semibold">
                    Postulado a:
                  </span>
                  <Link
                    href={`/empleos/${app.job?.slug}`}
                    className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 flex items-center gap-1 mt-0.5"
                  >
                    <span className="truncate">{app.job?.titulo}</span>
                    <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                  </Link>
                </div>

                {/* Cover letter message */}
                {app.mensaje ? (
                  <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
                    <p className="font-semibold text-slate-700 dark:text-slate-300 text-[11px] mb-1">
                      Mensaje del candidato:
                    </p>
                    <p className="italic line-clamp-3">"{app.mensaje}"</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic px-1">Sin carta de presentación escrita.</p>
                )}

                {/* CV Attachment button */}
                <div>
                  {app.candidato?.cv_url ? (
                    <a
                      href={app.candidato.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Ver Currículum (PDF)</span>
                      <Download className="w-3 h-3 text-indigo-500 ml-auto" />
                    </a>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Sin CV adjunto</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Update & Full Profile Modal */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{formatRelativeTime(app.created_at)}</span>
                  <button
                    onClick={() => setModalApp(app)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Ficha Completa</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Cambiar estado:</span>
                  <select
                    value={app.estado}
                    onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationEstado)}
                    className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="visto">CV Visto</option>
                    <option value="entrevista">En Proceso</option>
                    <option value="rechazado">Descartado</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Candidate Modal */}
      <CandidateDetailsModal
        application={modalApp}
        isOpen={!!modalApp}
        onClose={() => setModalApp(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}

export default function EmpresaPostulacionesPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    }>
      <EmpresaPostulacionesContent />
    </Suspense>
  )
}
