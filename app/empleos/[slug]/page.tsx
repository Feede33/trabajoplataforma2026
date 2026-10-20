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
  ChevronLeft,
  Briefcase,
  ShieldCheck,
  Sparkles
} from 'lucide-react'
import { fetchJobBySlug } from '@/lib/data'
import { JobWithEmpresa } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { ApplyModal } from '@/components/jobs/ApplyModal'

export default function JobDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params?.slug as string

  const [job, setJob] = useState<JobWithEmpresa | null>(null)
  const [loading, setLoading] = useState(true)
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    async function load() {
      if (!slug) return
      const found = await fetchJobBySlug(slug)
      setJob(found)
      setLoading(false)
    }
    load()
  }, [slug])

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
        <span className="text-slate-800 font-medium truncate max-w-xs">{job.titulo}</span>
      </nav>

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {job.empresa?.avatar_url ? (
                <img
                  src={job.empresa.avatar_url}
                  alt={job.empresa.nombre || 'Empresa'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-slate-400" />
              )}
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {job.titulo}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="font-semibold text-slate-800">{job.empresa?.nombre}</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {job.zona}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
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
          <div className="flex sm:flex-row md:flex-col lg:flex-row items-center gap-3 shrink-0">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-sm"
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

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-200 hover:shadow-lg hover:scale-[1.02]"
            >
              <Sparkles className="w-4 h-4" />
              <span>Postularme Ahora</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Job Description */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
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

            <button
              onClick={() => setIsApplyModalOpen(true)}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all shadow-md shadow-indigo-200"
            >
              Enviar Mi Postulación
            </button>
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
              <span>Aviso verificado por el equipo de EmpleosYa</span>
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      <ApplyModal
        job={job}
        isOpen={isApplyModalOpen}
        onClose={() => setIsApplyModalOpen(false)}
      />
    </div>
  )
}
