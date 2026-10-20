'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  Users,
  Eye,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowRight
} from 'lucide-react'
import { fetchJobs, fetchApplicationsForEmpresa, toggleJobState } from '@/lib/data'
import { JobWithEmpresa, ApplicationWithDetails, JobEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

export default function EmpresaDashboard() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      const [jobsData, appsData] = await Promise.all([
        fetchJobs(),
        fetchApplicationsForEmpresa(profile?.id)
      ])
      setJobs(jobsData)
      setApplications(appsData)
      setLoading(false)
    }
    loadData()
  }, [profile?.id])

  const handleToggleStatus = async (jobId: string, currentStatus: JobEstado) => {
    const nextStatus: JobEstado = currentStatus === 'activo' ? 'cerrado' : 'activo'
    await toggleJobState(jobId, nextStatus)
    setJobs((prev) =>
      prev.map((j) => (j.id === jobId ? { ...j, estado: nextStatus } : j))
    )
  }

  const activeJobs = jobs.filter((j) => j.estado === 'activo')

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
            Bienvenido, <span className="font-semibold text-slate-800">{profile?.nombre || 'Empresa'}</span>
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
            <p className="text-xs text-slate-500 font-medium">Empleos Activos</p>
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
            <p className="text-xs text-slate-500 font-medium">En Revisión / Entrevista</p>
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

        {loading ? (
          <div className="p-12 text-center text-slate-400">Cargando publicaciones...</div>
        ) : jobs.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-slate-500 text-sm">No tenés búsquedas publicadas todavía.</p>
            <Link
              href="/empresa/publicar"
              className="inline-block px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
            >
              Publicar mi primer empleo
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
