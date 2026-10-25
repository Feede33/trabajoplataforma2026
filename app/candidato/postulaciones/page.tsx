'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  ExternalLink,
  Clock,
  ArrowLeft,
  Search,
  Lock,
  ArrowRight
} from 'lucide-react'
import { fetchApplicationsForCandidate } from '@/lib/data'
import { ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

export default function CandidatoPostulacionesPage() {
  const { profile, isLoading } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [filter, setFilter] = useState<string>('todas')

  useEffect(() => {
    async function load() {
      if (!profile) {
        setLoadingApps(false)
        return
      }
      setLoadingApps(true)
      const data = await fetchApplicationsForCandidate(profile.id)
      setApplications(data)
      setLoadingApps(false)
    }

    if (!isLoading) {
      load()
    }
  }, [profile?.id, isLoading])

  const filtered = applications.filter((app) => {
    if (filter === 'todas') return true
    return app.estado === filter
  })

  const getStatusBadge = (estado: ApplicationEstado) => {
    const map = {
      pendiente: { variant: 'warning', label: 'Pendiente de Revisión' },
      visto: { variant: 'primary', label: 'CV Visto por la Empresa' },
      seleccionado: { variant: 'success', label: '¡Seleccionado!' },
      entrevista: { variant: 'success', label: 'Convocado a Entrevista' },
      rechazado: { variant: 'danger', label: 'Proceso Finalizado' },
    }[estado] as { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }

    return <Badge variant={map.variant} size="sm">{map.label}</Badge>
  }

  const getStatusDescription = (estado: ApplicationEstado) => {
    switch (estado) {
      case 'pendiente':
        return 'Tu postulación fue enviada correctamente y está esperando ser revisada por el reclutador.'
      case 'visto':
        return 'La empresa ya abrió y revisó tu perfil y currículum vitae.'
      case 'seleccionado':
        return '¡Felicitaciones! La empresa preseleccionó tu perfil con IA para avanzar en el proceso.'
      case 'entrevista':
        return '¡Excelente! La empresa seleccionó tu perfil para coordinar una entrevista.'
      case 'rechazado':
        return 'La empresa optó por otros perfiles para esta vacante.'
      default:
        return ''
    }
  }

  if (isLoading || loadingApps) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-4">
        <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-48 bg-slate-200 rounded-3xl animate-pulse" />
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
          <h2 className="text-2xl font-extrabold text-slate-900">Iniciá sesión para ver tus postulaciones</h2>
          <p className="text-sm text-slate-500 mt-2">
            Necesitás identificarte para consultar el estado de los empleos a los que te postulaste.
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link
        href="/candidato/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a mi dashboard
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Seguimiento de Empleos
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
            Mis Postulaciones
          </h1>
          <p className="text-sm text-slate-500">
            Postulaciones registradas con tu cuenta <span className="font-semibold text-slate-700">{profile.email}</span>
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full scrollbar-none bg-white p-1.5 rounded-2xl border border-slate-200">
          {['todas', 'pendiente', 'visto', 'entrevista', 'rechazado'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                filter === status
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
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No encontramos postulaciones activas</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'todas'
              ? 'Todavía no aplicaste a ninguna vacante. Explorá los empleos abiertos y postulate con tu perfil.'
              : `No tenés postulaciones en estado "${filter}".`}
          </p>
          <Link
            href="/empleos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-200 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Explorar Empleos Disponibles</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/empleos/${app.job?.slug}`}
                    className="font-extrabold text-slate-900 hover:text-indigo-600 text-lg flex items-center gap-1.5"
                  >
                    {app.job?.titulo}
                    <ExternalLink className="w-4 h-4 text-slate-400" />
                  </Link>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    Postulado {formatRelativeTime(app.created_at)}
                  </p>
                </div>

                <div className="shrink-0">{getStatusBadge(app.estado)}</div>
              </div>

              {/* Status explanation */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800 block mb-0.5">
                  Estado actual del proceso:
                </span>
                {getStatusDescription(app.estado)}
              </div>

              {app.mensaje && (
                <div className="text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Tu mensaje adjunto: </span>
                  <span className="italic">"{app.mensaje}"</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
