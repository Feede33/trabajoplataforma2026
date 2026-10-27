'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/context/AuthContext'
import { useSavedJobs } from '@/lib/context/SavedJobsContext'
import { ModeToggle } from '@/components/mode-toggle'
import {
  Briefcase,
  User,
  PlusCircle,
  LogOut,
  Menu,
  X,
  FileText,
  LayoutDashboard,
  Search,
  Sparkles,
  Zap,
  Bookmark
} from 'lucide-react'

export function Navbar() {
  const { profile, role, isAdmin, logout } = useAuth()
  const { savedJobs } = useSavedJobs()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Cerrar menú móvil y dropdown al cambiar de ruta
  useEffect(() => {
    setMobileMenuOpen(false)
    setDropdownOpen(false)
  }, [pathname])

  // Cerrar dropdown de usuario al hacer click afuera
  useEffect(() => {
    if (!dropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

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
    <header className={`sticky top-0 z-40 w-full bg-white/90 dark:bg-background/90 backdrop-blur-md transition-colors ${pathname === '/ia-chat' ? 'border-b-0' : 'border-b border-slate-200/80 dark:border-slate-800/80'}`}>
      <div className="w-full px-3 sm:px-5 lg:px-6">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center justify-start gap-4 xl:gap-6 shrink-0 z-10">
            <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group shrink-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-md shadow-sky-500/20 group-hover:shadow-sky-500/35 group-hover:scale-105 transition-all border border-slate-200/60 dark:border-slate-800">
                <Image
                  src="/logo-navbar.png"
                  alt="PostulaUY"
                  width={40}
                  height={40}
                  unoptimized
                  className="w-full h-full object-cover"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight flex items-center">
                  Postula<span className="bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 bg-clip-text text-transparent font-black ml-0.5">UY<span className="text-xs font-bold ml-0.5">.com</span></span>
                </span>
                <span className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5 sm:-mt-1 uppercase tracking-wider">
                  Plataforma Laboral
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation - Centrado real */}
          <nav className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center justify-center gap-1 xl:gap-2 px-2 z-10">
            <Link
              href="/empleos"
              className={`px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors whitespace-nowrap ${
                pathname === '/empleos'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              Explorar Empleos
            </Link>

            <Link
              href="/empleos-informales"
              className={`px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                pathname === '/empleos-informales'
                  ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 font-semibold border border-amber-200 dark:border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-300 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-500/15'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span>Empleos Informales</span>
              <span className="hidden xl:inline-block px-1.5 py-0.2 text-[10px] bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-full font-bold">
                WhatsApp
              </span>
            </Link>

            {!isEmpresa && (
              <Link
                href="/ia-chat"
                className={`px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  pathname === '/ia-chat'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span>IA Chat</span>
              </Link>
            )}

            <Link
              href="/planes"
              className={`px-2.5 xl:px-3 py-1.5 xl:py-2 rounded-lg text-xs xl:text-sm font-medium transition-colors whitespace-nowrap ${
                pathname === '/planes'
                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
            >
              Planes
            </Link>
          </nav>

          {/* Action Buttons & User Menu */}
          <div className="hidden lg:flex items-center justify-end gap-2 xl:gap-3 shrink-0 z-10">
            <ModeToggle />
            {profile ? (
              <div ref={dropdownRef} className="relative">
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
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-100 dark:border-slate-800/80 z-50 animate-in fade-in duration-100 overflow-hidden">
                    <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-850/40">
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 uppercase tracking-wider font-bold">Conectado como</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">{profile.nombre}</p>
                      {isAdmin ? (
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-extrabold uppercase tracking-wide">
                          Administrador
                        </span>
                      ) : (
                        <span className="inline-block mt-1.5 px-2.5 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 font-semibold capitalize">
                          {userRoleLabel}
                        </span>
                      )}
                    </div>

                    <div className="p-1.5 flex flex-col gap-0.5">
                      {isEmpresa ? (
                        <>
                          <Link
                            href="/empresa/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors duration-150"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
                            <span>Panel de Control</span>
                          </Link>
                          <Link
                            href="/empresa/publicar"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors duration-150"
                          >
                            <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span>Publicar Empleo</span>
                          </Link>
                        </>
                      ) : (
                        <>
                          <Link
                            href="/candidato/dashboard"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors duration-150"
                          >
                            <LayoutDashboard className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
                            <span>Mi Dashboard</span>
                          </Link>
                          <Link
                            href="/candidato/perfil"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors duration-150"
                          >
                            <FileText className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
                            <span>Mi Perfil y CV</span>
                          </Link>
                          <Link
                            href="/candidato/guardados"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors duration-150 group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Bookmark className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />
                              <span className="truncate">Empleos Guardados</span>
                            </div>
                            {savedJobs.length > 0 && (
                              <span
                                className={`${
                                  savedJobs.length > 9 ? 'min-w-[22px] h-[22px] px-1.5' : 'w-[22px] h-[22px]'
                                } aspect-square rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-400/30 flex items-center justify-center text-[11px] font-extrabold leading-none shrink-0 tabular-nums ml-2`}
                              >
                                {savedJobs.length}
                              </span>
                            )}
                          </Link>
                          <Link
                            href="/candidato/postulaciones"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100/80 dark:hover:bg-slate-800/70 transition-colors duration-150"
                          >
                            <Briefcase className="w-4 h-4 text-slate-400 dark:text-slate-400 shrink-0" />
                            <span>Mis Postulaciones</span>
                          </Link>
                        </>
                      )}
                    </div>

                    <div className="p-1.5 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        onClick={async () => {
                          setDropdownOpen(false)
                          await logout()
                        }}
                        className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors duration-150 text-left"
                      >
                        <LogOut className="w-4 h-4 shrink-0" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 xl:gap-2.5">
                <Link
                  href="/auth/login"
                  prefetch={false}
                  className="px-2.5 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors whitespace-nowrap"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/auth/registro"
                  prefetch={false}
                  className="px-2.5 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors whitespace-nowrap"
                >
                  Registrarse
                </Link>
                <Link
                  href="/empresa/publicar"
                  className="flex items-center gap-1.5 px-3 py-1.5 xl:px-4 xl:py-2 text-xs xl:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm hover:shadow transition-all whitespace-nowrap"
                >
                  <PlusCircle className="w-3.5 h-3.5 xl:w-4 xl:h-4 shrink-0" />
                  <span>Publicar Empleo</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile hamburger button */}
          <div className="flex lg:hidden items-center gap-1.5 sm:gap-2 z-10">
            <ModeToggle />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Overlay (flotante para evitar saltos de layout al scrollear) */}
      {mobileMenuOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 top-16 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-30 animate-in fade-in duration-200"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="lg:hidden absolute top-full left-0 right-0 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 sm:px-5 pt-3 pb-6 space-y-4 shadow-2xl z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-1">
            <Link
              href="/empleos"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Search className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Explorar Empleos
            </Link>

            <Link
              href="/empleos-informales"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/15 hover:bg-amber-100/70 dark:hover:bg-amber-500/25"
            >
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-amber-600 dark:text-amber-400 fill-amber-500" />
                <span>Empleos Informales</span>
              </div>
              <span className="px-2 py-0.5 text-[10px] bg-amber-200 dark:bg-amber-500/25 text-amber-900 dark:text-amber-300 rounded-full font-bold">
                WhatsApp
              </span>
            </Link>

            {!isEmpresa && (
              <Link
                href="/ia-chat"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Sparkles className="w-4 h-4 text-sky-500" />
                IA Chat
              </Link>
            )}

            <Link
              href="/planes"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Planes
            </Link>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {profile ? (
              <>
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-850 rounded-xl border border-slate-100 dark:border-slate-800">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Sesión actual</p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{profile.nombre}</p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 capitalize">{userRoleLabel}</p>
                </div>
                {isCandidato && (
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/candidato/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Mi Dashboard</span>
                    </Link>
                    <Link
                      href="/candidato/perfil"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Mi Perfil y CV</span>
                    </Link>
                    <Link
                      href="/candidato/guardados"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Bookmark className="w-4 h-4 text-blue-500 fill-blue-500 shrink-0" />
                        <span>Empleos Guardados</span>
                      </div>
                      {savedJobs.length > 0 && (
                        <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center">
                          {savedJobs.length}
                        </span>
                      )}
                    </Link>
                    <Link
                      href="/candidato/postulaciones"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Mis Postulaciones</span>
                    </Link>
                  </div>
                )}
                {isEmpresa && (
                  <div className="flex flex-col gap-1">
                    <Link
                      href="/empresa/dashboard"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Panel de Control</span>
                    </Link>
                    <Link
                      href="/empresa/publicar"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <PlusCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>Publicar Empleo</span>
                    </Link>
                    <Link
                      href="/empresa/seleccion-ia"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 rounded-xl transition-colors"
                    >
                      <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>Selección con IA</span>
                    </Link>
                  </div>
                )}
                <button
                  onClick={async () => {
                    setMobileMenuOpen(false)
                    await logout()
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href="/auth/login"
                    prefetch={false}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                  >
                    Iniciar Sesión
                  </Link>
                  <Link
                    href="/auth/registro"
                    prefetch={false}
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full text-center py-2.5 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl transition-colors border border-indigo-200/50 dark:border-indigo-800/50"
                  >
                    Registrarse
                  </Link>
                </div>
                <Link
                  href="/empresa/publicar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Publicar Empleo
                </Link>
              </>
            )}
          </div>
          </div>
        </>
      )}
    </header>
  )
}
