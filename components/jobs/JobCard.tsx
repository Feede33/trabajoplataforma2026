import React from 'react'
import Link from 'next/link'
import { MapPin, Building2, Clock, Banknote, ArrowRight, CheckCircle2 } from 'lucide-react'
import { JobWithEmpresa } from '@/lib/supabase/database.types'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'
import { BookmarkIconButton } from '@/components/jobs/BookmarkIconButton'

interface JobCardProps {
  job: JobWithEmpresa
  featured?: boolean
  isApplied?: boolean
}

export function JobCard({ job, featured = false, isApplied = false }: JobCardProps) {
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
    <div
      className={`group relative bg-white rounded-2xl border transition-all duration-200 p-4 sm:p-6 flex flex-col justify-between ${
        featured
          ? 'border-indigo-200 shadow-md shadow-indigo-100/50 hover:shadow-xl hover:border-indigo-300'
          : 'border-slate-200 hover:border-indigo-300 hover:shadow-lg'
      }`}
    >
      <div>
        {/* Header: Company Avatar + Name + Time */}
        <div className="flex items-start justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
              {job.empresa?.avatar_url ? (
                <img
                  src={job.empresa.avatar_url}
                  alt={job.empresa.nombre || 'Empresa'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-6 h-6 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-700 truncate">
                {job.empresa?.nombre || 'Empresa Confidencial'}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{job.zona}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] sm:text-xs text-slate-400 flex items-center gap-1 shrink-0 whitespace-nowrap">
              <Clock className="w-3 h-3 shrink-0" />
              {formatRelativeTime(job.created_at)}
            </span>
            <BookmarkIconButton job={job} size="sm" />
          </div>
        </div>

        {/* Job Title */}
        <Link href={`/empleos/${job.slug}`} className="block mt-4">
          <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {job.titulo}
          </h3>
        </Link>

        {/* Badges: Rubro, Modalidad, Contrato */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          {job.es_externo && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60">
              Oferta Externa
            </span>
          )}
          {isApplied && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Ya postulado
            </span>
          )}
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

        {/* Description snippet */}
        <p className="text-sm text-slate-600 mt-3 line-clamp-2 leading-relaxed">
          {job.descripcion.replace(/[*#_`-]/g, '')}
        </p>

        {/* Tags */}
        {job.tags && job.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {job.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium"
              >
                {tag}
              </span>
            ))}
            {job.tags.length > 4 && (
              <span className="text-[11px] text-slate-400 self-center">
                +{job.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer: Salary + Action CTA */}
      <div className="border-t border-slate-100 mt-5 pt-4 flex items-center justify-between gap-3">
        {job.salario_rango ? (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg min-w-0">
            <Banknote className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{job.salario_rango}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">Salario a convenir</span>
        )}

        <Link
          href={`/empleos/${job.slug}`}
          className={`inline-flex items-center gap-1 text-sm font-semibold group-hover:translate-x-0.5 transition-all shrink-0 whitespace-nowrap ${
            isApplied
              ? 'text-emerald-600 hover:text-emerald-700'
              : 'text-indigo-600 hover:text-indigo-700'
          }`}
        >
          {isApplied ? 'Ver mi postulación' : 'Ver puesto'}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
