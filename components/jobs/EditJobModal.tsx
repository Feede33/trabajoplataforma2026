'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  X,
  Pencil,
  Check,
  AlertCircle,
  Save,
  Building2,
  MapPin,
  Banknote,
  Briefcase
} from 'lucide-react'
import { JobWithEmpresa, JobModalidad, JobTipoContrato, JobEstado } from '@/lib/supabase/database.types'
import { RUBROS, MODALIDADES, TIPOS_CONTRATO, DEPARTAMENTOS_UY } from '@/lib/utils'
import { updateJob } from '@/lib/data'

interface EditJobModalProps {
  job: JobWithEmpresa
  isOpen: boolean
  onClose: () => void
  onJobUpdated: (updatedJob: JobWithEmpresa) => void
}

export function EditJobModal({ job, isOpen, onClose, onJobUpdated }: EditJobModalProps) {
  const [titulo, setTitulo] = useState(job.titulo)
  const [rubro, setRubro] = useState(job.rubro)
  const [modalidad, setModalidad] = useState<JobModalidad>(job.modalidad)
  const [tipoContrato, setTipoContrato] = useState<JobTipoContrato>(job.tipo_contrato)
  const [zona, setZona] = useState(job.zona)
  const [salario, setSalario] = useState(job.salario_rango || '')
  const [estado, setEstado] = useState<JobEstado>(job.estado)
  const [tagsInput, setTagsInput] = useState(job.tags?.join(', ') || '')
  const [descripcion, setDescripcion] = useState(job.descripcion)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (isOpen) {
      setTitulo(job.titulo)
      setRubro(job.rubro)
      setModalidad(job.modalidad)
      setTipoContrato(job.tipo_contrato)
      setZona(job.zona)
      setSalario(job.salario_rango || '')
      setEstado(job.estado)
      setTagsInput(job.tags?.join(', ') || '')
      setDescripcion(job.descripcion)
      setErrorMessage('')
      setSuccessMessage('')
    }
  }, [isOpen, job])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!titulo.trim()) {
      setErrorMessage('El título del puesto es obligatorio.')
      return
    }

    if (!descripcion.trim()) {
      setErrorMessage('La descripción del empleo es obligatoria.')
      return
    }

    setIsSubmitting(true)

    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const updated = await updateJob(job.id, {
        titulo: titulo.trim(),
        rubro,
        modalidad,
        tipo_contrato: tipoContrato,
        zona: zona.trim() || 'Uruguay',
        salario_rango: salario.trim() || null,
        estado,
        tags: parsedTags,
        descripcion: descripcion.trim(),
      })

      setSuccessMessage('¡Empleo actualizado correctamente!')
      onJobUpdated(updated)

      setTimeout(() => {
        onClose()
      }, 1000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar el empleo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const modalContent = (
    <div className="fixed inset-0 !m-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-4 sm:p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Pencil className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Editar Oferta de Empleo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Modificá los detalles de tu búsqueda laboral
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-700 dark:text-emerald-300">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Título del Puesto *
            </label>
            <input
              type="text"
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Chofer de Reparto / Desarrollador Frontend"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Grid Rubro & Modalidad */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Rubro o Sector *
              </label>
              <select
                value={rubro}
                onChange={(e) => setRubro(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {RUBROS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Modalidad *
              </label>
              <select
                value={modalidad}
                onChange={(e) => setModalidad(e.target.value as JobModalidad)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 capitalize"
              >
                {MODALIDADES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid Tipo de Contrato & Estado */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tipo de Contrato *
              </label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value as JobTipoContrato)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 capitalize"
              >
                {TIPOS_CONTRATO.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Estado de la Publicación *
              </label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value as JobEstado)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="activo">Activo (visible para candidatos)</option>
                <option value="cerrado">Pausado / Cerrado</option>
              </select>
            </div>
          </div>

          {/* Grid Zona & Salario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Zona / Ubicación *
              </label>
              <input
                type="text"
                required
                value={zona}
                onChange={(e) => setZona(e.target.value)}
                placeholder="Ej: Montevideo, Uruguay"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Salario Ofrecido (Opcional)
              </label>
              <input
                type="text"
                value={salario}
                onChange={(e) => setSalario(e.target.value)}
                placeholder="Ej: $45.000 - $60.000 o A convenir"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Competencias / Etiquetas (separadas por coma)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Ej: Libreta B, Puntualidad, Facturación"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Descripción del Puesto *
            </label>
            <textarea
              required
              rows={7}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detallá las responsabilidades, requisitos y condiciones del trabajo..."
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 leading-relaxed font-sans"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 dark:shadow-none transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Guardando cambios...</span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
