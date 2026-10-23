'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  AlertCircle,
  Lock,
  Building2,
  ArrowRight
} from 'lucide-react'
import { RUBROS, MODALIDADES, TIPOS_CONTRATO, slugify } from '@/lib/utils'
import { createJob } from '@/lib/data'
import { useAuth } from '@/lib/context/AuthContext'
import { JobModalidad, JobTipoContrato } from '@/lib/supabase/database.types'
import { BillingStatus, fetchBillingStatus } from '@/lib/billing-client'

export default function PublicarEmpleoPage() {
  const router = useRouter()
  const { profile, isLoading, isAdmin } = useAuth()

  const [titulo, setTitulo] = useState('')
  const [rubro, setRubro] = useState(RUBROS[0])
  const [modalidad, setModalidad] = useState<JobModalidad>('remoto')
  const [tipoContrato, setTipoContrato] = useState<JobTipoContrato>('full-time')
  const [zona, setZona] = useState('')
  const [salario, setSalario] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [quotaExceeded, setQuotaExceeded] = useState(false)
  const [billing, setBilling] = useState<BillingStatus | null>(null)

  useEffect(() => {
    if (profile?.ubicacion) {
      setZona(profile.ubicacion)
    } else {
      setZona('Montevideo, Uruguay')
    }
  }, [profile])

  useEffect(() => {
    if (!profile || isAdmin) return
    fetchBillingStatus(profile.id).then(setBilling).catch(() => setBilling(null))
  }, [profile, isAdmin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!profile) {
      setError('Tenés que iniciar sesión como empresa para publicar.')
      return
    }

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
          empresa_id: profile.id,
          titulo,
          descripcion,
          rubro,
          zona: zona || 'Uruguay',
          modalidad,
          tipo_contrato: tipoContrato,
          salario_rango: salario || null,
          estado: 'activo',
          slug,
          tags,
        },
        profile.nombre || 'Mi Empresa'
      )

      router.push('/empresa/dashboard')
    } catch (err: any) {
      setQuotaExceeded(err?.code === 'QUOTA_EXCEEDED')
      setError(err.message || 'Error al publicar la vacante.')
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 space-y-6">
        <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
        <div className="h-96 bg-slate-200 rounded-3xl animate-pulse" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
          <Building2 className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900">Iniciá sesión para publicar</h2>
          <p className="text-sm text-slate-500 mt-2">
            Para publicar una oferta laboral, tenés que identificarte con tu cuenta de Empresa.
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href="/auth/login"
            className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
          >
            <span>Iniciar Sesión</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/auth/registro?tipo=empresa"
            className="w-full py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            Crear Cuenta de Empresa
          </Link>
        </div>
      </div>
    )
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
            Nueva Búsqueda Laboral
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Publicar un Nuevo Empleo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Publicando en nombre de <span className="font-semibold text-slate-800">{profile.nombre || profile.email}</span>
          </p>
        </div>

        {billing && !isAdmin && (
          <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900">
            <span>
              Plan <strong className="capitalize">{billing.plan}</strong>: usaste <strong>{billing.avisosUsados}</strong> de{' '}
              <strong>{billing.avisosLimite}</strong> avisos este mes.
            </span>
            {billing.plan === 'gratis' && (
              <Link href="/planes" className="font-bold text-indigo-700 hover:underline">
                Ver planes
              </Link>
            )}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
            {quotaExceeded && (
              <Link href="/planes" className="ml-auto shrink-0 font-bold text-indigo-700 hover:underline">
                Mejorar mi plan
              </Link>
            )}
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
