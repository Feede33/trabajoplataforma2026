'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Globe,
  FileText,
  Building2,
  MapPin,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  ArrowRight,
  ShieldAlert,
  CheckSquare,
  Square,
  Layers,
  Compass,
  Clock,
  Play,
  Pause,
  PlusCircle,
  Zap,
  Radio,
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import { ExtractedExternalJob } from '@/lib/gemini'
import { CrawlerSource } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'

export default function AdminAgregadorPage() {
  const { profile, isAdmin, isLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<'deep_crawl' | 'single_url' | 'text' | 'continuous_cron'>('deep_crawl')
  const [urlInput, setUrlInput] = useState('')
  const [textInput, setTextInput] = useState('')
  const [companyHint, setCompanyHint] = useState('')
  const [maxJobsLimit, setMaxJobsLimit] = useState(10)

  const [isExtracting, setIsExtracting] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [crawlStats, setCrawlStats] = useState<{
    mode?: string
    discoveredCount?: number
    skippedCount?: number
  } | null>(null)

  const [extractedJobs, setExtractedJobs] = useState<ExtractedExternalJob[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())

  // Estado para la pestaña de Monitoreo Continuo (Cron)
  const [sources, setSources] = useState<CrawlerSource[]>([])
  const [isLoadingSources, setIsLoadingSources] = useState(false)
  const [isSyncingCron, setIsSyncingCron] = useState(false)
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null)
  const [syncResults, setSyncResults] = useState<any>(null)
  const [syncError, setSyncError] = useState<string | null>(null)

  // Formulario para nueva fuente
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceUrl, setNewSourceUrl] = useState('')
  const [newSourceHint, setNewSourceHint] = useState('')
  const [newSourceRubro, setNewSourceRubro] = useState('Tecnología')
  const [newSourceMaxJobs, setNewSourceMaxJobs] = useState(8)
  const [isAddingSource, setIsAddingSource] = useState(false)

  // Cargar fuentes al montar o al cambiar a pestaña continuous_cron
  const loadSources = async () => {
    setIsLoadingSources(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/admin/job-aggregator', {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })
      const data = await res.json()
      if (data.sources) {
        setSources(data.sources)
      }
    } catch (err) {
      console.error('Error al cargar fuentes de rastreo:', err)
    } finally {
      setIsLoadingSources(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      loadSources()
    }
  }, [isAdmin])

  // Si no es admin
  if (!isLoading && !isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Acceso Restringido</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Esta herramienta de agregación automática está reservada exclusivamente para administradores de PostulaUY.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold"
        >
          Volver al Inicio
        </Link>
      </div>
    )
  }

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)
    setCrawlStats(null)
    setIsExtracting(true)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      let payload: any = {}
      if (activeTab === 'deep_crawl') {
        payload = {
          action: 'deep_crawl',
          url: urlInput.trim(),
          companyHint: companyHint.trim(),
          maxJobs: maxJobsLimit,
        }
      } else if (activeTab === 'single_url') {
        payload = {
          action: 'extract_url',
          url: urlInput.trim(),
          companyHint: companyHint.trim(),
        }
      } else {
        payload = {
          action: 'extract_text',
          text: textInput.trim(),
          companyHint: companyHint.trim(),
          sourceUrl: urlInput.trim(),
        }
      }

      const res = await fetch('/api/admin/job-aggregator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al procesar la extracción')
      }

      if (!data.jobs || data.jobs.length === 0) {
        setErrorMsg('La IA no detectó ofertas de empleo válidas en el contenido analizado.')
      } else {
        setExtractedJobs(data.jobs)
        setSelectedIndices(new Set(data.jobs.map((_: any, idx: number) => idx)))

        if (activeTab === 'deep_crawl') {
          setCrawlStats({
            mode: data.mode,
            discoveredCount: data.discoveredCount,
            skippedCount: data.skippedCount,
          })
          setSuccessMsg(
            `¡Deep Crawl completado! Se descubrieron ${data.discoveredCount || 0} enlaces de vacantes y se extrajeron ${data.jobs.length} ofertas nuevas con Gemini.`
          )
        } else {
          setSuccessMsg(`¡Se extrajeron ${data.jobs.length} ofertas de empleo correctamente con Gemini!`)
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al conectar con el servidor')
    } finally {
      setIsExtracting(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIndices.size === extractedJobs.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(extractedJobs.map((_, i) => i)))
    }
  }

  const toggleSelectJob = (index: number) => {
    const next = new Set(selectedIndices)
    if (next.has(index)) {
      next.delete(index)
    } else {
      next.add(index)
    }
    setSelectedIndices(next)
  }

  const removeJob = (index: number) => {
    const updated = extractedJobs.filter((_, i) => i !== index)
    setExtractedJobs(updated)
    const next = new Set<number>()
    selectedIndices.forEach((i) => {
      if (i < index) next.add(i)
      if (i > index) next.add(i - 1)
    })
    setSelectedIndices(next)
  }

  const handlePublishSelected = async () => {
    if (selectedIndices.size === 0) return
    setIsPublishing(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const jobsToPublish = extractedJobs.filter((_, idx) => selectedIndices.has(idx))

      const res = await fetch('/api/admin/job-aggregator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'publish_batch',
          jobs: jobsToPublish,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al publicar los empleos')
      }

      setSuccessMsg(`¡Éxito! Se han publicado ${data.count} empleos en PostulaUY. Ya están disponibles en /empleos.`)
      setExtractedJobs((prev) => prev.filter((_, idx) => !selectedIndices.has(idx)))
      setSelectedIndices(new Set())
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al publicar las ofertas')
    } finally {
      setIsPublishing(false)
    }
  }

  // Métodos para Monitoreo Continuo (Cron)
  const handleToggleSource = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/admin/job-aggregator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'toggle_source',
          id,
          activo: !currentStatus,
        }),
      })

      if (res.ok) {
        setSources((prev) => prev.map((s) => (s.id === id ? { ...s, activo: !currentStatus } : s)))
      }
    } catch (err) {
      console.error('Error al cambiar estado de la fuente:', err)
    }
  }

  const handleDeleteSource = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta fuente del rastreo continuo?')) return

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/admin/job-aggregator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'delete_source',
          id,
        }),
      })

      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id))
      }
    } catch (err) {
      console.error('Error al eliminar fuente:', err)
    }
  }

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSourceName.trim() || !newSourceUrl.trim()) return

    setIsAddingSource(true)
    setErrorMsg(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/admin/job-aggregator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          action: 'add_source',
          source: {
            nombre: newSourceName.trim(),
            url: newSourceUrl.trim(),
            empresa_hint: newSourceHint.trim() || null,
            rubro_default: newSourceRubro,
            max_jobs_per_run: newSourceMaxJobs,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al guardar fuente')
      }

      if (data.source) {
        setSources((prev) => [data.source, ...prev])
      }
      setNewSourceName('')
      setNewSourceUrl('')
      setNewSourceHint('')
      setShowAddSource(false)
      setSuccessMsg('¡Nueva fuente de rastreo continuo agregada exitosamente!')
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar la fuente')
    } finally {
      setIsAddingSource(false)
    }
  }

  // Sincronizar todas las fuentes activas
  const handleRunSyncNow = async () => {
    setIsSyncingCron(true)
    setSyncError(null)
    setSyncResults(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/cron/sync-jobs', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al ejecutar sincronización automática')
      }

      setSyncResults(data)
      await loadSources()
    } catch (err: any) {
      setSyncError(err.message || 'Error durante la sincronización')
    } finally {
      setIsSyncingCron(false)
    }
  }

  // Sincronizar una fuente específica bajo demanda
  const handleRunSyncSource = async (sourceId: string) => {
    setSyncingSourceId(sourceId)
    setSyncError(null)
    setSyncResults(null)

    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/cron/sync-jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ sourceId }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al rastrear la fuente seleccionada')
      }

      setSyncResults(data)
      await loadSources()
    } catch (err: any) {
      setSyncError(err.message || 'Error durante el rastreo de la fuente')
    } finally {
      setSyncingSourceId(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-extrabold text-[11px] uppercase tracking-wider border border-indigo-200/50">
              Crawler & Agregador IA
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-indigo-500 shrink-0" />
            <span>Deep Crawler y Extracción de Empleos</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Rastrea páginas corporativas completas, descubre automáticamente todos los enlaces de empleos internos y estructúralos con Gemini en 1 clic.
          </p>
        </div>

        <Link
          href="/empleos"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-colors"
        >
          <span>Ver Empleos Publicados</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Card with Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('deep_crawl')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'deep_crawl'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Deep Crawler (Rastrear toda la web)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('single_url')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'single_url'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>URL Individual</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'text'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Pegar Texto / Clasificado</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('continuous_cron')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'continuous_cron'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Monitoreo Continuo & Cron</span>
            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold uppercase">
              Auto
            </span>
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1, 2 & 3: EXTRACCIÓN MANUAL / BAJO DEMANDA
           ───────────────────────────────────────────────────────────── */}
        {activeTab !== 'continuous_cron' ? (
          <form onSubmit={handleExtract} className="space-y-4">
            {activeTab === 'deep_crawl' && (
              <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5">
                <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">¿Cómo funciona el Deep Crawler?</p>
                  <p className="text-[11px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    Ingresa la página raíz de carreras de una empresa (o portal de empleo). El crawler visitará la página, descubrirá automáticamente todos los enlaces a vacantes individuales (<code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded">/jobs/</code>, <code className="bg-white/80 dark:bg-slate-900 px-1 py-0.5 rounded">/vacantes/</code>), descartará las que ya tengas en tu base de datos y extraerá el contenido de cada una con Gemini.
                  </p>
                </div>
              </div>
            )}

            {activeTab !== 'text' ? (
              <div className="space-y-1.5">
                <label htmlFor="url" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {activeTab === 'deep_crawl'
                    ? 'URL de la sección de carreras / bolsa de trabajo de la empresa:'
                    : 'URL directa de una vacante específica:'}
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="url"
                    type="url"
                    required
                    placeholder={
                      activeTab === 'deep_crawl'
                        ? 'https://empresa.com.uy/trabaja-con-nosotros o https://careers.empresa.com'
                        : 'https://careers.empresa.com/job/12345'
                    }
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="text" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Texto de las ofertas de empleo (copiado de LinkedIn, avisos, emails, etc.):
                </label>
                <textarea
                  id="text"
                  required
                  rows={6}
                  placeholder="Pega aquí el texto completo de uno o varios avisos de empleo..."
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="companyHint" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nombre de la Empresa (opcional, ayuda a la IA):
                </label>
                <input
                  id="companyHint"
                  type="text"
                  placeholder="Ej: Tienda Inglesa, Ta-Ta, Mercado Libre, dLocal..."
                  value={companyHint}
                  onChange={(e) => setCompanyHint(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {activeTab === 'deep_crawl' && (
                <div className="space-y-1.5">
                  <label htmlFor="maxJobs" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Límite máximo de vacantes a rastrear por tanda:
                  </label>
                  <select
                    id="maxJobs"
                    value={maxJobsLimit}
                    onChange={(e) => setMaxJobsLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value={5}>Hasta 5 vacantes</option>
                    <option value={10}>Hasta 10 vacantes (Recomendado)</option>
                    <option value={15}>Hasta 15 vacantes</option>
                    <option value={20}>Hasta 20 vacantes</option>
                  </select>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                disabled={isExtracting}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                {isExtracting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                      {activeTab === 'deep_crawl'
                        ? 'Navegando y rastreando vacantes internas con IA...'
                        : 'Descargando y analizando con Gemini...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {activeTab === 'deep_crawl'
                        ? 'Rastrear Página Completa con Deep Crawler'
                        : 'Procesar y Extraer Empleos con IA'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* ─────────────────────────────────────────────────────────────
             TAB 4: MONITOREO CONTINUO & CRON AUTOMÁTICO
             ───────────────────────────────────────────────────────────── */
          <div className="space-y-6">
            {/* Explicación y Estado del Cron */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-slate-50 to-indigo-500/10 dark:from-emerald-950/20 dark:via-slate-850 dark:to-indigo-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Rastreador Continuo Automatizado</span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold uppercase border border-emerald-300 dark:border-emerald-800">
                        Activo
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Frecuencia automática: <span className="font-semibold text-slate-800 dark:text-slate-200">Todos los días a las 07:00 UYT</span> vía Vercel Cron.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunSyncNow}
                  disabled={isSyncingCron || Boolean(syncingSourceId)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer shrink-0"
                >
                  {isSyncingCron ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Rastreando y Sincronizando Fuentes...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Sincronizar Todas las Fuentes Ahora</span>
                    </>
                  )}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">1. Detección Inteligente</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    Visita las bolsas de empleo configuradas y descubre nuevos links a vacantes.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">2. Deduplicación Estricta</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    Compara con las URLs ya guardadas en PostulaUY y omite cualquier empleo repetido.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">3. Publicación Directa</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    Extrae los nuevos empleos con Gemini y los publica automáticamente en /empleos.
                  </p>
                </div>
              </div>
            </div>

            {/* Resultado de la ejecución manual */}
            {syncResults && (
              <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      Sincronización Completada
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(syncResults.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase block">Fuentes Procesadas</span>
                    <span className="text-lg font-extrabold text-white">{syncResults.sources_processed}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                    <span className="text-[10px] text-slate-400 uppercase block">Nuevos Publicados</span>
                    <span className="text-lg font-extrabold text-emerald-400">
                      +{syncResults.total_new_jobs_published}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-slate-400 uppercase block">Estado</span>
                    <span className="text-xs font-bold text-slate-200 mt-1 block">Completado con éxito</span>
                  </div>
                </div>

                {syncResults.details && syncResults.details.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Detalle por Empresa:</p>
                    <div className="space-y-1">
                      {syncResults.details.map((d: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-800/40 text-xs border border-slate-750"
                        >
                          <span className="font-semibold text-slate-200">{d.fuente}</span>
                          {d.error ? (
                            <span className="text-rose-400 text-[11px]">{d.error}</span>
                          ) : (
                            <div className="flex items-center gap-3 text-[11px] text-slate-400">
                              <span>Descubiertos: {d.enlaces_descubiertos || 0}</span>
                              <span>Omitidos: {d.omitidas_existentes || 0}</span>
                              <span className="font-bold text-emerald-400">
                                Publicados: {d.nuevas_publicadas || 0}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {syncError && (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{syncError}</span>
              </div>
            )}

            {/* Gestión de Fuentes Monitoreadas */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Páginas y Portales Monitoreados ({sources.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Estas fuentes son rastreadas automáticamente por el cron para importar vacantes nuevas.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddSource(!showAddSource)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showAddSource ? 'Cerrar Formulario' : 'Añadir Nueva Empresa'}</span>
                </button>
              </div>

              {/* Formulario para Añadir Fuente */}
              {showAddSource && (
                <form
                  onSubmit={handleAddSource}
                  className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/40 dark:bg-slate-850 space-y-4"
                >
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                    Registrar Nueva Fuente para Rastreo Automático
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Nombre de la Empresa o Portal:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Computrabajo, BuscoJobs, Conaprole..."
                        value={newSourceName}
                        onChange={(e) => setNewSourceName(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        URL de la Sección de Carreras / Empleo:
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://empresa.com.uy/trabaja-con-nosotros"
                        value={newSourceUrl}
                        onChange={(e) => setNewSourceUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Pista de Nombre para IA (Opcional):
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: Computrabajo Uruguay"
                        value={newSourceHint}
                        onChange={(e) => setNewSourceHint(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Rubro por defecto:
                        </label>
                        <select
                          value={newSourceRubro}
                          onChange={(e) => setNewSourceRubro(e.target.value)}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          <option value="Tecnología">Tecnología</option>
                          <option value="Comercio">Comercio</option>
                          <option value="Logística">Logística</option>
                          <option value="Salud">Salud</option>
                          <option value="Administración">Administración</option>
                          <option value="Gastronomía">Gastronomía</option>
                          <option value="General">General</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          Máx vacantes/rastreo:
                        </label>
                        <select
                          value={newSourceMaxJobs}
                          onChange={(e) => setNewSourceMaxJobs(Number(e.target.value))}
                          className="w-full px-2.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
                        >
                          <option value={5}>5 vacantes</option>
                          <option value={8}>8 vacantes</option>
                          <option value={10}>10 vacantes</option>
                          <option value={15}>15 vacantes</option>
                          <option value={20}>20 vacantes</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddSource(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isAddingSource}
                      className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
                    >
                      {isAddingSource ? 'Guardando...' : 'Guardar y Activar Fuente'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Fuentes */}
              {isLoadingSources ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  <span>Cargando fuentes de rastreo...</span>
                </div>
              ) : sources.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  No hay fuentes configuradas todavía. Haz clic en &ldquo;Añadir Nueva Empresa&rdquo; arriba.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {sources.map((source) => (
                    <div
                      key={source.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 dark:text-white text-sm">
                            {source.nombre}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              source.activo
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-750'
                            }`}
                          >
                            {source.activo ? 'Monitoreo Activo' : 'Pausado'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-medium">
                            {source.rubro_default || 'General'}
                          </span>
                        </div>

                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline max-w-full truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{source.url}</span>
                        </a>

                        <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                          <span>
                            Última ejecución:{' '}
                            {source.ultima_ejecucion
                              ? new Date(source.ultima_ejecucion).toLocaleString('es-UY', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Pendiente'}
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {source.total_publicadas || 0} publicadas en total
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        {/* Botón para rastrear inmediatamente ESTA fuente */}
                        <button
                          type="button"
                          onClick={() => handleRunSyncSource(source.id)}
                          disabled={syncingSourceId === source.id || isSyncingCron}
                          title="Rastrear esta fuente ahora mismo"
                          className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 disabled:opacity-50 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {syncingSourceId === source.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600 dark:text-indigo-400" />
                              <span>Rastreando...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                              <span>Rastrear Ahora</span>
                            </>
                          )}
                        </button>

                        {/* Botón para Pausar / Activar */}
                        <button
                          type="button"
                          onClick={() => handleToggleSource(source.id, source.activo)}
                          title={source.activo ? 'Pausar Monitoreo' : 'Activar Monitoreo'}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                            source.activo
                              ? 'border-amber-200 dark:border-amber-900/60 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                              : 'border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          {source.activo ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Activar</span>
                            </>
                          )}
                        </button>

                        {/* Botón para Eliminar */}
                        <button
                          type="button"
                          onClick={() => handleDeleteSource(source.id)}
                          title="Eliminar Fuente"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Crawl Stats Banner for Manual Deep Crawl */}
        {activeTab !== 'continuous_cron' && crawlStats && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Modo:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 capitalize">
                {crawlStats.mode === 'multi_page' ? 'Multilink (Enlaces Internos)' : 'Página única'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Enlaces descubiertos:</span>
              <span className="font-bold text-indigo-600 dark:text-indigo-400">
                {crawlStats.discoveredCount || 0}
              </span>
            </div>
            {crawlStats.skippedCount !== undefined && crawlStats.skippedCount > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Omitidas por ya existir en PostulaUY:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {crawlStats.skippedCount}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Nuevas listas para publicar:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {extractedJobs.length}
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}
      </div>

      {/* Extracted Jobs Preview Section for Manual Extraction */}
      {extractedJobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Ofertas Extraídas Listas para Revisar</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400 text-xs font-extrabold">
                  {extractedJobs.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona las vacantes que deseas publicar en PostulaUY.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {selectedIndices.size === extractedJobs.length ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Deseleccionar todas</span>
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 text-slate-400" />
                    <span>Seleccionar todas</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handlePublishSelected}
                disabled={selectedIndices.size === 0 || isPublishing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Publicando en Supabase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Publicar {selectedIndices.size} Seleccionadas</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extractedJobs.map((job, idx) => {
              const isSelected = selectedIndices.has(idx)
              return (
                <div
                  key={idx}
                  className={`relative p-5 rounded-3xl border transition-all space-y-3 ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 border-indigo-300 dark:border-indigo-600 shadow-md shadow-indigo-100/30'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => toggleSelectJob(idx)}
                      className="flex items-center gap-3 text-left min-w-0 cursor-pointer"
                    >
                      <div className="mt-0.5">
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 shrink-0" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">
                          {job.titulo}
                        </h3>
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                          {job.empresa_nombre}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => removeJob(idx)}
                      title="Eliminar de la vista previa"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge variant="primary" size="sm">
                      {job.rubro}
                    </Badge>
                    <Badge variant="outline" size="sm" className="capitalize">
                      {job.modalidad}
                    </Badge>
                    <Badge variant="outline" size="sm" className="capitalize">
                      {job.tipo_contrato}
                    </Badge>
                    <span className="flex items-center gap-1 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{job.zona}</span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed">
                    {job.descripcion.replace(/[*#_`-]/g, '')}
                  </p>

                  <div className="pt-1 space-y-1 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      URL directa de postulación:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={job.url_postulacion_externa || ''}
                        onChange={(e) => {
                          const updated = [...extractedJobs]
                          updated[idx] = { ...updated[idx], url_postulacion_externa: e.target.value }
                          setExtractedJobs(updated)
                        }}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="https://..."
                      />
                      {job.url_postulacion_externa && (
                        <a
                          href={job.url_postulacion_externa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 dark:text-indigo-400 shrink-0 transition-colors"
                          title="Probar y abrir enlace en nueva pestaña"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
