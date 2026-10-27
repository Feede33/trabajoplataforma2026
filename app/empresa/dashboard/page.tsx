'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Briefcase,
  Users,
  PlusCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  Building2,
  Trash2,
  Pencil,
  Search,
  Filter,
  Eye,
  Mail,
  CheckCheck,
  Sparkles,
  Wand2
} from 'lucide-react'
import {
  fetchJobsByEmpresa,
  fetchApplicationsForEmpresa,
  toggleJobState,
  deleteJob,
  updateApplicationStatus,
  selectCandidateAndRejectOthers,
  markApplicationsAsSeen
} from '@/lib/data'
import { JobWithEmpresa, ApplicationWithDetails, JobEstado, ApplicationEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { CandidateCard } from '@/components/empresa/CandidateCard'
import { CandidateDetailsModal } from '@/components/empresa/CandidateDetailsModal'
import { AiCandidateSelectorModal } from '@/components/empresa/AiCandidateSelectorModal'
import { EmpresaDashboardSkeleton } from '@/components/empresa/EmpresaDashboardSkeleton'
import { ShinyButton } from '@/components/ui/shiny-button'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'
import { useTheme } from 'next-themes'

export default function EmpresaDashboard() {
  const router = useRouter()
  const { profile, isLoading } = useAuth()
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // Filters for candidates section
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('todos')
  const [statusFilter, setStatusFilter] = useState<string>('todos')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedModalApp, setSelectedModalApp] = useState<ApplicationWithDetails | null>(null)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [isAiSelectorOpen, setIsAiSelectorOpen] = useState(false)

  const handleOpenAiSelector = () => {
    if (selectedJobFilter && selectedJobFilter !== 'todos') {
      router.push(`/empresa/seleccion-ia?jobId=${selectedJobFilter}`)
    } else {
      router.push('/empresa/seleccion-ia')
    }
  }

  const { resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

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
    // Si la empresa seleccionó a un candidato: "Si la empresa seleccionó a otra persona te descartó"
    if (newStatus === 'seleccionado') {
      const targetApp = applications.find((a) => a.id === appId)
      const jobId = targetApp?.job_id || targetApp?.job?.id || ''
      if (jobId) {
        const rejectedIds = await selectCandidateAndRejectOthers(appId, jobId)
        const rejectedSet = new Set(rejectedIds)
        setApplications((prev) =>
          prev.map((a) => {
            if (a.id === appId) return { ...a, estado: 'seleccionado' }
            const matchesJob = a.job_id === jobId || a.job?.id === jobId || (targetApp?.job?.slug && a.job?.slug === targetApp.job.slug)
            if (rejectedSet.has(a.id) || (matchesJob && a.id !== appId)) {
              return { ...a, estado: 'rechazado' }
            }
            return a
          })
        )
        if (selectedModalApp?.id === appId) {
          setSelectedModalApp((prev) => (prev ? { ...prev, estado: 'seleccionado' } : null))
        } else if (selectedModalApp && (selectedModalApp.job_id === jobId || selectedModalApp.job?.id === jobId)) {
          setSelectedModalApp((prev) => (prev ? { ...prev, estado: 'rechazado' } : null))
        }
        return
      }
    }

    await updateApplicationStatus(appId, newStatus)
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, estado: newStatus } : a))
    )
    if (selectedModalApp?.id === appId) {
      setSelectedModalApp((prev) => (prev ? { ...prev, estado: newStatus } : null))
    }
  }

  const handleMarkAllAsSeen = async () => {
    const pendingToMark = filteredApplications.filter((a) => a.estado === 'pendiente')
    if (pendingToMark.length === 0) return

    setIsMarkingAll(true)
    try {
      const ids = pendingToMark.map((a) => a.id)
      await markApplicationsAsSeen(ids)
      const idSet = new Set(ids)
      setApplications((prev) =>
        prev.map((a) => (idSet.has(a.id) ? { ...a, estado: 'visto' } : a))
      )
    } finally {
      setIsMarkingAll(false)
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
  const pendingCount = applications.filter((a) => a.estado === 'pendiente').length
  const seenCount = applications.filter((a) => a.estado === 'visto').length
  const selectedCount = applications.filter((a) => a.estado === 'seleccionado').length
  const inReviewCount = applications.filter((a) => a.estado === 'entrevista').length

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

  const pendingInCurrentView = filteredApplications.filter((a) => a.estado === 'pendiente').length

  if (isLoading || loadingData) {
    return <EmpresaDashboardSkeleton />
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
              <div className="flex items-center gap-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Postulaciones Recibidas</p>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-[10px]">
                    {pendingCount} {pendingCount === 1 ? 'nueva' : 'nuevas'}
                  </span>
                )}
              </div>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{applications.length}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl">
            Ver candidatos ↓
          </span>
        </button>

        <button
          type="button"
          onClick={() => scrollToPostulaciones('visto')}
          className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:border-sky-300 dark:hover:border-sky-700 hover:shadow-md transition-all text-left flex items-center justify-between group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Eye className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">CVs Vistos / Revisados</p>
              <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5">{seenCount}</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-slate-400 group-hover:text-sky-600 transition-colors hidden sm:block">
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
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold text-xs flex items-center gap-1 border border-indigo-200/50">
                  <Mail className="w-3 h-3" />
                  {pendingCount} {pendingCount === 1 ? 'nueva' : 'nuevas'}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
            {/* Botón Seleccionar con IA: LiquidMetalButton en modo claro, ShinyButton en modo oscuro */}
            {!isMounted || resolvedTheme === 'dark' ? (
              <ShinyButton
                onClick={handleOpenAiSelector}
                size="sm"
                className="shrink-0 w-[168px] h-9 inline-flex items-center justify-center shadow-md shadow-indigo-500/20"
                title="Abrir asistente de selección rápida con IA estilo Tinder"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse shrink-0" />
                <span>Seleccionar con IA</span>
              </ShinyButton>
            ) : (
              <LiquidMetalButton
                label="Seleccionar con IA"
                viewMode="both"
                width={168}
                height={36}
                onClick={handleOpenAiSelector}
                title="Abrir asistente de selección rápida con IA estilo Tinder"
                className="shrink-0"
              />
            )}

            {pendingInCurrentView > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsSeen}
                disabled={isMarkingAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 font-bold text-xs shadow-sm transition-all"
                title="Abre y marca todas las postulaciones visibles como vistas"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {isMarkingAll
                    ? 'Abriendo...'
                    : `Marcar todas como vistas (${pendingInCurrentView})`}
                </span>
              </button>
            )}
          </div>
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
                { id: 'todos', label: 'Todos', count: applications.length },
                { id: 'seleccionado', label: 'Seleccionados', count: selectedCount },
                { id: 'pendiente', label: 'Nuevas', count: pendingCount },
                { id: 'visto', label: 'CV Visto', count: seenCount },
                { id: 'entrevista', label: 'En Proceso', count: inReviewCount },
                { id: 'rechazado', label: 'Descartados', count: applications.filter((a) => a.estado === 'rechazado').length }
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 ${
                    statusFilter === st.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{st.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      statusFilter === st.id
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}
                  >
                    {st.count}
                  </span>
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
                Cuando los postulantes envíen su currículum a tus avisos, aparecerán inmediatamente aquí para que puedas revisarlos y contactarlos.
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
                <CandidateCard
                  key={app.id}
                  application={app}
                  onStatusChange={handleStatusChange}
                  onOpenModal={(selected) => setSelectedModalApp(selected)}
                />
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

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Link
                        href={`/empleos/${job.slug}`}
                        className="flex-1 min-w-[70px] sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold transition-colors"
                        title="Ver y editar oferta"
                      >
                        <Pencil className="w-3.5 h-3.5 text-amber-500" />
                        <span>Editar</span>
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(job.id, job.estado)}
                        className={`flex-[2] min-w-[120px] text-xs font-semibold py-2 px-3 rounded-xl border transition-colors ${
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
                        className="flex-1 min-w-[80px] sm:flex-initial flex items-center justify-center gap-1 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
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

      {/* AI Candidate Selector Modal (Tinder Mode) */}
      <AiCandidateSelectorModal
        isOpen={isAiSelectorOpen}
        onClose={() => setIsAiSelectorOpen(false)}
        jobs={jobs}
        applications={applications}
        initialJobId={selectedJobFilter}
        onStatusChange={handleStatusChange}
      />
    </div>
  )
}
