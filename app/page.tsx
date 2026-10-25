'use client'

import React, { useState, useEffect, useRef } from 'react'
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
import { fetchJobs, fetchApplicationsForCandidate } from '@/lib/data'
import { JobWithEmpresa } from '@/lib/supabase/database.types'
import { JobCard } from '@/components/jobs/JobCard'
import { useAuth } from '@/lib/context/AuthContext'

const KEYWORD_SUGGESTIONS = [
  'Chofer', 'Repartidor', 'Fletes', 'Logística', 'Almacén',
  'Programador', 'Desarrollador Web', 'Frontend', 'Backend', 'Full Stack',
  'Diseñador Gráfico', 'UI/UX', 'Community Manager', 'Marketing Digital',
  'Administrativo', 'Contabilidad', 'Recursos Humanos', 'Atención al Cliente',
  'Electricista', 'Plomero', 'Construcción', 'Enfermero', 'Médico', 'Seguridad',
  'Vendedor', 'Cajero', 'Repositor', 'Cocinero', 'Mozo', 'Limpieza',
]

const LOCATION_SUGGESTIONS = [
  'Montevideo', 'Canelones', 'Punta del Este', 'Maldonado', 'Salto',
  'Paysandú', 'Rivera', 'Melo', 'Tacuarembó', 'Minas', 'Trinidad',
  'Las Piedras', 'Ciudad de la Costa', 'Florida', 'Durazno',
  'Remoto', '100% Remoto', 'Híbrido',
]

