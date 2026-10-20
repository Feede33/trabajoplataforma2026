'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Briefcase, Building2, User, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { login, loginDemo, profile } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    const res = await login(email, password)
    setIsLoading(false)

    if (res.success) {
      router.push('/empleos')
    } else {
      setError(res.error || 'Credenciales inválidas')
    }
  }

  const handleDemo = (role: 'empresa' | 'candidato') => {
    loginDemo(role)
    if (role === 'empresa') {
      router.push('/empresa/dashboard')
    } else {
      router.push('/candidato/dashboard')
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200">
            <Briefcase className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">Iniciar Sesión</h1>
          <p className="text-xs text-slate-500">
            Ingresá a tu cuenta para gestionar vacantes o ver tus postulaciones
          </p>
        </div>

        {/* Demo Fast Login Pills */}
        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Acceso Rápido de Prueba (Demo)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemo('empresa')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 font-semibold text-xs shadow-sm transition-all"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
              <span>Soy Empresa</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemo('candidato')}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 font-semibold text-xs shadow-sm transition-all"
            >
              <User className="w-3.5 h-3.5 text-emerald-500" />
              <span>Soy Candidato</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico
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
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLoading ? <span>Iniciando...</span> : <span>Ingresar</span>}
          </button>
        </form>

        {/* Register link */}
        <div className="pt-2 text-center text-xs text-slate-500">
          ¿No tenés una cuenta todavía?{' '}
          <Link href="/auth/registro" className="font-semibold text-indigo-600 hover:underline">
            Registrate acá
          </Link>
        </div>
      </div>
    </div>
  )
}
