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

/**
 * Regla de 3 para paquetes de IA de Candidatos:
 * - 1 crédito de consulta equivale a un tope de TOKENS_POR_CREDITO_IA tokens ponderados.
 * - Si una consulta pesada (ej. Búsqueda Profunda o lectura de CV PDF) consume más tokens,
 *   se descuentan créditos proporcionalmente: Math.ceil(tokensConsumidos / TOKENS_POR_CREDITO_IA).
 * - Precio Neto Usuario = Costo Real API (en UYU) × MARGEN_MULTIPLICADOR_IA (x2).
 */
export const TOKENS_POR_CREDITO_IA = 5_000
export const MARGEN_MULTIPLICADOR_IA = 2
export const USD_TO_UYU_REF = 42

export type ProductId = 'mensual' | 'anual' | 'creditos_5' | 'creditos_20' | 'candidato_claude' | 'candidato_chatgpt'
export type ProductRole = 'empresa' | 'candidato'

export interface Product {
  id: ProductId
  kind: 'plan' | 'credits'
  nombre: string
  descripcion: string
  /** Precio neto, sin IVA (ya incluye el margen x2 sobre el costo de API en paquetes IA) */
  neto: number
  /** Roles que pueden comprarlo */
  roles: ProductRole[]
  /** Planes: duración y límite de avisos creados por mes */
  dias?: number
  avisosMes?: number
  /** Paquetes: cantidad de usos / consultas de IA acreditadas */
  creditos?: number
  /** Tope de tokens incluidos en el paquete (garantiza que el usuario nunca supere el costo de API calculado) */
  tokensIncluidos?: number
  /** Costo estimado de API en USD para esos tokens (antes de aplicar el margen x2) */
  costoApiUsd?: number
  /** Modelos de IA habilitados en el paquete */
  modelos?: string[]
  /** Proveedor de IA */
  proveedorIa?: string
}

/**
 * Calcula cuántos créditos descontar según los tokens reales consumidos en una llamada a la API
 * (Regla de 3: garantiza que el costo de API nunca supere lo pagado por el usuario).
 */
export function calcularCreditosPorTokens(tokensConsumidos: number): number {
  if (tokensConsumidos <= 0) return 1
  return Math.max(1, Math.ceil(tokensConsumidos / TOKENS_POR_CREDITO_IA))
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
  candidato_claude: {
    id: 'candidato_claude',
    kind: 'credits',
    nombre: 'Pack Claude IA',
    descripcion: '100 consultas de IA (~500.000 tokens) con Claude Sonnet 5.5 y familia Claude',
    // Según precios oficiales Anthropic: Sonnet 5.5 ($2/M input, $10/M output).
    // Costo real API para 500k tokens ≈ $1.80 USD (~$76 UYU). Precio neto $200 UYU = +160% de margen limpio.
    neto: 200,
    roles: ['candidato'],
    creditos: 100,
    tokensIncluidos: 500_000,
    costoApiUsd: 1.8,
    proveedorIa: 'Anthropic',
    modelos: ['Claude Sonnet 5.5', 'Claude Haiku 5.5', 'Claude Opus 5.5'],
  },
  candidato_chatgpt: {
    id: 'candidato_chatgpt',
    kind: 'credits',
    nombre: 'Pack ChatGPT IA',
    descripcion: '100 consultas de IA (~500.000 tokens) con GPT-5.4 y GPT-5.2',
    // Según precios oficiales OpenAI de tus capturas:
    // GPT-5.4 ($2.50/M input, $15.00/M output) y GPT-5.2 ($1.75/M input, $14.00/M output).
    // Costo real API para 500k tokens ≈ $2.20 USD (~$92 UYU). Precio neto $250 UYU = +170% de margen limpio.
    neto: 250,
    roles: ['candidato'],
    creditos: 100,
    tokensIncluidos: 500_000,
    costoApiUsd: 2.2,
    proveedorIa: 'OpenAI',
    modelos: ['GPT-5.4', 'GPT-5.2'],
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
