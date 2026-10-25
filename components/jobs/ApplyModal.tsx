'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  X,
  CheckCircle2,
  Upload,
  FileText,
  Send,
  AlertCircle,
  Lock,
  ArrowRight,
  Building2,
  Check,
  Clock
} from 'lucide-react'
import { JobWithEmpresa, ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { submitApplication, uploadCV, fetchCandidateApplicationForJob } from '@/lib/data'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime } from '@/lib/utils'

interface ApplyModalProps {
  job: JobWithEmpresa
  isOpen: boolean
  onClose: () => void
  existingApplication?: ApplicationWithDetails | null
  onApplied?: (application: ApplicationWithDetails) => void
}

export function ApplyModal({
  job,
  isOpen,
  onClose,
  existingApplication,
  onApplied,
}: ApplyModalProps) {
  const { profile, updateProfile } = useAuth()
  const [nombre, setNombre] = useState(profile?.nombre || '')
  const [email, setEmail] = useState(profile?.email || '')
  const [mensaje, setMensaje] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvFileName, setCvFileName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [detectedApplication, setDetectedApplication] = useState<ApplicationWithDetails | null>(null)

  const activeExistingApp = existingApplication !== undefined ? existingApplication : detectedApplication

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false)
      setErrorMessage('')
      setCvFile(null)
      setMensaje('')
    }
  }, [isOpen, job.id])

  useEffect(() => {
    let active = true
    async function checkAlreadyApplied() {
      if (!isOpen || !profile || profile.role === 'empresa' || existingApplication !== undefined) {
        return
      }
      const found = await fetchCandidateApplicationForJob(job.id, profile.id, job.slug)
      if (active) {
        setDetectedApplication(found)
      }
    }
    checkAlreadyApplied()
    return () => {
      active = false
    }
  }, [isOpen, job.id, job.slug, profile, existingApplication])

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre || '')
      setEmail(profile.email || '')
      if (!cvFile) {
        setCvFileName(profile.cv_url ? 'CV guardado en tu perfil' : '')
      }
    }
  }, [profile, cvFile])

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage('')
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (file.size > 5 * 1024 * 1024) {
        setErrorMessage('El archivo supera el tamaño máximo permitido de 5 MB.')
        e.target.value = ''
        return
      }
      setCvFile(file)
      setCvFileName(file.name)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage('')

    if (!profile) {
      setErrorMessage('Tenés que iniciar sesión con una cuenta de candidato para postularte.')
      return
    }

    if (profile.role === 'empresa') {
      setErrorMessage('Tu cuenta actual es de tipo Empresa. Necesitás una cuenta de Candidato para postularte.')
      return
    }

    if (!nombre.trim() || !email.trim()) {
      setErrorMessage('Por favor completá tu nombre y correo electrónico.')
      return
    }

    if (!cvFile && !profile.cv_url) {
      setErrorMessage('Por favor adjuntá tu currículum vitae en formato PDF o Word.')
      return
    }

    setIsSubmitting(true)

    try {
      let currentCvUrl = profile.cv_url || ''

      // Si subió un nuevo archivo de CV, lo subimos a Supabase Storage
      if (cvFile) {
        currentCvUrl = await uploadCV(cvFile, profile.id)
      }

      // Guardamos el CV actualizado (y el nombre si cambió) en su perfil para futuras postulaciones
      if (cvFile || (nombre.trim() && nombre.trim() !== profile.nombre)) {
        try {
          await updateProfile({
            cv_url: currentCvUrl || profile.cv_url,
            nombre: nombre.trim(),
          })
        } catch (profileErr) {
          console.warn('No se pudo actualizar el perfil automáticamente:', profileErr)
        }
      }

      const createdApp = await submitApplication({
        job_id: job.id,
        job_titulo: job.titulo,
        job_slug: job.slug,
        candidato_id: profile.id,
        candidato_nombre: nombre.trim(),
        candidato_email: email.trim(),
        mensaje: mensaje.trim(),
        cv_url: currentCvUrl,
      })

      setDetectedApplication(createdApp)
      onApplied?.(createdApp)
      setIsSuccess(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al enviar tu postulación.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (estado: ApplicationEstado) => {
    const map = {
      pendiente: { variant: 'warning', label: 'Pendiente de Revisión' },
      visto: { variant: 'primary', label: 'CV Visto por la Empresa' },
      seleccionado: { variant: 'success', label: '¡Seleccionado!' },
      entrevista: { variant: 'success', label: 'Convocado a Entrevista' },
      rechazado: { variant: 'danger', label: 'Proceso Finalizado' },
    }[estado] as { variant: 'warning' | 'primary' | 'success' | 'danger'; label: string }

    return <Badge variant={map.variant} size="sm">{map.label}</Badge>
  }

  const modalContent = (
    <div className="fixed inset-0 !m-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-slate-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors z-10"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="p-5 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-2xl font-bold text-slate-900">¡Postulación Enviada con Éxito!</h3>
            <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
              Tu postulación para <span className="font-semibold text-slate-800">{job.titulo}</span> en{' '}
              <span className="font-semibold text-slate-800">{job.empresa?.nombre || 'la empresa'}</span> fue registrada correctamente.
            </p>
            <div className="pt-4 flex flex-col gap-2">
              <Link
                href="/candidato/postulaciones"
                className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors text-center shadow-md shadow-indigo-100"
              >
                Ver Mis Postulaciones
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-6 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : !profile ? (
          /* Usuario NO autenticado -> Forzar inicio de sesión */
          <div className="p-5 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-8 h-8" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Identificación Requerida
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900 mt-1">Iniciá sesión para postularte</h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mt-2">
                Para postularte a <span className="font-semibold text-slate-800">{job.titulo}</span> en{' '}
                <span className="font-semibold text-slate-800">{job.empresa?.nombre || 'la empresa'}</span>, necesitás ingresar con tu cuenta de candidato.
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Link
                href={`/auth/login?redirect=/empleos/${job.slug}`}
                className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
              >
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href={`/auth/registro?tipo=candidato&redirect=/empleos/${job.slug}`}
                className="w-full py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors text-center"
              >
                Crear Cuenta de Candidato
              </Link>
            </div>
          </div>
        ) : profile.role === 'empresa' ? (
          /* Cuenta Empresa -> Advertir que debe ser candidato */
          <div className="p-5 sm:p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">Cuenta de Empresa detectada</h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto mt-2">
                Actualmente estás identificado como <span className="font-semibold text-slate-800">{profile.nombre || profile.email}</span> (Rol Empresa). Las postulaciones a empleos sólo están disponibles para cuentas con perfil Candidato.
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        ) : activeExistingApp ? (
          /* Candidato YA postulado a esta oferta */
          <div className="p-5 sm:p-8 text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                Postulación Registrada
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Ya te postulaste a esta oferta
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed max-w-sm mx-auto">
                Ya enviaste tu currículum para <span className="font-semibold text-slate-800">{job.titulo}</span> en{' '}
                <span className="font-semibold text-slate-800">{job.empresa?.nombre || 'la empresa'}</span>.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-500">Estado actual:</span>
                {getStatusBadge(activeExistingApp.estado)}
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>Fecha de envío:</span>
                <span className="font-medium text-slate-700 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatRelativeTime(activeExistingApp.created_at)}
                </span>
              </div>
              {activeExistingApp.mensaje && (
                <div className="pt-2 border-t border-slate-200/70 text-xs text-slate-600">
                  <span className="font-semibold text-slate-700 block mb-0.5">Tu mensaje adjunto:</span>
                  <p className="italic line-clamp-3">"{activeExistingApp.mensaje}"</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex flex-col gap-2.5">
              <Link
                href="/candidato/postulaciones"
                className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors text-center shadow-md shadow-indigo-100"
              >
                Ver Mis Postulaciones
              </Link>
              <button
                onClick={onClose}
                className="w-full py-2.5 px-6 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* Formulario de Postulación de Candidato */
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5">
            <div className="pr-8">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Postulación Laboral
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1 break-words">{job.titulo}</h2>
              <p className="text-xs text-slate-500 mt-0.5">en {job.empresa?.nombre || 'Empresa'}</p>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
                />
              </div>

              {/* Upload CV */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Currículum Vitae (PDF o Word) *
                </label>
                <label className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="font-medium truncate max-w-[180px] sm:max-w-[240px]">
                      {cvFileName || 'Hacé clic para adjuntar tu CV'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 group-hover:underline flex items-center gap-1 shrink-0 ml-auto">
                    <Upload className="w-3.5 h-3.5" />
                    {profile.cv_url && !cvFile ? 'Reemplazar' : 'Examinar'}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                {profile.cv_url && !cvFile && (
                  <p className="text-[11px] text-emerald-600 mt-1 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Se utilizará el CV adjunto en tu perfil. Podés hacer clic arriba para cambiarlo.
                  </p>
                )}
              </div>

              {/* Mensaje */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Carta de Presentación o Mensaje (Opcional)
                </label>
                <textarea
                  rows={3}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Contale a la empresa por qué sos el candidato ideal..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400 resize-none"
                />
              </div>
            </div>

            <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg transition-all"
              >
                {isSubmitting ? (
                  <span>Subiendo y postulando...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Postulación</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
