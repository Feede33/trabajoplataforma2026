import type { SupabaseClient } from '@supabase/supabase-js'
import { CANDIDATE_MODELS, makeHttpsPost } from '@/lib/gemini'
import { callClaudeChat, formatToolsForClaude } from '@/lib/server/claude'
import { callOpenAiChat, formatToolsForOpenAi } from '@/lib/server/openai'
import {
  createGmailDraft,
  getGmailConnection,
  isGoogleConfigured,
  isValidEmail,
  listGmailDrafts,
  sendGmail,
} from '@/lib/server/google'
import { cleanChatText } from '@/lib/chat-format'

/**
 * Agente de IA para postulaciones.
 * - Las herramientas se ejecutan SIEMPRE en el servidor con el usuario ya autenticado.
 * - Postular exige confirmación del usuario salvo que el modo automático esté activo.
 */

export interface AgentUser {
  userId: string
  email: string | null
}

export interface PendingApplication {
  job_id: string
  titulo: string
  empresa: string | null
  mensaje: string
}

export interface PendingEmail {
  to: string
  subject: string
  body: string
  attach_cv: boolean
  thread_id?: string
  in_reply_to?: string
}

export interface PendingProfile {
  nombre?: string
  bio?: string
  ubicacion?: string
}

export interface Attachment {
  name: string
  mime: string
  /** base64 sin prefijo data: */
  data: string
}

export const ALLOWED_ATTACHMENT_MIMES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
export const MAX_ATTACHMENTS = 3
export const MAX_ATTACHMENT_BYTES = 3 * 1024 * 1024 // total

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentResult {
  reply: string
  pending: PendingApplication[]
  applied: { job_id: string; titulo: string }[]
  /** Correo propuesto, a la espera de que el usuario lo confirme (nunca se envía solo) */
  pendingEmail: PendingEmail | null
  /** Cambios al perfil/CV propuestos por la IA (se guardan solo si el usuario confirma) */
  pendingProfile: PendingProfile | null
  /** La IA necesitó Gmail pero el usuario no lo tiene conectado */
  needsGmail: boolean
  /** Se actualizó el perfil (bio/ubicación/nombre) */
  profileUpdated: boolean
}

const MAX_STEPS = 6
const MAX_APPLY_PER_TURN = 10

