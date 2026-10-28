'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Mail,
  User,
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  ExternalLink,
  ArrowLeft,
  Loader2,
  HelpCircle,
  Building2,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'

const SUPPORT_EMAIL = 'postulauysoporte@gmail.com'

export default function ContactoPage() {
  const { profile } = useAuth()

  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [descripcion, setDescripcion] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [submittedData, setSubmittedData] = useState<{ nombre: string; email: string; descripcion: string } | null>(null)

  // Pre-cargar datos si el usuario ya está autenticado
  useEffect(() => {
    if (profile) {
      if (profile.nombre) setNombre((prev) => prev || profile.nombre || '')
      if (profile.email) setEmail((prev) => prev || profile.email || '')
    }
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!nombre.trim() || nombre.trim().length < 2) {
      setErrorMessage('Por favor ingresa tu nombre completo.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setErrorMessage('Por favor ingresa una dirección de correo electrónico válida (Gmail u otro).')
      return
    }

    if (!descripcion.trim() || descripcion.trim().length < 5) {
      setErrorMessage('Por favor describe tu consulta o mensaje detalladamente (mínimo 5 caracteres).')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          email: email.trim(),
          descripcion: descripcion.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Ocurrió un error al enviar tu mensaje')
      }

      setSubmittedData({
        nombre: nombre.trim(),
        email: email.trim(),
        descripcion: descripcion.trim(),
      })
      setIsSuccess(true)
    } catch (err: any) {
      setErrorMessage(err.message || 'No se pudo enviar el mensaje. Intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = () => {
    setIsSuccess(false)
    setDescripcion('')
    setErrorMessage(null)
    setSubmittedData(null)
  }

  // Enlaces pre-armados para clientes de correo
  const mailSubject = submittedData
    ? `Contacto PostulaUY - ${submittedData.nombre}`
    : `Consulta en PostulaUY`
  const mailBody = submittedData
    ? `${submittedData.descripcion}\n\nDe: ${submittedData.nombre} (${submittedData.email})`
    : ''
  const gmailWebComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${SUPPORT_EMAIL}&su=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`
  const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(mailBody)}`

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Inicio</span>
          </Link>

          <span className="text-xs text-slate-400">PostulaUY • Soporte Oficial</span>
        </div>

        {/* Hero Header */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-sky-500/10 dark:bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-300 text-xs font-bold uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Canal de Atención Directa</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ¿En qué podemos ayudarte?
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Comunicate directamente con el equipo de soporte de <span className="font-semibold text-slate-900 dark:text-white">Postulauy.com</span>. Respondemos todas las consultas sobre avisos, cuentas de candidatos o empresas en menos de 24 horas.
            </p>
          </div>
        </div>

        {/* Main Grid: Form + Info Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Column: Form or Success Card (2 cols) */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
              {isSuccess ? (
                /* Estado de Éxito */
                <div className="py-8 text-center space-y-6 animate-in fade-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm animate-bounce">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Envío Exitoso
                    </span>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      ¡Tu mensaje ha sido enviado!
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      Muchas gracias <span className="font-semibold text-slate-800 dark:text-slate-100">{submittedData?.nombre}</span>. Hemos recibido tu consulta y se envió una copia a{' '}
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{SUPPORT_EMAIL}</span>. Te responderemos cuanto antes a tu casilla{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{submittedData?.email}</span>.
                    </p>
                  </div>

                  {/* Resumen del Mensaje */}
                  {submittedData && (
                    <div className="max-w-lg mx-auto p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 text-left space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                        <span>Copia del mensaje:</span>
                        <span>{new Date().toLocaleDateString('es-UY')}</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 whitespace-pre-wrap italic">
                        &ldquo;{submittedData.descripcion}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Sugerencia de envío directo en Gmail */}
                  <div className="max-w-lg mx-auto p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-900 dark:text-sky-200 text-left flex items-start gap-2.5">
                    <Mail className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sky-950 dark:text-sky-100">¿Querés tener una copia en tus Enviados de Gmail?</p>
                      <p className="text-[11px] text-sky-800 dark:text-sky-300 leading-relaxed">
                        Hacé clic en el botón rojo <strong>&ldquo;Abrir en Gmail&rdquo;</strong> para abrir tu cuenta de Gmail con el destinatario y mensaje listos para enviar.
                      </p>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                    <a
                      href={gmailWebComposeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-red-500/20 transition-all"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Abrir en Gmail</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                    </a>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full sm:w-auto px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
                    >
                      Enviar otro mensaje
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario de Contacto */
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      Formulario de Contacto
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Completá los campos a continuación para escribirnos directamente a <span className="font-semibold text-slate-700 dark:text-slate-300">{SUPPORT_EMAIL}</span>.
                    </p>
                  </div>

                  {errorMessage && (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Campo: Nombre */}
                    <div className="space-y-1.5">
                      <label htmlFor="nombre" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Nombre Completo *</span>
                      </label>
                      <input
                        id="nombre"
                        type="text"
                        required
                        placeholder="Ej. Juan Pérez"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {/* Campo: Gmail / Email */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="email" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>Gmail o Correo Electrónico *</span>
                        </label>
                        <span className="text-[11px] text-slate-400">Te responderemos a esta casilla</span>
                      </div>
                      <input
                        id="email"
                        type="email"
                        required
                        placeholder="tu.correo@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      />
                    </div>

                    {/* Campo: Caja de Descripción */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="descripcion" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                          <span>Caja de Descripción / Consulta *</span>
                        </label>
                        <span className="text-[11px] text-slate-400">
                          {descripcion.length} caracteres
                        </span>
                      </div>
                      <textarea
                        id="descripcion"
                        required
                        rows={6}
                        placeholder="Describí tu consulta detalladamente: dudas sobre cómo postularte a un empleo, consultas sobre publicaciones de empresas, sugerencias de mejora o problemas técnicos..."
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Botón de Envío */}
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Al enviar el formulario, tu mensaje llegará directamente a <span className="font-semibold text-slate-700 dark:text-slate-300">{SUPPORT_EMAIL}</span>.
                    </p>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 hover:from-sky-700 hover:via-indigo-700 hover:to-indigo-800 disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all cursor-pointer shrink-0"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando mensaje...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Enviar a Soporte</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Support Details & Fast Contact (1 col) */}
          <div className="space-y-6">
            {/* Direct Email Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <Mail className="w-4 h-4 text-sky-500" />
                <span>Correo Directo</span>
              </h3>

              <div className="space-y-3">
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Si preferís escribirnos directamente desde tu cuenta de correo o app habitual:
                </p>

                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="block p-3 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 hover:border-sky-300 transition-colors group"
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 block mb-0.5">
                    Email de Soporte
                  </span>
                  <div className="flex items-center justify-between gap-1 text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    <span className="truncate">{SUPPORT_EMAIL}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-sky-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </a>

                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Tiempo de respuesta: <strong>Menos de 24 horas</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Montevideo, Uruguay</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Links Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500" />
                <span>Respuestas Rápidas</span>
              </h3>

              <div className="space-y-3 text-xs">
                <Link
                  href="/empleos"
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">¿Cómo postularme a un empleo?</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                </Link>

                <Link
                  href="/empresa/publicar"
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">¿Cómo publicar como empresa?</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                </Link>

                <Link
                  href="/ia-chat"
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-750 flex items-center justify-between transition-colors block"
                >
                  <div className="flex items-center gap-2.5">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Asistente IA para Candidatos</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
