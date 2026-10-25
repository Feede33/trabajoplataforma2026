'use client'

import React, { useEffect } from 'react'
import {
  X,
  User,
  Mail,
  MapPin,
  Briefcase,
  FileText,
  ExternalLink,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

interface CandidateDetailsModalProps {
  application: ApplicationWithDetails | null
  isOpen: boolean
  onClose: () => void
  onStatusChange?: (appId: string, newStatus: ApplicationEstado) => Promise<void>
}

export function CandidateDetailsModal({
  application,
  isOpen,
  onClose,
  onStatusChange
}: CandidateDetailsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && application && application.estado === 'pendiente' && onStatusChange) {
      onStatusChange(application.id, 'visto')
    }
  }, [isOpen, application, onStatusChange])

  if (!isOpen || !application) return null

  const { candidato, job, estado, mensaje, created_at, id } = application

  const getStatusBadge = (st: ApplicationEstado) => {
    const map: Record<ApplicationEstado, { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }> = {
      pendiente: { variant: 'warning', label: 'Pendiente de revisión' },
      visto: { variant: 'primary', label: 'CV Visto' },
      entrevista: { variant: 'success', label: 'En Proceso / Entrevista' },
      rechazado: { variant: 'danger', label: 'Descartado' },
    }
    const current = map[st] || { variant: 'warning', label: st }
    return <Badge variant={current.variant} size="md">{current.label}</Badge>
  }

  const emailSubject = encodeURIComponent(`Postulación para ${job?.titulo || 'la búsqueda laboral'} - PostulaUY`)
  const emailBody = encodeURIComponent(
    `Hola ${candidato?.nombre || 'Candidato'},\n\nNos ponemos en contacto desde la empresa respecto a tu postulación para el puesto de "${job?.titulo || ''}".\n\nSaludos cordiales.`
  )
  const mailtoUrl = `mailto:${candidato?.email || ''}?subject=${emailSubject}&body=${emailBody}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-3 sm:gap-4 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl bg-indigo-600 text-white font-black text-lg sm:text-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 dark:shadow-none">
              {candidato?.nombre ? candidato.nombre[0].toUpperCase() : <User className="w-5 h-5 sm:w-6 sm:h-6" />}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate">
                {candidato?.nombre || 'Candidato sin nombre'}
              </h2>
              <div className="flex flex-wrap items-center gap-2 mt-0.5 sm:mt-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[170px] sm:max-w-none">{candidato?.email || 'Sin correo registrado'}</span>
                </span>
                {candidato?.ubicacion && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{candidato.ubicacion}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 sm:space-y-6 text-sm">
          {/* Postulación Info Banner */}
          <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                Puesto aplicado
              </span>
              <p className="font-bold text-slate-900 dark:text-white text-base mt-0.5">
                {job?.titulo || 'Aviso de empleo'}
              </p>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Postulado {formatRelativeTime(created_at)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Estado actual:</span>
              {getStatusBadge(estado)}
            </div>
          </div>

          {/* Selector de estado de postulación */}
          {onStatusChange && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Gestionar estado del candidato:
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Actualizá la etapa del proceso de selección.
                </p>
              </div>

              <select
                value={estado}
                onChange={(e) => onStatusChange(id, e.target.value as ApplicationEstado)}
                className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pendiente">Pendiente de revisión</option>
                <option value="visto">CV Visto</option>
                <option value="entrevista">En Proceso / Entrevista</option>
                <option value="rechazado">Descartado</option>
              </select>
            </div>
          )}

          {/* Presentación / Carta de presentación */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Mensaje del postulante
            </h3>
            {mensaje ? (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap text-sm italic">
                "{mensaje}"
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">El candidato no incluyó una carta de presentación escrita.</p>
            )}
          </div>

          {/* Bio / Perfil */}
          {candidato?.bio && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Sobre el candidato (Bio)
              </h3>
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 text-slate-700 dark:text-slate-300 leading-relaxed text-sm">
                {candidato.bio}
              </div>
            </div>
          )}

          {/* Currículum Vitae */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Currículum Vitae (CV)
            </h3>
            {candidato?.cv_url ? (
              <div className="p-4 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/30 dark:bg-indigo-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white text-sm">
                      Documento adjunto por el candidato
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Formato PDF o documento cargado a la plataforma
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <a
                    href={candidato.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-md shadow-indigo-200 dark:shadow-none"
                  >
                    <span>Abrir / Descargar CV</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex items-center gap-3 text-slate-500 dark:text-slate-400 text-xs">
                <AlertCircle className="w-4 h-4 text-slate-400 shrink-0" />
                <span>El postulante aún no ha cargado su archivo de currículum en la plataforma.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            ID de Postulación: <span className="font-mono text-[11px]">{id.slice(0, 8)}...</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {candidato?.email && (
              <a
                href={mailtoUrl}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-sm"
              >
                <Mail className="w-4 h-4" />
                <span>Contactar por Email</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
