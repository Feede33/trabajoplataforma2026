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
  Lock
} from 'lucide-react'
import { fetchApplicationsForCandidate, fetchJobs } from '@/lib/data'
import { ApplicationWithDetails, JobWithEmpresa } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { JobCard } from '@/components/jobs/JobCard'

export default function CandidatoDashboard() {
  const { profile, isLoading } = useAuth()
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
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="h-32 bg-slate-200 rounded-3xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-3xl animate-pulse" />
          <div className="h-32 bg-slate-200 rounded-3xl animate-pulse" />
        </div>
      </div>
    )
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
                  <p className="text-xs text-slate-400 mt-0.5">
                    Postulado {formatRelativeTime(app.created_at)}
                  </p>
                </div>

                <div>
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
                </div>
              </div>
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
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </div>
    </div>
  )
}
