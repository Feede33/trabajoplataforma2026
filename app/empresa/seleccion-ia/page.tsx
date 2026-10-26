'use client'

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BriefcaseBusiness,
  Check,
  CheckCheck,
  CheckCircle2,
  CircleHelp,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  Mail,
  MapPin,
  RotateCcw,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import {
  JobWithEmpresa,
  ApplicationWithDetails,
  ApplicationEstado,
} from '@/lib/supabase/database.types'
import {
  fetchJobsByEmpresa,
  fetchApplicationsForEmpresa,
  updateApplicationStatus,
  selectCandidateAndRejectOthers,
} from '@/lib/data'
import { useAuth } from '@/lib/context/AuthContext'
import { formatRelativeTime, getAiBadgeDetails } from '@/lib/utils'

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

function getInitials(name?: string | null) {
  if (!name) return 'C'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function SeleccionIaContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialJobParam = searchParams.get('jobId')

  const { profile, isLoading: authLoading } = useAuth()
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([])
  const [loadingData, setLoadingData] = useState(true)

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

  // Visual animation stamps
  const [stamp, setStamp] = useState<'selected' | 'rejected' | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)

  // Session summary
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set())
  const [copiedEmails, setCopiedEmails] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)

  // Cargar datos de la empresa
  useEffect(() => {
    async function load() {
      if (!profile) return
      setLoadingData(true)
      try {
        const [empJobs, empApps] = await Promise.all([
          fetchJobsByEmpresa(profile.id),
          fetchApplicationsForEmpresa(profile.id),
        ])
        setJobs(empJobs)
        setApplications(empApps)
      } catch (err) {
        console.warn('Error cargando postulaciones:', err)
      } finally {
        setLoadingData(false)
      }
    }

    if (!authLoading && profile) {
      load()
    }
  }, [profile, authLoading])

  // Configurar trabajo inicial
  useEffect(() => {
    if (loadingData || jobs.length === 0) return

    if (initialJobParam && initialJobParam !== 'todos') {
      const exists = jobs.some((j) => j.id === initialJobParam)
      if (exists) {
        setSelectedJobId(initialJobParam)
        return
      }
    }

    const jobWithApps = jobs.find((j) =>
      applications.some((a) => a.job_id === j.id || a.job?.slug === j.slug)
    )
    if (jobWithApps) {
      setSelectedJobId(jobWithApps.id)
    } else {
      setSelectedJobId(jobs[0].id)
    }
  }, [loadingData, jobs, applications, initialJobParam])

  const selectedJob = useMemo(() => {
    return jobs.find((j) => j.id === selectedJobId) || null
  }, [jobs, selectedJobId])

  const currentJobApplications = useMemo(() => {
    if (!selectedJob) return []
    return applications.filter(
      (a) => a.job_id === selectedJob.id || a.job?.slug === selectedJob.slug
    )
  }, [selectedJob, applications])

  const handleStatusChange = useCallback(async (appId: string, newStatus: ApplicationEstado) => {
    if (newStatus === 'seleccionado') {
      const targetApp = applications.find((a) => a.id === appId)
      const jobId = targetApp?.job_id || targetApp?.job?.id || ''
      if (jobId) {
        const rejIds = await selectCandidateAndRejectOthers(appId, jobId)
        const rejSet = new Set(rejIds)
        setApplications((prev) =>
          prev.map((a) => {
            if (a.id === appId) return { ...a, estado: 'seleccionado' }
            const matchesJob = a.job_id === jobId || a.job?.id === jobId || (targetApp?.job?.slug && a.job?.slug === targetApp.job.slug)
            if (rejSet.has(a.id) || (matchesJob && a.id !== appId)) {
              return { ...a, estado: 'rechazado' }
            }
            return a
          })
        )
        return
      }
    }

    await updateApplicationStatus(appId, newStatus)
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, estado: newStatus } : a))
    )
  }, [applications])

  // Start AI Analysis
  const handleStartAnalysis = async () => {
    if (!selectedJob || currentJobApplications.length === 0) return

    setStep('analyzing')
    setIsAnalyzing(true)

    try {
      const evalsMap: Record<string, CandidateEvaluation> = {}

      currentJobApplications.forEach((app) => {
        if (typeof app.ai_match_score === 'number') {
          const badgeDetails = getAiBadgeDetails(app.ai_match_score)
          evalsMap[app.id] = {
            applicationId: app.id,
            matchScore: app.ai_match_score,
            badgeLabel: badgeDetails.label,
            summary: app.ai_summary || 'Postulación evaluada previamente con IA.',
            strengths: app.ai_strengths && app.ai_strengths.length > 0 ? app.ai_strengths : ['Perfil verificado'],
            recommendation: app.ai_match_score >= 75 ? 'recomendado' : app.ai_match_score < 40 ? 'descartar' : 'considerar',
          }
        }
      })

      const pendingApps = currentJobApplications.filter((app) => !evalsMap[app.id])

      if (pendingApps.length > 0) {
        const CHUNK_SIZE = 15
        for (let i = 0; i < pendingApps.length; i += CHUNK_SIZE) {
          const chunk = pendingApps.slice(i, i + CHUNK_SIZE)
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
            candidates: chunk.map((app) => ({
              id: app.id,
              candidatoId: app.candidato_id,
              candidatoNombre: app.candidato?.nombre || 'Candidato',
              candidatoEmail: app.candidato?.email || '',
              mensaje: app.mensaje,
              hasCv: !!app.candidato?.cv_url,
              cvUrl: app.candidato?.cv_url || null,
              created_at: app.created_at,
            })),
          }

          const res = await fetch('/api/empresa/ai-screen', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

          const data = await res.json()
          if (data && Array.isArray(data.evaluations)) {
            data.evaluations.forEach((ev: CandidateEvaluation) => {
              evalsMap[ev.applicationId] = ev
            })
          }
        }
      }

      setEvaluations(evalsMap)

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

      setTimeout(() => {
        setIsAnalyzing(false)
        setStep('tinder')
      }, pendingApps.length === 0 ? 350 : 700)
    } catch (err) {
      console.warn('Error en análisis de IA, usando orden original:', err)
      setDeck(currentJobApplications)
      setCurrentIndex(0)
      setIsAnalyzing(false)
      setStep('tinder')
    }
  }

  // Handle Seleccionar
  const handleSelect = useCallback(async () => {
    if (isAnimating || currentIndex >= deck.length) return
    const current = deck[currentIndex]
    if (!current) return

    setIsAnimating(true)
    setStamp('selected')
    setSwipeDirection('right')

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

    await handleStatusChange(current.id, 'seleccionado')

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
    }, 320)
  }, [currentIndex, deck, isAnimating, handleStatusChange])

  // Handle Descartar
  const handleDiscard = useCallback(async () => {
    if (isAnimating || currentIndex >= deck.length) return
    const current = deck[currentIndex]
    if (!current) return

    setIsAnimating(true)
    setStamp('rejected')
    setSwipeDirection('left')

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

    await handleStatusChange(current.id, 'rechazado')

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
    }, 320)
  }, [currentIndex, deck, isAnimating, handleStatusChange])

  // Handle Undo
  const handleUndo = useCallback(async () => {
    if (isAnimating || history.length === 0) return

    setIsAnimating(true)
    const lastItem = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    setHistory(newHistory)

    await handleStatusChange(lastItem.appId, lastItem.prevStatus)

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

    setCurrentIndex(lastItem.index)
    if (step === 'completed') {
      setStep('tinder')
    }

    setTimeout(() => {
      setIsAnimating(false)
    }, 180)
  }, [history, isAnimating, handleStatusChange, step])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return
      }

      if (e.key === 'Escape') {
        router.push('/empresa/dashboard')
        return
      }

      if (step !== 'tinder') return

      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        e.preventDefault()
        handleDiscard()
      } else if (e.key === 's' || e.key === 'S' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        handleSelect()
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace') {
        e.preventDefault()
        handleUndo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [step, handleSelect, handleDiscard, handleUndo, router])

  const currentCandidate = deck[currentIndex] || null
  const currentEvaluation = currentCandidate ? evaluations[currentCandidate.id] : null

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

  if (loadingData) {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center text-white">
        <Sparkles className="size-10 text-[#b7ff68] animate-spin" />
        <p className="mt-4 text-xs uppercase tracking-[0.24em] text-white/50">Cargando asistente con IA...</p>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[#080b14] text-white selection:bg-[#b7ff68] selection:text-[#080b14]">
      <div className="mx-auto flex min-h-screen w-full max-w-[1480px] flex-col px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            {step === 'select_job' ? (
              <Link
                href="/empresa/dashboard"
                aria-label="Volver al panel"
                className="grid size-10 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
                title="Volver al panel"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setStep('select_job')}
                aria-label="Cambiar de anuncio"
                className="grid size-10 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white cursor-pointer"
                title="Cambiar anuncio de búsqueda"
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
              </button>
            )}

            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b7ff68]">
                Postulaciones / {selectedJob?.rubro || 'Selección con IA'}
              </p>
              <h1 className="mt-1 text-sm font-semibold sm:text-base text-white">
                {step === 'select_job' ? 'Seleccionar anuncio y postulantes' : 'Revisión de candidatos'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelpModal((prev) => !prev)}
              aria-label="Ayuda de atajos"
              className="grid size-10 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white cursor-pointer"
              title="Atajos de teclado e información"
            >
              <CircleHelp aria-hidden="true" className="size-4" />
            </button>

            <Link
              href="/empresa/dashboard"
              aria-label="Cerrar y volver al panel"
              className="grid size-10 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
              title="Volver al panel"
            >
              <X aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </header>

        {showHelpModal && (
          <div className="mt-4 p-4 rounded-2xl border border-white/10 bg-[#111827] text-xs text-white/80 space-y-2 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between font-bold text-[#b7ff68]">
              <span className="flex items-center gap-1.5"><Award className="size-4" /> Atajos de teclado</span>
              <button onClick={() => setShowHelpModal(false)} className="text-white/40 hover:text-white"><X className="size-3.5" /></button>
            </div>
            <p className="text-white/60">
              Podés evaluar rápidamente a tus candidatos usando el teclado:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[#b7ff68] font-bold">[S]</span> o <span className="text-[#b7ff68] font-bold">[Espacio]</span>: Seleccionar
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[#ff9ab0] font-bold">[D]</span> o <span className="text-[#ff9ab0] font-bold">[→]</span>: Descartar
              </div>
              <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                <span className="text-white/70 font-bold">[←]</span>: Volver / Deshacer
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: SELECT JOB */}
        {step === 'select_job' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6 sm:py-10 px-2 sm:px-4">
            <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#111827] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#b7ff68]/10 blur-3xl pointer-events-none" />

              <div className="p-5 sm:p-7 border-b border-white/10 flex items-center justify-between gap-4 relative">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-12 place-items-center rounded-2xl bg-[#b7ff68] text-[#111827] font-bold shadow-[0_0_0_8px_rgba(183,255,104,0.08)]">
                    <Sparkles className="size-6 text-[#111827]" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b7ff68]">
                      Asistente de Selección
                    </p>
                    <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                      Seleccionar con IA
                    </h2>
                    <p className="text-xs text-white/50 mt-0.5">
                      Elegí un anuncio para evaluar y clasificar a sus postulantes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7 space-y-3 max-h-[55vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                    Tus anuncios activos ({jobs.length})
                  </p>
                  <span className="text-[11px] text-white/35">
                    Seleccioná uno para comenzar
                  </span>
                </div>

                {jobs.length === 0 ? (
                  <div className="py-14 text-center space-y-3 border border-dashed border-white/10 rounded-2xl p-6">
                    <BriefcaseBusiness className="size-12 text-white/20 mx-auto" />
                    <p className="text-sm font-semibold text-white/70">
                      No tenés búsquedas publicadas todavía
                    </p>
                    <Link
                      href="/empresa/publicar"
                      className="inline-block px-4 py-2 rounded-xl bg-[#b7ff68] text-[#111827] font-bold text-xs"
                    >
                      Publicar Empleo
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {jobs.map((job) => {
                      const jobApps = applications.filter(
                        (a) => a.job_id === job.id || a.job?.slug === job.slug
                      )
                      const count = jobApps.length
                      const isSelected = selectedJobId === job.id

                      return (
                        <div
                          key={job.id}
                          onClick={() => setSelectedJobId(job.id)}
                          className={`p-4 rounded-2xl border transition-all duration-150 cursor-pointer flex items-center justify-between gap-4 ${
                            isSelected
                              ? 'border-[#b7ff68] bg-[#b7ff68]/[0.08] shadow-[0_0_30px_rgba(183,255,104,0.12)]'
                              : 'border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]'
                          }`}
                        >
                          <div className="min-w-0 flex items-center gap-3.5">
                            <div
                              className={`size-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'border-[#b7ff68] bg-[#b7ff68]'
                                  : 'border-white/30'
                              }`}
                            >
                              {isSelected && <div className="size-1.5 rounded-full bg-[#111827]" />}
                            </div>

                            <div className="min-w-0">
                              <h3 className="font-bold text-sm sm:text-base text-white truncate">
                                {job.titulo}
                              </h3>
                              <div className="flex items-center gap-2 text-xs text-white/45 mt-0.5">
                                <span>{job.zona || 'Uruguay'}</span>
                                <span>·</span>
                                <span className="capitalize">{job.modalidad}</span>
                                {job.rubro && (
                                  <>
                                    <span>·</span>
                                    <span>{job.rubro}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {count > 0 ? (
                              <span
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                                  isSelected
                                    ? 'bg-[#b7ff68] text-[#111827] shadow-[0_0_15px_rgba(183,255,104,0.3)]'
                                    : 'bg-white/10 text-white/80'
                                }`}
                              >
                                <Users className="size-3.5" />
                                <span>{count} {count === 1 ? 'postulante' : 'postulantes'}</span>
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 rounded-xl text-xs font-medium text-white/30 bg-white/5">
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

              <div className="p-5 sm:p-6 border-t border-white/10 bg-[#0c111e] flex items-center justify-between gap-3">
                <Link
                  href="/empresa/dashboard"
                  className="text-xs font-semibold text-white/50 hover:text-white transition-colors px-3 py-2"
                >
                  Cancelar
                </Link>

                <button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={!selectedJob || currentJobApplications.length === 0}
                  className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all duration-200 cursor-pointer ${
                    !selectedJob || currentJobApplications.length === 0
                      ? 'bg-white/10 text-white/30 cursor-not-allowed'
                      : 'bg-[#b7ff68] text-[#111827] hover:bg-[#c6ff85] shadow-[0_10px_30px_rgba(183,255,104,0.25)] hover:-translate-y-0.5 active:scale-98'
                  }`}
                >
                  <Sparkles className="size-4 text-[#111827]" />
                  <span>
                    {currentJobApplications.length === 0
                      ? 'Sin postulantes'
                      : `Comenzar revisión (${currentJobApplications.length})`}
                  </span>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZING */}
        {step === 'analyzing' && (
          <div className="flex-1 flex flex-col justify-center items-center py-10 px-4">
            <div className="w-full max-w-lg rounded-[28px] border border-white/10 bg-[#111827] shadow-[0_30px_100px_rgba(0,0,0,0.5)] p-8 sm:p-12 text-center space-y-6 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#b7ff68]/15 blur-3xl" />

              <div className="relative">
                <div className="size-20 rounded-3xl bg-[#b7ff68] text-[#111827] flex items-center justify-center shadow-[0_0_50px_rgba(183,255,104,0.35)] animate-pulse">
                  <Sparkles className="size-10 text-[#111827] animate-spin" style={{ animationDuration: '6s' }} />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b7ff68]">
                  Inteligencia Artificial
                </p>
                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Analizando candidatos...
                </h3>
                <p className="text-xs text-white/50 max-w-sm">
                  Evaluando afinidad para <span className="text-[#b7ff68] font-semibold">{selectedJob?.titulo}</span>
                </p>
              </div>

              <div className="w-full space-y-2.5 text-left bg-[#080b14]/60 p-4 rounded-2xl border border-white/10 text-xs">
                <div className="flex items-center gap-2.5 text-[#d5ffa8] font-semibold">
                  <Sparkles className="size-3.5 text-[#b7ff68] animate-pulse" />
                  <span>Analizando aptitudes y perfiles...</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/50">
                  <Check className="size-3.5 text-[#b7ff68]" />
                  <span>Calculando nivel de compatibilidad...</span>
                </div>
                <div className="flex items-center gap-2.5 text-white/40">
                  <div className="size-2 rounded-full bg-[#b7ff68] animate-ping" />
                  <span>Preparando tarjetas de revisión...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: TINDER REVISION (V0) */}
        {step === 'tinder' && currentCandidate && (
          <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[220px_minmax(0,760px)_220px] lg:items-center lg:justify-center lg:gap-10">
            <aside className="hidden self-stretch lg:flex lg:flex-col lg:justify-between lg:py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/40">Vacante activa</p>
                <div className="mt-4 border-l border-[#b7ff68] pl-4">
                  <p className="text-lg font-semibold text-white">{selectedJob?.titulo}</p>
                  <p className="mt-1 text-sm leading-6 text-white/45 capitalize">
                    {selectedJob?.rubro || 'General'} · {selectedJob?.modalidad || 'Presencial'}
                  </p>
                </div>
              </div>
              <div className="space-y-5 text-sm text-white/45">
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-white/5 text-[#b7ff68] font-bold">01</span>
                  <span className="text-white/80 font-medium">Perfil actual</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-white/5">02</span>
                  <span>Decisión</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-white/5">03</span>
                  <span>Siguiente perfil</span>
                </div>
              </div>
            </aside>

            <article className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#111827] shadow-[0_30px_100px_rgba(0,0,0,0.35)]">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#b7ff68]/10 blur-3xl pointer-events-none" />

              {stamp === 'selected' && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-6 animate-in zoom-in-75 fade-in duration-150">
                  <div className="px-6 py-3 border-4 border-[#b7ff68] text-[#b7ff68] font-black text-2xl sm:text-3xl uppercase tracking-widest rounded-3xl bg-[#080b14]/95 shadow-[0_0_50px_rgba(183,255,104,0.4)] backdrop-blur-md flex items-center gap-3 transform rotate-6 scale-105">
                    <CheckCircle2 className="size-8 sm:size-9 text-[#b7ff68] shrink-0" />
                    <span>¡SELECCIONADO!</span>
                  </div>
                </div>
              )}

              {stamp === 'rejected' && (
                <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center p-6 animate-in zoom-in-75 fade-in duration-150">
                  <div className="px-6 py-3 border-4 border-[#ff6b8a] text-[#ff6b8a] font-black text-2xl sm:text-3xl uppercase tracking-widest rounded-3xl bg-[#080b14]/95 shadow-[0_0_50px_rgba(255,107,138,0.4)] backdrop-blur-md flex items-center gap-3 transform -rotate-6 scale-105">
                    <X className="size-8 sm:size-9 text-[#ff6b8a] shrink-0" />
                    <span>DESCARTADO</span>
                  </div>
                </div>
              )}

              <div className="relative border-b border-white/10 px-5 py-4 sm:px-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-white/50">
                    <span className="size-2 rounded-full bg-[#b7ff68]" />
                    <span>
                      Perfil {String(currentIndex + 1).padStart(2, '0')} de {String(deck.length).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-[#b7ff68] bg-[#b7ff68]/10 px-2.5 py-0.5 rounded-full border border-[#b7ff68]/20">
                      {selectedIds.size} seleccionados
                    </span>
                  </div>
                </div>
              </div>

              <div
                className={`relative space-y-7 px-5 py-6 sm:px-8 sm:py-8 transition-all duration-300 ease-out ${
                  swipeDirection === 'right'
                    ? 'translate-x-44 rotate-12 opacity-0 scale-95 pointer-events-none'
                    : swipeDirection === 'left'
                    ? '-translate-x-44 -rotate-12 opacity-0 scale-95 pointer-events-none'
                    : 'translate-x-0 rotate-0 opacity-100 scale-100'
                }`}
              >
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="grid size-16 place-items-center rounded-2xl bg-[#b7ff68] text-2xl font-bold text-[#111827] shadow-[0_0_0_8px_rgba(183,255,104,0.08)] shrink-0">
                      {getInitials(currentCandidate.candidato?.nombre)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-2xl font-bold tracking-tight text-white">
                          {currentCandidate.candidato?.nombre || 'Candidato'}
                        </h2>
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
                          {currentCandidate.estado === 'pendiente' ? 'Nuevo' : currentCandidate.estado}
                        </span>
                      </div>
                      {currentCandidate.candidato?.email ? (
                        <a
                          href={`mailto:${currentCandidate.candidato.email}`}
                          className="mt-1 flex items-center gap-2 text-sm text-white/50 hover:text-[#b7ff68] transition-colors"
                        >
                          <Mail aria-hidden="true" className="size-4 text-white/40" />
                          <span>{currentCandidate.candidato.email}</span>
                        </a>
                      ) : (
                        <p className="mt-1 flex items-center gap-2 text-sm text-white/40">
                          <Mail aria-hidden="true" className="size-4" /> Sin email público
                        </p>
                      )}
                      <p className="mt-2 text-xs text-white/35">
                        Postuló {formatRelativeTime(currentCandidate.created_at)}
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const score = currentEvaluation?.matchScore ?? 80
                    const badgeLabel = currentEvaluation?.badgeLabel || getAiBadgeDetails(score).label
                    return (
                      <div className="rounded-2xl border border-[#b7ff68]/20 bg-[#b7ff68]/5 px-4 py-3 sm:min-w-44 shrink-0">
                        <div className="flex items-center justify-between gap-4 text-xs font-semibold text-[#b7ff68]">
                          <span className="flex items-center gap-1.5">
                            <Sparkles aria-hidden="true" className="size-4" /> Match IA
                          </span>
                          <span>{score}%</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-[#b7ff68] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                          />
                        </div>
                        <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
                          {badgeLabel}
                        </p>
                      </div>
                    )
                  })()}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-2 text-xs text-white/35">
                      <BriefcaseBusiness className="size-4" />
                      <span>Experiencia</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white/85">
                      {currentCandidate.candidato?.bio
                        ? currentCandidate.candidato.bio.slice(0, 32)
                        : 'Perfil verificado'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-2 text-xs text-white/35">
                      <MapPin className="size-4" />
                      <span>Ubicación</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white/85">
                      {currentCandidate.candidato?.ubicacion || selectedJob?.zona || 'Uruguay'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                    <div className="flex items-center gap-2 text-xs text-white/35">
                      <Gauge className="size-4" />
                      <span>Modalidad</span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white/85 capitalize">
                      {selectedJob?.modalidad || 'Inmediata'}
                    </p>
                  </div>
                </div>

                <section className="rounded-2xl border border-[#b7ff68]/20 bg-[#b7ff68]/[0.045] p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#d5ffa8]">
                    <Sparkles aria-hidden="true" className="size-4 text-[#b7ff68]" />
                    <span>Lectura rápida de IA</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-white/70">
                    {currentEvaluation?.summary ||
                      'El postulante cuenta con disponibilidad y aptitudes afines a la vacante solicitada.'}
                  </p>
                  {currentEvaluation?.strengths && currentEvaluation.strengths.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {currentEvaluation.strengths.map((str, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#111827] px-3 py-2 text-xs font-medium text-white/70"
                        >
                          <span className="size-1.5 rounded-full bg-[#b7ff68]" />
                          {str}
                        </span>
                      ))}
                    </div>
                  )}
                </section>

                <section>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                      Carta de presentación
                    </p>
                  </div>
                  {currentCandidate.mensaje ? (
                    <div className="mt-3 rounded-2xl border border-white/10 bg-[#080b14]/50 px-4 py-4 text-sm text-white/80 leading-relaxed italic">
                      "{currentCandidate.mensaje}"
                    </div>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-white/10 bg-[#080b14]/50 px-4 py-4 text-sm italic text-white/35">
                      El candidato no incluyó un mensaje escrito en su postulación.
                    </div>
                  )}
                </section>

                {currentCandidate.candidato?.cv_url ? (
                  <a
                    href={currentCandidate.candidato.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-sm font-semibold text-white/80 transition hover:border-[#b7ff68]/40 hover:bg-white/[0.07] group cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <FileText aria-hidden="true" className="size-5 text-[#b7ff68]" /> Ver CV del candidato (PDF)
                    </span>
                    <ExternalLink aria-hidden="true" className="size-4 text-white/40 group-hover:text-[#b7ff68] transition-colors" />
                  </a>
                ) : (
                  <div className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3.5 text-xs text-white/35">
                    <FileText className="size-4 text-white/30" />
                    <span>Sin CV adjunto en archivo</span>
                  </div>
                )}
              </div>

              <footer className="flex flex-col gap-3 border-t border-white/10 bg-[#0c111e] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={isAnimating || history.length === 0}
                  className={`order-2 flex items-center justify-center gap-2 text-xs font-semibold transition sm:order-1 ${
                    history.length === 0 || isAnimating
                      ? 'text-white/20 cursor-not-allowed'
                      : 'text-white/40 hover:text-white cursor-pointer'
                  }`}
                >
                  <RotateCcw aria-hidden="true" className="size-4" /> Deshacer
                </button>

                <div className="order-1 grid w-full grid-cols-2 gap-3 sm:order-2 sm:w-auto sm:min-w-[360px]">
                  <button
                    type="button"
                    onClick={handleDiscard}
                    disabled={isAnimating}
                    aria-label="Descartar candidato"
                    className="group relative flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#ff6b8a]/35 bg-[#ff6b8a]/[0.06] text-[#ff9ab0] hover:-translate-y-0.5 hover:border-[#ff6b8a]/70 hover:bg-[#ff6b8a]/[0.12] px-4 text-sm font-bold transition duration-200 active:scale-[0.98] cursor-pointer"
                  >
                    <span className="grid size-8 place-items-center rounded-xl bg-[#ff6b8a]/10 group-hover:bg-[#ff6b8a]/20 transition">
                      <X aria-hidden="true" className="size-4 text-[#ff9ab0]" />
                    </span>
                    <span>Descartar</span>
                    <kbd className="hidden rounded-md border border-current/20 bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold opacity-70 sm:inline">
                      D
                    </kbd>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelect}
                    disabled={isAnimating}
                    aria-label="Seleccionar candidato"
                    className="group relative flex min-h-14 items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#b7ff68]/40 bg-[#b7ff68]/[0.06] text-[#d5ffa8] hover:-translate-y-0.5 hover:border-[#b7ff68]/75 hover:bg-[#b7ff68]/[0.12] px-4 text-sm font-bold transition duration-200 active:scale-[0.98] cursor-pointer"
                  >
                    <span className="grid size-8 place-items-center rounded-xl bg-[#b7ff68]/10 group-hover:bg-[#b7ff68]/20 transition">
                      <Check aria-hidden="true" className="size-4 text-[#b7ff68]" />
                    </span>
                    <span>Seleccionar</span>
                    <kbd className="hidden rounded-md border border-current/20 bg-black/10 px-1.5 py-0.5 text-[10px] font-semibold opacity-70 sm:inline">
                      S
                    </kbd>
                  </button>
                </div>
              </footer>
            </article>

            <aside className="hidden lg:block">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">Tu progreso</p>
                <div className="mt-5 text-4xl font-bold tracking-tight text-white">
                  {currentIndex}
                  <span className="text-xl text-white/25"> / {deck.length}</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#b7ff68] transition-all duration-300"
                    style={{ width: `${(currentIndex / Math.max(1, deck.length)) * 100}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-white/40">
                  Toma una decisión para avanzar al siguiente perfil.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-xs text-white/35">
                <Award className="size-4 text-[#b7ff68]" /> Atajo: usa S o D
              </div>
            </aside>
          </section>
        )}

        {/* STEP 4: COMPLETED SUMMARY */}
        {step === 'completed' && (
          <div className="flex-1 flex flex-col justify-center items-center py-6 sm:py-10 px-2 sm:px-4">
            <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#111827] shadow-[0_30px_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col relative">
              <div className="absolute right-0 top-0 h-44 w-44 rounded-full bg-[#b7ff68]/10 blur-3xl pointer-events-none" />

              <div className="p-6 sm:p-8 text-center space-y-4 border-b border-white/10 relative">
                <div className="size-16 rounded-3xl bg-[#b7ff68] text-[#111827] flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(183,255,104,0.3)] animate-in zoom-in">
                  <Check className="size-8 stroke-[3]" />
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#b7ff68]">
                    Proceso Finalizado
                  </p>
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    ¡Selección completada!
                  </h3>
                  <p className="text-xs text-white/50 max-w-md mx-auto">
                    Revisaste a todos los postulantes para <strong className="text-white">{selectedJob?.titulo}</strong>.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto pt-2">
                  <div className="p-3 bg-[#b7ff68]/[0.08] rounded-2xl border border-[#b7ff68]/30 text-center">
                    <p className="text-2xl font-bold text-[#b7ff68]">{selectedIds.size}</p>
                    <p className="text-[10px] font-bold text-[#d5ffa8] uppercase tracking-wider">
                      Seleccionados
                    </p>
                  </div>
                  <div className="p-3 bg-white/[0.03] rounded-2xl border border-white/10 text-center">
                    <p className="text-2xl font-bold text-white/60">{rejectedIds.size}</p>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">
                      Descartados
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7 space-y-3 max-h-[45vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/40">
                    Candidatos seleccionados ({selectedIds.size})
                  </p>
                  {selectedIds.size > 0 && (
                    <button
                      onClick={handleCopySelectedEmails}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#b7ff68] hover:underline cursor-pointer"
                    >
                      {copiedEmails ? (
                        <>
                          <CheckCheck className="size-3.5 text-[#b7ff68]" />
                          <span>¡Emails copiados!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="size-3.5" />
                          <span>Copiar correos</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {selectedIds.size === 0 ? (
                  <div className="p-8 text-center text-xs text-white/35 bg-white/[0.02] rounded-2xl border border-dashed border-white/10">
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
                            className="p-3.5 rounded-2xl border border-[#b7ff68]/30 bg-[#b7ff68]/[0.05] flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="size-9 rounded-xl bg-[#b7ff68] text-[#111827] font-bold text-sm flex items-center justify-center shrink-0">
                                {getInitials(c.candidato?.nombre)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs text-white truncate">
                                  {c.candidato?.nombre}
                                </p>
                                <p className="text-[11px] text-white/45 truncate">
                                  {c.candidato?.email || 'Sin email'}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {ev && (
                                <span className="text-[11px] font-bold text-[#b7ff68] bg-[#b7ff68]/15 px-2.5 py-0.5 rounded-lg border border-[#b7ff68]/20">
                                  {ev.matchScore}% Match
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 border-t border-white/10 bg-[#0c111e] flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setStep('select_job')}
                  className="w-full sm:w-auto text-xs font-semibold text-white/50 hover:text-white transition px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 cursor-pointer"
                >
                  Evaluar otro anuncio
                </button>

                <Link
                  href="/empresa/dashboard"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-[#b7ff68] text-[#111827] hover:bg-[#c6ff85] font-bold text-xs shadow-[0_10px_25px_rgba(183,255,104,0.25)] transition text-center"
                >
                  Ver postulaciones en el panel
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Bottom footer hint */}
        <div className="flex items-center justify-center gap-2 pb-1 text-[11px] text-white/25">
          <ArrowLeft aria-hidden="true" className="size-3" /> Navegar <span>·</span> <ArrowRight aria-hidden="true" className="size-3" /> Decidir con teclado
        </div>
      </div>
    </main>
  )
}

export default function SeleccionIaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center text-white">
          <Sparkles className="size-10 text-[#b7ff68] animate-spin" />
          <p className="mt-4 text-xs uppercase tracking-[0.24em] text-white/50">Cargando...</p>
        </div>
      }
    >
      <SeleccionIaContent />
    </Suspense>
  )
}
