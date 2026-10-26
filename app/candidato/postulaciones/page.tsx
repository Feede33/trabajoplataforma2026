'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  ExternalLink,
  Clock,
  Calendar,
  ArrowLeft,
  Search,
  Lock,
  ArrowRight,
  Info
} from 'lucide-react'
import { fetchApplicationsForCandidate } from '@/lib/data'
import { ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'

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
      visto: { variant: 'primary', label: 'Visto por la Empresa' },
      seleccionado: { variant: 'success', label: '¡Seleccionado!' },
      entrevista: { variant: 'purple', label: 'En Proceso' },
      rechazado: { variant: 'danger', label: 'No seleccionado' },
    }[estado] as { variant: 'warning' | 'primary' | 'success' | 'danger' | 'purple'; label: string }

    if (estado === 'seleccionado') {
      return (
        <div className="relative group inline-block">
          <Badge
            variant="success"
            size="sm"
            className="cursor-pointer font-semibold gap-1.5 shadow-sm hover:ring-2 hover:ring-emerald-400/40 transition-all select-none"
            title="Si la empresa te seleccionó, en estos días deberías de estar recibiendo novedades."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>¡Seleccionado!</span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
              <Info className="w-2.5 h-2.5" />
              Aviso
            </span>
          </Badge>

          {/* Tooltip flotante al hacer hover */}
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
            {/* Flecha del tooltip */}
            <div className="absolute right-6 -bottom-1.5 w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45" />
          </div>
        </div>
      )
    }

    return <Badge variant={map.variant} size="sm">{map.label}</Badge>
  }

  const getStatusDescription = (estado: ApplicationEstado) => {
    switch (estado) {
      case 'pendiente':
        return 'Tu postulación fue recibida y está esperando ser abierta por la empresa.'
      case 'visto':
        return 'La empresa ya abrió tu postulación y revisó tu presentación.'
      case 'entrevista':
        return 'La empresa no te descartó y tu postulación se encuentra en evaluación activa.'
      case 'seleccionado':
        return '¡Felicitaciones! La empresa te seleccionó para cubrir esta vacante laboral.'
      case 'rechazado':
        return 'La empresa optó por seleccionar a otro postulante o descartó tu postulación.'
      default:
        return ''
    }
  }

  if (isLoading || loadingApps) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="h-4 w-32 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-indigo-100 dark:bg-indigo-950/60 rounded animate-pulse" />
            <div className="h-8 w-60 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse" />
            <div className="h-3.5 w-72 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
          </div>
          <div className="h-9 w-64 bg-slate-100 dark:bg-slate-800 rounded-2xl animate-pulse" />
        </div>
        <div className="space-y-4 pt-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="h-5 w-52 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-36 bg-slate-100 dark:bg-slate-800/60 rounded animate-pulse" />
                </div>
                <div className="h-6 w-28 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              </div>
              <div className="h-12 w-full bg-slate-50 dark:bg-slate-800/40 rounded-2xl animate-pulse" />
            </div>
          ))}
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
          {[
            { id: 'todas', label: 'Todas' },
            { id: 'seleccionado', label: 'Seleccionados' },
            { id: 'pendiente', label: 'Nuevas' },
            { id: 'visto', label: 'Visto' },
            { id: 'entrevista', label: 'En Proceso' },
            { id: 'rechazado', label: 'No seleccionados' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setFilter(item.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                filter === item.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {item.label}
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
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-1.5">
                    {app.created_at ? (
                      <>
                        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Postulado el <strong className="font-semibold text-slate-800 dark:text-slate-200">{formatDateTime(app.created_at)}</strong></span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">•</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 shrink-0" />
                          {formatRelativeTime(app.created_at)}
                        </span>
                      </>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        Fecha no disponible
                      </span>
                    )}
                  </div>
                </div>

                <div className="shrink-0">{getStatusBadge(app.estado)}</div>
              </div>

              {/* Status explanation */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-800 block mb-0.5">
                  Estado actual del proceso:
                </span>
                <p>{getStatusDescription(app.estado)}</p>

                {app.estado === 'seleccionado' && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                    <div
                      className="relative group/aviso inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 font-semibold cursor-help text-[11px] hover:bg-emerald-100/70 dark:hover:bg-emerald-900/50 transition-all select-none"
                      tabIndex={0}
                    >
                      <Info className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>Aviso sobre tu postulación</span>
                      <span className="text-[10px] font-normal text-emerald-600 dark:text-emerald-400 underline decoration-dotted">
                        (pasá el mouse)
                      </span>

                      {/* Tooltip con aviso al hacer hover */}
                      <div className="absolute left-0 bottom-full mb-2 z-50 opacity-0 invisible group-hover/aviso:opacity-100 group-hover/aviso:visible group-focus-within/aviso:opacity-100 group-focus-within/aviso:visible transition-all duration-200 pointer-events-none w-72 max-w-[85vw] p-3 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700/80 text-xs">
                        <div className="flex items-start gap-2.5">
                          <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="space-y-0.5">
                            <p className="font-bold text-emerald-400 text-xs">Próximos pasos</p>
                            <p className="text-slate-200 text-[11px] leading-relaxed">
                              Si la empresa te seleccionó, en estos días deberías de estar recibiendo novedades.
                            </p>
                          </div>
                        </div>
                        <div className="absolute left-6 -bottom-1.5 w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45" />
                      </div>
                    </div>
                  </div>
                )}
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
