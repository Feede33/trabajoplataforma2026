'use client'

import React, { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Briefcase, Building2, User, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import { UserRole } from '@/lib/supabase/database.types'

function RegistroContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialRole: UserRole = searchParams.get('tipo') === 'empresa' ? 'empresa' : 'candidato'
  const redirect = searchParams.get('redirect')

  const { signup, loginWithGoogle } = useAuth()
  const [role, setRole] = useState<UserRole>(initialRole)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const handleGoogleSignup = async () => {
    setError('')
    setIsGoogleLoading(true)
    const res = await loginWithGoogle({ role, redirect })
    if (!res.success) {
      setIsGoogleLoading(false)
      setError(res.error || 'No se pudo conectar con Google')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const res = await signup(email, password, role, nombre)
    setIsLoading(false)

    if (res.success) {
      if (res.requiresEmailConfirmation) {
        setSuccessMessage(
          res.message || '¡Cuenta registrada con éxito! Te enviamos un enlace de confirmación a tu correo electrónico para que actives tu cuenta antes de iniciar sesión.'
        )
      } else if (redirect) {
        router.push(redirect)
      } else if (role === 'empresa') {
        router.push('/empresa/dashboard')
      } else {
        router.push('/candidato/dashboard')
      }
    } else {
      setError(res.error || 'Ocurrió un error al crear la cuenta en el backend.')
    }
  }

  if (successMessage) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-xl text-center space-y-5">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">¡Cuenta Creada!</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {successMessage}
          </p>
          <div className="pt-2">
            <Link
              href={redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login'}
              className="inline-block w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-colors"
            >
              Ir a Iniciar Sesión
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Crear una Cuenta</h1>
          <p className="text-xs text-slate-500">
            Elegí tu perfil y empezá a conectar en Postulauy.com
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setRole('candidato')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === 'candidato'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Soy Candidato</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('empresa')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
              role === 'empresa'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Soy Empresa</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Signup Button */}
        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={isGoogleLoading || isLoading}
          className="w-full py-2.5 px-3 sm:px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          <span className="truncate">
            {isGoogleLoading
              ? 'Conectando con Google...'
              : role === 'empresa'
              ? 'Registrarse con Google como Empresa'
              : 'Registrarse con Google como Candidato'}
          </span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center py-1">
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink mx-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            o registrate con tu correo
          </span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              {role === 'empresa' ? 'Nombre de la Empresa *' : 'Nombre y Apellido *'}
            </label>
            <input
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={role === 'empresa' ? 'Ej: Logística Oriental S.A.' : 'Ej: Lucas Benítez'}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || isGoogleLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <span>Registrando en el sistema...</span> : <span>Crear mi Cuenta</span>}
          </button>

          <p className="text-[11px] text-center text-slate-500 leading-relaxed">
            Al continuar o registrarte, aceptás nuestros{' '}
            <Link href="/terms-of-service" className="text-indigo-600 hover:underline font-medium">
              Términos del Servicio
            </Link>{' '}
            y la{' '}
            <Link href="/privacy-policy" className="text-indigo-600 hover:underline font-medium">
              Política de Privacidad
            </Link>.
          </p>
        </form>

        <div className="pt-2 text-center text-xs text-slate-500">
          ¿Ya tenés una cuenta?{' '}
          <Link
            href={redirect ? `/auth/login?redirect=${encodeURIComponent(redirect)}` : '/auth/login'}
            className="font-semibold text-indigo-600 hover:underline"
          >
            Iniciá sesión acá
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RegistroPage() {
  return (
    <Suspense fallback={<div className="max-w-md mx-auto py-20 text-center text-slate-400">Cargando...</div>}>
      <RegistroContent />
    </Suspense>
  )
}
