'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  MessageCircle,
  MapPin,
  Clock,
  Briefcase,
  Search,
  Sparkles,
  Zap,
  Phone,
  Mail,
  Navigation,
  AlertCircle,
  CheckCircle2,
  X,
  Send,
  Building,
  DollarSign,
  ArrowRight,
  Filter,
  Lock,
  ExternalLink
} from 'lucide-react'
import { InformalJob } from '@/lib/supabase/database.types'
import { fetchInformalJobs, createInformalJob, parseInformalJobWithAI, formatWhatsAppUrl } from '@/lib/data'
import { formatRelativeTime } from '@/lib/utils'
import { useAuth } from '@/lib/context/AuthContext'

export default function EmpleosInformalesPage() {
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<InformalJob[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRubro, setSelectedRubro] = useState('Todos')
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [showAdminNotice, setShowAdminNotice] = useState(false)

  // Verificación de Administrador
  const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'nicodelcerro33@gmail.com'
  const isAdmin =
    profile?.email === adminEmail ||
    profile?.email?.toLowerCase().includes('admin') ||
    (profile?.role as string) === 'admin'

  // AI Modal state
  const [rawText, setRawText] = useState('')
  const [parsedPreview, setParsedPreview] = useState<Partial<InformalJob> | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishSuccess, setPublishSuccess] = useState(false)
  const [publishError, setPublishError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      const data = await fetchInformalJobs()
      setJobs(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleOpenAiModal = () => {
    if (!isAdmin) {
      setShowAdminNotice(true)
      return
    }
    setIsAiModalOpen(true)
    setPublishError('')
    setPublishSuccess(false)
  }

  const handleInterpretAI = () => {
    if (!rawText.trim()) return
    const parsed = parseInformalJobWithAI(rawText)
    setParsedPreview(parsed)
  }

  const handlePublishFromAI = async () => {
    if (!parsedPreview?.cargo) {
      setPublishError('Por favor asegurate de que haya al menos un cargo o título detectado.')
      return
    }

    if (
      !parsedPreview.whatsapp &&
      !parsedPreview.telefono &&
      !parsedPreview.email &&
      !parsedPreview.direccion
    ) {
      setPublishError('Debés indicar al menos un canal de contacto (WhatsApp, teléfono, email o dirección).')
      return
    }

    setIsPublishing(true)
    setPublishError('')

    try {
      const created = await createInformalJob({
        titulo: parsedPreview.titulo || parsedPreview.cargo,
        cargo: parsedPreview.cargo,
        rubro: parsedPreview.rubro || 'General',
        zona: parsedPreview.zona || null,
        horario: parsedPreview.horario || null,
        descripcion: parsedPreview.descripcion || rawText,
        whatsapp: parsedPreview.whatsapp || parsedPreview.contacto_whatsapp || null,
        telefono: parsedPreview.telefono || null,
        email: parsedPreview.email || null,
        direccion: parsedPreview.direccion || null,
        contacto_whatsapp: parsedPreview.whatsapp || parsedPreview.contacto_whatsapp || null,
        contacto_indicaciones: parsedPreview.contacto_indicaciones || null,
        salario: parsedPreview.salario || null,
        raw_text: rawText,
        activo: true,
      })

      setJobs((prev) => [created, ...prev])
      setPublishSuccess(true)
      setTimeout(() => {
        setPublishSuccess(false)
        setIsAiModalOpen(false)
        setRawText('')
        setParsedPreview(null)
      }, 1500)
    } catch (err: any) {
      setPublishError(err.message || 'Error al publicar el aviso.')
    } finally {
      setIsPublishing(false)
    }
  }

  // Ejemplos de prueba reales basados en clasificados
  const loadExample = (type: 'taxi' | 'mecanico' | 'comida') => {
    let ex = ''
    if (type === 'taxi') {
      ex = `CHOFERES para taxi diurno nocturno o trabajar solo, radio taxi 141 con o sin experiencia; enviar foto de libreta al WhatsApp cel 093609479 - 094920807 Cod.Web.298982761`
    } else if (type === 'mecanico') {
      ex = `MECÁNICO aprendiz o estudiante de mecánica entre 23 y 40 años para cambios de aceite en importante Lubricentro. Enviar CV a: lubricantes13@hotmail.com Cod.Web.299225191`
    } else {
      ex = `Estamos buscando personal para local de comidas, ubicado en la zona del Paso Molino, para el turno vespertino 17 a 01am. Para el cargo : CAJERA. WhatsApp ( no llamar porfavor) * 092327302 •.`
    }
    setRawText(ex)
    const parsed = parseInformalJobWithAI(ex)
    setParsedPreview(parsed)
  }

  const rubrosList = [
    'Todos',
    'Transporte y Choferes',
    'Mecánica y Talleres',
    'Gastronomía',
    'Belleza y Estética',
    'Oficios y Mantenimiento',
    'Comercio',
    'Servicios y Limpieza'
  ]

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.titulo.toLowerCase().includes(search.toLowerCase()) ||
      job.cargo.toLowerCase().includes(search.toLowerCase()) ||
      (job.zona && job.zona.toLowerCase().includes(search.toLowerCase())) ||
      job.descripcion.toLowerCase().includes(search.toLowerCase())

    const matchesRubro =
      selectedRubro === 'Todos' || job.rubro.toLowerCase() === selectedRubro.toLowerCase()

    return matchesSearch && matchesRubro
  })

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold tracking-wide">
                <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                <span>Contacto Directo: WhatsApp • Teléfono • Email • Presencial</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Empleos Informales y Avisos Clasificados
              </h1>
              <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                Vacantes de contratación directa: choferes, mecánicos, gastronomía, oficios y servicios.
                Contactá al empleador al instante por su vía directa preferida sin formularios extensos.
              </p>
            </div>

            {/* AI Assistant Button (Only Admin or Subscription Preview) */}
            <div className="shrink-0 flex flex-col items-start sm:items-end gap-1.5">
              <button
                onClick={handleOpenAiModal}
                className={`w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl font-bold text-sm shadow-md transition-all ${
                  isAdmin
                    ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-amber-500/25 hover:shadow-lg transform hover:-translate-y-0.5'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isAdmin ? (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>Publicar Aviso con IA</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-800 text-amber-100 font-extrabold uppercase">
                      Admin
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Publicar con IA</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold border border-slate-200">
                      Próximamente Suscripción
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Search bar & Rubros */}
          <div className="mt-8 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cargo, oficio o zona (ej: Chofer, Mecánico, Manicura, Paso Molino)..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 focus:bg-white border border-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-sm text-slate-800 placeholder-slate-400"
              />
            </div>

            {/* Rubro Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none">
              <span className="text-xs font-semibold text-slate-500 px-2 flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                Rubro:
              </span>
              {rubrosList.map((rubro) => (
                <button
                  key={rubro}
                  onClick={() => setSelectedRubro(rubro)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                    selectedRubro === rubro
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {rubro}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content List */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center justify-between mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Mostrando {filteredJobs.length} {filteredJobs.length === 1 ? 'aviso disponible' : 'avisos disponibles'}
          </p>
          <span className="text-xs text-slate-400">
            Avisos adaptables sin requisitos rígidos
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bg-white rounded-3xl p-6 border border-slate-200 space-y-4 animate-pulse">
                <div className="h-6 w-3/4 bg-slate-200 rounded" />
                <div className="h-4 w-1/2 bg-slate-200 rounded" />
                <div className="h-16 bg-slate-100 rounded-2xl" />
                <div className="h-10 bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
              <Briefcase className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">No encontramos avisos con ese criterio</h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Probá borrando el filtro de búsqueda para ver todos los avisos clasificados disponibles.
            </p>
            <button
              onClick={() => {
                setSearch('')
                setSelectedRubro('Todos')
              }}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredJobs.map((job) => {
              const waNumber = job.whatsapp || job.contacto_whatsapp
              const waLink = waNumber ? formatWhatsAppUrl(waNumber, job.titulo) : null

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-3xl p-6 border border-slate-200 hover:border-amber-300 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                        {job.rubro}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(job.created_at)}
                      </span>
                    </div>

                    {/* Title & Position */}
                    <div>
                      <h3 className="text-lg font-extrabold text-slate-900 leading-snug">
                        {job.titulo}
                      </h3>
                      <p className="text-xs font-semibold text-amber-800 mt-0.5">
                        Cargo: {job.cargo}
                      </p>
                    </div>

                    {/* Adaptable Details Pill Row (Only shows what exists!) */}
                    {(job.zona || job.horario || job.salario) && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        {/* Zona: Solo si existe */}
                        {job.zona && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{job.zona}</span>
                          </span>
                        )}

                        {/* Horario: Solo si existe */}
                        {job.horario && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-medium">
                            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{job.horario}</span>
                          </span>
                        )}

                        {/* Salario: Solo si existe */}
                        {job.salario && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{job.salario}</span>
                          </span>
                        )}
                      </div>
                    )}

                    {/* Description Body */}
                    <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                      <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                        {job.descripcion}
                      </p>
                    </div>

                    {/* Address if to show in person */}
                    {job.direccion && (
                      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 font-medium min-w-0">
                        <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="truncate">Tratar personalmente en: <strong>{job.direccion}</strong></span>
                      </div>
                    )}

                    {/* Indications if present */}
                    {job.contacto_indicaciones && !job.direccion && (
                      <p className="text-[11px] text-slate-500 italic flex items-center gap-1 truncate">
                        ℹ️ <span className="truncate">{job.contacto_indicaciones}</span>
                      </p>
                    )}
                  </div>

                  {/* Adaptable Direct Contact Action Buttons with controlled width and truncation */}
                  {(() => {
                    const showWhatsApp = !!(waLink && waNumber)
                    const showEmail = !!job.email
                    const showPhone = !!(job.telefono && (!waNumber || job.telefono !== waNumber))
                    const totalButtons = (showWhatsApp ? 1 : 0) + (showEmail ? 1 : 0) + (showPhone ? 1 : 0)

                    return (
                      <div
                        className={`pt-2 grid gap-2 w-full ${
                          totalButtons > 1 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
                        }`}
                      >
                        {/* Canal WhatsApp */}
                        {showWhatsApp && (
                          <a
                            href={waLink!}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`Contactar por WhatsApp a ${waNumber}`}
                            className="w-full min-w-0 h-10 flex items-center justify-center gap-2 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all"
                          >
                            <MessageCircle className="w-4 h-4 fill-white shrink-0" />
                            <span className="truncate">WhatsApp ({waNumber})</span>
                          </a>
                        )}

                        {/* Canal Email */}
                        {showEmail && (
                          <a
                            href={`mailto:${job.email}?subject=Postulaci%C3%B3n%20para%20${encodeURIComponent(job.titulo)}`}
                            title={`Enviar CV a ${job.email}`}
                            className="w-full min-w-0 h-10 flex items-center justify-center gap-2 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all"
                          >
                            <Mail className="w-4 h-4 shrink-0" />
                            <span className="truncate">Enviar CV ({job.email})</span>
                          </a>
                        )}

                        {/* Canal Teléfono */}
                        {showPhone && (
                          <a
                            href={`tel:${job.telefono}`}
                            title={`Llamar a ${job.telefono}`}
                            className={`w-full min-w-0 h-10 flex items-center justify-center gap-1.5 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors ${
                              totalButtons === 3 ? 'sm:col-span-2' : ''
                            }`}
                          >
                            <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="truncate">Llamar ({job.telefono})</span>
                          </a>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })}
          </div>
        )}

        {/* Safety Callout */}
        <div className="mt-12 p-6 rounded-3xl bg-blue-50/60 border border-blue-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div className="text-xs text-blue-900 leading-relaxed space-y-0.5">
            <p className="font-bold">Consejo de seguridad para empleos informales:</p>
            <p className="text-blue-700">
              Ningún empleador legítimo debe pedirte dinero ni transferencias por adelantado para entrevistas, exámenes o materiales.
            </p>
          </div>
        </div>
      </main>

      {/* Modal: Aviso de Solo Administrador */}
      {showAdminNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
                Acceso Restringido
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                Publicación con IA exclusiva para Administradores
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed mt-2">
                Por el momento, solo el administrador de la plataforma puede publicar e interpretar avisos con la IA.
                Más adelante se habilitará para empresas y particulares mediante un <strong>sistema de suscripción</strong>.
              </p>
            </div>
            <div className="pt-2 flex flex-col gap-2">
              {!profile ? (
                <Link
                  href="/auth/login"
                  className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  Iniciar Sesión como Administrador
                </Link>
              ) : null}
              <button
                onClick={() => setShowAdminNotice(false)}
                className="w-full py-2.5 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Publicar con IA (Solo Admin) */}
      {isAiModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Publicador Asistido por IA
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 uppercase">
                      Panel Admin
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Pegá cualquier aviso de clasificados o WhatsApp. La IA extraerá los datos adaptables.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 space-y-6 overflow-y-auto">
              {publishSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>¡Aviso interpretado y publicado exitosamente en la plataforma!</span>
                </div>
              )}

              {publishError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{publishError}</span>
                </div>
              )}

              {/* Botones de prueba rápida con clasificados reales */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Cargar clasificados de ejemplo (Del recorte):
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadExample('taxi')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 text-[11px] font-semibold text-slate-700 hover:text-amber-800"
                  >
                    🚕 Chofer Taxi (WhatsApp / Cel)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadExample('mecanico')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 text-[11px] font-semibold text-slate-700 hover:text-amber-800"
                  >
                    🔧 Mecánico (Solo Email)
                  </button>
                  <button
                    type="button"
                    onClick={() => loadExample('comida')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-amber-50 text-[11px] font-semibold text-slate-700 hover:text-amber-800"
                  >
                    🍔 Cajera Paso Molino
                  </button>
                </div>
              </div>

              {/* Input raw text */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Texto del Aviso / Clasificado
                </label>
                <textarea
                  rows={4}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder="Pegá aquí el texto del aviso tal cual lo copiaste..."
                  className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-xs sm:text-sm text-slate-800 resize-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleInterpretAI}
                  disabled={!rawText.trim()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Interpretar Campos con IA</span>
                </button>
              </div>

              {/* Live Extracted Preview */}
              {parsedPreview && (
                <div className="p-5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-4">
                  <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                    <span className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Extracción Adaptable (Solo completa lo que existe):
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Cargo *:</label>
                      <input
                        type="text"
                        value={parsedPreview.cargo || ''}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({ ...prev, cargo: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Zona (Opcional, vacío si no se sabe):
                      </label>
                      <input
                        type="text"
                        value={parsedPreview.zona || ''}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({ ...prev, zona: e.target.value || null }))
                        }
                        placeholder="Sin zona especificada"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        WhatsApp de Contacto:
                      </label>
                      <input
                        type="text"
                        value={parsedPreview.whatsapp || ''}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({
                            ...prev,
                            whatsapp: e.target.value || null,
                            contacto_whatsapp: e.target.value || null,
                          }))
                        }
                        placeholder="Ej: 093609479"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-emerald-700"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Email de Contacto (CV):
                      </label>
                      <input
                        type="email"
                        value={parsedPreview.email || ''}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({ ...prev, email: e.target.value || null }))
                        }
                        placeholder="Ej: lubricantes13@hotmail.com"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-indigo-700"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Teléfono / Llamada:
                      </label>
                      <input
                        type="text"
                        value={parsedPreview.telefono || ''}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({ ...prev, telefono: e.target.value || null }))
                        }
                        placeholder="Ej: 094920807"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Dirección para Presentarse:
                      </label>
                      <input
                        type="text"
                        value={parsedPreview.direccion || ''}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({ ...prev, direccion: e.target.value || null }))
                        }
                        placeholder="Ej: 8 de Octubre 3576"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">
                        Horario / Turno (Opcional):
                      </label>
                      <input
                        type="text"
                        value={parsedPreview.horario || ''}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({ ...prev, horario: e.target.value || null }))
                        }
                        placeholder="Sin horario especificado"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Rubro:</label>
                      <input
                        type="text"
                        value={parsedPreview.rubro || 'General'}
                        onChange={(e) =>
                          setParsedPreview((prev) => ({ ...prev, rubro: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 font-medium"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => setIsAiModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!parsedPreview || isPublishing}
                onClick={handlePublishFromAI}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-amber-200 transition-all"
              >
                {isPublishing ? (
                  <span>Guardando...</span>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Publicar Aviso Inmediatamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
