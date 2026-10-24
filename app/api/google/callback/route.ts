import { NextResponse } from 'next/server'
import { getServiceClient, getSiteUrl } from '@/lib/server/auth'
import {
  emailFromIdToken,
  encryptToken,
  exchangeCode,
  verifyState,
} from '@/lib/server/google'

export async function GET(request: Request) {
  const site = getSiteUrl(request)
  const back = (status: string) => NextResponse.redirect(`${site}/ia-chat?gmail=${status}`)

  const url = new URL(request.url)
  if (url.searchParams.get('error')) return back('denied')

  const userId = verifyState(url.searchParams.get('state'))
  const code = url.searchParams.get('code')
  if (!userId || !code) return back('error')

  const db = getServiceClient()
  if (!db) return back('error')

  try {
    const tokens = await exchangeCode(code, site)
    if (!tokens.refresh_token) return back('error')
    // Verificar que el usuario realmente otorgó el permiso de envío
    if (!tokens.scope?.includes('gmail.send')) return back('denied')

    const { error } = await db.from('google_connections').upsert({
      user_id: userId,
      email: emailFromIdToken(tokens.id_token),
      refresh_token_enc: encryptToken(tokens.refresh_token),
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      console.error('Error guardando conexión de Google:', error)
      return back('error')
    }
    return back('connected')
  } catch (err) {
    console.error('Callback de Google falló:', err)
    return back('error')
  }
}
