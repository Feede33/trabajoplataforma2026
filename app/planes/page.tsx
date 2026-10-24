'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Sparkles, Zap, Building2, User, Loader2, AlertCircle, Clock, Crown, Camera, Wand2, Bot, Cpu, ArrowRight } from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import {
  FREE_AVISOS_MES,
  MAX_AVISOS_POR_USO_IA,
  PRODUCTS,
  ProductId,
  formatUYU,
  totalConIva,
} from '@/lib/billing'
import { BillingStatus, fetchBillingStatus, startCheckout } from '@/lib/billing-client'
import { FeaturedGlowCard } from '@/components/ui/border-beam'
import { LiquidGlassShowcase, LiquidGlassCard } from '@/components/ui/liquid-glass'

function PlanesContent() {
  const { profile, isAdmin, isLoading, getAccessToken } = useAuth()
  const searchParams = useSearchParams()
  const status = searchParams.get('status')

  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [buying, setBuying] = useState<ProductId | null>(null)
  const [error, setError] = useState('')

  const isEmpresa = profile?.role === 'empresa'
  const isCandidato = profile?.role === 'candidato'

  const loadBilling = async () => {
    if (!profile) return
    try {
      setBilling(await fetchBillingStatus(profile.id))
    } catch {
      setBilling(null)
    }
  }

  useEffect(() => {
    loadBilling()
    // Después de pagar, el webhook puede demorar unos segundos: se reintenta una vez
    if (profile && status === 'success') {
      const t = setTimeout(loadBilling, 5000)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, status])

  const handleBuy = async (product: ProductId) => {
    setError('')
    setBuying(product)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Iniciá sesión para continuar con la compra.')
      const url = await startCheckout(product, token)
      window.location.href = url
    } catch (err: any) {
      setError(err.message || 'No se pudo iniciar el pago.')
      setBuying(null)
    }
  }

  const loginHref = '/auth/login?redirect=/planes'

  const renderBuyButton = (
    product: ProductId,
    label: string,
    highlighted = false,
    glassVariant?: 'crystal' | 'crystal-amber'
  ) => {
    const p = PRODUCTS[product]
    const variantClass = glassVariant === 'crystal-amber'
      ? 'bg-gradient-to-r from-amber-500/90 via-orange-500/90 to-amber-600/90 hover:from-amber-500 hover:to-orange-500 text-white backdrop-blur-md border border-white/40 dark:border-amber-300/30 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.35),inset_0_1px_1px_rgba(255,255,255,0.5)] hover:shadow-[0_10px_28px_-4px_rgba(245,158,11,0.5)] hover:-translate-y-0.5'
      : glassVariant === 'crystal'
      ? 'bg-slate-900/75 hover:bg-slate-900/90 dark:bg-white/10 dark:hover:bg-white/20 text-white backdrop-blur-md border border-white/30 dark:border-white/20 shadow-[0_8px_20px_-6px_rgba(15,23,42,0.25),inset_0_1px_1px_rgba(255,255,255,0.35)] hover:-translate-y-0.5'
      : highlighted
      ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/35 hover:-translate-y-0.5'
      : 'bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:border dark:border-slate-700 text-white'

    const baseClass = `relative z-10 w-full py-3 px-5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${variantClass}`

    if (isLoading) {
      return <div className="h-11 rounded-2xl bg-slate-100 animate-pulse" />
    }
    if (!profile) {
      return (
        <Link href={loginHref} className={baseClass}>
          Iniciá sesión para comprar
        </Link>
      )
    }
    if (isAdmin) {
      return <p className="text-xs text-center text-slate-500">Como administrador no necesitás un plan.</p>
    }
    const allowed = p.roles.includes(profile.role as 'empresa' | 'candidato')
    if (!allowed) {
      return (
        <p className="text-xs text-center text-slate-500">
          Disponible solo para cuentas de {p.roles[0] === 'empresa' ? 'Empresa' : 'Candidato'}.
        </p>
      )
    }
    return (
      <button type="button" disabled={buying !== null} onClick={() => handleBuy(product)} className={`${baseClass} disabled:opacity-60`}>
        {buying === product ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirigiendo a Mercado Pago...</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    )
  }

  const priceBlock = (neto: number, suffix: string, extra?: string) => (
    <div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-slate-900">{formatUYU(neto)}</span>
        <span className="text-sm font-semibold text-slate-500">{suffix}</span>
      </div>
      <p className="text-xs text-slate-500 mt-1">
        + IVA · total {formatUYU(totalConIva(neto))}
        {extra ? ` · ${extra}` : ''}
      </p>
    </div>
  )

  const features = (items: string[]) => (
    <ul className="space-y-2.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-sm text-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )

  const currentPlanBadge = (plan: 'gratis' | 'mensual' | 'anual') =>
    billing?.plan === plan ? (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">Tu plan actual</span>
    ) : null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-16 [zoom:1.08] sm:[zoom:1.10]">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Planes y precios</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Buscar trabajo es gratis. Potencialo con IA.</h1>
        <p className="text-sm text-slate-600">
          Elegí a tu medida: Asistente inteligente para candidatos, publicación de clasificados con IA o planes para empresas.
        </p>
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>¡Gracias por tu compra! Tu pago está siendo confirmado y se acredita en unos segundos.</span>
        </div>
      )}
      {status === 'pending' && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          <Clock className="w-5 h-5 shrink-0" />
          <span>Tu pago está pendiente de acreditación. Cuando Mercado Pago lo confirme, tu plan se activa automáticamente.</span>
        </div>
      )}
      {status === 'failure' && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>El pago no se completó. No se realizó ningún cobro. Podés intentarlo nuevamente.</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-sm text-rose-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. SECCIÓN: Para candidatos · Asistente de IA (Gemini Gratis, Claude y ChatGPT) */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900">Para candidatos · Asistente de IA</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200">
                Pago por uso · Sin suscripción
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Empezá gratis con Google Gemini o sumá paquetes prepagos para usar Claude o ChatGPT cuando lo necesites.
            </p>
          </div>
        </div>

        {isCandidato && billing && (
          <div className="p-4 rounded-2xl bg-violet-50/80 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800/50 text-sm text-slate-700 dark:text-slate-200 flex items-center justify-between">
            <span>
              Tenés <strong>{billing.creditos}</strong> consultas de IA disponibles en tu cuenta.
            </span>
            <Link href="/ia-chat" className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1">
              Ir al Chat de IA <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* 1.1 Gratis — Google Gemini (Incluido) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-7 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">Google AI</span>
                  <h3 className="text-lg font-extrabold text-slate-900">Gemini Gratis</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                  Ya activo
                </span>
              </div>

              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900">$0</span>
                  <span className="text-sm font-semibold text-slate-500">/ siempre</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  API gratuita de Google Gemini ya integrada en tu cuenta
                </p>
              </div>

              {/* Modelos incluidos */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-emerald-500" /> Modelos incluidos
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {['Gemini 3.5 Flash', 'Gemini 3.8 Flash', 'Gemini 3.5 Flash Lite'].map((m) => (
                    <span
                      key={m}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {features([
                'Búsqueda inteligente de empleos formales e informales',
                'Lectura y análisis de tu CV en formato PDF',
                'Sugerencias para optimizar tu perfil profesional',
                'Postulación en 1 clic y borrador de emails con Gmail',
              ])}
            </div>

            {profile ? (
              <Link
                href="/ia-chat"
                className="w-full py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm text-center transition-colors flex items-center justify-center gap-2"
              >
                <span>Usar Asistente Gemini Gratis</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <Link
                href="/auth/registro?tipo=candidato"
                className="w-full py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm text-center transition-colors"
              >
                Crear cuenta de candidato gratis
              </Link>
            )}
          </div>

          {/* 1.2 Pack Claude — Anthropic */}
          {(() => {
            const p = PRODUCTS.candidato_claude
            return (
              <FeaturedGlowCard className="p-7 flex flex-col justify-between gap-6">
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-500/30 border border-indigo-400/30 whitespace-nowrap">
                  <Sparkles className="w-3 h-3 fill-amber-300 text-amber-300" /> Ideal para CV y Redacción
                </span>

                <div className="relative z-10 space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">{p.proveedorIa}</span>
                      <h3 className="text-lg font-extrabold text-slate-900">{p.nombre}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-800">
                      {p.creditos} consultas
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-slate-900">{formatUYU(p.neto)}</span>
                      <span className="text-sm font-semibold text-slate-500">pago único</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {p.creditos} consultas de IA · Los créditos no vencen
                    </p>
                  </div>

                  {/* Modelos de Claude */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-indigo-500" /> Modelos incluidos
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(p.modelos || []).map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 border border-indigo-200/70 dark:border-indigo-800/60"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {features([
                    `${p.creditos} consultas de IA incluidas`,
                    'Redacción superior de cartas y emails con Claude Sonnet 5.5',
                    'Búsqueda Profunda y adaptación completa de tu CV',
                    'Sin suscripción mensual: recargás cuando querés',
                  ])}
                </div>

                {renderBuyButton('candidato_claude', `Comprar ${p.creditos} consultas Claude`, true)}
              </FeaturedGlowCard>
            )
          })()}

          {/* 1.3 Pack ChatGPT — OpenAI */}
          {(() => {
            const p = PRODUCTS.candidato_chatgpt
            return (
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-7 flex flex-col justify-between gap-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">{p.proveedorIa}</span>
                      <h3 className="text-lg font-extrabold flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-400" /> {p.nombre}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400 text-emerald-950">
                      {p.creditos} consultas
                    </span>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold">{formatUYU(p.neto)}</span>
                      <span className="text-sm font-semibold text-slate-300">pago único</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      {p.creditos} consultas de IA · Los créditos no vencen
                    </p>
                  </div>

                  {/* Modelos de ChatGPT */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                      <Cpu className="w-3.5 h-3.5 text-emerald-400" /> Modelos incluidos
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(p.modelos || []).map((m) => (
                        <span
                          key={m}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white/10 text-white border border-white/15"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  <ul className="space-y-2.5">
                    {[
                      `${p.creditos} consultas de IA incluidas`,
                      'Razonamiento insignia con GPT-5.4 (1M de contexto)',
                      'Complejidad profesional y análisis profundo de CV con GPT-5.2',
                      'Sin suscripción mensual: pagás solo por lo que usás',
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {isLoading ? (
                  <div className="h-11 rounded-2xl bg-white/10 animate-pulse" />
                ) : !profile ? (
                  <Link
                    href={loginHref}
                    className="w-full py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm text-center transition-colors"
                  >
                    Iniciá sesión para comprar
                  </Link>
                ) : isAdmin ? (
                  <p className="text-xs text-center text-slate-300">Como administrador no necesitás un plan.</p>
                ) : !isCandidato ? (
                  <p className="text-xs text-center text-slate-300">Disponible solo para cuentas de Candidato.</p>
                ) : (
                  <button
                    type="button"
                    disabled={buying !== null}
                    onClick={() => handleBuy('candidato_chatgpt')}
                    className="w-full py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {buying === 'candidato_chatgpt' ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Redirigiendo a Mercado Pago...</span>
                      </>
                    ) : (
                      <span>Comprar {p.creditos} consultas ChatGPT</span>
                    )}
                  </button>
                )}
              </div>
            )
          })()}
        </div>
      </section>

      {/* 2. SECCIÓN: Créditos de IA para publicar avisos informales con visión artificial */}
      <section>
        <LiquidGlassShowcase>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/90 to-orange-500/90 text-white flex items-center justify-center shrink-0 shadow-[0_8px_20px_-4px_rgba(245,158,11,0.45),inset_0_1px_1px_rgba(255,255,255,0.6)] border border-white/40 backdrop-blur-md">
                <Sparkles className="w-6 h-6 drop-shadow-sm" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    Para Negocios: publicá avisos informales con IA
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/55 dark:bg-white/10 backdrop-blur-md border border-white/70 dark:border-white/15 text-amber-700 dark:text-amber-300 shadow-sm">
                    Visión Artificial
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                  Subí una foto o captura de pantalla y la IA arma el aviso por vos. Pensado para comercios, negocios locales y particulares.
                </p>
              </div>
            </div>

            {/* Píldoras translúcidas de proceso (Cristal esmerilado) */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/[0.07] backdrop-blur-md border border-white/75 dark:border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none">
                <Camera className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                1. Captura o foto
              </span>
              <span className="text-slate-400 font-bold">→</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/[0.07] backdrop-blur-md border border-white/75 dark:border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none">
                <Wand2 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                2. Lectura con IA
              </span>
              <span className="text-slate-400 font-bold">→</span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-white/[0.07] backdrop-blur-md border border-white/75 dark:border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:shadow-none">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                3. Aviso listo
              </span>
            </div>
          </div>

          {isCandidato && billing && (
            <div className="p-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 backdrop-blur-md border border-amber-400/40 dark:border-amber-400/30 text-sm text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span>
                Te quedan <strong>{billing.creditos}</strong> usos de IA disponibles en tu cuenta.
              </span>
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-7 max-w-4xl py-1">
            {(['creditos_5', 'creditos_20'] as ProductId[]).map((id) => {
              const p = PRODUCTS[id]
              const unit = p.neto / (p.creditos || 1)
              const isBestPack = id === 'creditos_20'
              return (
                <LiquidGlassCard
                  key={id}
                  accent={isBestPack ? 'amber' : 'cyan'}
                  className="p-7"
                >
                  <div className="space-y-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/80 dark:border-white/15 flex items-center justify-center shadow-sm">
                          <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-900">{p.nombre}</h3>
                      </div>
                      {isBestPack ? (
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-500/20 dark:bg-amber-400/20 backdrop-blur-md border border-amber-500/40 dark:border-amber-300/30 text-amber-900 dark:text-amber-200 shadow-sm">
                          25% OFF por uso
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/55 dark:bg-white/10 backdrop-blur-md border border-white/75 dark:border-white/15 text-slate-700">
                          Para empezar
                        </span>
                      )}
                    </div>

                    {priceBlock(p.neto, '', `${formatUYU(unit)} + IVA por uso`)}

                    <div className="h-px bg-gradient-to-r from-transparent via-slate-300/60 dark:via-white/15 to-transparent" />

                    {features([
                      `Hasta ${MAX_AVISOS_POR_USO_IA} avisos extraídos por cada uso`,
                      'Los créditos no vencen nunca',
                      'Si la IA falla, no se descuenta el uso',
                    ])}
                  </div>

                  {renderBuyButton(
                    id,
                    `Comprar ${p.creditos} usos`,
                    false,
                    isBestPack ? 'crystal-amber' : 'crystal'
                  )}
                </LiquidGlassCard>
              )
            })}
          </div>

          <p className="text-xs text-slate-600 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Ver avisos informales y contactar por WhatsApp o email siempre es gratis. La IA es opcional.
          </p>
        </LiquidGlassShowcase>
      </section>

      {/* 3. SECCIÓN: Planes para empresas */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Para empresas</h2>
            <p className="text-xs text-slate-500">Publicá empleos formales y recibí postulaciones.</p>
          </div>
        </div>

        {isEmpresa && billing && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
            Este mes usaste <strong>{billing.avisosUsados}</strong> de <strong>{billing.avisosLimite}</strong> avisos.
            {billing.periodEnd && (
              <> Tu plan vence el <strong>{new Date(billing.periodEnd).toLocaleDateString('es-UY')}</strong>.</>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {/* Gratis */}
          <div className="bg-white rounded-3xl border border-slate-200 p-7 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">Gratis</h3>
                {currentPlanBadge('gratis')}
              </div>
              <div>
                <span className="text-4xl font-extrabold text-slate-900">$0</span>
                <p className="text-xs text-slate-500 mt-1">Para empezar y probar la plataforma</p>
              </div>
              {features([
                `${FREE_AVISOS_MES} avisos por mes`,
                'Recibí postulaciones y CVs',
                'Panel para gestionar candidatos',
              ])}
            </div>
            {profile ? (
              <p className="text-xs text-center text-slate-500">Se aplica automáticamente a tu cuenta.</p>
            ) : (
              <Link href="/auth/registro?tipo=empresa" className="w-full py-3 px-5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-800 font-bold text-sm text-center transition-colors">
                Crear cuenta de empresa
              </Link>
            )}
          </div>

          {/* Mensual */}
          <FeaturedGlowCard className="p-7 flex flex-col justify-between gap-6">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1 rounded-full bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-500/30 border border-indigo-400/30">
              <Zap className="w-3 h-3 fill-amber-300 text-amber-300" /> Más popular
            </span>
            <div className="relative z-10 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold text-slate-900">Mensual</h3>
                {currentPlanBadge('mensual')}
              </div>
              {priceBlock(PRODUCTS.mensual.neto, '/mes')}
              {features([
                `${PRODUCTS.mensual.avisosMes} avisos por mes`,
                'Recibí postulaciones y CVs',
                'Panel para gestionar candidatos',
                'Sin permanencia: pagás solo el mes que lo necesitás',
              ])}
            </div>
            {renderBuyButton('mensual', 'Contratar plan mensual', true)}
          </FeaturedGlowCard>

          {/* Anual */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-7 flex flex-col justify-between gap-6">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-400" /> Anual
                </h3>
                {billing?.plan === 'anual' ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-400 text-emerald-950">Tu plan actual</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-amber-950">Mejor valor</span>
                )}
              </div>
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">{formatUYU(PRODUCTS.anual.neto / 12)}</span>
                  <span className="text-sm font-semibold text-slate-300">/mes</span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Pago único de {formatUYU(PRODUCTS.anual.neto)} + IVA (total {formatUYU(totalConIva(PRODUCTS.anual.neto))}) · 20% menos que el mensual
                </p>
              </div>
              <ul className="space-y-2.5">
                {[
                  `${PRODUCTS.anual.avisosMes} avisos por mes`,
                  'Recibí postulaciones y CVs',
                  'Panel para gestionar candidatos',
                  'Un solo pago, sin renovaciones durante un año',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            {isLoading ? (
              <div className="h-11 rounded-2xl bg-white/10 animate-pulse" />
            ) : !profile ? (
              <Link href={loginHref} className="w-full py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm text-center transition-colors">
                Iniciá sesión para comprar
              </Link>
            ) : isAdmin ? (
              <p className="text-xs text-center text-slate-300">Como administrador no necesitás un plan.</p>
            ) : !isEmpresa ? (
              <p className="text-xs text-center text-slate-300">Disponible solo para cuentas de Empresa.</p>
            ) : (
              <button
                type="button"
                disabled={buying !== null}
                onClick={() => handleBuy('anual')}
                className="w-full py-3 px-5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-slate-950 font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {buying === 'anual' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Redirigiendo a Mercado Pago...</span>
                  </>
                ) : (
                  <span>Contratar plan anual</span>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-slate-500">
        Los pagos se procesan de forma segura con Mercado Pago. Postulauy.com no almacena datos de tarjetas.
      </p>
    </div>
  )
}

export default function PlanesPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto px-4 py-16"><div className="h-96 bg-slate-200 rounded-3xl animate-pulse" /></div>}>
      <PlanesContent />
    </Suspense>
  )
}
