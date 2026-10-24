import { createClient } from '@/lib/supabase/client'
import { FREE_AVISOS_MES } from '@/lib/billing'

export interface BillingStatus {
  /** Plan vigente o 'gratis' */
  plan: 'gratis' | 'mensual' | 'anual'
  periodEnd: string | null
  /** Avisos formales que se pueden crear por mes */
  avisosLimite: number
  /** Avisos formales creados este mes */
  avisosUsados: number
  /** Usos de IA para publicar clasificados/empleos informales (creditos_5, creditos_20) */
  creditosPublicar: number
  /** Consultas de IA para Claude (candidato_claude) */
  creditosClaude: number
  /** Consultas de IA para ChatGPT (candidato_chatgpt) */
  creditosChatgpt: number
  /** Compatibilidad: alias a creditosPublicar */
  creditos: number
}

/** Fecha (YYYY-MM-01) del mes actual en horario de Montevideo, igual que el cálculo del servidor. */
function currentPeriod(): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Montevideo', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  return `${year}-${month}-01`
}

/** Lee el estado de facturación del usuario (las políticas RLS solo permiten ver lo propio). */
export async function fetchBillingStatus(userId: string): Promise<BillingStatus> {
  const supabase = createClient()

  const [subRes, usageRes, creditsRes] = await Promise.all([
    supabase.from('subscriptions').select('plan, avisos_mes_limite, current_period_end').eq('user_id', userId).maybeSingle(),
    supabase.from('job_usage').select('creados').eq('user_id', userId).eq('periodo', currentPeriod()).maybeSingle(),
    supabase.from('ai_credits').select('*').eq('user_id', userId).maybeSingle(),
  ])

  const sub = subRes.data as { plan: 'mensual' | 'anual'; avisos_mes_limite: number; current_period_end: string } | null
  const active = !!sub && new Date(sub.current_period_end).getTime() > Date.now()

  const cData = creditsRes.data as Record<string, any> | null
  const creditosPublicar = typeof cData?.balance === 'number' ? Math.max(0, cData.balance) : 0
  const creditosClaude = typeof cData?.balance_claude === 'number' ? Math.max(0, cData.balance_claude) : 0
  const creditosChatgpt = typeof cData?.balance_chatgpt === 'number' ? Math.max(0, cData.balance_chatgpt) : 0

  return {
    plan: active ? sub!.plan : 'gratis',
    periodEnd: active ? sub!.current_period_end : null,
    avisosLimite: active ? sub!.avisos_mes_limite : FREE_AVISOS_MES,
    avisosUsados: (usageRes.data as { creados: number } | null)?.creados ?? 0,
    creditosPublicar,
    creditosClaude,
    creditosChatgpt,
    creditos: creditosPublicar,
  }
}

/** Inicia el pago en Mercado Pago y devuelve la URL a la que hay que redirigir al usuario. */
export async function startCheckout(product: string, accessToken: string): Promise<string> {
  const res = await fetch('/api/billing/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ product }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) {
    throw new Error(data.error || 'No se pudo iniciar el pago.')
  }
  return data.url as string
}