const TOOLS = [
  {
    name: 'get_my_profile',
    description: 'Devuelve el perfil del candidato (nombre, email, bio/resumen del CV, ubicación y si tiene CV adjunto).',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'read_my_cv',
    description:
      'Lee el archivo de CV (PDF) adjunto del candidato y devuelve su contenido en texto: experiencia, estudios, habilidades, idiomas. Úsalo para recomendar empleos o ajustar el CV.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'prepare_email',
    description:
      'Prepara UN correo de postulación o respuesta a una empresa desde el Gmail del usuario. NO lo envía: el usuario lo revisa y confirma con un botón en pantalla. Usar con correos reales.',
    parameters: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING', description: 'Correo del destinatario.' },
        subject: { type: 'STRING' },
        body: { type: 'STRING', description: 'Cuerpo del mensaje en español, breve, con saludo y firma con el nombre del candidato.' },
        attach_cv: { type: 'BOOLEAN', description: 'Adjuntar el CV del perfil (por defecto true).' },
        thread_id: { type: 'STRING', description: 'ID del hilo de Gmail si se responde a un correo previo.' },
        in_reply_to: { type: 'STRING', description: 'ID del mensaje previo si se responde a un correo específico.' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_gmail_draft',
    description:
      'Crea un borrador de correo de postulación o contacto directamente en la cuenta de Gmail del usuario para que pueda revisarlo desde su app de Gmail sin enviarlo de inmediato.',
    parameters: {
      type: 'OBJECT',
      properties: {
        to: { type: 'STRING', description: 'Dirección de correo destino.' },
        subject: { type: 'STRING', description: 'Asunto del borrador.' },
        body: { type: 'STRING', description: 'Cuerpo del mensaje en texto claro.' },
        attach_cv: {
          type: 'BOOLEAN',
          description: 'Si debe adjuntar el CV del candidato guardado en su perfil (por defecto true).',
        },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'list_gmail_drafts',
    description:
      'Lista los borradores pendientes guardados en la cuenta de Gmail del usuario (destinatario, asunto y resumen).',
    parameters: {
      type: 'OBJECT',
      properties: {
        limit: {
          type: 'INTEGER',
          description: 'Cantidad máxima de borradores a devolver (por defecto 5).',
        },
      },
    },
  },
  {
    name: 'propose_profile_update',
    description:
      'Propone una versión mejorada del perfil/CV del candidato (resumen profesional, ubicación, nombre). NO guarda nada: el usuario ve una vista previa editable y decide si la guarda. Enviar solo los campos a cambiar; bio debe ser el texto final completo.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nombre: { type: 'STRING' },
        bio: { type: 'STRING', description: 'Resumen profesional completo, listo para guardar (reemplaza el actual).' },
        ubicacion: { type: 'STRING' },
      },
    },
  },
  {
    name: 'search_jobs',
    description: 'Busca empleos formales activos publicados por empresas. Devuelve id, título, empresa, zona, rubro, modalidad, contrato, salario.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING', description: 'Palabras clave (puesto, habilidad).' },
        zona: { type: 'STRING' },
        rubro: { type: 'STRING' },
        limit: { type: 'INTEGER', description: 'Máximo de resultados (por defecto 8, máx 20).' },
      },
    },
  },
  {
    name: 'search_informal_jobs',
    description: 'Busca avisos de empleo informales (contacto por WhatsApp/teléfono/email). No se pueden postular desde la plataforma: se contactan directamente.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: { type: 'STRING' },
        zona: { type: 'STRING' },
        limit: { type: 'INTEGER' },
      },
    },
  },
  {
    name: 'list_my_applications',
    description: 'Lista las postulaciones ya realizadas por el candidato, con su estado.',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'list_company_contacts',
    description: 'Lista contactos de empresas (nombre, categoría, zona, WhatsApp).',
    parameters: {
      type: 'OBJECT',
      properties: {
        categoria: { type: 'STRING' },
        zona: { type: 'STRING' },
        limit: { type: 'INTEGER' },
      },
    },
  },
  {
    name: 'apply_to_jobs',
    description:
      'Postula al candidato a uno o más empleos formales (usar los id devueltos por search_jobs). Si el usuario no activó el modo automático, la postulación queda pendiente de su confirmación.',
    parameters: {
      type: 'OBJECT',
      properties: {
        job_ids: { type: 'ARRAY', items: { type: 'STRING' } },
        mensaje: { type: 'STRING', description: 'Mensaje de presentación breve y personalizado en español.' },
      },
      required: ['job_ids'],
    },
  },
]

const DEEP_SEARCH_PROMPT = `

MODO BÚSQUEDA PROFUNDA ACTIVADO:
- Lee el perfil y el CV, y deduce los puestos objetivo y sinónimos (ej: "cajero" → "cajera", "atención al cliente", "ventas mostrador").
- Haz VARIAS búsquedas (mínimo 3) con distintas palabras clave, zonas y rubros, tanto en empleos formales (search_jobs) como informales (search_informal_jobs); consulta también list_company_contacts si aplica. Usa limit alto (hasta 20).
- Revisa list_my_applications para no repetir empleos a los que ya se postuló.
- Entrega un ranking de los mejores 5-8 resultados, cada uno con una línea de por qué encaja con el CV, y ofrece postularse.`

