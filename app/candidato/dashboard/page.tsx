'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  FileText,
  User,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  Lock,
  Bookmark,
  Info
} from 'lucide-react'
import { fetchApplicationsForCandidate, fetchJobs } from '@/lib/data'
import { ApplicationWithDetails, JobWithEmpresa } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { useSavedJobs } from '@/lib/context/SavedJobsContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'
import { JobCard } from '@/components/jobs/JobCard'
import { CandidatoDashboardSkeleton } from '@/components/candidato/CandidatoDashboardSkeleton'

export default function CandidatoDashboard() {
  const { profile, isLoading } = useAuth()
  const { savedJobs } = useSavedJobs()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [recommendedJobs, setRecommendedJobs] = useState<JobWithEmpresa[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    async function load() {
      if (!profile) {
        setLoadingData(false)
        return
      }
      setLoadingData(true)
      const [apps, jobs] = await Promise.all([
        fetchApplicationsForCandidate(profile.id),
        fetchJobs(),
      ])
      setApplications(apps)
      setRecommendedJobs(jobs.slice(0, 3))
      setLoadingData(false)
    }

    if (!isLoading) {
      load()
    }
  }, [profile?.id, isLoading])

  const entrevistas = applications.filter((a) => a.estado === 'entrevista').length

  if (isLoading || loadingData) {
    return <CandidatoDashboardSkeleton />
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Iniciá sesión para ver tu panel</h2>
          <p className="text-sm text-slate-500 mt-2">
            Identificate con tu cuenta de candidato para gestionar tus postulaciones y ver recomendaciones.
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Panel de Candidato
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
            Hola, {profile?.nombre || profile?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Hacé seguimiento de tus postulaciones y descubrí nuevas vacantes
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Link
            href="/candidato/perfil"
            className="flex-1 sm:flex-initial justify-center px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Editar mi Perfil</span>
          </Link>

          <Link
            href="/empleos"
            className="flex-1 sm:flex-initial justify-center px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4 shrink-0" />
            <span>Buscar Empleos</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Postulaciones Realizadas</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{applications.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Entrevistas Conseguidas</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{entrevistas}</p>
          </div>
        </div>

        <Link
          href="/candidato/guardados"
          className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Bookmark className="w-6 h-6 fill-blue-500 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium group-hover:text-blue-600 transition-colors">Empleos Guardados</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{savedJobs.length}</p>
          </div>
        </Link>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">CV Adjunto</p>
            <p className="text-xs font-bold text-slate-800 mt-1">
              {profile?.cv_url ? 'Listo para postularse' : 'Pendiente de carga'}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Applications Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tus Postulaciones Recientes</h2>
            <p className="text-xs text-slate-500">Estado de los procesos en los que estás participando</p>
          </div>
          <Link
            href="/candidato/postulaciones"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {applications.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-slate-500">Todavía no te postulaste a ningún empleo.</p>
            <Link
              href="/empleos"
              className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
            >
              Explorar oportunidades
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.slice(0, 4).map((app) => (
              <div
                key={app.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors gap-3"
              >
                <div>
                  <Link
                    href={`/empleos/${app.job?.slug}`}
                    className="font-bold text-slate-900 hover:text-indigo-600 text-sm flex items-center gap-1.5"
                  >
                    {app.job?.titulo}
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                    {app.created_at ? (
                      <>
                        <span>Postulado el <strong className="font-semibold text-slate-600 dark:text-slate-300">{formatDateTime(app.created_at)}</strong></span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span>{formatRelativeTime(app.created_at)}</span>
                      </>
                    ) : (
                      <span>Fecha no disponible</span>
                    )}
                  </div>
                </div>

                <div>
                  {app.estado === 'seleccionado' ? (
                    <div className="relative group inline-block">
                      <Badge
                        variant="success"
                        size="sm"
                        className="cursor-pointer font-semibold gap-1.5 shadow-sm hover:ring-2 hover:ring-emerald-400/40 transition-all select-none"
                        title="Si la empresa te seleccionó, en estos días deberías de estar recibiendo novedades."
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>¡Seleccionado!</span>
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
                          <Info className="w-2.5 h-2.5" />
                          Aviso
                        </span>
                      </Badge>

                      <div className="absolute right-0 bottom-full mb-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none w-72 max-w-[85vw] p-3 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700/80 text-xs">
                        <div className="flex items-start gap-2.5">
                          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-emerald-400 text-xs">Aviso importante</p>
                            <p className="text-slate-200 text-[11px] leading-relaxed">
                              Si la empresa te seleccionó, en estos días deberías de estar recibiendo novedades.
                            </p>
                          </div>
                        </div>
                        <div className="absolute right-6 -bottom-1.5 w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45" />
                      </div>
                    </div>
                  ) : (
                    <Badge
                      variant={
                        app.estado === 'entrevista'
                          ? 'success'
                          : app.estado === 'visto'
                          ? 'primary'
                          : app.estado === 'rechazado'
                          ? 'danger'
                          : 'warning'
                      }
                      size="sm"
                      className="capitalize font-semibold"
                    >
                      {app.estado === 'entrevista' ? 'En Entrevista' : app.estado}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Jobs Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-blue-500 fill-blue-500" />
              <h2 className="text-lg font-bold text-slate-900">Tus Empleos Guardados</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                {savedJobs.length}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Vacantes que guardaste con el botón de bookmark para revisar o postularte más adelante
            </p>
          </div>
          {savedJobs.length > 0 && (
            <Link
              href="/candidato/guardados"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0 whitespace-nowrap"
            >
              <span>Ver todos ({savedJobs.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {savedJobs.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center mx-auto">
              <Bookmark className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Todavía no guardaste ningún empleo</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Hacé clic en el botón de guardar en cualquier vacante para tenerla a mano acá y postularte cuando quieras.
            </p>
            <Link
              href="/empleos"
              className="inline-block px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors shadow-sm"
            >
              Explorar empleos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {savedJobs.slice(0, 3).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isApplied={applications.some((a) => a.job_id === job.id || a.job?.slug === job.slug)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recommended Jobs */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Empleos Recomendados para Vos</h2>
            <p className="text-xs text-slate-500">Basado en las búsquedas más solicitadas</p>
          </div>
          <Link
            href="/empleos"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 shrink-0 whitespace-nowrap"
          >
            <span>Ver más empleos</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {recommendedJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              isApplied={applications.some((a) => a.job_id === job.id || a.job?.slug === job.slug)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
