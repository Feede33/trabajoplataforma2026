'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  Users,
  PlusCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  Lock,
  Building2,
  Trash2,
  Pencil,
  FileText,
  Mail,
  Download,
  Search,
  Filter,
  CheckCircle2,
  ChevronDown,
  Eye,
  AlertCircle
} from 'lucide-react'
import {
  fetchJobsByEmpresa,
  fetchApplicationsForEmpresa,
  toggleJobState,
  deleteJob,
  updateApplicationStatus
} from '@/lib/data'
import { JobWithEmpresa, ApplicationWithDetails, JobEstado, ApplicationEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { CandidateDetailsModal } from '@/components/empresa/CandidateDetailsModal'

export default function EmpresaDashboard() {
  const { profile, isLoading } = useAuth()
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Filters for candidates section
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedModalApp, setSelectedModalApp] = useState<ApplicationWithDetails | null>(null)

  const postulacionesSectionRef = useRef<HTMLDivElement>(null)
  const publicacionesSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadData() {
      if (!profile) {
        setLoadingData(false)
        return
      }
      setLoadingData(true)
      const [jobsData, appsData] = await Promise.all([
        fetchJobsByEmpresa(profile.id),
        fetchApplicationsForEmpresa(profile.id)
      ])
      setJobs(jobsData)
      setApplications(appsData)
      setLoadingData(false)
    }

    if (!isLoading) {
      loadData()
    }
  }, [profile?.id, isLoading])

  const handleToggleStatus = async (jobId: string, currentStatus: JobEstado) => {
    const nextStatus: JobEstado = currentStatus === 'activo' ? 'cerrado' : 'activo'
    await toggleJobState(jobId, nextStatus)
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, estado: nextStatus } : j))
    )
  }

  const handleDeleteJob = async (jobId: string, titulo: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la búsqueda "${titulo}"?`)) {
      return
    }
    await deleteJob(jobId)
    setJobs((prev) => prev.filter((j) => j.id !== jobId))
  }

  const handleStatusChange = async (appId: string, newStatus: ApplicationEstado) => {
    await updateApplicationStatus(appId, newStatus)
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, estado: newStatus } : a))
    )
    if (selectedModalApp?.id === appId) {
      setSelectedModalApp((prev) => (prev ? { ...prev, estado: newStatus } : null))
    }
  }

  const scrollToPostulaciones = (status?: string, jobId?: string) => {
    if (status) setStatusFilter(status)
    if (jobId) setSelectedJobFilter(jobId)
    postulacionesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToPublicaciones = () => {
    publicacionesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const activeJobs = jobs.filter((j) => j.estado === 'activo')
  const inReviewCount = applications.filter((a) => a.estado === 'entrevista' || a.estado === 'pendiente').length

  // Filtered applications list
  const filteredApplications = applications.filter((app) => {
    if (selectedJobFilter !== 'todos') {
      const matchJob = app.job_id === selectedJobFilter || app.job?.slug === selectedJobFilter
      if (!matchJob) return false
    }
    if (statusFilter !== 'todos' && app.estado !== statusFilter) {
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">Iniciá sesión como Empresa</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Accedé a tu panel para publicar nuevas vacantes, gestionar búsquedas y revisar currículums.
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Panel de Empresa
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-1">
            Gestión de Empleos y Candidatos
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Conectado como <span className="font-semibold text-slate-800 dark:text-slate-200">{profile.nombre || profile.email}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/empresa/publicar"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 dark:shadow-none hover:shadow-lg shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Publicar Nuevo Empleo</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row (Interactive) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <button
          type="button"
          onClick={scrollToPublicaciones}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tus Empleos Activos</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{activeJobs.length}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-600 transition-colors hidden sm:block">
            Ver empleos ↓
          </span>
        </button>

        <button
          type="button"
          onClick={() => scrollToPostulaciones('todos')}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Postulaciones Recibidas</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{applications.length}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
            Ver candidatos ↓
          </span>
        </button>

        <button
          type="button"
          onClick={() => scrollToPostulaciones('entrevista')}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-amber-300 dark:hover:border-amber-700 hover:shadow-md transition-all text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">En Entrevista / Revisión</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{inReviewCount}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-600 transition-colors hidden sm:block">
            Filtrar ↓
          </span>
        </button>
      </div>

      {/* SECTION: Postulaciones y Candidatos Recibidos (High Priority) */}
      <div
        ref={postulacionesSectionRef}
        id="candidatos-section"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden scroll-mt-24"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Candidatos y Postulaciones Recibidas
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs">
                {applications.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Revisá quiénes se postularon, sus datos de contacto, cartas de presentación y currículums vitae.
            </p>
          </div>

          <Link
            href="/empresa/postulaciones"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 shrink-0 self-start sm:self-auto"
          >
            <span>Ver pantalla completa</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Job */}
            {jobs.length > 0 && (
              <div className="flex items-center gap-2 min-w-[200px]">
                <label htmlFor="filter-job" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                  Empleo:
                </label>
                <select
                  id="filter-job"
                  value={selectedJobFilter}
                  onChange={(e) => setSelectedJobFilter(e.target.value)}
                  className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="todos">Todos tus empleos ({applications.length})</option>
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

            {/* Filter Status Pills */}
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
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    statusFilter === st.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por candidato o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Content: Candidates Cards Grid */}
        <div className="p-5 sm:p-6">
          {applications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Aún no has recibido postulaciones
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Cuando los postulantes envíen su currículum a tus avisos, aparecerán inmediatamente aquí para que puedas contactarlos.
              </p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <Filter className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                No se encontraron postulaciones con los filtros aplicados
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Probá cambiando los filtros de empleo o estado.
              </p>
              <button
                onClick={() => {
                  setSelectedJobFilter('todos')
                  setStatusFilter('todos')
                  setSearchQuery('')
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 transition-colors"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  className="bg-white dark:bg-slate-850 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Candidate header & status */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                          {app.candidato?.nombre ? app.candidato.nombre[0].toUpperCase() : 'C'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm truncate">
                            {app.candidato?.nombre || 'Candidato'}
                          </h3>
                          <a
                            href={`mailto:${app.candidato?.email}`}
                            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate mt-0.5"
                          >
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{app.candidato?.email || 'Sin correo'}</span>
                          </a>
                        </div>
                      </div>

                      {getStatusBadge(app.estado)}
                    </div>

                    {/* Job Applied Pill */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">
                        Postulado a:
                      </span>
                      <Link
                        href={`/empleos/${app.job?.slug}`}
                        className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 flex items-center gap-1.5 mt-0.5"
                      >
                        <span className="truncate">{app.job?.titulo}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                      </Link>
                    </div>

                    {/* Candidate Cover Letter Message */}
                    {app.mensaje ? (
                      <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                          Mensaje del candidato:
                        </p>
                        <p className="italic line-clamp-3">"{app.mensaje}"</p>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1">
                        Sin carta de presentación escrita.
                      </div>
                    )}

                    {/* CV Button */}
                    <div>
                      {app.candidato?.cv_url ? (
                        <a
                          href={app.candidato.cv_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors"
                        >
                          <FileText className="w-4 h-4" />
                          <span>Ver Currículum (PDF)</span>
                          <Download className="w-3.5 h-3.5 ml-auto text-indigo-500" />
                        </a>
                      ) : (
                        <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Sin CV adjunto</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Status Dropdown */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>{formatRelativeTime(app.created_at)}</span>
                      <button
                        onClick={() => setSelectedModalApp(app)}
                        className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver Ficha Completa</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Estado:</span>
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
        </div>
      </div>

      {/* SECTION: Jobs Table ("Tus Publicaciones") */}
      <div
        ref={publicacionesSectionRef}
        id="publicaciones-section"
        className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden scroll-mt-24"
      >
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tus Publicaciones</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Administrá el estado de tus búsquedas laborales</p>
          </div>
          <button
            onClick={() => scrollToPostulaciones('todos')}
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 shrink-0"
          >
            <span>Ver postulaciones recibidas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-slate-700 dark:text-slate-300 font-bold text-base">No tenés búsquedas publicadas todavía</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              Comenzá a recibir candidatos publicando tu primera oferta de empleo.
            </p>
            <Link
              href="/empresa/publicar"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs shadow-md shadow-indigo-200"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Publicar mi primer empleo</span>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Cards List */}
            <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {jobs.map((job) => {
                const jobApps = applications.filter((a) => a.job_id === job.id || a.job?.slug === job.slug)
                return (
                  <div key={job.id} className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/empleos/${job.slug}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 flex items-center gap-1.5 text-sm"
                        >
                          <span className="truncate">{job.titulo}</span>
                          <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{job.zona}</p>
                      </div>
                      <Badge
                        variant={job.estado === 'activo' ? 'success' : 'default'}
                        size="sm"
                        className="capitalize shrink-0"
                      >
                        {job.estado}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="primary" size="sm">{job.rubro}</Badge>
                        <Badge variant="outline" size="sm" className="capitalize">{job.modalidad}</Badge>
                      </div>
                      <span className="text-slate-400 text-[11px]">{formatRelativeTime(job.created_at)}</span>
                    </div>

                    {/* Candidatos badge button */}
                    <div className="pt-1">
                      <button
                        onClick={() => scrollToPostulaciones('todos', job.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                          jobApps.length > 0
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>Postulaciones recibidas:</span>
                        </span>
                        <span className="font-bold">{jobApps.length}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/empleos/${job.slug}`}
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                        title="Ver y editar oferta"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-500" />
                        <span>Editar</span>
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(job.id, job.estado)}
                        className={`flex-1 text-xs font-semibold py-2 px-3 rounded-xl border transition-colors ${
                          job.estado === 'activo'
                            ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {job.estado === 'activo' ? 'Pausar aviso' : 'Reactivar aviso'}
                      </button>
                      <button
                        onClick={() => handleDeleteJob(job.id, job.titulo)}
                        title="Eliminar oferta permanentemente"
                        className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop Table */}
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
                  {jobs.map((job) => {
                    const jobApps = applications.filter((a) => a.job_id === job.id || a.job?.slug === job.slug)
                    return (
                      <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/empleos/${job.slug}`}
                            className="font-bold text-slate-900 dark:text-white hover:text-indigo-600 flex items-center gap-1.5"
                          >
                            {job.titulo}
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                          </Link>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{job.zona}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="primary" size="sm">{job.rubro}</Badge>
                            <Badge variant="outline" size="sm" className="capitalize">{job.modalidad}</Badge>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {jobApps.length > 0 ? (
                            <button
                              onClick={() => scrollToPostulaciones('todos', job.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs transition-colors"
                              title="Hacer clic para ver los candidatos de este empleo"
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>{jobApps.length} {jobApps.length === 1 ? 'postulación' : 'postulaciones'}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">0 postulaciones</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                          {formatRelativeTime(job.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={job.estado === 'activo' ? 'success' : 'default'}
                            size="sm"
                            className="capitalize"
                          >
                            {job.estado}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {jobApps.length > 0 && (
                              <button
                                onClick={() => scrollToPostulaciones('todos', job.id)}
                                title="Ver candidatos postulados a este empleo"
                                className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 hover:bg-indigo-100 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Candidatos ({jobApps.length})</span>
                              </button>
                            )}
                            <Link
                              href={`/empleos/${job.slug}`}
                              title="Ver y editar oferta"
                              className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5 text-amber-500" />
                              <span>Editar</span>
                            </Link>
                            <button
                              onClick={() => handleToggleStatus(job.id, job.estado)}
                              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                                job.estado === 'activo'
                                  ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                                  : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              }`}
                            >
                              {job.estado === 'activo' ? 'Pausar' : 'Reactivar'}
                            </button>
                            <button
                              onClick={() => handleDeleteJob(job.id, job.titulo)}
                              title="Eliminar oferta permanentemente"
                              className="p-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Candidate Details Modal */}
      <CandidateDetailsModal
        application={selectedModalApp}
        isOpen={!!selectedModalApp}
        onClose={() => setSelectedModalApp(null)}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