function systemPrompt(deep = false): string {
  const hoy = new Date().toLocaleDateString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'full' })
  return `Eres el asistente de IA de PostulaUY, una plataforma laboral de Uruguay. Hoy es ${hoy}.
Ayudas al candidato a encontrar empleo y a postularse sin hacerlo una por una.

Reglas:
- Responde siempre en español rioplatense, breve y claro. Usa listas cortas cuando enumeres empleos.
- Usa las herramientas para obtener datos reales. NUNCA inventes empleos, empresas, ids ni contactos.
- FORMATO, EMOJIS E ICONOS:
  * Estructura cada vacante o puesto recomendado de forma ordenada y limpia, separando cada detalle en su propia línea con su emoji:
    1. **Nombre del Puesto - Rubro**
       🏢 Nombre de la Empresa o Comercio
       📍 Ubicación / Barrio
       🕒 Turno o Horario
       ✨ Por qué encaja con el perfil del candidato
       ✉️ Correo de contacto (si aplica)
  * Usa siempre EMOJIS E ICONOS UNICODE REALES (💼 para puestos, 🏢 para empresas, 📍 para ubicación, 💰 para salario, 🕒 para horarios, ✉️ para correos, 📞 para contacto, ✨ para recomendaciones, ✅ para requisitos).
  * NUNCA pongas asteriscos antes de los emojis (está PROHIBIDO escribir "* 🏢" o "* 📍"). Coloca el emoji directamente al inicio de la línea.
  * Si usas negrita para el título, ciérrala SIEMPRE con ** antes de cualquier otro texto o emoji (ejemplo correcto: "**Puesto** 📍 Montevideo", NUNCA "**Puesto📍 Montevideo" sin cerrar).
  * No dejes asteriscos huérfanos o sueltos en el texto.
- Para recomendar, primero lee el perfil (get_my_profile); si tiene CV adjunto, léelo también con read_my_cv. Luego busca empleos acordes. Explica en una línea por qué encaja cada uno.
- Si el perfil/CV está vacío o es pobre, sugiere completarlo y ofrécete a redactarlo; si el usuario quiere ajustarlo o mejorarlo, redacta la versión y llama a propose_profile_update (el usuario la revisa y confirma; nunca digas que ya se guardó).
- Para postular usa apply_to_jobs con los id exactos de search_jobs. Si el usuario dice "postulame a todos/5", usa los resultados más relevantes. No postules a empleos a los que ya se postuló (revisa list_my_applications si hay duda).
- Los empleos informales no tienen postulación en la plataforma: da el contacto para que el usuario escriba.
- POSTULACIONES Y BORRADORES POR GMAIL:
  * Para enviar una postulación por correo usa prepare_email (el usuario lo revisa en pantalla y pulsa "Enviar correo"). Personaliza el mensaje con el puesto y contexto, y fírmalo con el nombre del candidato.
  * Si el usuario quiere redactar un correo y dejarlo guardado en su cuenta de Gmail para revisarlo o enviarlo más tarde, usa create_gmail_draft.
  * Para ver qué borradores tiene pendientes usa list_gmail_drafts.
  * Por privacidad y seguridad del usuario, la IA solo redacta borradores y envía postulaciones autorizadas por él; NO lee su bandeja de entrada ni correos personales recibidos (si el usuario te pide revisar si le respondieron o leer su correo recibido, explícale amablemente que por privacidad de Google solo gestionas envíos y borradores).
  * Si el usuario aún no tiene Gmail conectado, indícale amablemente que use el botón "Conectar Gmail".
- Después de apply_to_jobs, informa claramente si quedó pendiente de confirmación o si ya fue enviada.
- Si el usuario adjunta archivos (imágenes o PDF):
  * Examina inmediatamente la imagen o documento.
  * Si es una imagen general (foto, dibujo, captura, logo, etc.) o pide analizarla: DESCRIBE DIRECTAMENTE qué ves o qué representa en texto plano de forma prolija, sin llamar a herramientas de búsqueda de empleo ni de CV a menos que la imagen sea explícitamente una oferta de trabajo o el usuario pida postularse.
  * Si es un aviso de empleo o captura de clasificados: resume claramente los datos (puesto, requisitos, ubicación, contacto) y pregúntale si quiere buscar ofertas similares.
  * Si es un CV: analiza el perfil profesional y destaca sus fortalezas.${deep ? DEEP_SEARCH_PROMPT : ''}`
}

type GeminiPart = Record<string, any>
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] }

/** Extrae el contenido de un PDF de CV con Gemini (lectura multimodal). */
async function extractCvText(pdf: Buffer): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en el servidor (.env.local)')
  let lastError: Error | null = null
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const { statusCode, data } = await makeHttpsPost(url, {
        contents: [
          {
            role: 'user',
            parts: [
              { inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } },
              {
                text: 'Transcribe de forma ordenada y fiel el contenido de este currículum: datos de contacto, perfil, experiencia laboral (puesto, empresa, fechas, tareas), educación, habilidades e idiomas. No inventes nada. Solo texto plano.',
              },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      })
      if (statusCode !== 200) {
        if ([404, 429, 503].includes(statusCode)) {
          lastError = new Error(`Modelo ${model} no disponible (${statusCode})`)
          continue
        }
        throw new Error(data?.error?.message || 'Error de Gemini')
      }
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .filter((p: any) => typeof p.text === 'string' && !p.thought)
        .map((p: any) => p.text)
        .join('')
        .trim()
      if (!text) throw new Error('Gemini no devolvió texto')
      return text.slice(0, 12000)
    } catch (err: any) {
      lastError = err
    }
  }
  throw lastError || new Error('No hay modelos de Gemini disponibles')
}