export default function HomePage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [jobs, setJobs] = useState<JobWithEmpresa[]>([])
  const [appliedJobIds, setAppliedJobIds] = useState<Set<string>>(new Set())
  const [appliedSlugs, setAppliedSlugs] = useState<Set<string>>(new Set())
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(true)

  const [keywordFocused, setKeywordFocused] = useState(false)
  const [locationFocused, setLocationFocused] = useState(false)
  const keywordRef = useRef<HTMLDivElement>(null)
  const locationRef = useRef<HTMLDivElement>(null)

  // Cerrar dropdowns al hacer click afuera
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (keywordRef.current && !keywordRef.current.contains(e.target as Node)) {
        setKeywordFocused(false)
      }
      if (locationRef.current && !locationRef.current.contains(e.target as Node)) {
        setLocationFocused(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filteredKeywords = keyword.trim()
    ? KEYWORD_SUGGESTIONS.filter((s) => s.toLowerCase().includes(keyword.toLowerCase()))
    : KEYWORD_SUGGESTIONS.slice(0, 8)

  const filteredLocations = location.trim()
    ? LOCATION_SUGGESTIONS.filter((s) => s.toLowerCase().includes(location.toLowerCase()))
    : LOCATION_SUGGESTIONS

  useEffect(() => {
    async function load() {
      const data = await fetchJobs()
      setJobs(data)
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    let active = true
    async function loadApplied() {
      if (!profile || profile.role === 'empresa') {
        if (active) {
          setAppliedJobIds(new Set())
          setAppliedSlugs(new Set())
        }
        return
      }
      const apps = await fetchApplicationsForCandidate(profile.id)
      if (active) {
        setAppliedJobIds(new Set(apps.map((a) => a.job_id).filter(Boolean)))
        setAppliedSlugs(new Set(apps.map((a) => a.job?.slug).filter(Boolean) as string[]))
      }
    }
    loadApplied()
    return () => {
      active = false
    }
  }, [profile?.id, profile?.role])

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
      <section className="relative bg-gradient-to-b from-indigo-900 via-slate-900 to-slate-950 text-white pt-14 pb-24 sm:pt-20 sm:pb-28 px-4 sm:px-6 lg:px-8">
        {/* Ambient background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto text-center space-y-6 sm:space-y-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/20 text-[11px] sm:text-xs font-medium backdrop-blur-md text-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>La plataforma laboral más moderna de Uruguay</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
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
            className="relative z-30 max-w-3xl mx-auto bg-white p-2.5 sm:p-3 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col sm:flex-row items-center gap-2 border border-slate-200/50"
          >
            {/* Keyword input with suggestions */}
            <div ref={keywordRef} className="relative flex-1 w-full">
              <div className="flex items-center gap-3 px-3.5 py-2">
                <Search className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Puesto, habilidad o palabra clave..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onFocus={() => setKeywordFocused(true)}
                  className="w-full bg-transparent text-slate-800 text-sm focus:outline-none placeholder-slate-400"
                  autoComplete="off"
                />
              </div>
              {keywordFocused && filteredKeywords.length > 0 && (
                <ul className="absolute left-0 top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-1.5 max-h-64 overflow-y-auto text-left">
                  {filteredKeywords.map((s) => (
                    <li
                      key={s}
                      onMouseDown={() => {
                        setKeyword(s)
                        setKeywordFocused(false)
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
                    >
                      <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="w-full h-px sm:w-px sm:h-8 bg-slate-100 sm:bg-slate-200 shrink-0" />

            {/* Location input with suggestions */}
            <div ref={locationRef} className="relative flex-1 w-full">
              <div className="flex items-center gap-3 px-3.5 py-2">
                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Ciudad, zona o 'Remoto'..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onFocus={() => setLocationFocused(true)}
                  className="w-full bg-transparent text-slate-800 text-sm focus:outline-none placeholder-slate-400"
                  autoComplete="off"
                />
              </div>
              {locationFocused && filteredLocations.length > 0 && (
                <ul className="absolute left-0 top-full mt-2 w-full bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-1.5 max-h-64 overflow-y-auto text-left">
                  {filteredLocations.map((s) => (
                    <li
                      key={s}
                      onMouseDown={() => {
                        setLocation(s)
                        setLocationFocused(false)
                      }}
                      className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
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
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200/80 p-4 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 text-center">
          <div>
            <p className="text-2xl sm:text-4xl font-extrabold text-indigo-600">+1.500</p>
            <p className="text-[11px] sm:text-sm font-medium text-slate-600 mt-1">Empleos activos</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-extrabold text-slate-900">+450</p>
            <p className="text-[11px] sm:text-sm font-medium text-slate-600 mt-1">Empresas contratando</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-extrabold text-emerald-600">24hs</p>
            <p className="text-[11px] sm:text-sm font-medium text-slate-600 mt-1">Tiempo de respuesta</p>
          </div>
          <div>
            <p className="text-2xl sm:text-4xl font-extrabold text-indigo-600">98%</p>
            <p className="text-[11px] sm:text-sm font-medium text-slate-600 mt-1">Candidatos conformes</p>
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
              <JobCard
                key={job.id}
                job={job}
                isApplied={appliedJobIds.has(job.id) || appliedSlugs.has(job.slug)}
              />
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
                className="group relative bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 hover:border-indigo-300 hover:shadow-lg transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3 sm:gap-4">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr ${cat.color} flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform shrink-0`}
                  >
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors text-sm sm:text-base">
                      {cat.name}
                    </h3>
                    <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">{cat.count}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            )
          })}
        </div>
      </section>

      {/* Dual Value Proposition Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* For Candidates */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-5 sm:p-10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Para Candidatos
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
                Llevá tu carrera al siguiente nivel
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Creá tu perfil profesional, cargá tu CV y postulate a las búsquedas laborales de empresas que valoran tu talento. Seguí el estado de tus aplicaciones en tiempo real.
              </p>
            </div>

            <div className="pt-6">
              <Link
                href="/auth/registro?tipo=candidato"
                prefetch={false}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-colors shadow-md shadow-indigo-200"
              >
                <span>Crear Perfil de Candidato</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* For Companies */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white border border-slate-800 rounded-3xl p-5 sm:p-10 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Para Empresas
              </span>
              <h3 className="text-xl sm:text-2xl font-bold text-white">
                Contratá al mejor talento más rápido
              </h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Publicá avisos laborales con especificaciones claras. Gestioná postulantes, revisá currículums en PDF y cambiá el estado de los procesos desde un panel intuitivo.
              </p>
            </div>

            <div className="pt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/empresa/publicar"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-colors shadow-md shadow-emerald-500/20"
              >
                <span>Publicar Empleo (2 gratis/mes)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/planes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-200 font-semibold text-sm transition-colors"
              >
                <span>Ver Planes</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-indigo-600 rounded-3xl p-6 sm:p-12 text-center text-white relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl sm:text-3xl font-extrabold">¿Listo para dar el siguiente paso?</h2>
            <p className="text-indigo-100 text-sm leading-relaxed">
              Unite a la comunidad de profesionales y empresas que ya están transformando el mercado laboral.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
              <Link
                href="/empleos"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors shadow text-center"
              >
                Explorar Todos los Empleos
              </Link>
              <Link
                href="/auth/registro"
                prefetch={false}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-700 text-white font-semibold text-sm hover:bg-indigo-800 transition-colors border border-indigo-500 text-center"
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
