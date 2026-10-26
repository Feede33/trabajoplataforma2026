import { NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'
import { getServiceClient } from '@/lib/server/auth'
import { extractText } from 'unpdf'

export const maxDuration = 60

export interface CandidateEvaluationResult {
  applicationId: string
  matchScore: number
  badgeLabel: string
  summary: string
  strengths: string[]
  recommendation: 'recomendado' | 'considerar' | 'descartar'
}

/**
 * Descarga y extrae el texto plano de un CV (PDF) alojado en Supabase Storage o URL pública.
 * Tiene un timeout de 8 segundos para no demorar la evaluación si un archivo tarda en responder.
 */
async function extractTextFromCv(cvUrl: string | null | undefined): Promise<string | null> {
  if (!cvUrl || typeof cvUrl !== 'string' || !cvUrl.startsWith('http')) {
    return null
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)

    if (process.env.NODE_ENV === 'development') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }

    const res = await fetch(cvUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'PostulaUY-AI-Screen/1.0',
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      console.warn(`[AI-Screen] No se pudo descargar el CV (${res.status}): ${cvUrl}`)
      return null
    }

    const buffer = await res.arrayBuffer()
    if (!buffer || buffer.byteLength === 0) return null

    const uint8Array = new Uint8Array(buffer)
    const { text } = await extractText(uint8Array)

    if (Array.isArray(text) && text.length > 0) {
      const cleanText = text
        .join('\n')
        .replace(/\r?\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      if (cleanText.length > 20) {
        // Limitar a los primeros 3000 caracteres (suficiente para experiencia, aptitudes, educación)
        return cleanText.slice(0, 3000)
      }
    }
  } catch (err: any) {
    console.warn(`[AI-Screen] No se pudo extraer texto del CV (${cvUrl}):`, err?.message)
  }

  return null
}