async function callGeminiChat(contents: GeminiContent[], deep = false): Promise<GeminiContent> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en el servidor (.env.local)')

  let lastError: Error | null = null
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const { statusCode, data } = await makeHttpsPost(url, {
        systemInstruction: { parts: [{ text: systemPrompt(deep) }] },
        tools: [{ functionDeclarations: TOOLS }],
        contents,
        generationConfig: { temperature: 0.4 },
      })
      if (statusCode !== 200) {
        if ([404, 429, 503].includes(statusCode)) {
          lastError = new Error(`Modelo ${model} no disponible (${statusCode})`)
          continue
        }
        throw new Error(`Error en API Gemini (${statusCode}): ${data?.error?.message || 'Desconocido'}`)
      }
      const content = data?.candidates?.[0]?.content
      if (!content?.parts?.length) throw new Error('Gemini no devolvió contenido')
      return { role: 'model', parts: content.parts }
    } catch (err: any) {
      console.warn(`ai-chat: falló ${model}:`, err.message)
      lastError = err
    }
  }
  throw lastError || new Error('No hay modelos de Gemini disponibles')
}

function norm(s?: string | null): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

function matches(haystack: (string | null | undefined)[], query?: string): boolean {
  if (!query) return true
  const text = norm(haystack.join(' '))
  const words = norm(query).split(/\s+/).filter((w) => w.length > 1)
  if (words.length === 0) return true
  // Coincide si aparece al menos una palabra clave
  return words.some((w) => text.includes(w))
}

function clampLimit(n: unknown, def = 8): number {
  const v = typeof n === 'number' ? n : def
  return Math.max(1, Math.min(20, Math.floor(v)))
}

/** Descarga el CV del propio usuario desde Storage (nunca de otra carpeta). */
export async function loadOwnCv(
  db: SupabaseClient,
  userId: string
): Promise<{ buf: Buffer; filename: string; mime: string; ext: string } | { error: string }> {
  const { data: prof } = await db.from('profiles').select('cv_url').eq('id', userId).maybeSingle()
  const cvUrl: string | null = prof?.cv_url ?? null
  if (!cvUrl) return { error: 'El usuario no tiene un CV adjunto. Sugiérele subirlo en Mi Perfil y CV.' }
  const marker = '/cvs/'
  const idx = cvUrl.indexOf(marker)
  const path = idx >= 0 ? decodeURIComponent(cvUrl.slice(idx + marker.length).split('?')[0]) : ''
  const safeId = userId.replace(/[^a-zA-Z0-9_-]/g, '')
  if (!path || !path.startsWith(safeId + '/') || path.includes('..')) {
    return { error: 'No se pudo acceder al CV adjunto.' }
  }
  const { data: file, error } = await db.storage.from('cvs').download(path)
  if (error || !file) return { error: 'No se pudo descargar el CV.' }
  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > 5 * 1024 * 1024) return { error: 'El CV es demasiado grande.' }
  const ext = (path.split('.').pop() || 'pdf').toLowerCase()
  const mimes: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }
  return { buf, ext, mime: mimes[ext] || 'application/octet-stream', filename: `CV.${ext}` }
}

export async function sendConfirmedEmail(
  db: SupabaseClient,
  user: AgentUser,
  mail: PendingEmail
): Promise<void> {
  let attachment
  if (mail.attach_cv) {
    const cv = await loadOwnCv(db, user.userId)
    if ('error' in cv) throw new Error(cv.error)
    attachment = { filename: cv.filename, mime: cv.mime, data: cv.buf }
  }
  await sendGmail(db, user.userId, {
    to: mail.to,
    subject: mail.subject.slice(0, 200),
    body: mail.body.slice(0, 5000),
    attachment,
    threadId: mail.thread_id,
    inReplyTo: mail.in_reply_to,
  })
}

