'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  MapPin,
  Building2,
  Clock,
  Banknote,
  Globe,
  Share2,
  Check,
  CheckCircle2,
  ChevronLeft,
  Briefcase,
  ShieldCheck,
  Sparkles,
  Pencil,
  ExternalLink
} from 'lucide-react'
import { fetchJobBySlug, fetchCandidateApplicationForJob } from '@/lib/data'
import { JobWithEmpresa, ApplicationWithDetails } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'
import { ApplyModal } from '@/components/jobs/ApplyModal'
import { EditJobModal } from '@/components/jobs/EditJobModal'
import { BookmarkIconButton } from '@/components/jobs/BookmarkIconButton'
import { useAuth } from '@/lib/context/AuthContext'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string
  const { profile, isAdmin } = useAuth()

  const [job, setJob] = useState<JobWithEmpresa | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [existingApplication, setExistingApplication] = useState<ApplicationWithDetails | null>(null)

  const isOwner = Boolean(profile && job && (profile.id === job.empresa_id || isAdmin))

  useEffect(() => {
    async function load() {
      if (!slug) return
      const found = await fetchJobBySlug(slug)
      setJob(found)
      setLoading(false)
    }
    load()
  }, [slug])

  useEffect(() => {
    let active = true
    async function checkApplication() {
      if (!job || !profile || profile.role === 'empresa') {
        if (active) setExistingApplication(null)
        return
      }
      const app = await fetchCandidateApplicationForJob(job.id, profile.id, job.slug)
      if (active) {
        setExistingApplication(app)
      }
    }
    checkApplication()
    return () => {
      active = false
    }
  }, [job?.id, job?.slug, profile?.id, profile?.role])

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-64 bg-slate-200 rounded-3xl animate-pulse" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
          <Briefcase className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Empleo no encontrado</h1>
        <p className="text-sm text-slate-500">
          La vacante que buscás ya no está disponible o el enlace es incorrecto.
        </p>
        <Link
          href="/empleos"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          Volver al listado
        </Link>
      </div>
    )
  }

  const modalidadVariant = {
    remoto: 'success',
    presencial: 'default',
    hibrido: 'purple',
  }[job.modalidad] as 'success' | 'default' | 'purple'

  const modalidadLabel = {
    remoto: 'Remoto',
    presencial: 'Presencial',
    hibrido: 'Híbrido',
  }[job.modalidad]

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-slate-500">
        <Link href="/" className="hover:text-slate-800 transition-colors">
          Inicio
        </Link>
        <span>/</span>
        <Link href="/empleos" className="hover:text-slate-800 transition-colors">
          Empleos
        </Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-[140px] sm:max-w-xs">{job.titulo}</span>
      </nav>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5 min-w-0">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {job.empresa?.avatar_url ? (
                <img
                  src={job.empresa.avatar_url}
                  alt={job.empresa.nombre || 'Empresa'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7 sm:w-8 sm:h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5 min-w-0">
              <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight break-words">
                {job.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{job.empresa?.nombre}</span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                  {job.zona}
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="flex items-center gap-1 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  Publicado {formatRelativeTime(job.created_at)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Badge variant={modalidadVariant} size="sm">
                  {modalidadLabel}
                </Badge>
                <Badge variant="outline" size="sm" className="capitalize">
                  {job.tipo_contrato}
                </Badge>
                <Badge variant="primary" size="sm">
                  {job.rubro}
                </Badge>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col-reverse sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto shrink-0">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleShare}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm"
                title="Copiar enlace"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span className="text-emerald-600">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Compartir</span>
                  </>
                )}
              </button>

              <div className="h-10 px-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center shadow-sm" title="Guardar empleo">
                <BookmarkIconButton job={job} size="default" />
              </div>
            </div>

            {isOwner ? (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md shadow-amber-500/20 hover:shadow-lg hover:scale-[1.02]"
              >
                <Pencil className="w-4 h-4" />
                <span>Editar Empleo</span>
              </button>
            ) : existingApplication ? (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-sm transition-all shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Ya te postulaste • Ver estado</span>
              </button>
            ) : (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:scale-[1.02]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Postularme Ahora</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
              Descripción del Puesto
            </h2>

            <div className="prose prose-slate max-w-none text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {job.descripcion}
            </div>

            {/* Tags */}
            {job.tags && job.tags.length > 0 && (
              <div className="pt-6 border-t border-slate-100">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Tecnologías y Competencias Requeridas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Sidebar info */}
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Resumen de la Oportunidad
            </h3>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Salario</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                  {job.salario_rango || 'A convenir'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Modalidad</span>
                <span className="font-semibold text-slate-800 capitalize">{job.modalidad}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tipo de Contrato</span>
                <span className="font-semibold text-slate-800 capitalize">{job.tipo_contrato}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Sector</span>
                <span className="font-semibold text-slate-800">{job.rubro}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ubicación</span>
                <span className="font-semibold text-slate-800 text-right">{job.zona}</span>
              </div>
            </div>

            {isOwner ? (
              <div className="space-y-2.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200">
                    <Building2 className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Tu aviso de empleo</span>
                  </div>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 pl-5">
                    Como empresa anunciante podés modificar los datos de esta oferta en cualquier momento.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-sm transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  <span>Editar este Empleo</span>
                </button>
              </div>
            ) : existingApplication ? (
              <div className="space-y-2.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ya estás postulado a esta vacante</span>
                  </div>
                  <p className="text-[11px] text-emerald-700 pl-5">
                    Enviada el {formatDateTime(existingApplication.created_at)} ({formatRelativeTime(existingApplication.created_at)}) • Estado:{' '}
                    <span className="font-semibold capitalize">{existingApplication.estado}</span>
                  </p>
                </div>
                <button
                  onClick={() => setIsApplyModalOpen(true)}
                  className="w-full py-2.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-all"
                >
                  Ver Detalle de Mi Postulación
                </button>
              </div>
            ) : job.es_externo ? (
              <div className="space-y-2.5 pt-1">
                <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200">
                    <ExternalLink className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>Convocatoria Externa Verificada</span>
                  </div>
                  <p className="text-[11px] text-sky-700 dark:text-sky-400 pl-5 leading-relaxed">
                    Esta vacante pertenece a <span className="font-semibold">{job.empresa?.nombre || 'la empresa'}</span>. La postulación se realiza directamente en su portal oficial.
                  </p>
                </div>
                <a
                  href={job.url_postulacion_externa || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-sky-500/20 flex items-center justify-center gap-2 group"
                >
                  <span>Postularme en la Web de {job.empresa?.nombre || 'la Empresa'}</span>
                  <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </a>
              </div>
            ) : (
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-200"
              >
                Enviar Mi Postulación
              </button>
            )}
          </div>

          {/* Company Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              Acerca de la Empresa
            </h3>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                {job.empresa?.avatar_url ? (
                  <img src={job.empresa.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-6 h-6 text-slate-400" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">{job.empresa?.nombre}</h4>
                <p className="text-xs text-slate-500">{job.empresa?.ubicacion || job.zona}</p>
              </div>
            </div>

            {job.empresa?.website && (
              <a
                href={job.empresa.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:underline pt-1"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Visitar sitio web oficial</span>
              </a>
            )}

            <div className="pt-2 text-xs text-slate-500 flex items-center gap-1.5 border-t border-slate-100">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Aviso verificado por el equipo de Postulauy.com</span>
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* Apply Modal */}
      <ApplyModal
        job={job}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
        existingApplication={existingApplication}
        onApplied={(app) => setExistingApplication(app)}
      />

      {/* Edit Job Modal (para la empresa dueña del aviso) */}
      {isOwner && job && (
        <EditJobModal
          job={job}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onJobUpdated={(updated) => {
            setJob(updated)
            if (updated.slug && updated.slug !== slug) {
              router.replace(`/empleos/${updated.slug}`)
            }
          }}
        />
      )}
    </>
  )
}