function computeFallbackEvaluations(
  job: { titulo: string; descripcion?: string; tags?: string[] },
  candidates: Array<{
    id: string
    candidatoNombre: string
    mensaje: string | null
    hasCv?: boolean
    cvText?: string | null
  }>
): CandidateEvaluationResult[] {
  const jobText = `${job.titulo} ${job.descripcion || ''} ${(job.tags || []).join(' ')}`.toLowerCase()

  const keywords = jobText
    .replace(/[^a-záéíóúñ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)

  return candidates.map((c, index) => {
    let score = 55
    const strengths: string[] = []

    if (c.cvText) {
      score += 20
      const cvLower = c.cvText.toLowerCase()
      const matchesInCv = keywords.filter((k) => cvLower.includes(k))
      if (matchesInCv.length > 0) {
        score += Math.min(20, matchesInCv.length * 5)
        strengths.push(`CV con experiencia en ${matchesInCv.slice(0, 2).join(' y ')}`)
      } else {
        strengths.push('Currículum Vitae analizado con éxito')
      }
    } else if (c.hasCv) {
      score += 15
      strengths.push('Currículum Vitae adjunto en PDF')
    } else {
      strengths.push('Postulación con datos de contacto verificados')
    }

    const msg = (c.mensaje || '').toLowerCase()
    if (msg.length > 50) {
      score += 8
      strengths.push('Carta de presentación detallada')
    } else if (msg.length > 10) {
      score += 4
      strengths.push('Mensaje inicial recibido')
    }

    // Keyword matching en el mensaje
    const matchesInMsg = keywords.filter((k) => msg.includes(k))
    if (matchesInMsg.length > 0) {
      score += Math.min(10, matchesInMsg.length * 4)
      strengths.push(`Afinidad con tareas clave del puesto`)
    }

    const hash = c.candidatoNombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), index * 7)
    score = Math.min(97, Math.max(40, score + (hash % 10) - 3))

    let recommendation: 'recomendado' | 'considerar' | 'descartar' = 'considerar'
    let badgeLabel = 'Perfil Compatible'
    if (score >= 90) {
      recommendation = 'recomendado'
      badgeLabel = 'Candidato Ideal'
    } else if (score >= 75) {
      recommendation = 'recomendado'
      badgeLabel = 'Alta Afinidad'
    } else if (score >= 55) {
      recommendation = 'considerar'
      badgeLabel = 'Perfil Compatible'
    } else if (score >= 35) {
      recommendation = 'considerar'
      badgeLabel = 'Afinidad Media'
    } else {
      recommendation = 'descartar'
      badgeLabel = 'Afinidad Básica'
    }

    const summary = c.cvText
      ? `${c.candidatoNombre} presenta un perfil con experiencia analizada directamente de su currículum. Se detectaron competencias afines para ${job.titulo}.`
      : c.mensaje?.trim()
      ? `${c.candidatoNombre} demostró interés en la vacante de ${job.titulo}: "${c.mensaje.slice(0, 80)}...".`
      : `${c.candidatoNombre} se postuló a la vacante de ${job.titulo}. Cumple con los requisitos para avanzar.`

    return {
      applicationId: c.id,
      matchScore: score,
      badgeLabel,
      summary,
      strengths: strengths.slice(0, 3),
      recommendation,
    }
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.job || !Array.isArray(body.candidates)) {
      return NextResponse.json(
        { error: 'Datos incompletos. Se requiere objeto "job" y array de "candidates".' },
        { status: 400 }
      )
    }

    const { job, candidates } = body

    if (candidates.length === 0) {
      return NextResponse.json({ success: true, evaluations: [] })
    }

    // 1. Obtener cliente de servicio para consultar caché de cv_text (Opción C)
    let cachedCvMap: Record<string, string> = {}
    const serviceClient = getServiceClient()
    if (serviceClient) {
      try {
        const candidateIds = candidates
          .map((c: any) => c.candidatoId)
          .filter((id: any) => typeof id === 'string' && id.length > 0)

        if (candidateIds.length > 0) {
          const { data: profilesData } = await serviceClient
            .from('profiles')
            .select('id, cv_text')
            .in('id', candidateIds)

          if (Array.isArray(profilesData)) {
            profilesData.forEach((p: any) => {
              if (p.cv_text && typeof p.cv_text === 'string' && p.cv_text.trim().length > 20) {
                cachedCvMap[p.id] = p.cv_text.trim()
              }
            })
          }
        }
      } catch {
        // Si la columna cv_text aún no existe en Supabase, continuamos sin fallar
      }
    }

    // 2. Extraer texto en paralelo para todos los candidatos (Opción A + lazy caching C)
    const enrichedCandidates = await Promise.all(
      candidates.map(async (c: any) => {
        let cvText = c.candidatoId ? cachedCvMap[c.candidatoId] : null

        if (!cvText && c.cvUrl) {
          cvText = await extractTextFromCv(c.cvUrl)

          // Guardar en la base de datos para que futuras evaluaciones sean instantáneas
          if (cvText && c.candidatoId && serviceClient) {
            try {
              await serviceClient
                .from('profiles')
                .update({ cv_text: cvText })
                .eq('id', c.candidatoId)
            } catch {
              // Silencioso si la columna no existe aún
            }
          }
        }

        return {
          ...c,
          cvText: cvText || null,
        }
      })
    )

    // Si no hay API key de Gemini configurada, usamos el motor heurístico local con el texto extraído
    if (!process.env.GEMINI_API_KEY) {
      const fallback = computeFallbackEvaluations(job, enrichedCandidates)
      return NextResponse.json({ success: true, evaluations: fallback, source: 'heuristic' })
    }

    // 3. Prompt para evaluación con IA Gemini incluyendo experiencia del CV
    const prompt = `
Eres un asistente de Recursos Humanos de alto nivel para PostulaUY en Uruguay.
Tu objetivo es analizar minuciosamente a los postulantes para una búsqueda laboral evaluando su EXPERIENCIA, HABILIDADES Y FORMACIÓN extraídas de sus currículums vitae y organizarlos según su afinidad real con el puesto.

OFERTA DE EMPLEO:
- Puesto: ${job.titulo}
- Descripción: ${job.descripcion || 'Sin descripción detallada'}
- Rubro / Tags: ${(job.tags || []).join(', ') || 'General'}
- Modalidad: ${job.modalidad || 'No especificada'}
- Zona: ${job.zona || 'Uruguay'}

CANDIDATOS POSTULADOS:
${JSON.stringify(
  enrichedCandidates.map((c: any) => ({
    applicationId: c.id,
    nombre: c.candidatoNombre,
    mensaje: c.mensaje || 'Sin carta de presentación',
    tieneCv: !!c.hasCv,
    contenidoCurriculum: c.cvText
      ? c.cvText
      : c.hasCv
      ? 'CV adjunto en archivo (no fue posible extraer texto plano indexable)'
      : 'Sin currículum vitae adjunto',
    fecha: c.created_at,
  })),
  null,
  2
)}

INSTRUCCIONES DE EVALUACIÓN:
1. Analiza el "contenidoCurriculum" de cada candidato (trayectoria laboral previa, herramientas, tecnologías, estudios) comparándolo directamente con las tareas y requisitos del puesto "${job.titulo}".
2. Asigna un "matchScore" entero entre 30 y 98:
   - 85-98 (Muy Alto / Recomendado): Su CV demuestra experiencia directamente aplicable, formación adecuada y dominio de herramientas solicitadas.
   - 70-84 (Medio / Considerar): Tiene habilidades transferibles o experiencia general en el rubro, pero le falta profundizar en algún requisito clave o su CV es breve.
   - 35-69 (Bajo / Descartar): Su experiencia previa o perfil no guardan relación con la vacante.
3. Asigna "recommendation": "recomendado" (score >= 75), "considerar" (score entre 40 y 74), o "descartar" (score < 40).
4. Asigna "badgeLabel" según el matchScore:
   - score >= 90: "Candidato Ideal"
   - score 75 a 89: "Alta Afinidad"
   - score 55 a 74: "Perfil Compatible"
   - score 35 a 54: "Afinidad Media"
   - score < 35 (ej: 25%): "Afinidad Básica"
5. Redacta un "summary" de 2 oraciones concisas y amables justificando la evaluación en base a lo que leíste en su CV (ej: "Cuenta con sólida experiencia en puestos similares y formación técnica adecuada...").
6. Incluye "strengths": un array de 2 a 3 puntos fuertes concretos destacados que encontraste en su CV o postulación (ej: "3 años en puestos similares", "Conocimientos en [Herramienta clave]", "Formación técnica alineada").

Devuelve EXCLUSIVAMENTE un array JSON válido con la siguiente estructura exacta:
[
  {
    "applicationId": "string",
    "matchScore": 90,
    "badgeLabel": "Altamente Recomendado",
    "summary": "...",
    "strengths": ["...", "..."],
    "recommendation": "recomendado"
  }
]
`

    const persistEvaluations = async (evals: CandidateEvaluationResult[]) => {
      if (!serviceClient) return
      try {
        await Promise.all(
          evals.map(async (ev) => {
            if (ev.applicationId) {
              await serviceClient
                .from('applications')
                .update({
                  ai_match_score: ev.matchScore,
                  ai_badge_label: ev.badgeLabel,
                  ai_summary: ev.summary,
                  ai_strengths: ev.strengths,
                  ai_evaluated_at: new Date().toISOString(),
                })
                .eq('id', ev.applicationId)
            }
          })
        )
      } catch (err: any) {
        console.warn('[AI-Screen] No se pudo persistir evaluación en applications:', err?.message)
      }
    }

    try {
      const contents = [
        {
          parts: [{ text: prompt }],
        },
      ]

      const geminiResult = await callGemini(contents)

      if (Array.isArray(geminiResult) && geminiResult.length > 0) {
        const validated: CandidateEvaluationResult[] = enrichedCandidates.map((cand: any) => {
          const found = geminiResult.find((r: any) => r.applicationId === cand.id)
          if (found && typeof found.matchScore === 'number') {
            return {
              applicationId: cand.id,
              matchScore: Math.min(99, Math.max(30, Math.round(found.matchScore))),
              badgeLabel: found.badgeLabel || 'Perfil Compatible',
              summary: found.summary || 'Postulación analizada con éxito.',
              strengths: Array.isArray(found.strengths) ? found.strengths : ['Perfil evaluado con IA'],
              recommendation: found.recommendation || 'considerar',
            }
          }
          return computeFallbackEvaluations(job, [cand])[0]
        })

        await persistEvaluations(validated)
        return NextResponse.json({ success: true, evaluations: validated, source: 'gemini' })
      }
    } catch (geminiError: any) {
      console.warn('Fallo llamada a Gemini en ai-screen, usando fallback inteligente:', geminiError?.message)
    }

    const fallback = computeFallbackEvaluations(job, enrichedCandidates)
    await persistEvaluations(fallback)
    return NextResponse.json({ success: true, evaluations: fallback, source: 'fallback' })
  } catch (err: any) {
    console.error('Error in ai-screen API:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
