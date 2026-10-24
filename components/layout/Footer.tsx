import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Briefcase, Heart, MapPin, Mail, ShieldCheck } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10">
          {/* Brand & mission */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center shadow-md shadow-sky-500/10 group-hover:shadow-sky-500/25 group-hover:scale-105 transition-all border border-slate-800">
                <Image
                  src="/logo-navbar.png"
                  alt="PostulaUY"
                  width={36}
                  height={36}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="font-extrabold text-xl text-white tracking-tight flex items-center">
                Postula<span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400 bg-clip-text text-transparent font-black ml-0.5">UY<span className="text-xs font-bold ml-0.5">.com</span></span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              La plataforma que conecta a las empresas líderes con el mejor talento del país. Fletes, tecnología, logística, diseño, administración y más.
            </p>
            <div className="flex items-center gap-4 text-xs text-slate-400 pt-2">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-indigo-400" /> Uruguay
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> Empleos Verificados
              </span>
            </div>
          </div>

          {/* Candidatos */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Para Candidatos
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/empleos" className="hover:text-white transition-colors">
                  Buscar Empleos
                </Link>
              </li>
              <li>
                <Link href="/empleos?modalidad=remoto" className="hover:text-white transition-colors">
                  Trabajo Remoto
                </Link>
              </li>
              <li>
                <Link href="/candidato/perfil" className="hover:text-white transition-colors">
                  Cargar mi CV
                </Link>
              </li>
              <li>
                <Link href="/candidato/postulaciones" className="hover:text-white transition-colors">
                  Mis Postulaciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Empresas */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Para Empresas
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/empresa/publicar" className="hover:text-white transition-colors">
                  Publicar Empleo
                </Link>
              </li>
              <li>
                <Link href="/empresa/dashboard" className="hover:text-white transition-colors">
                  Panel de Empresa
                </Link>
              </li>
              <li>
                <Link href="/empresa/postulaciones" className="hover:text-white transition-colors">
                  Gestionar Candidatos
                </Link>
              </li>
              <li>
                <Link href="/auth/registro?tipo=empresa" prefetch={false} className="hover:text-white transition-colors">
                  Crear Cuenta Empresa
                </Link>
              </li>
            </ul>
          </div>

          {/* Rubros populares */}
          <div>
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-4">
              Rubros Populares
            </h4>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/empleos?rubro=Tecnología" className="hover:text-white transition-colors">
                  Tecnología & IT
                </Link>
              </li>
              <li>
                <Link href="/empleos?rubro=Logística" className="hover:text-white transition-colors">
                  Logística & Fletes
                </Link>
              </li>
              <li>
                <Link href="/empleos?rubro=Marketing" className="hover:text-white transition-colors">
                  Marketing & Ventas
                </Link>
              </li>
              <li>
                <Link href="/empleos?rubro=Diseño" className="hover:text-white transition-colors">
                  Diseño & Creatividad
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-slate-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} Postulauy.com. Todos los derechos reservados.</p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/terms-of-service" className="hover:text-white transition-colors underline-offset-4 hover:underline">
              Términos del Servicio
            </Link>
            <span className="text-slate-700">•</span>
            <Link href="/privacy-policy" className="hover:text-white transition-colors underline-offset-4 hover:underline">
              Política de Privacidad
            </Link>
            <span className="text-slate-700">•</span>
            <span>Uruguay</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
