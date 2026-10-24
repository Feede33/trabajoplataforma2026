import { NextResponse } from 'next/server'
import { getAuthedContext, getServiceClient, isBackendConfigured } from '@/lib/server/auth'
import { applyToJobs, runAgent, ChatTurn } from '@/lib/server/ai-agent'

export const maxDuration = 60

const MAX_HISTORY = 20
const MAX_MESSAGE_LEN = 4000

export async function POST(request: Request) {
  try {
    if (!isBackendConfigured()) {
      return NextResponse.json({ error: 'El backend no está configurado.' }, { status: 503 })
    }
    const ctx = await getAuthedContext(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Iniciá sesión para usar el chat de IA.' }, { status: 401 })
    }
    if (!ctx.isAdmin && ctx.role !== 'candidato') {
      return NextResponse.json({ error: 'El chat de IA está disponible para cuentas de candidato.' }, { status: 403 })
    }
    const db = getServiceClient()
    if (!db) {
      return NextResponse.json({ error: 'Servicio no configurado (falta SUPABASE_SERVICE_ROLE_KEY).' }, { status: 503 })
    }

    const body = await request.json().catch(() => ({}))
    const user = { userId: ctx.userId, email: ctx.email }

    // Confirmación explícita del usuario: se aplican las postulaciones propuestas sin pasar por el modelo.
    if (Array.isArray(body.confirm) && body.confirm.length > 0) {
      const items = body.confirm
        .filter((c: any) => c && typeof c.job_id === 'string')
        .map((c: any) => ({
          job_id: c.job_id as string,
          mensaje: typeof c.mensaje === 'string' ? c.mensaje.slice(0, 1500) : 'Hola, me interesa esta vacante.',
        }))
      const { applied, skipped } = await applyToJobs(db, user, items)
      return NextResponse.json({ applied, skipped })
    }

    const history: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_HISTORY)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LEN) }))

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Mensaje inválido.' }, { status: 400 })
    }

    const result = await runAgent({ db, user, history, autoApply: body.autoApply === true })
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error en /api/ai-chat:', err)
    return NextResponse.json({ error: err.message || 'Error procesando la solicitud' }, { status: 500 })
  }
}
