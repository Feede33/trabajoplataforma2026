import type { SupabaseClient } from '@supabase/supabase-js'
import { CANDIDATE_MODELS, makeHttpsPost } from '@/lib/gemini'

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

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentResult {
  reply: string
  pending: PendingApplication[]
  applied: { job_id: string; titulo: string }[]
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
    name: 'update_my_profile',
    description:
      'Actualiza el perfil/currículum del candidato. Usar solo si el usuario pidió explícitamente ajustar o mejorar su CV/perfil. Enviar solo los campos a cambiar.',
    parameters: {
      type: 'OBJECT',
      properties: {
        nombre: { type: 'STRING' },
        bio: { type: 'STRING', description: 'Resumen profesional / experiencia (reemplaza el actual).' },
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

function systemPrompt(): string {
  const hoy = new Date().toLocaleDateString('es-UY', { timeZone: 'America/Montevideo', dateStyle: 'full' })
  return `Eres el asistente de IA de PostulaUY, una plataforma laboral de Uruguay. Hoy es ${hoy}.
Ayudas al candidato a encontrar empleo y a postularse sin hacerlo una por una.

Reglas:
- Responde siempre en español rioplatense, breve y claro. Usa listas cortas cuando enumeres empleos.
- Usa las herramientas para obtener datos reales. NUNCA inventes empleos, empresas, ids ni contactos.
- Para recomendar, primero lee el perfil (get_my_profile) y luego busca empleos acordes. Explica en una línea por qué encaja cada uno.
- Si el perfil/CV está vacío o es pobre, sugiere completarlo y ofrécete a redactarlo; solo llama a update_my_profile si el usuario lo pide o aprueba el texto.
- Para postular usa apply_to_jobs con los id exactos de search_jobs. Si el usuario dice "postulame a todos/5", usa los resultados más relevantes. No postules a empleos a los que ya se postuló (revisa list_my_applications si hay duda).
- Los empleos informales no tienen postulación en la plataforma: da el contacto para que el usuario escriba.
- Después de apply_to_jobs, informa claramente si quedó pendiente de confirmación o si ya fue enviada.`
}

type GeminiPart = Record<string, any>
type GeminiContent = { role: 'user' | 'model'; parts: GeminiPart[] }

async function callGeminiChat(contents: GeminiContent[]): Promise<GeminiContent> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('Falta GEMINI_API_KEY en el servidor (.env.local)')

  let lastError: Error | null = null
  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
      const { statusCode, data } = await makeHttpsPost(url, {
        systemInstruction: { parts: [{ text: systemPrompt() }] },
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
}): Promise<AgentResult> {
  const { db, user, history, autoApply } = opts
  const result: AgentResult = { reply: '', pending: [], applied: [], profileUpdated: false }

  const contents: GeminiContent[] = history.map((t) => ({
    role: t.role === 'user' ? 'user' : 'model',
    parts: [{ text: t.content }],
  }))

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
      case 'update_my_profile': {
        const patch: Record<string, string> = {}
        for (const k of ['nombre', 'bio', 'ubicacion']) {
          if (typeof args[k] === 'string' && args[k].trim()) patch[k] = args[k].trim().slice(0, 4000)
        }
        if (Object.keys(patch).length === 0) return { error: 'No hay campos para actualizar' }
        const { error } = await db.from('profiles').update(patch).eq('id', user.userId)
        if (error) return { error: 'No se pudo actualizar el perfil' }
        result.profileUpdated = true
        return { ok: true, actualizado: Object.keys(patch) }
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

  for (let step = 0; step < MAX_STEPS; step++) {
    const modelContent = await callGeminiChat(contents)
    contents.push(modelContent)

    const calls = modelContent.parts.filter((p) => p.functionCall)
    if (calls.length === 0) {
      result.reply = modelContent.parts
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('')
        .trim()
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

  result.reply = 'No pude completar la solicitud. ¿Podés reformularla?'
  return result
}
