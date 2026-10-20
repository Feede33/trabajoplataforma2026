'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Briefcase,
  Building2,
  MapPin,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { RUBROS, MODALIDADES, TIPOS_CONTRATO, slugify } from '@/lib/utils'
import { createJob } from '@/lib/data'
import { useAuth } from '@/lib/context/AuthContext'
import { JobModalidad, JobTipoContrato } from '@/lib/supabase/database.types'

export default function PublicarEmpleoPage() {
  const router = useRouter()
  const { profile } = useAuth()

  const [titulo, setTitulo] = useState('')
  const [rubro, setRubro] = useState(RUBROS[0])
  const [modalidad, setModalidad] = useState<JobModalidad>('remoto')
  const [tipoContrato, setTipoContrato] = useState<JobTipoContrato>('full-time')
  const [zona, setZona] = useState('Buenos Aires, Argentina')
  const [salario, setSalario] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!titulo.trim() || !descripcion.trim()) {
      setError('Por favor completá el título y la descripción del puesto.')
      return
    }

    setIsSubmitting(true)

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const slug = slugify(titulo) + '-' + Math.floor(1000 + Math.random() * 9000)

      await createJob(
        {
          empresa_id: profile?.id || 'emp-demo',
          titulo,
          descripcion,
          rubro,
          zona,
          modalidad,
          tipo_contrato: tipoContrato,
          salario_rango: salario || null,
          estado: 'activo',
          slug,
          tags,
        },
        profile?.nombre || 'Mi Empresa'
      )

      router.push('/empresa/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error al publicar la vacante.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <Link
        href="/empresa/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver al panel de empresa
      </Link>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Nueva Búsqueda
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Publicar un Nuevo Empleo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Completá los detalles de la posición para comenzar a recibir candidatos calificados
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Título */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Título del Puesto *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Chofer de Larga Distancia, Desarrollador React, Asistente Contable..."
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Grid Rubro + Modalidad + Contrato */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Rubro / Sector *
              </label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
              >
                {RUBROS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Modalidad *
              </label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as JobModalidad)}
                className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
              >
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Tipo de Contrato *
              </label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value as JobTipoContrato)}
                className="w-full px-3.5 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
              >
                {TIPOS_CONTRATO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Zona + Salario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Ubicación / Zona *
              </label>
              <input
                type="text"
                required
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ej: CABA, Rosario, Córdoba, Remoto..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                Rango Salarial (Opcional)
              </label>
              <input
                type="text"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
                placeholder="Ej: $1.200.000 - $1.600.000 ARS o USD 1500"
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Habilidades / Etiquetas (separadas por comas)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ej: Licencia Profesional, Fletes, Cargas, Atención al cliente"
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Descripción del Puesto y Requisitos *
            </label>
            <textarea
              required
              rows={8}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detallá las tareas, requisitos excluyentes, deseables y beneficios que ofrece la empresa..."
              className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 resize-y leading-relaxed"
            />
          </div>

          {/* Submit CTA */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Link
              href="/empresa/dashboard"
              className="px-5 py-3 text-sm font-semibold text-slate-600 hover:text-slate-800"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Publicando...' : 'Publicar Empleo Ahora'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
