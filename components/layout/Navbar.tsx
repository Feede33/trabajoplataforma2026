'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/context/AuthContext'
import {
  Briefcase,
  User,
  PlusCircle,
  LogOut,
  Menu,
  X,
  FileText,
  LayoutDashboard,
  Users,
  Search,
  Sparkles,
  Zap
} from 'lucide-react'

export function Navbar() {
  const { profile, role, isAdmin, logout } = useAuth()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const isEmpresa = role === 'empresa'
  const isCandidato = role === 'candidato'

  // Mostrar el rol real del usuario; si is_admin=false en Supabase, nunca mostrar "Admin"
  const userRoleLabel = (() => {
    if (isAdmin) return 'Admin'
    const r = profile?.role
    if (!r || r === 'admin') return 'Usuario'   // rol 'admin' en DB pero is_admin=false → no mostrar
    return r.charAt(0).toUpperCase() + r.slice(1) // 'empresa' → 'Empresa', 'candidato' → 'Candidato'
  })()

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-1 flex items-center justify-start gap-6">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-200 group-hover:scale-105 transition-transform">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-xl text-slate-900 tracking-tight flex items-center">
                  Postula<span className="text-indigo-600">UY</span><span className="text-xs text-indigo-500 font-bold ml-0.5">.com</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium -mt-1 uppercase tracking-wider">
                  Plataforma Laboral
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center justify-center gap-1 shrink-0">
            <Link
              href="/empleos"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/empleos'
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Explorar Empleos
            </Link>

            <Link
              href="/empleos-informales"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                pathname === '/empleos-informales'
                  ? 'text-amber-800 bg-amber-50 font-semibold border border-amber-200'
                  : 'text-slate-600 hover:text-amber-800 hover:bg-amber-50/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>Empleos Informales</span>
              <span className="px-1.5 py-0.2 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                WhatsApp
              </span>
            </Link>

            <Link
              href="/planes"
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                pathname === '/planes'
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Planes
            </Link>

            {isEmpresa && (
              <>
                <Link
                  href="/empresa/dashboard"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/empresa/dashboard'
                      ? 'text-indigo-600 bg-indigo-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Panel Empresa
                </Link>
                <Link
                  href="/empresa/postulaciones"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/empresa/postulaciones'
                      ? 'text-indigo-600 bg-indigo-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Candidatos
                </Link>
              </>
            )}

            {isCandidato && (
              <>
                <Link
                  href="/candidato/postulaciones"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/candidato/postulaciones'
                      ? 'text-indigo-600 bg-indigo-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Mis Postulaciones
                </Link>
                <Link
                  href="/candidato/perfil"
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/candidato/perfil'
                      ? 'text-indigo-600 bg-indigo-50 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  Mi Perfil & CV
                </Link>
              </>
            )}
          </nav>

          {/* Action Buttons & User Menu */}
          <div className="hidden md:flex flex-1 items-center justify-end gap-3">
            {profile ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-all shadow-sm"
                >
                  <div className="text-left">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                      {profile.nombre || profile.email}
                    </p>
                    <p className="text-[10px] text-slate-500 capitalize">
                      {userRoleLabel}
                    </p>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs overflow-hidden border border-indigo-200">
                    {profile.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile.nombre?.[0]?.toUpperCase() || <User className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Conectado como</p>
                      <p className="text-sm font-semibold text-slate-900 truncate">{profile.nombre}</p>
                      {isAdmin ? (
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 font-extrabold uppercase">
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-block mt-0.5 px-2 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-700 font-medium capitalize">
                          {userRoleLabel}
                        </span>
                      )}
                    </div>

                    {isEmpresa ? (
                      <>
                        <Link
                          href="/empresa/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          Panel de Control
                        </Link>
                        <Link
                          href="/empresa/publicar"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <PlusCircle className="w-4 h-4 text-indigo-600" />
                          Publicar Empleo
                        </Link>
                        <Link
                          href="/empresa/postulaciones"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Users className="w-4 h-4 text-slate-400" />
                          Postulaciones
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/candidato/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          Mi Dashboard
                        </Link>
                        <Link
                          href="/candidato/perfil"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <FileText className="w-4 h-4 text-slate-400" />
                          Mi Perfil y CV
                        </Link>
                        <Link
                          href="/candidato/postulaciones"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                          <Briefcase className="w-4 h-4 text-slate-400" />
                          Mis Postulaciones
                        </Link>
                      </>
                    )}

                    <div className="border-t border-slate-100 my-1 pt-1">
                      <button
                        onClick={() => {
                          setDropdownOpen(false)
                          logout()
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 transition-colors text-left font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/auth/login"
                  className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/auth/registro"
                  className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors"
                >
                  Registrarse
                </Link>
                <Link
                  href="/empresa/publicar"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all"
                >
                  <PlusCircle className="w-4 h-4" />
                  Publicar Empleo
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-5 pt-3 pb-6 space-y-4">
          <div className="space-y-1">
            <Link
              href="/empleos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Search className="w-4 h-4 text-indigo-600" />
              Explorar Empleos
            </Link>

            <Link
              href="/empleos-informales"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-amber-900 bg-amber-50 hover:bg-amber-100/70"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span>Empleos Informales</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-amber-200 text-amber-900 rounded-full font-bold">
                WhatsApp
              </span>
            </Link>

            <Link
              href="/planes"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Planes
            </Link>

            {isEmpresa && (
              <>
                <Link
                  href="/empresa/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <LayoutDashboard className="w-4 h-4 text-indigo-600" />
                  Panel Empresa
                </Link>
                <Link
                  href="/empresa/postulaciones"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Users className="w-4 h-4 text-indigo-600" />
                  Ver Candidatos
                </Link>
              </>
            )}

            {isCandidato && (
              <>
                <Link
                  href="/candidato/postulaciones"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Briefcase className="w-4 h-4 text-indigo-600" />
                  Mis Postulaciones
                </Link>
                <Link
                  href="/candidato/perfil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Mi Perfil y CV
                </Link>
              </>
            )}
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {profile ? (
              <>
                <div className="px-3 py-2 bg-slate-50 rounded-xl">
                  <p className="text-xs text-slate-500">Sesión actual</p>
                  <p className="text-sm font-semibold text-slate-900">{profile.nombre}</p>
                  <p className="text-xs text-indigo-600 capitalize">{userRoleLabel}</p>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    logout()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/empresa/publicar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  Publicar Empleo
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
