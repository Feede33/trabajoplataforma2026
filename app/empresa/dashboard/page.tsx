'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  Users,
  PlusCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  Lock,
  Building2
} from 'lucide-react'
import { fetchJobsByEmpresa, fetchApplicationsForEmpresa, toggleJobState } from '@/lib/data'
import { JobWithEmpresa, ApplicationWithDetails, JobEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

export default function EmpresaDashboard() {
  const { profile, isLoading } = useAuth()
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loadingData, setLoadingData] = useState(true)

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

  const activeJobs = jobs.filter((j) => j.estado === 'activo')

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
          <h2 className="text-2xl font-extrabold text-slate-900">Iniciá sesión como Empresa</h2>
          <p className="text-sm text-slate-500 mt-2">
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
            className="w-full py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Crear Cuenta de Empresa
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Panel de Empresa
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
            Gestión de Empleos y Candidatos
          </h1>
          <p className="text-sm text-slate-600">
            Conectado como <span className="font-semibold text-slate-800">{profile.nombre || profile.email}</span>
          </p>
        </div>

        <Link
          href="/empresa/publicar"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 hover:shadow-lg shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Publicar Nuevo Empleo</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Tus Empleos Activos</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{activeJobs.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Postulaciones Recibidas</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{applications.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">En Entrevista / Revisión</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">
              {applications.filter((a) => a.estado === 'entrevista' || a.estado === 'pendiente').length}
            </p>
          </div>
        </div>
      </div>

      {/* Jobs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Tus Publicaciones</h2>
            <p className="text-xs text-slate-500">Administrá el estado de tus búsquedas laborales</p>
          </div>
          <Link
            href="/empresa/postulaciones"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>Ver todas las postulaciones</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
            <p className="text-slate-700 font-bold text-base">No tenés búsquedas publicadas todavía</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4 font-semibold">Puesto</th>
                  <th className="px-6 py-4 font-semibold">Rubro / Modalidad</th>
                  <th className="px-6 py-4 font-semibold">Publicado</th>
                  <th className="px-6 py-4 font-semibold">Estado</th>
                  <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/empleos/${job.slug}`}
                        className="font-bold text-slate-900 hover:text-indigo-600 flex items-center gap-1.5"
                      >
                        {job.titulo}
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                      <p className="text-xs text-slate-500">{job.zona}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <Badge variant="primary" size="sm">{job.rubro}</Badge>
                        <Badge variant="outline" size="sm" className="capitalize">{job.modalidad}</Badge>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
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
                      <button
                        onClick={() => handleToggleStatus(job.id, job.estado)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors ${
                          job.estado === 'activo'
                            ? 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                            : 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {job.estado === 'activo' ? 'Pausar / Cerrar' : 'Reactivar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
