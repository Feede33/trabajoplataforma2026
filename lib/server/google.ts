import crypto from 'node:crypto'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Integración con Google (Gmail) para enviar y redactar postulaciones con la IA.
 * Scopes seguros y sensibles aprobados para producción pública sin auditorías externas:
 * - gmail.send (enviar postulaciones confirmadas por el candidato)
 * - gmail.compose (crear y listar borradores en su cuenta de Gmail)
 */

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'openid',
  'email',
]

export function isGoogleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
}

function secret(): string {
  return process.env.GOOGLE_TOKEN_ENC_KEY || process.env.GOOGLE_CLIENT_SECRET || ''
}

// ---------- Cifrado del refresh token (AES-256-GCM) ----------
function encKey(): Buffer {
  return crypto.createHash('sha256').update('gtoken:' + secret()).digest()
}

export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encKey(), iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), enc].map((b) => b.toString('base64')).join('.')
}

export function decryptToken(payload: string): string {
  const [iv, tag, enc] = payload.split('.').map((p) => Buffer.from(p, 'base64'))
  const decipher = crypto.createDecipheriv('aes-256-gcm', encKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

// ---------- State firmado (evita CSRF y asocia el callback al usuario) ----------
export function signState(userId: string): string {
  const body = Buffer.from(JSON.stringify({ u: userId, t: Date.now() })).toString('base64url')
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  return `${body}.${sig}`
}

export function verifyState(state: string | null): string | null {
  if (!state) return null
  const [body, sig] = state.split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    const { u, t } = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (typeof u !== 'string' || Date.now() - t > 10 * 60 * 1000) return null
    return u
  } catch {
    return null
  }
}

export function redirectUri(siteUrl: string): string {
  return `${siteUrl}/api/google/callback`
}

export function buildAuthUrl(siteUrl: string, userId: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri(siteUrl),
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // garantiza que Google devuelva refresh_token
    state: signState(userId),
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeCode(code: string, siteUrl: string) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirect_uri: redirectUri(siteUrl),
      grant_type: 'authorization_code',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error_description || 'No se pudo completar la conexión con Google')
  return data as { access_token: string; refresh_token?: string; id_token?: string; scope?: string }
}

/** Obtiene el email de la cuenta a partir del id_token (la firma ya la validó Google en el intercambio directo). */
export function emailFromIdToken(idToken?: string): string | null {
  if (!idToken) return null
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8'))
    return typeof payload.email === 'string' ? payload.email : null
  } catch {
    return null
  }
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID || '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error === 'invalid_grant'
        ? 'GMAIL_REVOKED'
        : data.error_description || 'No se pudo renovar el acceso a Gmail'
    )
  }
  return data.access_token as string
}

export async function getGmailConnection(db: SupabaseClient, userId: string): Promise<{ email: string | null } | null> {
  const { data } = await db.from('google_connections').select('email').eq('user_id', userId).maybeSingle()
  return data ? { email: data.email ?? null } : null
}

/** Obtiene credenciales de acceso válidas a Gmail renovando el token si es necesario. */
export async function getGmailAuth(
  db: SupabaseClient,
  userId: string
): Promise<{ accessToken: string; email: string | null }> {
  const { data } = await db
    .from('google_connections')
    .select('email, refresh_token_enc')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data) throw new Error('GMAIL_NOT_CONNECTED')

  let accessToken: string
  try {
    accessToken = await refreshAccessToken(decryptToken(data.refresh_token_enc))
  } catch (e: any) {
    if (e.message === 'GMAIL_REVOKED') {
      await db.from('google_connections').delete().eq('user_id', userId)
      throw new Error('GMAIL_NOT_CONNECTED')
    }
    throw e
  }

  return { accessToken, email: data.email ?? null }
}

// ---------- Envío y MIME ----------
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/

export function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v)
}

function stripCRLF(s: string): string {
  return s.replace(/[\r\n]+/g, ' ').trim()
}

function b64wrap(buf: Buffer): string {
  return (buf.toString('base64').match(/.{1,76}/g) || []).join('\r\n')
}

export interface OutgoingEmail {
  to: string
  subject: string
  body: string
  attachment?: { filename: string; mime: string; data: Buffer }
  threadId?: string
  inReplyTo?: string
}