export async function applyToJobs(
  db: SupabaseClient,
  user: AgentUser,
  items: { job_id: string; mensaje: string }[]
): Promise<{ applied: { job_id: string; titulo: string }[]; skipped: { job_id: string; reason: string }[] }> {
  const applied: { job_id: string; titulo: string }[] = []
  const skipped: { job_id: string; reason: string }[] = []

  for (const item of items.slice(0, MAX_APPLY_PER_TURN)) {
    const { data: job } = await db
      .from('jobs')
      .select('id, titulo, estado')
      .eq('id', item.job_id)
      .maybeSingle()
    if (!job || job.estado !== 'activo') {
      skipped.push({ job_id: item.job_id, reason: 'El empleo no existe o ya no está activo' })
      continue
    }
    const { error } = await db.from('applications').insert({
      job_id: job.id,
      candidato_id: user.userId,
      mensaje: item.mensaje,
    })
    if (error) {
      skipped.push({
        job_id: item.job_id,
        reason: error.code === '23505' ? 'Ya te habías postulado' : 'No se pudo registrar la postulación',
      })
      continue
    }
    applied.push({ job_id: job.id, titulo: job.titulo })
  }
  return { applied, skipped }
}

export async function runAgent(opts: {
  db: SupabaseClient
  user: AgentUser
  history: ChatTurn[]
  autoApply: boolean
  attachments?: Attachment[]
  includeCv?: boolean
  deepSearch?: boolean
  model?: string
}): Promise<AgentResult> {
  const { db, user, history, autoApply, attachments = [], includeCv = false, deepSearch = false, model = 'gemini' } = opts
  const result: AgentResult = {
    reply: '',
    pending: [],
    applied: [],
    pendingEmail: null,
    pendingProfile: null,
    needsGmail: false,
    profileUpdated: false,
  }

  const contents: GeminiContent[] = history.map((t) => ({
    role: t.role === 'user' ? 'user' : 'model',
    parts: [{ text: t.content }],
  }))

  // Archivos y CV del perfil se adjuntan solo al último mensaje del usuario
  const last = contents[contents.length - 1]
  for (const a of attachments) {
    last.parts.push({ text: `[Archivo adjunto: ${a.name}]` }, { inlineData: { mimeType: a.mime, data: a.data } })
  }
  if (includeCv) {
    const cv = await loadOwnCv(db, user.userId)
    if ('error' in cv) {
      last.parts.push({ text: `[Nota del sistema: no se pudo adjuntar el CV del perfil: ${cv.error}]` })
    } else if (cv.ext !== 'pdf') {
      last.parts.push({ text: '[Nota del sistema: el CV del perfil está en Word y no se puede leer; sugiere subir un PDF.]' })
    } else {
      last.parts.push({ text: '[CV del perfil del usuario, adjunto a continuación]' }, { inlineData: { mimeType: 'application/pdf', data: cv.buf.toString('base64') } })
    }
  }

  async function execTool(name: string, args: Record<string, any>): Promise<unknown> {
    switch (name) {
      case 'get_my_profile': {
        const { data } = await db
          .from('profiles')
          .select('nombre, email, bio, ubicacion, cv_url')
          .eq('id', user.userId)
          .maybeSingle()
        return { ...data, tiene_cv_adjunto: !!data?.cv_url, cv_url: undefined }
      }
      case 'read_my_cv': {
        const cv = await loadOwnCv(db, user.userId)
        if ('error' in cv) return { error: cv.error }
        if (cv.ext !== 'pdf') {
          return { error: 'El CV está en formato Word. Por ahora solo puedo leer PDF; pídele al usuario que suba una versión PDF.' }
        }
        return { contenido_cv: await extractCvText(cv.buf) }
      }
      case 'prepare_email': {
        if (!isGoogleConfigured()) return { error: 'El envío por Gmail no está configurado en la plataforma.' }
        if (!isValidEmail(args.to)) return { error: 'La dirección de correo no es válida.' }
        if (typeof args.subject !== 'string' || typeof args.body !== 'string' || !args.subject.trim() || !args.body.trim()) {
          return { error: 'Faltan asunto o mensaje.' }
        }
        const conn = await getGmailConnection(db, user.userId)
        if (!conn) {
          result.needsGmail = true
          return { error: 'El usuario aún no conectó su Gmail. Dile que use el botón "Conectar Gmail" que aparece en el chat y luego reintente.' }
        }
        result.pendingEmail = {
          to: args.to.trim(),
          subject: args.subject.trim().slice(0, 200),
          body: args.body.trim().slice(0, 5000),
          attach_cv: args.attach_cv !== false,
          thread_id: typeof args.thread_id === 'string' ? args.thread_id : undefined,
          in_reply_to: typeof args.in_reply_to === 'string' ? args.in_reply_to : undefined,
        }
        return {
          estado: 'PENDIENTE_DE_CONFIRMACION',
          nota: 'Aún NO se envió. El usuario verá el correo y un botón para enviarlo. Pídele que lo revise y confirme.',
        }
      }
      case 'create_gmail_draft': {
        if (!isGoogleConfigured()) return { error: 'El servicio de Gmail no está configurado.' }
        if (!isValidEmail(args.to)) return { error: 'Dirección de correo destino inválida.' }
        if (!args.subject || !args.body) return { error: 'Faltan asunto o cuerpo del correo.' }
        const conn = await getGmailConnection(db, user.userId)
        if (!conn) {
          result.needsGmail = true
          return { error: 'El usuario no tiene Gmail conectado.' }
        }
        try {
          let attachment
          if (args.attach_cv !== false) {
            const cv = await loadOwnCv(db, user.userId)
            if (!('error' in cv)) {
              attachment = { filename: cv.filename, mime: cv.mime, data: cv.buf }
            }
          }
          const draft = await createGmailDraft(db, user.userId, {
            to: args.to.trim(),
            subject: args.subject.trim(),
            body: args.body.trim(),
            attachment,
          })
          return {
            exito: true,
            mensaje: 'Borrador creado con éxito en tu Gmail.',
            draftId: draft.draftId,
            destinatario: args.to,
            asunto: args.subject,
          }
        } catch (err: any) {
          if (err.message === 'GMAIL_NOT_CONNECTED') {
            result.needsGmail = true
            return { error: 'La sesión de Gmail expiró. El usuario debe reconectar Gmail.' }
          }
          return { error: err.message || 'No se pudo crear el borrador' }
        }
      }
      case 'list_gmail_drafts': {
        if (!isGoogleConfigured()) return { error: 'El servicio de Gmail no está configurado.' }
        const conn = await getGmailConnection(db, user.userId)
        if (!conn) {
          result.needsGmail = true
          return { error: 'Gmail no está conectado.' }
        }
        try {
          const drafts = await listGmailDrafts(db, user.userId, clampLimit(args.limit, 5))
          return { total: drafts.length, borradores: drafts }
        } catch (err: any) {
          if (err.message === 'GMAIL_NOT_CONNECTED') {
            result.needsGmail = true
            return { error: 'La sesión de Gmail expiró. El usuario debe reconectar Gmail.' }
          }
          return { error: err.message || 'Error al listar borradores' }
        }
      }
      case 'propose_profile_update': {
        const patch: PendingProfile = {}
        for (const k of ['nombre', 'bio', 'ubicacion'] as const) {
          if (typeof args[k] === 'string' && args[k].trim()) patch[k] = args[k].trim().slice(0, 4000)
        }
        if (Object.keys(patch).length === 0) return { error: 'No hay cambios para proponer' }
        result.pendingProfile = patch
        return {
          estado: 'PENDIENTE_DE_CONFIRMACION',
          nota: 'Aún NO se guardó. El usuario verá la propuesta y un botón para guardarla en su perfil.',
        }
      }
      case 'search_jobs': {
        const { data } = await db
          .from('jobs')
          .select('id, titulo, descripcion, rubro, zona, modalidad, tipo_contrato, salario_rango, tags, created_at, empresa:profiles(nombre)')
          .eq('estado', 'activo')
          .order('created_at', { ascending: false })
          .limit(200)
        const rows = (data || []) as any[]
        return rows
          .filter(
            (j) =>
              matches([j.titulo, j.descripcion, j.rubro, (j.tags || []).join(' ')], args.query) &&
              matches([j.zona], args.zona) &&
              matches([j.rubro], args.rubro)
          )
          .slice(0, clampLimit(args.limit))
          .map((j) => ({
            id: j.id,
            titulo: j.titulo,
            empresa: j.empresa?.nombre ?? null,
            zona: j.zona,
            rubro: j.rubro,
            modalidad: j.modalidad,
            contrato: j.tipo_contrato,
            salario: j.salario_rango,
            resumen: (j.descripcion || '').slice(0, 240),
            publicado: j.created_at,
          }))
      }
      case 'search_informal_jobs': {
        const { data } = await db
          .from('informal_jobs')
          .select('id, titulo, cargo, rubro, zona, horario, descripcion, whatsapp, telefono, email, salario, created_at')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(200)
        return ((data || []) as any[])
          .filter((j) => matches([j.titulo, j.cargo, j.descripcion, j.rubro], args.query) && matches([j.zona], args.zona))
          .slice(0, clampLimit(args.limit))
          .map((j) => ({ ...j, descripcion: (j.descripcion || '').slice(0, 240) }))
      }
      case 'list_my_applications': {
        const { data } = await db
          .from('applications')
          .select('job_id, estado, created_at, job:jobs(titulo)')
          .eq('candidato_id', user.userId)
          .order('created_at', { ascending: false })
          .limit(50)
        return ((data || []) as any[]).map((a) => ({
          job_id: a.job_id,
          titulo: a.job?.titulo ?? null,
          estado: a.estado,
          fecha: a.created_at,
        }))
      }
      case 'list_company_contacts': {
        const { data } = await db
          .from('company_contacts')
          .select('nombre, categoria, zona, whatsapp, nota')
          .eq('activo', true)
          .limit(300)
        return ((data || []) as any[])
          .filter((c) => matches([c.categoria, c.nombre, c.nota], args.categoria) && matches([c.zona], args.zona))
          .slice(0, clampLimit(args.limit))
      }
      case 'apply_to_jobs': {
        const ids: string[] = Array.isArray(args.job_ids) ? args.job_ids.filter((x: unknown) => typeof x === 'string') : []
        const mensaje =
          typeof args.mensaje === 'string' && args.mensaje.trim()
            ? args.mensaje.trim().slice(0, 1500)
            : 'Hola, me interesa esta vacante. Adjunto mi perfil y quedo a disposición.'
        if (ids.length === 0) return { error: 'No se indicaron empleos' }

        if (autoApply) {
          const { applied, skipped } = await applyToJobs(
            db,
            user,
            ids.map((job_id) => ({ job_id, mensaje }))
          )
          result.applied.push(...applied)
          return { modo: 'automatico', enviadas: applied, omitidas: skipped }
        }

        const { data } = await db
          .from('jobs')
          .select('id, titulo, estado, empresa:profiles(nombre)')
          .in('id', ids.slice(0, MAX_APPLY_PER_TURN))
        const found = ((data || []) as any[]).filter((j) => j.estado === 'activo')
        for (const j of found) {
          if (!result.pending.some((p) => p.job_id === j.id)) {
            result.pending.push({ job_id: j.id, titulo: j.titulo, empresa: j.empresa?.nombre ?? null, mensaje })
          }
        }
        return {
          estado: 'PENDIENTE_DE_CONFIRMACION',
          nota: 'Aún NO se envió nada. El usuario verá un botón para confirmar. Dile que confirme.',
          empleos: found.map((j) => j.titulo),
        }
      }
      default:
        return { error: `Herramienta desconocida: ${name}` }
    }
  }

  // 1. Motor Anthropic Claude
  if (model && (model === 'claude' || model.includes('claude'))) {
    try {
      let specificModel = 'claude-3-7-sonnet-20250219'
      if (model.includes('haiku')) {
        specificModel = 'claude-3-5-haiku-20241022'
      } else if (model.includes('opus')) {
        specificModel = 'claude-3-opus-20240229'
      } else if (model.includes('sonnet')) {
        specificModel = 'claude-3-5-sonnet-20241022'
      }

      const claudeTools = formatToolsForClaude(TOOLS)
      const claudeMessages: any[] = history.map((t) => ({
        role: t.role === 'user' ? 'user' : 'assistant',
        content: t.content,
      }))
      const lastMsg = claudeMessages[claudeMessages.length - 1]
      if (attachments.length > 0) {
        const textAtts = attachments.map((a) => `[Archivo adjunto: ${a.name}]`).join('\n')
        lastMsg.content = `${lastMsg.content}\n${textAtts}`
      }

      const maxSteps = deepSearch ? 10 : MAX_STEPS
      for (let step = 0; step < maxSteps; step++) {
        const res = await callClaudeChat({
          system: systemPrompt(deepSearch),
          messages: claudeMessages,
          tools: claudeTools,
          model: specificModel,
        })

        const toolCalls = res.content.filter((c) => c.type === 'tool_use')
        const textBlocks = res.content.filter((c) => c.type === 'text')

        if (toolCalls.length === 0) {
          const fullText = textBlocks.map((b) => b.text || '').join('').trim()
          result.reply = cleanChatText(fullText)
          return result
        }

        claudeMessages.push({ role: 'assistant', content: res.content })

        const toolResults: any[] = []
        for (const tc of toolCalls) {
          let output: unknown
          try {
            output = await execTool(tc.name || '', tc.input || {})
          } catch (err: any) {
            output = { error: err.message || 'Error en herramienta' }
          }
          toolResults.push({
            type: 'tool_result',
            tool_use_id: tc.id,
            content: JSON.stringify(output),
          })
        }
        claudeMessages.push({ role: 'user', content: toolResults })
      }
    } catch (err: any) {
      console.warn('ai-chat: error en Claude, intentando con Gemini:', err.message)
      if (err.message?.includes('saldo') || err.message?.includes('balance')) {
        throw err
      }
    }
  }

  // 2. Motor OpenAI GPT
  if (model && (model === 'gpt' || model.includes('gpt') || model.includes('openai'))) {
    try {
      let specificModel = 'gpt-4o'
      if (model.includes('5.4')) {
        specificModel = 'gpt-5.4'
      } else if (model.includes('5.2')) {
        specificModel = 'gpt-5.2'
      } else if (model.includes('astra')) {
        specificModel = 'gpt-6-astra'
      }

      const openAiTools = formatToolsForOpenAi(TOOLS)
      const openAiMessages: any[] = [
        { role: 'system', content: systemPrompt(deepSearch) },
        ...history.map((t) => ({ role: t.role as any, content: t.content })),
      ]

      const maxSteps = deepSearch ? 10 : MAX_STEPS
      for (let step = 0; step < maxSteps; step++) {
        const res = await callOpenAiChat({
          messages: openAiMessages,
          tools: openAiTools,
          model: specificModel,
        })

        const msg = res.message
        openAiMessages.push(msg)

        if (!msg.tool_calls || msg.tool_calls.length === 0) {
          result.reply = cleanChatText(msg.content || '')
          return result
        }

        for (const tc of msg.tool_calls) {
          let args: Record<string, any> = {}
          try {
            args = JSON.parse(tc.function.arguments || '{}')
          } catch {}

          let output: unknown
          try {
            output = await execTool(tc.function.name, args)
          } catch (err: any) {
            output = { error: err.message || 'Error en herramienta' }
          }

          openAiMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(output),
          })
        }
      }
    } catch (err: any) {
      console.warn('ai-chat: error en OpenAI, intentando con Gemini:', err.message)
      if (err.message?.includes('saldo') || err.message?.includes('balance')) {
        throw err
      }
    }
  }

  // 3. Motor Base Google Gemini (Gratuito por defecto)
  const maxSteps = deepSearch ? 12 : MAX_STEPS
  for (let step = 0; step < maxSteps; step++) {
    const modelContent = await callGeminiChat(contents, deepSearch)
    contents.push(modelContent)

    const calls = modelContent.parts.filter((p) => p.functionCall)
    if (calls.length === 0) {
      const rawReply = modelContent.parts
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('')
        .trim()
      result.reply = cleanChatText(rawReply)
      return result
    }

    const responses: GeminiPart[] = []
    for (const part of calls) {
      const { name, args } = part.functionCall
      let output: unknown
      try {
        output = await execTool(name, args || {})
      } catch (err: any) {
        console.error(`ai-chat: error en herramienta ${name}:`, err)
        output = { error: 'Error ejecutando la herramienta' }
      }
      responses.push({
        functionResponse: {
          name,
          response: { result: Array.isArray(output) ? { items: output } : output },
        },
      })
    }
    contents.push({ role: 'user', parts: responses })
  }

  // Si agotó los pasos de herramientas, solicitamos una respuesta final directa en texto
  try {
    contents.push({
      role: 'user',
      parts: [{ text: 'Por favor responde al usuario directamente en texto claro con la información y análisis disponibles, sin llamar a más herramientas.' }],
    })
    const finalContent = await callGeminiChat(contents, deepSearch)
    const finalReply = finalContent.parts
      .filter((p) => typeof p.text === 'string' && !p.thought)
      .map((p) => p.text)
      .join('')
      .trim()
    if (finalReply) {
      result.reply = cleanChatText(finalReply)
      return result
    }
  } catch (err) {
    console.warn('ai-chat: error en resumen final tras agotar pasos:', err)
  }

  result.reply = 'No pude completar la solicitud. ¿Podés reformularla?'
  return result
}
