'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Eye,
  Mail,
  ExternalLink,
  FileText,
  Download,
  MailOpen,
  Sparkles,
  CheckCircle2,
  Clock
} from 'lucide-react'
import { ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { CandidateCardSkeleton } from './CandidateCardSkeleton'

export { CandidateCardSkeleton }

interface CandidateCardProps {
  application: ApplicationWithDetails
  onStatusChange: (appId: string, newStatus: ApplicationEstado) => Promise<void>
  onOpenModal: (app: ApplicationWithDetails) => void
}

export function CandidateCard({
  application,
  onStatusChange,
  onOpenModal,
}: CandidateCardProps) {
  const { candidato, job, estado, mensaje, created_at, id } = application

  // Una postulación está "sin abrir" si su estado es 'pendiente'
  const isUnopened = estado === 'pendiente'
  const [isOpening, setIsOpening] = useState(false)

  const handleOpenAndMarkSeen = async () => {
    setIsOpening(true)
    try {
      await onStatusChange(id, 'visto')
    } finally {
      setIsOpening(false)
    }
  }

  const handleOpenCv = async () => {
    if (isUnopened) {
      await onStatusChange(id, 'visto')
    }
  }

  const handleOpenModal = () => {
    if (isUnopened) {
      onStatusChange(id, 'visto')
    }
    onOpenModal(application)
  }

  const getStatusBadge = () => {
    switch (estado) {
      case 'pendiente':
        return (
          <Badge variant="warning" size="sm" className="flex items-center gap-1 font-bold">
            <Mail className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>Nueva</span>
          </Badge>
        )
      case 'visto':
        return (
          <Badge variant="primary" size="sm" className="flex items-center gap-1 font-bold">
            <Eye className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            <span>CV Visto</span>
          </Badge>
        )
      case 'seleccionado':
        return (
          <Badge variant="success" size="sm" className="flex items-center gap-1 font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
            <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Seleccionado</span>
          </Badge>
        )
      case 'entrevista':
        return (
          <Badge variant="success" size="sm" className="flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>En Proceso</span>
          </Badge>
        )
      case 'rechazado':
        return (
          <Badge variant="danger" size="sm" className="font-bold">
            Descartado
          </Badge>
        )
    }
  }

  return (
    <div
      className={`relative bg-white dark:bg-slate-900 rounded-3xl border transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between space-y-4 ${
        isUnopened
          ? 'border-indigo-100 dark:border-indigo-900/40 shadow-sm hover:shadow-md hover:border-indigo-200'
          : estado === 'visto'
          ? 'border-sky-100 dark:border-sky-900/30 shadow-sm hover:shadow-md'
          : 'border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="space-y-3">
        {/* Top Header: Candidate Name / Initials & Status Badge / Ver Button */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 transition-transform ${
                isUnopened
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800'
                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
              }`}
            >
              {candidato?.nombre ? candidato.nombre[0].toUpperCase() : 'C'}
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">
                {candidato?.nombre || 'Candidato'}
              </h3>

              {!isUnopened ? (
                <a
                  href={`mailto:${candidato?.email}`}
                  className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate mt-0.5"
                >
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{candidato?.email || 'Sin correo'}</span>
                </a>
              ) : (
                <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1 mt-0.5">
                  <Mail className="w-3 h-3" />
                  Nueva postulación recibida
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {getStatusBadge()}
            {isUnopened && (
              <button
                type="button"
                onClick={handleOpenAndMarkSeen}
                disabled={isOpening}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all hover:scale-105 active:scale-95"
                title="Hacé clic para ver la postulación completa"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver</span>
              </button>
            )}
          </div>
        </div>

        {/* Job Applied Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-semibold block">
            Postulado a:
          </span>
          <Link
            href={`/empleos/${job?.slug}`}
            className="font-bold text-slate-800 dark:text-slate-200 hover:text-indigo-600 flex items-center gap-1.5 mt-0.5"
          >
            <span className="truncate">{job?.titulo || 'Aviso de empleo'}</span>
            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
          </Link>
        </div>

        {/* Candidate Content: Blur card if unopened */}
        {isUnopened ? (
          <div className="relative rounded-2xl overflow-hidden border border-indigo-100/90 dark:border-indigo-900/40 bg-gradient-to-b from-indigo-50/30 to-slate-50/60 dark:from-indigo-950/20 dark:to-slate-900/40 p-4 min-h-[160px] flex flex-col items-center justify-center text-center">
            {/* Background dummy lines with blur */}
            <div className="absolute inset-0 p-4 opacity-20 filter blur-[4px] select-none pointer-events-none flex flex-col justify-between space-y-2">
              <div className="h-3 w-3/4 bg-slate-400 rounded" />
              <div className="h-3 w-5/6 bg-slate-400 rounded" />
              <div className="h-3 w-2/3 bg-slate-400 rounded" />
              <div className="h-8 w-full bg-indigo-300 rounded-xl mt-2" />
            </div>

            {/* Letter opening CTA */}
            <div className="relative z-10 flex flex-col items-center gap-2 max-w-[260px]">
              <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/25">
                <MailOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 dark:text-white text-xs">
                  Carta de postulación
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                  Hacé clic en Ver para abrir la carta y acceder al CV del candidato.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAndMarkSeen}
                disabled={isOpening}
                className="mt-1 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 dark:shadow-none transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{isOpening ? 'Abriendo...' : 'Ver'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-300">
            {/* Candidate Cover Letter Message */}
            {mensaje ? (
              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-800/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-1 relative">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-500" />
                    <span>Carta de presentación:</span>
                  </p>
                </div>
                <p className="italic line-clamp-3 leading-relaxed">"{mensaje}"</p>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 dark:text-slate-500 italic px-1 py-1">
                El candidato no incluyó carta escrita.
              </div>
            )}

            {/* CV Button */}
            <div>
              {candidato?.cv_url ? (
                <a
                  href={candidato.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleOpenCv}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>Ver Currículum (PDF)</span>
                  <Download className="w-3.5 h-3.5 ml-auto text-indigo-500" />
                </a>
              ) : (
                <div className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Sin CV adjunto</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer: Date, Modal Trigger & Status Selector */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(created_at)}
          </span>
          <button
            onClick={handleOpenModal}
            className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver Ficha Completa</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">Estado:</span>
          <select
            value={estado}
            onChange={(e) => onStatusChange(id, e.target.value as ApplicationEstado)}
            className="flex-1 text-xs font-semibold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {/* Si ya fue abierta, no se puede volver atrás a 'pendiente' */}
            {isUnopened && <option value="pendiente">Nueva (Sin abrir)</option>}
            <option value="visto">CV Visto</option>
            <option value="seleccionado">Seleccionado</option>
            <option value="entrevista">En Proceso / Entrevista</option>
            <option value="rechazado">Descartado</option>
          </select>
        </div>
      </div>
    </div>
  )
}
