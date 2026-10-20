'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Briefcase,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Search
} from 'lucide-react'
import { fetchApplicationsForCandidate } from '@/lib/data'
import { ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

export default function CandidatoPostulacionesPage() {
  const { profile } = useAuth()
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('todas')

  useEffect(() => {
    async function load() {
      const data = await fetchApplicationsForCandidate(profile?.id || 'cand-1')
      setApplications(data)
      setLoading(false)
    }
    load()
  }, [profile?.id])

  const filtered = applications.filter((app) => {
    if (filter === 'todas') return true
    return app.estado === filter
  })

  const getStatusBadge = (estado: ApplicationEstado) => {
    const map = {
      pendiente: { variant: 'warning', label: 'Pendiente de Revisión' },
      visto: { variant: 'primary', label: 'CV Visto por la Empresa' },
      entrevista: { variant: 'success', label: 'Convocado a Entrevista' },
      rechazado: { variant: 'danger', label: 'Proceso Finalizado' },
    }[estado] as { variant: any; label: string }

    return <Badge variant={map.variant} size="sm">{map.label}</Badge>
  }

  const getStatusDescription = (estado: ApplicationEstado) => {
    switch (estado) {
      case 'pendiente':
        return 'Tu CV fue entregado correctamente y está esperando ser abierto por los reclutadores.'
      case 'visto':
        return 'La empresa ya abrió y revisó tu perfil y currículum vitae.'
      case 'entrevista':
        return '¡Excelente noticia! La empresa seleccionó tu perfil para avanzar en la etapa de entrevistas. Te contactarán por email o teléfono.'
      case 'rechazado':
        return 'La empresa optó por otros perfiles para esta posición específica en esta oportunidad.'
      default:
        return ''
    }
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
            Seguimiento
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 mt-1">
            Mis Postulaciones Laborales
          </h1>
          <p className="text-sm text-slate-500">
            Revisá el estado y avance de todas tus aplicaciones
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 bg-white p-1.5 rounded-2xl border border-slate-200">
          {['todas', 'pendiente', 'visto', 'entrevista', 'rechazado'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
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

      {loading ? (
        <div className="py-16 text-center text-slate-400">Cargando postulaciones...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-bold text-slate-800">No encontramos postulaciones</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'todas'
              ? 'Todavía no aplicaste a ninguna vacante. Explorá las oportunidades disponibles y postulate hoy.'
              : `No tenés postulaciones en estado "${filter}".`}
          </p>
          <Link
            href="/empleos"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-md shadow-indigo-200 transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Explorar Empleos</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((app) => (
            <div
              key={app.id}
              className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all space-y-4"
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
