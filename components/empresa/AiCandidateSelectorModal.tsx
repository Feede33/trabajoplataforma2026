'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Sparkles,
  Wand2,
  ArrowLeft,
  ArrowRight,
  X,
  Check,
  CheckCircle2,
  RotateCcw,
  Users,
  Briefcase,
  Mail,
  FileText,
  ExternalLink,
  ChevronRight,
  Copy,
  CheckCheck,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  Building2,
  Lock,
  Eye
} from 'lucide-react'
import {
  JobWithEmpresa,
  ApplicationWithDetails,
  ApplicationEstado
} from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

export interface CandidateEvaluation {
  applicationId: string
  matchScore: number
  badgeLabel: string
  summary: string
  strengths: string[]
  recommendation: 'recomendado' | 'considerar' | 'descartar'
}

interface HistoryItem {
  index: number
  appId: string
  prevStatus: ApplicationEstado
  action: 'selected' | 'rejected'
}

interface AiCandidateSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  jobs: JobWithEmpresa[]
  applications: ApplicationWithDetails[]
  initialJobId?: string
  onStatusChange: (appId: string, newStatus: ApplicationEstado) => Promise<void>
}

export function AiCandidateSelectorModal({
  isOpen,
  onClose,
  jobs,
  applications,
  initialJobId,
  onStatusChange,
}: AiCandidateSelectorModalProps) {
  // Step: 'select_job' | 'analyzing' | 'tinder' | 'completed'
  const [step, setStep] = useState<'select_job' | 'analyzing' | 'tinder' | 'completed'>('select_job')

  // Selected job
  const [selectedJobId, setSelectedJobId] = useState<string>('')

  // AI Evaluations mapped by applicationId
  const [evaluations, setEvaluations] = useState<Record<string, CandidateEvaluation>>({})
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Ordered candidate list for the active job
  const [deck, setDeck] = useState<ApplicationWithDetails[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)

  // History for Undo (Volver atrás)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Visual animation stamps: 'selected' | 'rejected' | null
  const [stamp, setStamp] = useState<'selected' | 'rejected' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  // Session summary
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const [copiedEmails, setCopiedEmails] = useState(false)

  // Pick default job when modal opens
  useEffect(() => {
    if (!isOpen) {
      setStep('select_job')
      setStamp(null)
      setSwipeDirection(null)
      setHistory([])
      return
    }

    if (initialJobId && initialJobId !== 'todos') {
      setSelectedJobId(initialJobId)
    } else if (jobs.length > 0) {
      // Prioritize the first job that has applications
      const jobWithApps = jobs.find((j) =>
        applications.some((a) => a.job_id === j.id || a.job?.slug === j.slug)
      )
      setSelectedJobId(jobWithApps ? jobWithApps.id : jobs[0].id)
    }
  }, [isOpen, initialJobId, jobs, applications])

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || null
  }, [jobs, selectedJobId])

  const currentJobApplications = useMemo(() => {
    if (!selectedJob) return []
    return applications.filter(
      (a) => a.job_id === selectedJob.id || a.job?.slug === selectedJob.slug
    )
  }, [selectedJob, applications])

  // Start AI Analysis for the chosen job
  const handleStartAnalysis = async () => {
    if (!selectedJob || currentJobApplications.length === 0) return

    setStep('analyzing')
    setIsAnalyzing(true)

    try {
      const payload = {
        job: {
          id: selectedJob.id,
          titulo: selectedJob.titulo,
          descripcion: selectedJob.descripcion,
          rubro: selectedJob.rubro,
          zona: selectedJob.zona,
          modalidad: selectedJob.modalidad,
          tags: selectedJob.tags,
        },
        candidates: currentJobApplications.map((app) => ({
          id: app.id,
          candidatoNombre: app.candidato?.nombre || 'Candidato',
          candidatoEmail: app.candidato?.email || '',
          mensaje: app.mensaje,
          hasCv: !!app.candidato?.cv_url,
          created_at: app.created_at,
        })),
      }

      const res = await fetch('/api/empresa/ai-screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      const evalsMap: Record<string, CandidateEvaluation> = {}

      if (data && Array.isArray(data.evaluations)) {
        data.evaluations.forEach((ev: CandidateEvaluation) => {
          evalsMap[ev.applicationId] = ev
        })
      }

      setEvaluations(evalsMap)

      // Sort applicants by AI match score descending (best first)
      const sorted = [...currentJobApplications].sort((a, b) => {
        const scoreA = evalsMap[a.id]?.matchScore ?? 70
        const scoreB = evalsMap[b.id]?.matchScore ?? 70
        return scoreB - scoreA
      })

      setDeck(sorted)
      setCurrentIndex(0)
      setHistory([])
      setSelectedIds(new Set())
      setRejectedIds(new Set())

      // Short delay for the nice analysis transition
      setTimeout(() => {
        setIsAnalyzing(false)
        setStep('tinder')
      }, 700)
    } catch (err) {
      console.warn('Error en análisis de IA, usando orden original:', err)
      setDeck(currentJobApplications)
      setCurrentIndex(0)
      setIsAnalyzing(false)
      setStep('tinder')
    }
  }

  // Handle Seleccionar (en vez de like)
  const handleSelect = useCallback(async () => {
    if (isAnimating || currentIndex >= deck.length) return
    const current = deck[currentIndex]
    if (!current) return

    setIsAnimating(true)
    setStamp('selected')
    setSwipeDirection('right')

    // Save previous status for undo
    setHistory((prev) => [
      ...prev,
      {
        index: currentIndex,
        appId: current.id,
        prevStatus: current.estado,
        action: 'selected',
      },
    ])
    setSelectedIds((prev) => new Set(prev).add(current.id))
    setRejectedIds((prev) => {
      const next = new Set(prev)
      next.delete(current.id)
      return next
    })

    // Update status in backend / state
    await onStatusChange(current.id, 'seleccionado')

    setTimeout(() => {
      setStamp(null)
      setSwipeDirection(null)
      setIsAnimating(false)
      const nextIndex = currentIndex + 1
      if (nextIndex >= deck.length) {
        setStep('completed')
      } else {
        setCurrentIndex(nextIndex)
      }
    }, 380)
  }, [currentIndex, deck, isAnimating, onStatusChange])

  // Handle Descartar (Arrow Right / Pass)
  const handleDiscard = useCallback(async () => {
    if (isAnimating || currentIndex >= deck.length) return
    const current = deck[currentIndex]
    if (!current) return

    setIsAnimating(true)
    setStamp('rejected')
    setSwipeDirection('left')

    // Save previous status for undo
    setHistory((prev) => [
      ...prev,
      {
        index: currentIndex,
        appId: current.id,
        prevStatus: current.estado,
        action: 'rejected',
      },
    ])
    setRejectedIds((prev) => new Set(prev).add(current.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(current.id)
      return next
    })

    // Update status in backend / state
    await onStatusChange(current.id, 'rechazado')

    setTimeout(() => {
      setStamp(null)
      setSwipeDirection(null)
      setIsAnimating(false)
      const nextIndex = currentIndex + 1
      if (nextIndex >= deck.length) {
        setStep('completed')
      } else {
        setCurrentIndex(nextIndex)
      }
    }, 380)
  }, [currentIndex, deck, isAnimating, onStatusChange])

  // Handle Volver Atrás (Undo / Arrow Left)
  const handleUndo = useCallback(async () => {
    if (isAnimating || history.length === 0) return

    setIsAnimating(true)
    const lastItem = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    setHistory(newHistory)

    // Revert candidate status in database/state
    await onStatusChange(lastItem.appId, lastItem.prevStatus)

    if (lastItem.action === 'selected') {
      setSelectedIds((prev) => {
        const next = new Set(prev)
        next.delete(lastItem.appId)
        return next
      })
    } else {
      setRejectedIds((prev) => {
        const next = new Set(prev)
        next.delete(lastItem.appId)
        return next
      })
    }

    // Step index backwards
    setCurrentIndex(lastItem.index)
    if (step === 'completed') {
      setStep('tinder')
    }

    setTimeout(() => {
      setIsAnimating(false)
    }, 200)
  }, [history, isAnimating, onStatusChange, step])

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen || step !== 'tinder') return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault()
        handleDiscard()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        handleUndo()
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleSelect()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, step, handleSelect, handleDiscard, handleUndo, onClose])

  // Prevent background scrolling while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const currentCandidate = deck[currentIndex] || null
  const currentEvaluation = currentCandidate ? evaluations[currentCandidate.id] : null

  // Copy selected candidate emails
  const handleCopySelectedEmails = () => {
    const emails = deck
      .filter((c) => selectedIds.has(c.id) && c.candidato?.email)
      .map((c) => c.candidato?.email)
      .join(', ')

    if (emails) {
      navigator.clipboard.writeText(emails)
      setCopiedEmails(true)
      setTimeout(() => setCopiedEmails(false), 2500)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[94vh]">
        {/* ============================================================== */}
        {/* STEP 1: SELECT JOB / ANUNCIO                                   */}
        {/* ============================================================== */}
        {step === 'select_job' && (
          <div className="flex flex-col h-full max-h-[90vh]">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white dark:from-purple-950/30 dark:via-indigo-950/20 dark:to-slate-900 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none shrink-0">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      Seleccionar con IA
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold text-[10px] uppercase tracking-wide">
                      Tinder Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Elegí cuál de tus anuncios querés evaluar. La IA leerá todos los postulantes y los organizará de mayor a menor compatibilidad.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Job List Selector */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Tus Anuncios Publicados ({jobs.length})
              </label>

              {jobs.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    No tenés búsquedas publicadas todavía
                  </p>
                  <p className="text-xs text-slate-500">
                    Publicá un empleo para comenzar a recibir candidatos y evaluarlos con IA.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {jobs.map((job) => {
                    const jobApps = applications.filter(
                      (a) => a.job_id === job.id || a.job?.slug === job.slug
                    )
                    const count = jobApps.length
                    const isSelected = selectedJobId === job.id
                    const hasPending = jobApps.some((a) => a.estado === 'pendiente')

                    return (
                      <div
                        key={job.id}
                        onClick={() => setSelectedJobId(job.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-sm'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/60'
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div
                            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                              {job.titulo}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              <span>{job.zona || 'Uruguay'}</span>
                              <span>•</span>
                              <span className="capitalize">{job.modalidad}</span>
                              {job.rubro && (
                                <>
                                  <span>•</span>
                                  <span>{job.rubro}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {count > 0 ? (
                            <span
                              className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300'
                              }`}
                            >
                              <Users className="w-3.5 h-3.5" />
                              <span>{count} {count === 1 ? 'postulante' : 'postulantes'}</span>
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800">
                              0 postulantes
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer with action button */}
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                {selectedJob && (
                  <span>
                    Anuncio seleccionado: <strong className="text-slate-800 dark:text-slate-200">{selectedJob.titulo}</strong>
                    {' '}({currentJobApplications.length} {currentJobApplications.length === 1 ? 'postulante' : 'postulantes'})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={!selectedJob || currentJobApplications.length === 0}
                  className={`w-1/2 sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md ${
                    !selectedJob || currentJobApplications.length === 0
                      ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 shadow-indigo-200 dark:shadow-none hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>
                    {currentJobApplications.length === 0
                      ? 'Sin postulantes para evaluar'
                      : `Comenzar Selección con IA (${currentJobApplications.length})`}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 2: ANALYZING STATE (AI READING CANDIDATES)                 */}
        {/* ============================================================== */}
        {step === 'analyzing' && (
          <div className="p-10 sm:p-14 text-center space-y-6 flex flex-col items-center justify-center min-h-[420px]">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-pink-500 text-white flex items-center justify-center shadow-xl shadow-indigo-300/50 dark:shadow-none animate-bounce">
                <Wand2 className="w-10 h-10 animate-pulse text-amber-300" />
              </div>
              <div className="absolute -inset-2 rounded-3xl bg-purple-500/20 blur-xl animate-pulse" />
            </div>

            <div className="space-y-2 max-w-md">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">
                La IA está leyendo a todos los postulantes...
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Analizando cartas de presentación, perfiles y currículums para el puesto de{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">
                  {selectedJob?.titulo}
                </strong>
                . Organizándolos por orden de compatibilidad.
              </p>
            </div>

            {/* Animated Progress Steps */}
            <div className="w-full max-w-sm space-y-2 text-left bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold animate-pulse">
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Extrayendo cartas y aptitudes clave...</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>Evaluando {currentJobApplications.length} {currentJobApplications.length === 1 ? 'postulación' : 'postulaciones'} recibidas</span>
              </div>
              <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold">
                <div className="w-2 h-2 rounded-full bg-purple-600 animate-ping" />
                <span>Preparando panel de selección estilo Tinder...</span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 3: TINDER INTERACTIVE CARD DECK                           */}
        {/* ============================================================== */}
        {step === 'tinder' && currentCandidate && (
          <div className="flex flex-col h-full max-h-[92vh]">
            {/* Top Navigation & Progress */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setStep('select_job')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                  title="Cambiar de anuncio"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 truncate">
                      {selectedJob?.titulo}
                    </span>
                  </div>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                    Postulante {currentIndex + 1} de {deck.length}
                  </p>
                </div>
              </div>

              {/* Counter Badges & Close */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3" />
                  <span>{selectedIds.size} seleccionados</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-800">
                  <X className="w-3 h-3" />
                  <span>{rejectedIds.size} descartados</span>
                </span>

                <button
                  onClick={onClose}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Cerrar selección"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-1 transition-all duration-300"
                style={{ width: `${((currentIndex) / deck.length) * 100}%` }}
              />
            </div>

            {/* Tinder Card Container */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col justify-start relative">
              {/* STAMP: ¡SELECCIONADO! */}
              {stamp === 'selected' && (
                <div className="absolute top-8 right-8 z-30 pointer-events-none transform rotate-12 animate-in zoom-in-75 duration-200">
                  <div className="px-5 py-2 border-4 border-emerald-500 text-emerald-600 dark:text-emerald-400 font-black text-2xl uppercase tracking-widest rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-2xl backdrop-blur-md flex items-center gap-2">
                    <CheckCircle2 className="w-7 h-7" />
                    <span>¡SELECCIONADO!</span>
                  </div>
                </div>
              )}

              {/* STAMP: DESCARTADO */}
              {stamp === 'rejected' && (
                <div className="absolute top-8 left-8 z-30 pointer-events-none transform -rotate-12 animate-in zoom-in-75 duration-200">
                  <div className="px-5 py-2 border-4 border-rose-500 text-rose-600 dark:text-rose-400 font-black text-2xl uppercase tracking-widest rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-2xl backdrop-blur-md flex items-center gap-2">
                    <X className="w-7 h-7" />
                    <span>DESCARTADO</span>
                  </div>
                </div>
              )}

              {/* The Active Tinder Card */}
              <div
                className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-5 sm:p-6 space-y-5 transition-all duration-300 ${
                  swipeDirection === 'right'
                    ? 'translate-x-28 rotate-6 opacity-0'
                    : swipeDirection === 'left'
                    ? '-translate-x-28 -rotate-6 opacity-0'
                    : 'translate-x-0 rotate-0 opacity-100'
                }`}
              >
                {/* Header: Candidate Info & AI Match Score */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md shadow-indigo-200 dark:shadow-none">
                      {currentCandidate.candidato?.nombre
                        ? currentCandidate.candidato.nombre[0].toUpperCase()
                        : 'C'}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-slate-900 dark:text-white text-lg truncate">
                        {currentCandidate.candidato?.nombre || 'Candidato'}
                      </h3>
                      {currentCandidate.candidato?.email ? (
                        <a
                          href={`mailto:${currentCandidate.candidato.email}`}
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                        >
                          <Mail className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{currentCandidate.candidato.email}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">Sin email público</span>
                      )}
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Postulado {formatRelativeTime(currentCandidate.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* AI Match Badge */}
                  <div className="flex flex-row sm:flex-col items-start sm:items-end gap-1.5 shrink-0">
                    <div className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-purple-500/10 to-indigo-500/10 border border-emerald-300 dark:border-emerald-700/50 flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                        {currentEvaluation?.matchScore ?? 85}% Coincidencia IA
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300">
                      {currentEvaluation?.badgeLabel || 'Perfil Compatible'}
                    </span>
                  </div>
                </div>

                {/* AI Review / Insight Box */}
                <div className="bg-gradient-to-br from-purple-50/80 via-indigo-50/50 to-white dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 p-4 rounded-2xl border border-purple-200/80 dark:border-purple-800/40 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-purple-300">
                    <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Veredicto de la Inteligencia Artificial:</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {currentEvaluation?.summary ||
                      'El postulante cumple con los criterios solicitados para la vacante y muestra buena predisposición.'}
                  </p>

                  {/* Strengths list */}
                  {currentEvaluation?.strengths && currentEvaluation.strengths.length > 0 && (
                    <div className="pt-1 flex flex-wrap gap-1.5">
                      {currentEvaluation.strengths.map((str, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800/90 text-[11px] font-semibold text-slate-700 dark:text-slate-300 border border-purple-100 dark:border-purple-900/50 shadow-2xs"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>{str}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Candidate Cover Letter */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Carta de Presentación del Candidato
                  </label>
                  {currentCandidate.mensaje ? (
                    <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 italic leading-relaxed">
                      "{currentCandidate.mensaje}"
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 italic p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                      El candidato no incluyó un mensaje escrito en su postulación.
                    </div>
                  )}
                </div>

                {/* CV PDF Button */}
                <div>
                  {currentCandidate.candidato?.cv_url ? (
                    <a
                      href={currentCandidate.candidato.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between py-3 px-4 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-colors group"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Ver Currículum Vitae (PDF original)</span>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-indigo-500 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  ) : (
                    <div className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Sin CV adjunto en archivo</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ============================================================== */}
            {/* TINDER CONTROLS DOCK (VOLVER ATRÁS, DESCARTAR, SELECCIONAR)   */}
            {/* ============================================================== */}
            <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center gap-3">
              <div className="flex items-center justify-center gap-4 sm:gap-6 w-full max-w-md">
                {/* BOTÓN VOLVER ATRÁS (Arrow Left / Undo) */}
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={isAnimating || history.length === 0}
                  className={`flex flex-col items-center justify-center gap-1 w-14 h-14 rounded-2xl border transition-all ${
                    history.length === 0 || isAnimating
                      ? 'border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 cursor-not-allowed'
                      : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:scale-105 active:scale-95 shadow-sm'
                  }`}
                  title="Volver al postulante anterior (Tecla Flecha Izquierda ←)"
                >
                  <RotateCcw className="w-5 h-5" />
                  <span className="text-[9px] font-bold uppercase tracking-tight">Atrás</span>
                </button>

                {/* BOTÓN DESCARTAR (Arrow Right / Cross) */}
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={isAnimating}
                  className="flex-1 py-3.5 px-4 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-700 dark:text-rose-400 font-bold text-sm shadow-sm transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2 group"
                  title="Descartar candidato (Tecla Flecha Derecha →)"
                >
                  <X className="w-5 h-5 text-rose-600 dark:text-rose-400 group-hover:rotate-90 transition-transform" />
                  <span>Descartar</span>
                  <ArrowRight className="w-4 h-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* BOTÓN SELECCIONAR (En vez de like) */}
                <button
                  type="button"
                  onClick={handleSelect}
                  disabled={isAnimating}
                  className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm shadow-lg shadow-emerald-200/50 dark:shadow-none transition-all hover:scale-102 active:scale-98 flex items-center justify-center gap-2 group ring-2 ring-emerald-500/20"
                  title="Seleccionar candidato (Tecla Espacio o Enter)"
                >
                  <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
                  <span className="tracking-wide">Seleccionar</span>
                  <Check className="w-4 h-4 text-emerald-200 group-hover:scale-125 transition-transform" />
                </button>
              </div>

              {/* Keyboard shortcuts tip */}
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center hidden sm:block">
                💡 <span className="font-semibold text-slate-600 dark:text-slate-400">Atajos de teclado:</span> [←] Volver atrás • [→] Descartar • [Enter / Espacio] Seleccionar
              </p>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 4: COMPLETED SCREEN                                       */}
        {/* ============================================================== */}
        {step === 'completed' && (
          <div className="flex flex-col h-full max-h-[92vh]">
            <div className="p-6 sm:p-8 text-center space-y-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-b from-emerald-50/50 to-white dark:from-emerald-950/20 dark:to-slate-900">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-200 dark:shadow-none animate-in zoom-in">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  ¡Selección completada!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Revisaste a todos los postulantes para <strong className="text-slate-800 dark:text-slate-200">{selectedJob?.titulo}</strong> con la asistencia de la IA.
                </p>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto pt-2">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center">
                  <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {selectedIds.size}
                  </p>
                  <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">
                    Seleccionados
                  </p>
                </div>
                <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-2xl font-black text-slate-700 dark:text-slate-300">
                    {rejectedIds.size}
                  </p>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                    Descartados
                  </p>
                </div>
              </div>
            </div>

            {/* List of Selected Candidates */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-3 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Candidatos Seleccionados ({selectedIds.size})
                </h4>
                {selectedIds.size > 0 && (
                  <button
                    onClick={handleCopySelectedEmails}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {copiedEmails ? (
                      <>
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-600">¡Emails copiados!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar correos</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {selectedIds.size === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  No seleccionaste ningún candidato en esta ronda.
                </div>
              ) : (
                <div className="space-y-2">
                  {deck
                    .filter((c) => selectedIds.has(c.id))
                    .map((c) => {
                      const ev = evaluations[c.id]
                      return (
                        <div
                          key={c.id}
                          className="p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                              {c.candidato?.nombre ? c.candidato.nombre[0].toUpperCase() : 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {c.candidato?.nombre}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {c.candidato?.email || 'Sin email'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {ev && (
                              <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-lg">
                                {ev.matchScore}%
                              </span>
                            )}
                            <Badge variant="success" size="sm">
                              Seleccionado
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setStep('select_job')}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
              >
                Evaluar otro anuncio
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 dark:shadow-none transition-colors"
              >
                Ver postulaciones en el panel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
