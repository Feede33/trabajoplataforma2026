/**
 * Catálogo de planes y paquetes de Postulauy.com.
 * Los precios se definen SOLO aquí (el servidor nunca confía en un precio enviado por el navegador).
 * Montos en pesos uruguayos (UYU). El IVA se suma al precio neto.
 */

export const IVA_RATE = 0.22

/** Avisos formales gratis por mes. Debe coincidir con el valor fijo de la función enforce_job_quota en la migración 007. */
export const FREE_AVISOS_MES = 2

/** Máximo de avisos que se publican con un solo uso de IA (evita que 1 crédito publique una página entera). */
export const MAX_AVISOS_POR_USO_IA = 5

export type ProductId = 'mensual' | 'anual' | 'creditos_5' | 'creditos_20'
export type ProductRole = 'empresa' | 'candidato'

export interface Product {
  id: ProductId
  kind: 'plan' | 'credits'
  nombre: string
  descripcion: string
  /** Precio neto, sin IVA */
  neto: number
  /** Roles que pueden comprarlo */
  roles: ProductRole[]
  /** Planes: duración y límite de avisos creados por mes */
  dias?: number
  avisosMes?: number
  /** Paquetes: cantidad de usos de IA */
  creditos?: number
}

export const PRODUCTS: Record<ProductId, Product> = {
  mensual: {
    id: 'mensual',
    kind: 'plan',
    nombre: 'Plan Mensual',
    descripcion: '15 avisos por mes durante 30 días',
    neto: 500,
    roles: ['empresa'],
    dias: 30,
    avisosMes: 15,
  },
  anual: {
    id: 'anual',
    kind: 'plan',
    nombre: 'Plan Anual',
    descripcion: '30 avisos por mes durante 365 días',
    neto: 4800,
    roles: ['empresa'],
    dias: 365,
    avisosMes: 30,
  },
  creditos_5: {
    id: 'creditos_5',
    kind: 'credits',
    nombre: 'Pack 5 usos de IA',
    descripcion: 'Publicá 5 veces con IA (hasta 5 avisos por uso)',
    neto: 100,
    roles: ['candidato'],
    creditos: 5,
  },
  creditos_20: {
    id: 'creditos_20',
    kind: 'credits',
    nombre: 'Pack 20 usos de IA',
    descripcion: 'Publicá 20 veces con IA (hasta 5 avisos por uso)',
    neto: 300,
    roles: ['candidato'],
    creditos: 20,
  },
}

/** Roles (además del admin) que pueden publicar avisos informales con IA pagando créditos. */
export const AI_ALLOWED_ROLES: ProductRole[] = ['candidato']

export function totalConIva(neto: number): number {
  return Math.round(neto * (1 + IVA_RATE) * 100) / 100
}

export function isProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && value in PRODUCTS
}

export function formatUYU(value: number): string {
  return `$${value.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}
