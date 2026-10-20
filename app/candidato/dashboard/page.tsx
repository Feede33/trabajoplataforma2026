'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  FileText,
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { fetchApplicationsForCandidate, fetchJobs } from '@/lib/data'
import { ApplicationWithDetails, JobWithEmpresa } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { JobCard } from '@/components/jobs/JobCard'

export default function CandidatoDashboard() {
  const { profile } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [recommendedJobs, setRecommendedJobs] = useState<JobWithEmpresa[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [apps, jobs] = await Promise.all([
        fetchApplicationsForCandidate(profile?.id || 'cand-1'),
        fetchJobs(),
      ])
      setApplications(apps)
      setRecommendedJobs(jobs.slice(0, 3))
      setLoading(false)
    }
    load()
  }, [profile?.id])

  const entrevistas = applications.filter((a) => a.estado === 'entrevista').length

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Panel de Candidato
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
            Hola, {profile?.nombre || 'Candidato'} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Hacé seguimiento de tus postulaciones y descubrí nuevas vacantes
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/candidato/perfil"
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>Editar mi Perfil</span>
          </Link>

          <Link
            href="/empleos"
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 flex items-center gap-1.5"
          >
            <Briefcase className="w-4 h-4" />
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
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tus Postulaciones Recientes</h2>
            <p className="text-xs text-slate-500">Estado de los procesos en los que estás participando</p>
          </div>
          <Link
            href="/candidato/postulaciones"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Ver todas</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-400">Cargando postulaciones...</div>
        ) : applications.length === 0 ? (
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
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Empleos Recomendados para Vos</h2>
            <p className="text-xs text-slate-500">Basado en las búsquedas más solicitadas</p>
          </div>
          <Link
            href="/empleos"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
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
