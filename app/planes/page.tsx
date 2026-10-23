'use client'

import React, { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Sparkles, Zap, Building2, User, Loader2, AlertCircle, Clock, Crown } from 'lucide-react'
import { useAuth } from '@/lib/context/AuthContext'
import { FREE_AVISOS_MES, MAX_AVISOS_POR_USO_IA, PRODUCTS, ProductId, formatUYU, totalConIva } from '@/lib/billing'
import { BillingStatus, fetchBillingStatus, startCheckout } from '@/lib/billing-client'

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

  const renderBuyButton = (product: ProductId, label: string, highlighted = false) => {
    const p = PRODUCTS[product]
    const baseClass = `w-full py-3 px-5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
      highlighted
        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'
        : 'bg-slate-900 hover:bg-slate-800 text-white'
    }`

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-14">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">Planes y precios</span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Buscar trabajo es gratis. Publicar, a tu medida.</h1>
        <p className="text-sm text-slate-600">
          Los postulantes usan Postulauy.com sin costo. Las empresas empiezan gratis y pasan a un plan cuando necesitan publicar más.
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

      {/* Planes para empresas */}
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
          <div className="relative bg-white rounded-3xl border-2 border-indigo-500 p-7 flex flex-col justify-between gap-6 shadow-xl shadow-indigo-100">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
              <Zap className="w-3 h-3" /> Más popular
            </span>
            <div className="space-y-5">
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
          </div>

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

      {/* Créditos de IA para particulares */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Publicá avisos informales con IA</h2>
            <p className="text-xs text-slate-500">
              Subí una foto o captura de pantalla y la IA arma el aviso por vos. Para cuentas de Candidato.
            </p>
          </div>
        </div>

        {isCandidato && billing && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            Te quedan <strong>{billing.creditos}</strong> usos de IA.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
          {(['creditos_5', 'creditos_20'] as ProductId[]).map((id) => {
            const p = PRODUCTS[id]
            const unit = p.neto / (p.creditos || 1)
            return (
              <div key={id} className="bg-white rounded-3xl border border-slate-200 p-7 flex flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-amber-600" />
                    <h3 className="text-lg font-extrabold text-slate-900">{p.nombre}</h3>
                  </div>
                  {priceBlock(p.neto, '', `${formatUYU(unit)} + IVA por uso`)}
                  {features([
                    `Hasta ${MAX_AVISOS_POR_USO_IA} avisos por cada uso`,
                    'Los créditos no vencen',
                    'Si la IA falla, no se descuenta el uso',
                  ])}
                </div>
                {renderBuyButton(id, `Comprar ${p.creditos} usos`)}
              </div>
            )
          })}
        </div>
        <p className="text-xs text-slate-500">
          Ver avisos informales y contactar por WhatsApp o email siempre es gratis. La IA es opcional.
        </p>
      </section>

      <p className="text-center text-xs text-slate-500">
        Los pagos se procesan de forma segura con Mercado Pago. Postulauy.com no almacena datos de tarjetas.
      </p>
    </div>
  )
}

export default function PlanesPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-16"><div className="h-96 bg-slate-200 rounded-3xl animate-pulse" /></div>}>
      <PlanesContent />
    </Suspense>
  )
}
