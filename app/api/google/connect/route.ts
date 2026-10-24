import { NextResponse } from 'next/server'
import { getAuthedContext, getServiceClient, getSiteUrl } from '@/lib/server/auth'
import { buildAuthUrl, getGmailConnection, isGoogleConfigured } from '@/lib/server/google'

/** POST: estado de la conexión; si no está conectado devuelve la URL de autorización de Google. */
export async function POST(request: Request) {
  const ctx = await getAuthedContext(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = getServiceClient()
  if (!db) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
  if (!isGoogleConfigured()) {
    return NextResponse.json({ configured: false, connected: false })
  }

  const body = await request.json().catch(() => ({}))

  // Mientras la aplicación de Google OAuth está en proceso de verificación (24h aprox.),
  // solo los administradores pueden autorizar y usar la integración con Gmail.
  if (!ctx.isAdmin) {
    return NextResponse.json({
      configured: false,
      connected: false,
      comingSoon: true,
      message: 'La función de postular por Gmail estará disponible muy pronto (en proceso de verificación oficial con Google).',
    })
  }

  const conn = await getGmailConnection(db, ctx.userId)

  if (conn && !body.reconnect) {
    return NextResponse.json({ configured: true, connected: true, email: conn.email })
  }
  return NextResponse.json({
    configured: true,
    connected: false,
    url: buildAuthUrl(getSiteUrl(request), ctx.userId),
  })
}

/** DELETE: desconecta Gmail (borra el token guardado). */
export async function DELETE(request: Request) {
  const ctx = await getAuthedContext(request)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = getServiceClient()
  if (!db) return NextResponse.json({ error: 'Servicio no configurado' }, { status: 503 })
  await db.from('google_connections').delete().eq('user_id', ctx.userId)
  return NextResponse.json({ ok: true })
}