function buildMime(from: string | null, mail: OutgoingEmail): string {
  const boundary = 'b_' + crypto.randomBytes(12).toString('hex')
  const subject = `=?UTF-8?B?${Buffer.from(stripCRLF(mail.subject)).toString('base64')}?=`
  const headers = [
    ...(from ? [`From: ${stripCRLF(from)}`] : []),
    `To: ${stripCRLF(mail.to)}`,
    `Subject: ${subject}`,
    ...(mail.inReplyTo ? [`In-Reply-To: <${stripCRLF(mail.inReplyTo)}>`, `References: <${stripCRLF(mail.inReplyTo)}>`] : []),
    'MIME-Version: 1.0',
  ]
  const textPart = [
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    b64wrap(Buffer.from(mail.body, 'utf8')),
  ]

  if (!mail.attachment) {
    return [...headers, ...textPart].join('\r\n')
  }
  const fname = mail.attachment.filename.replace(/[^\w.\- ]/g, '_')
  return [
    ...headers,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    ...textPart,
    `--${boundary}`,
    `Content-Type: ${mail.attachment.mime}; name="${fname}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${fname}"`,
    '',
    b64wrap(mail.attachment.data),
    `--${boundary}--`,
  ].join('\r\n')
}

/** Envía un correo desde la cuenta de Gmail conectada del usuario. */
export async function sendGmail(db: SupabaseClient, userId: string, mail: OutgoingEmail): Promise<void> {
  if (!isValidEmail(mail.to)) throw new Error('Dirección de correo inválida')
  const { accessToken, email } = await getGmailAuth(db, userId)

  const raw = Buffer.from(buildMime(email, mail)).toString('base64url')
  const payload: any = { raw }
  if (mail.threadId) payload.threadId = mail.threadId

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.error('Gmail send error:', err)
    throw new Error(err?.error?.message || 'Gmail rechazó el envío')
  }
}

// ---------- Extracción y Decodificación de Correos ----------
function decodeBase64Url(str?: string): string {
  if (!str) return ''
  try {
    return Buffer.from(str, 'base64url').toString('utf8')
  } catch {
    return ''
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractTextFromPayload(payload: any): string {
  if (!payload) return ''

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  if (Array.isArray(payload.parts) && payload.parts.length > 0) {
    for (const part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        return decodeBase64Url(part.body.data)
      }
    }
    for (const part of payload.parts) {
      const nested = extractTextFromPayload(part)
      if (nested) return nested
    }
    for (const part of payload.parts) {
      if (part.mimeType === 'text/html' && part.body?.data) {
        return stripHtml(decodeBase64Url(part.body.data))
      }
    }
  }

  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return stripHtml(decodeBase64Url(payload.body.data))
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }

  return ''
}

// ---------- Búsqueda, Lectura y Borradores ----------
export async function createGmailDraft(
  db: SupabaseClient,
  userId: string,
  mail: OutgoingEmail
): Promise<{ draftId: string; messageId: string }> {
  if (!isValidEmail(mail.to)) throw new Error('Dirección de correo inválida')
  const { accessToken, email } = await getGmailAuth(db, userId)

  const raw = Buffer.from(buildMime(email, mail)).toString('base64url')
  const payload: any = {
    message: {
      raw,
      ...(mail.threadId ? { threadId: mail.threadId } : {}),
    },
  }
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'No se pudo crear el borrador en Gmail')
  }
  const data = await res.json()
  return { draftId: data.id, messageId: data.message?.id || '' }
}

export interface GmailDraftSummary {
  id: string
  messageId: string
  to: string
  subject: string
  snippet: string
}

export async function listGmailDrafts(
  db: SupabaseClient,
  userId: string,
  limit = 5
): Promise<GmailDraftSummary[]> {
  const { accessToken } = await getGmailAuth(db, userId)
  const max = Math.min(10, Math.max(1, limit))
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts?maxResults=${max}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || 'Error al listar borradores en Gmail')
  }
  const data = await res.json()
  const drafts: { id: string; message?: { id: string } }[] = data.drafts || []
  if (drafts.length === 0) return []

  const details = await Promise.all(
    drafts.slice(0, max).map(async (d) => {
      try {
        const draftRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${d.id}?format=metadata&metadataHeaders=To&metadataHeaders=Subject`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!draftRes.ok) return null
        const draftData = await draftRes.json()
        const headers: { name: string; value: string }[] = draftData.message?.payload?.headers || []
        const getHeader = (name: string) =>
          headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || ''
        return {
          id: d.id,
          messageId: draftData.message?.id || '',
          to: getHeader('to'),
          subject: getHeader('subject') || '(Sin asunto)',
          snippet: draftData.message?.snippet || '',
        }
      } catch {
        return null
      }
    })
  )

  return details.filter((d): d is GmailDraftSummary => d !== null)
}
