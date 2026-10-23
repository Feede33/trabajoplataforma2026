'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Search,
  MapPin,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Building2,
  Users,
  Clock,
  Sparkles,
  ArrowRight,
  Truck,
  Code2,
  PenTool,
  BadgeDollarSign,
  HeartPulse,
  GraduationCap
} from 'lucide-react'
import { fetchJobs } from '@/lib/data'
import { JobWithEmpresa } from '@/lib/supabase/database.types'
import { JobCard } from '@/components/jobs/JobCard'

export default function HomePage() {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const data = await fetchJobs()
      setJobs(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword) params.set('q', keyword)
    if (location) params.set('zona', location)
    router.push(`/empleos?${params.toString()}`)
  }

  const CATEGORIES = [
    { name: 'Tecnología & IT', count: '48 vacantes', icon: Code2, color: 'from-blue-500 to-indigo-600', query: 'Tecnología' },
    { name: 'Logística & Fletes', count: '34 vacantes', icon: Truck, color: 'from-amber-500 to-orange-600', query: 'Logística' },
    { name: 'Diseño & UI/UX', count: '19 vacantes', icon: PenTool, color: 'from-purple-500 to-pink-600', query: 'Diseño' },
    { name: 'Ventas & Marketing', count: '27 vacantes', icon: TrendingUp, color: 'from-emerald-500 to-teal-600', query: 'Marketing' },
    { name: 'Administración', count: '22 vacantes', icon: BadgeDollarSign, color: 'from-sky-500 to-blue-600', query: 'Administración' },
    { name: 'Salud & Bienestar', count: '14 vacantes', icon: HeartPulse, color: 'from-rose-500 to-red-600', query: 'Salud' },
  ]

  return (
    <div className="space-y-20 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-medium backdrop-blur-md text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>La plataforma laboral más moderna de Uruguay</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Encontrá tu próximo trabajo o al{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-blue-300 to-teal-200">
              mejor talento
            </span>{' '}
            para tu equipo
          </h1>

          <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Conectamos a postulantes y empresas de fletes, logística, tecnología, marketing y servicios en todo Uruguay.
          </p>

          {/* Search Form */}
          <form
            onSubmit={handleSearch}
            className="max-w-3xl mx-auto bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-slate-200/50"
          >
            <div className="flex-1 w-full flex items-center gap-3 px-3.5 py-2">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Puesto, habilidad o palabra clave..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full text-slate-800 text-sm focus:outline-none placeholder-slate-400"
              />
            </div>

            <div className="hidden sm:block w-px h-8 bg-slate-200" />

            <div className="flex-1 w-full flex items-center gap-3 px-3.5 py-2">
              <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Ciudad, zona o 'Remoto'..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-slate-800 text-sm focus:outline-none placeholder-slate-400"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-7 py-3 rounded-xl sm:rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-600/30 shrink-0 flex items-center justify-center gap-2"
            >
              <Search className="w-4 h-4" />
              <span>Buscar Empleos</span>
            </button>
          </form>

          {/* Popular Search Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-slate-400">
            <span className="font-medium text-slate-300">Búsquedas populares:</span>
            <Link
              href="/empleos?modalidad=remoto"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              🌍 100% Remoto
            </Link>
            <Link
              href="/empleos?rubro=Logística"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              🚛 Fletes & Logística
            </Link>
            <Link
              href="/empleos?rubro=Tecnología"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              💻 Programación & IT
            </Link>
            <Link
              href="/empleos?tipo_contrato=part-time"
              className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-colors"
            >
              ⏱️ Part-Time
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600">+1.500</p>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">Empleos activos</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-slate-900">+450</p>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">Empresas contratando</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-emerald-600">24hs</p>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">Tiempo de respuesta</p>
          </div>
          <div>
            <p className="text-3xl sm:text-4xl font-extrabold text-indigo-600">98%</p>
            <p className="text-xs sm:text-sm font-medium text-slate-600 mt-1">Candidatos conformes</p>
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Oportunidades destacadas
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Últimos empleos publicados
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              Postulate directamente con tu perfil en minutos
            </p>
          </div>

          <Link
            href="/empleos"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700 group"
          >
            <span>Ver todos los empleos</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-200/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.slice(0, 6).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
            Explorá por sectores
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Encontrá trabajo en tu área de especialidad
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat, idx) => {
            const Icon = cat.icon
            return (
              <Link
                key={idx}
                href={`/empleos?rubro=${encodeURIComponent(cat.query)}`}
                className="group relative bg-white rounded-2xl border border-slate-200 p-6 hover:border-indigo-300 hover:shadow-lg transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">{cat.count}</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* Dual Value Proposition Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* For Candidates */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Para Candidatos
              </span>
              <h3 className="text-2xl font-bold text-slate-900">
                Llevá tu carrera al siguiente nivel
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Creá tu perfil profesional, cargá tu CV y postulate a las búsquedas laborales de empresas que valoran tu talento. Seguí el estado de tus aplicaciones en tiempo real.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/auth/registro?tipo=candidato"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md shadow-indigo-200"
              >
                <span>Crear Perfil de Candidato</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* For Companies */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-8 sm:p-10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Para Empresas
              </span>
              <h3 className="text-2xl font-bold text-white">
                Contratá al mejor talento más rápido
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Publicá avisos laborales con especificaciones claras. Gestioná postulantes, revisá currículums en PDF y cambiá el estado de los procesos desde un panel intuitivo.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/empresa/publicar"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-colors shadow-md shadow-emerald-500/20"
              >
                <span>Publicar Empleo Gratis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-indigo-600 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-3xl font-extrabold">¿Listo para dar el siguiente paso?</h2>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Unite a la comunidad de profesionales y empresas que ya están transformando el mercado laboral.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/empleos"
                className="px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors shadow"
              >
                Explorar Todos los Empleos
              </Link>
              <Link
                href="/auth/registro"
                className="px-6 py-3 rounded-xl bg-indigo-700 text-white font-semibold text-sm hover:bg-indigo-800 transition-colors border border-indigo-500"
              >
                Crear una Cuenta
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
