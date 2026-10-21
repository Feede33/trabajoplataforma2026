'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  FileText,
  Mail,
  ExternalLink,
  Download,
  Lock,
  Building2,
  ArrowRight
} from 'lucide-react'
import { fetchApplicationsForEmpresa, updateApplicationStatus } from '@/lib/data'
import { ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { useAuth } from '@/lib/context/AuthContext'

export default function EmpresaPostulacionesPage() {
  const { profile, isLoading } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('todos')

  useEffect(() => {
    async function load() {
      if (!profile) {
        setLoadingData(false)
        return
      }
      setLoadingData(true)
      const data = await fetchApplicationsForEmpresa(profile.id)
      setApplications(data)
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
  }

  const filtered = applications.filter((app) => {
    if (filterStatus === 'todos') return true
    return app.estado === filterStatus
  })

  const getStatusBadge = (estado: ApplicationEstado) => {
    const map = {
      pendiente: { variant: 'warning', label: 'Pendiente' },
      visto: { variant: 'primary', label: 'Visto' },
      entrevista: { variant: 'success', label: 'En Entrevista' },
      rechazado: { variant: 'danger', label: 'Rechazado' },
    }[estado] as { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }

    return <Badge variant={map.variant} size="sm">{map.label}</Badge>
  }

  if (isLoading || loadingData) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Iniciá sesión como Empresa</h2>
          <p className="text-sm text-slate-500 mt-2">
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Panel Empresa
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
            Postulaciones Recibidas
          </h1>
          <p className="text-sm text-slate-500">
            Candidatos que aplicaron a las búsquedas de <span className="font-semibold text-slate-700">{profile.nombre || profile.email}</span>
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 bg-white p-1.5 rounded-2xl border border-slate-200">
          {['todos', 'pendiente', 'visto', 'entrevista', 'rechazado'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No hay postulaciones para mostrar</h3>
          <p className="text-xs text-slate-500">
            {filterStatus === 'todos'
              ? 'Cuando los candidatos se postulen a tus búsquedas, aparecerán acá.'
              : `No tenés candidatos en estado "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header: Name + Status */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {app.candidato?.nombre || 'Candidato'}
                    </h3>
                    <a
                      href={`mailto:${app.candidato?.email}`}
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Mail className="w-3 h-3" />
                      {app.candidato?.email}
                    </a>
                  </div>
                  {getStatusBadge(app.estado)}
                </div>

                {/* Job Applied For */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                    Postulado a:
                  </span>
                  <Link
                    href={`/empleos/${app.job?.slug}`}
                    className="font-bold text-slate-800 hover:text-indigo-600 flex items-center gap-1 mt-0.5"
                  >
                    <span className="truncate">{app.job?.titulo}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </Link>
                </div>

                {/* Cover letter message */}
                {app.mensaje && (
                  <div className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <p className="font-semibold text-slate-700 text-[11px] mb-1">
                      Mensaje del candidato:
                    </p>
                    <p className="italic line-clamp-3">"{app.mensaje}"</p>
                  </div>
                )}

                {/* CV Attachment button */}
                <div>
                  <a
                    href={app.candidato?.cv_url || '#'}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700 text-xs font-bold transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Ver Currículum (PDF)</span>
                    <Download className="w-3 h-3 text-indigo-500 ml-auto" />
                  </a>
                </div>
              </div>

              {/* Status Update Dropdown */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400">
                  {formatRelativeTime(app.created_at)}
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium">Cambiar estado:</span>
                  <select
                    value={app.estado}
                    onChange={(e) => handleStatusChange(app.id, e.target.value as ApplicationEstado)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="visto">Visto</option>
                    <option value="entrevista">En Entrevista</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
