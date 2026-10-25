import { NextResponse } from 'next/server'
import { isValidEmail } from '@/lib/server/google'
import { getAuthedContext, getServiceClient, isBackendConfigured } from '@/lib/server/auth'
import {
  ALLOWED_ATTACHMENT_MIMES,
  MAX_ATTACHMENTS,
  MAX_PHOTO_ATTACHMENTS,
  MAX_PDF_ATTACHMENTS,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
  MAX_ATTACHMENT_BYTES,
  Attachment,
  applyToJobs,
  runAgent,
  sendConfirmedEmail,
  ChatTurn,
} from '@/lib/server/ai-agent'

export const maxDuration = 60

const MAX_HISTORY = 20
const MAX_MESSAGE_LEN = 4000

function cleanNewlines(str?: string): string {
  if (!str) return ''
  return str.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
}

function personalizeEmailText(
  template: string,
  meta: { empresa?: string; puesto?: string; candidateName?: string }
): string {
  if (!template) return ''
  let res = cleanNewlines(template)

  const empresaVal = meta.empresa?.trim() || ''
  const puestoVal = meta.puesto?.trim() || ''
  const nombreVal = meta.candidateName?.trim() || ''

  if (empresaVal) {
    res = res.replace(/\{\s*empresa[0-9]*\s*\}/gi, empresaVal)
  }
  if (puestoVal) {
    res = res.replace(/\{\s*(puesto|cargo|vacante)[0-9]*\s*\}/gi, puestoVal)
  }
  if (nombreVal) {
    res = res.replace(/\{\s*(nombre|candidato)\s*\}/gi, nombreVal)
  }

  return res
}

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
    const user = { userId: ctx.userId, email: ctx.email, isAdmin: ctx.isAdmin }

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

    // Confirmación explícita de cambios al perfil/CV propuestos por la IA
    if (body.confirmProfile && typeof body.confirmProfile === 'object') {
      const patch: Record<string, string> = {}
      for (const k of ['nombre', 'bio', 'ubicacion']) {
        const v = body.confirmProfile[k]
        if (typeof v === 'string' && v.trim()) patch[k] = v.trim().slice(0, 4000)
      }
      if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Sin cambios.' }, { status: 400 })
      const { error } = await db.from('profiles').update(patch).eq('id', user.userId)
      if (error) return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 })
      return NextResponse.json({ saved: Object.keys(patch) })
    }

    // Confirmación explícita de correos en lote (hasta 5 correos simultáneos)
    if (Array.isArray(body.confirmEmails) && body.confirmEmails.length > 0) {
      if (!ctx.isAdmin) {
        return NextResponse.json({
          error: 'La función de postular por Gmail estará disponible muy pronto (en proceso de verificación oficial con Google).',
          code: 'GMAIL_COMING_SOON',
          comingSoon: true,
        }, { status: 403 })
      }
      const rawList = body.confirmEmails.slice(0, 5)
      const validList = rawList.filter((e: any) =>
        e &&
        isValidEmail(e.to) &&
        typeof e.subject === 'string' &&
        typeof e.body === 'string' &&
        e.subject.trim() &&
        e.body.trim()
      )
      if (validList.length === 0) {
        return NextResponse.json({ error: 'No hay correos válidos para enviar.' }, { status: 400 })
      }

      const results = await Promise.allSettled(
        validList.map((e: any) => {
          const empresa = typeof e.empresa === 'string' ? e.empresa.trim() : undefined
          const puesto = typeof e.puesto === 'string' ? e.puesto.trim() : undefined
          const candidateName = user.email ? user.email.split('@')[0] : 'Candidato'
          const subject = personalizeEmailText(e.subject, { empresa, puesto, candidateName }).slice(0, 200)
          const body = personalizeEmailText(e.body, { empresa, puesto, candidateName }).slice(0, 5000)

          return sendConfirmedEmail(db, user, {
            to: e.to.trim(),
            subject,
            body,
            attach_cv: e.attach_cv !== false,
            empresa,
            puesto,
            thread_id: typeof e.thread_id === 'string' ? e.thread_id : undefined,
            in_reply_to: typeof e.in_reply_to === 'string' ? e.in_reply_to : undefined,
          })
        })
      )

      const sentRecipients: string[] = []
      const failedRecipients: { to: string; error: string }[] = []

      results.forEach((res, idx) => {
        const to = validList[idx].to.trim()
        if (res.status === 'fulfilled') {
          sentRecipients.push(to)
        } else {
          failedRecipients.push({ to, error: res.reason?.message || 'Error al enviar' })
        }
      })

      if (sentRecipients.length === 0 && failedRecipients.some((f) => f.error === 'GMAIL_NOT_CONNECTED')) {
        return NextResponse.json({ error: 'Conectá tu Gmail para enviar correos.', code: 'GMAIL_NOT_CONNECTED' }, { status: 409 })
      }

      return NextResponse.json({
        sent: sentRecipients.length > 0,
        count: sentRecipients.length,
        recipients: sentRecipients,
        failed: failedRecipients,
      })
    }

    // Confirmación explícita de UN correo: se envía exactamente lo que el usuario vio en pantalla.
    if (body.confirmEmail && typeof body.confirmEmail === 'object') {
      if (!ctx.isAdmin) {
        return NextResponse.json({
          error: 'La función de postular por Gmail estará disponible muy pronto (en proceso de verificación oficial con Google).',
          code: 'GMAIL_COMING_SOON',
          comingSoon: true,
        }, { status: 403 })
      }
      const e = body.confirmEmail
      if (!isValidEmail(e.to) || typeof e.subject !== 'string' || typeof e.body !== 'string' || !e.subject.trim() || !e.body.trim()) {
        return NextResponse.json({ error: 'Correo inválido.' }, { status: 400 })
      }
      try {
        const empresa = typeof e.empresa === 'string' ? e.empresa.trim() : undefined
        const puesto = typeof e.puesto === 'string' ? e.puesto.trim() : undefined
        const candidateName = user.email ? user.email.split('@')[0] : 'Candidato'
        const subject = personalizeEmailText(e.subject, { empresa, puesto, candidateName }).slice(0, 200)
        const body = personalizeEmailText(e.body, { empresa, puesto, candidateName }).slice(0, 5000)

        await sendConfirmedEmail(db, user, {
          to: e.to.trim(),
          subject,
          body,
          attach_cv: e.attach_cv !== false,
          thread_id: typeof e.thread_id === 'string' ? e.thread_id : undefined,
          in_reply_to: typeof e.in_reply_to === 'string' ? e.in_reply_to : undefined,
        })
        return NextResponse.json({ sent: true, to: e.to.trim() })
      } catch (err: any) {
        if (err.message === 'GMAIL_NOT_CONNECTED') {
          return NextResponse.json({ error: 'Conectá tu Gmail para enviar correos.', code: 'GMAIL_NOT_CONNECTED' }, { status: 409 })
        }
        return NextResponse.json({ error: err.message || 'No se pudo enviar el correo.' }, { status: 502 })
      }
    }

    const history: ChatTurn[] = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: any) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_HISTORY)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LEN) }))

    if (history.length === 0 || history[history.length - 1].role !== 'user') {
      return NextResponse.json({ error: 'Mensaje inválido.' }, { status: 400 })
    }

    // Adjuntos (fotos/PDF) con validación estricta de tipo, cantidad y tamaño
    const attachments: Attachment[] = []
    if (Array.isArray(body.attachments)) {
      if (body.attachments.length > MAX_ATTACHMENTS) {
        return NextResponse.json({ error: `Podés adjuntar hasta ${MAX_ATTACHMENTS} archivos por mensaje.` }, { status: 400 })
      }
      let total = 0
      let photoCount = 0
      let pdfCount = 0

      for (const a of body.attachments) {
        if (!a || typeof a.data !== 'string' || typeof a.mime !== 'string' || !ALLOWED_ATTACHMENT_MIMES.includes(a.mime)) {
          return NextResponse.json({ error: 'Tipo de archivo no permitido. Usá fotos (PNG, JPG, WebP) o documentos PDF.' }, { status: 400 })
        }

        const isImage = a.mime.startsWith('image/')
        const isPdf = a.mime === 'application/pdf'

        if (isImage) {
          photoCount++
          if (photoCount > MAX_PHOTO_ATTACHMENTS) {
            return NextResponse.json({ error: `Podés adjuntar un máximo de ${MAX_PHOTO_ATTACHMENTS} fotos por mensaje.` }, { status: 400 })
          }
        }
        if (isPdf) {
          pdfCount++
          if (pdfCount > MAX_PDF_ATTACHMENTS) {
            return NextResponse.json({ error: `Podés adjuntar un máximo de ${MAX_PDF_ATTACHMENTS} documentos PDF por mensaje.` }, { status: 400 })
          }
        }

        const fileBytes = Math.floor((a.data.length * 3) / 4)
        if (isImage && fileBytes > MAX_IMAGE_BYTES) {
          return NextResponse.json({ error: `La foto "${a.name || 'archivo'}" supera el límite de 10 MB.` }, { status: 413 })
        }
        if (isPdf && fileBytes > MAX_PDF_BYTES) {
          return NextResponse.json({ error: `El documento PDF "${a.name || 'archivo'}" supera el límite de 15 MB.` }, { status: 413 })
        }

        total += fileBytes
        if (total > MAX_ATTACHMENT_BYTES) {
          return NextResponse.json({ error: 'Los archivos adjuntos superan el máximo de 20 MB en total.' }, { status: 413 })
        }

        attachments.push({
          name: typeof a.name === 'string' ? a.name.slice(0, 120) : 'archivo',
          mime: a.mime,
          data: a.data,
        })
      }
    }

    const requestedModel = typeof body.model === 'string' ? body.model.toLowerCase() : 'gemini'
    const isClaude = requestedModel.includes('claude')
    const isOpenAi = requestedModel.includes('gpt') || requestedModel.includes('openai')
    const isPaidModel = isClaude || isOpenAi

    if (isPaidModel && !ctx.isAdmin) {
      const { data: credRow } = await db.from('ai_credits').select('*').eq('user_id', ctx.userId).maybeSingle()
      const cData = credRow as Record<string, any> | null
      const balanceClaude = typeof cData?.balance_claude === 'number' ? cData.balance_claude : 0
      const balanceChatgpt = typeof cData?.balance_chatgpt === 'number' ? cData.balance_chatgpt : 0

      if (isClaude && balanceClaude <= 0) {
        return NextResponse.json(
          {
            error: 'No tenés consultas de Claude disponibles. Podés adquirir el Pack Claude en la página de Planes o usar Gemini Gratis.',
            code: 'NO_CREDITS',
            provider: 'claude',
          },
          { status: 402 }
        )
      }

      if (isOpenAi && balanceChatgpt <= 0) {
        return NextResponse.json(
          {
            error: 'No tenés consultas de ChatGPT disponibles. Podés adquirir el Pack ChatGPT en la página de Planes o usar Gemini Gratis.',
            code: 'NO_CREDITS',
            provider: 'chatgpt',
          },
          { status: 402 }
        )
      }
    }

    const result = await runAgent({
      db,
      user,
      history,
      autoApply: body.autoApply === true,
      attachments,
      includeCv: body.includeCv === true,
      deepSearch: body.deepSearch === true,
      model: requestedModel,
    })

    // Descontar crédito específico según el proveedor de pago usado
    if (isPaidModel && !ctx.isAdmin) {
      if (isClaude) {
        const { error: rpcErr } = await db.rpc('consume_claude_credit', { p_user: ctx.userId })
        if (rpcErr) {
          const { data: cRow } = await db.from('ai_credits').select('*').eq('user_id', ctx.userId).maybeSingle()
          const cur = (cRow as any)?.balance_claude || 1
          await db
            .from('ai_credits')
            .update({ balance_claude: Math.max(0, cur - 1), updated_at: new Date().toISOString() })
            .eq('user_id', ctx.userId)
        }
      } else if (isOpenAi) {
        const { error: rpcErr } = await db.rpc('consume_chatgpt_credit', { p_user: ctx.userId })
        if (rpcErr) {
          const { data: cRow } = await db.from('ai_credits').select('*').eq('user_id', ctx.userId).maybeSingle()
          const cur = (cRow as any)?.balance_chatgpt || 1
          await db
            .from('ai_credits')
            .update({ balance_chatgpt: Math.max(0, cur - 1), updated_at: new Date().toISOString() })
            .eq('user_id', ctx.userId)
        }
      }
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Error en /api/ai-chat:', err)
    return NextResponse.json({ error: err.message || 'Error procesando la solicitud' }, { status: 500 })
  }
}
