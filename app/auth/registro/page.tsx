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

  const { signup } = useAuth()
  const [role, setRole] = useState<UserRole>(initialRole)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

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
      <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-xl text-center space-y-5">
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
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
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
              placeholder={role === 'empresa' ? 'Ej: Logística Santa Fe S.A.' : 'Ej: Lucas Benítez'}
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
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <span>Registrando en el sistema...</span> : <span>Crear mi Cuenta</span>}
          </button>
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
