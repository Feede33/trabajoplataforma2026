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
  Clock,
  Calendar,
  User,
  Info
} from 'lucide-react'
import { JobWithEmpresa, ApplicationWithDetails, ApplicationEstado } from '@/lib/supabase/database.types'
import { useAuth } from '@/lib/context/AuthContext'
import { submitApplication, uploadCV, fetchCandidateApplicationForJob } from '@/lib/data'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, formatDateTime } from '@/lib/utils'

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
  const [mensaje, setMensaje] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [cvFileName, setCvFileName] = useState('')
  const [updateProfileCv, setUpdateProfileCv] = useState(false)
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
      setUpdateProfileCv(false)
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

      // Solo si el usuario explícitamente marcó la opción, actualizamos su CV predeterminado en el perfil.
      // El nombre y datos de la cuenta NUNCA se sobreescriben desde una postulación.
      if (cvFile && updateProfileCv && currentCvUrl) {
        try {
          await updateProfile({
            cv_url: currentCvUrl,
          })
        } catch (profileErr) {
          console.warn('No se pudo actualizar el CV en el perfil automáticamente:', profileErr)
        }
      }

      const candidateName = profile.nombre?.trim() || 'Candidato'
      const candidateEmail = profile.email?.trim() || ''

      const createdApp = await submitApplication({
        job_id: job.id,
        job_titulo: job.titulo,
        job_slug: job.slug,
        candidato_id: profile.id,
        candidato_nombre: candidateName,
        candidato_email: candidateEmail,
        mensaje: mensaje.trim(),
        cv_url: currentCvUrl,
      })

      setDetectedApplication(createdApp)
      onApplied?.(createdApp)
      setIsSuccess(true)

      // Pre-cálculo en segundo plano con IA (Opción C): evalúa y guarda el match_score en la BD
      if (createdApp?.id) {
        fetch('/api/empresa/ai-screen', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job: {
              id: job.id,
              titulo: job.titulo,
              descripcion: job.descripcion,
              rubro: job.rubro,
              zona: job.zona,
              modalidad: job.modalidad,
              tags: job.tags,
            },
            candidates: [
              {
                id: createdApp.id,
                candidatoId: profile.id,
                candidatoNombre: candidateName,
                candidatoEmail: candidateEmail,
                mensaje: mensaje.trim(),
                hasCv: !!currentCvUrl,
                cvUrl: currentCvUrl || null,
                created_at: createdApp.created_at,
              },
            ],
          }),
        }).catch((bgErr) => console.warn('Background AI evaluation error:', bgErr))
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ocurrió un error al enviar tu postulación.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusBadge = (estado: ApplicationEstado) => {
    const map = {
      pendiente: { variant: 'warning', label: 'Pendiente de Revisión' },
      visto: { variant: 'primary', label: 'Visto por la Empresa' },
      seleccionado: { variant: 'success', label: '¡Seleccionado!' },
      entrevista: { variant: 'purple', label: 'En Proceso' },
      rechazado: { variant: 'danger', label: 'No seleccionado' },
    }[estado] as { variant: 'warning' | 'primary' | 'success' | 'danger' | 'purple'; label: string }

    if (estado === 'seleccionado') {
      return (
        <div className="relative group inline-block">
          <Badge
            variant="success"
            size="sm"
            className="cursor-pointer font-semibold gap-1.5 shadow-sm hover:ring-2 hover:ring-emerald-400/40 transition-all select-none"
            title="Si la empresa te seleccionó, en estos días deberías de estar recibiendo novedades."
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>¡Seleccionado!</span>
            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold">
              <Info className="w-2.5 h-2.5" />
              Aviso
            </span>
          </Badge>

          <div className="absolute right-0 bottom-full mb-2 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none w-72 max-w-[85vw] p-3 rounded-2xl bg-slate-900 text-white shadow-xl border border-slate-700/80 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-emerald-400 text-xs">Aviso importante</p>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  Si la empresa te seleccionó, en estos días deberías de estar recibiendo novedades.
                </p>
              </div>
            </div>
            <div className="absolute right-6 -bottom-1.5 w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45" />
          </div>
        </div>
      )
    }

    return <Badge variant={map.variant} size="sm">{map.label}</Badge>
  }

  const modalContent = (
    <div className="fixed inset-0 !m-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-500">
                <span>Fecha y hora de envío:</span>
                <span className="font-medium text-slate-700 flex items-center gap-1.5 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{formatDateTime(activeExistingApp.created_at)}</span>
                  <span className="text-slate-400 font-normal">({formatRelativeTime(activeExistingApp.created_at)})</span>
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
              {/* Resumen de Identidad del Candidato */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                    {profile.nombre ? profile.nombre[0].toUpperCase() : <User className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
                      Postulándote como
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {profile.nombre || 'Candidato'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {profile.email}
                    </p>
                  </div>
                </div>
                <Link
                  href="/candidato/perfil"
                  target="_blank"
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 whitespace-nowrap"
                  title="Modificar los datos de tu cuenta en tu perfil"
                >
                  Editar perfil ↗
                </Link>
              </div>

              {/* Upload CV */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Currículum Vitae (PDF o Word) *
                </label>
                <label className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-indigo-50/30 cursor-pointer transition-colors group">
                  <div className="flex items-center gap-2.5 text-xs text-slate-600 dark:text-slate-300 min-w-0">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0" />
                    <span className="font-medium truncate max-w-[180px] sm:max-w-[240px]">
                      {cvFileName || 'Hacé clic para adjuntar tu CV'}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 group-hover:underline flex items-center gap-1 shrink-0 ml-auto">
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
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                    <Check className="w-3 h-3" /> Se utilizará el CV guardado en tu perfil. Podés hacer clic arriba para cambiarlo.
                  </p>
                )}
                {cvFile && (
                  <label className="flex items-center gap-2 mt-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={updateProfileCv}
                      onChange={(e) => setUpdateProfileCv(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Actualizar también este archivo como mi CV predeterminado en mi perfil</span>
                  </label>
                )}
              </div>

              {/* Mensaje / Carta de Presentación Personalizada */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Carta de Presentación o Mensaje Personalizado
                  </label>
                  <span className="text-[11px] text-slate-400">Opcional</span>
                </div>
                <textarea
                  rows={4}
                  value={mensaje}
                  onChange={(e) => setMensaje(e.target.value)}
                  placeholder="Personalizá tu postulación: contale a la empresa por qué te interesa este puesto, qué experiencia relevante tenés o qué podés aportar..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Este mensaje es específico para este aviso y será leído directamente por el equipo de selección.
                </p>
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
