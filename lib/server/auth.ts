import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { isProfileAdmin } from '@/lib/auth-utils'

/**
 * Utilidades de servidor para rutas API (solo se importan desde /app/api).
 */

export function isBackendConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !!(url && key && !url.includes('your-supabase-project'))
}

/** Cliente con privilegios totales. Usar únicamente después de verificar permisos en código. */
export function getServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

export interface AuthedContext {
  userId: string
  email: string | null
  role: string | null
  isAdmin: boolean
}

/**
 * Valida el token Bearer y devuelve la identidad y el rol REALES leídos desde la base de datos.
 * Devuelve null si el token falta o es inválido.
 */
export async function getAuthedContext(request: Request): Promise<AuthedContext | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null
  if (!token) return null

  const supabaseAuth = createClient(url, anonKey, { auth: { persistSession: false } })
  const {
    data: { user },
    error,
  } = await supabaseAuth.auth.getUser(token)
  if (error || !user) return null

  // El perfil se lee con el cliente de servicio para no depender de las políticas RLS
  const service = getServiceClient()
  const reader = service || supabaseAuth
  const { data: profile } = await reader
    .from('profiles')
    .select('is_admin, role, email')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    email: user.email || profile?.email || null,
    role: profile?.role || null,
    isAdmin: isProfileAdmin(profile || { email: user.email }),
  }
}

/** URL pública del sitio, usada para los retornos y el webhook de Mercado Pago. */
export function getSiteUrl(request: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/+$/, '')
  const prodUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (prodUrl) return `https://${prodUrl}`
  return new URL(request.url).origin
}
