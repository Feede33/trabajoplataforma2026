'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, formatDateTime, getAiBadgeDetails } from '@/lib/utils'

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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && application && onStatusChange) {
      if (application.estado === 'pendiente') {
        onStatusChange(application.id, 'visto')
      } else if (application.estado === 'visto') {
        onStatusChange(application.id, 'entrevista')
      }
    }
  }, [isOpen, application, onStatusChange])

  if (!mounted || !isOpen || !application) return null

  const { candidato, job, estado, mensaje, created_at, id } = application

  const getStatusBadge = (st: ApplicationEstado) => {
    const map: Record<ApplicationEstado, { variant: 'warning' | 'primary' | 'success' | 'danger' | 'purple'; label: string }> = {
      pendiente: { variant: 'warning', label: 'Pendiente de revisión' },
      visto: { variant: 'primary', label: 'Visto' },
      seleccionado: { variant: 'success', label: 'Seleccionado' },
      entrevista: { variant: 'purple', label: 'En Proceso' },
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

  const modalContent = (
    <div className="fixed inset-0 !m-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
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
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span>Postulado el <strong className="font-semibold text-slate-700 dark:text-slate-200">{formatDateTime(created_at)}</strong></span>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="flex items-center gap-1 text-slate-400">
                  <Clock className="w-3 h-3 shrink-0" />
                  {formatRelativeTime(created_at)}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <span className="text-[11px] text-slate-500 font-medium">Estado actual:</span>
              {getStatusBadge(estado)}
            </div>
          </div>

          {/* Acciones directas y automáticas sobre la postulación */}
          {onStatusChange && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                  Decisión sobre la postulación:
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {estado === 'seleccionado'
                    ? 'Este candidato fue seleccionado para cubrir la vacante.'
                    : estado === 'rechazado'
                    ? 'La postulación de este candidato fue descartada.'
                    : 'El candidato se encuentra actualmente en evaluación activa.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {estado === 'seleccionado' ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-xs border border-emerald-300 dark:border-emerald-700">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Seleccionado</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onStatusChange(id, 'entrevista')}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 transition-colors"
                    >
                      Revertir a En Proceso
                    </button>
                  </div>
                ) : estado === 'rechazado' ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold text-xs border border-rose-200 dark:border-rose-800">
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      <span>Descartado</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onStatusChange(id, 'entrevista')}
                      className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-semibold text-indigo-600 dark:text-indigo-400 transition-colors"
                    >
                      Reconsiderar Candidato
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onStatusChange(id, 'rechazado')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold transition-all active:scale-95"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Descartar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(id, 'seleccionado')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm hover:shadow active:scale-95"
                      title="Seleccionar candidato (descarta automáticamente a los demás del mismo empleo)"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Seleccionar Candidato</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* AI Pre-evaluated Analysis Box (Opción C) */}
          {typeof application.ai_match_score === 'number' && (
            <div className="bg-gradient-to-br from-purple-50/80 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 p-4 sm:p-5 rounded-2xl border border-purple-200/80 dark:border-purple-800/40 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                  <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Análisis de IA para esta vacante</span>
                </div>
                <div className="flex items-center gap-2">
                  {(() => {
                    const badgeInfo = getAiBadgeDetails(application.ai_match_score)
                    return (
                      <>
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs border border-emerald-200 dark:border-emerald-800/60">
                          {application.ai_match_score}% Coincidencia
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${badgeInfo.badgeClass}`}>
                          {badgeInfo.label}
                        </span>
                      </>
                    )
                  })()}
                </div>
              </div>

              {application.ai_summary && (
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                  {application.ai_summary}
                </p>
              )}

              {application.ai_strengths && application.ai_strengths.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {application.ai_strengths.map((str, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-purple-100 dark:border-purple-900/50 shadow-2xs"
                    >
                      <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{str}</span>
                    </span>
                  ))}
                </div>
              )}
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

  return createPortal(modalContent, document.body)
}
