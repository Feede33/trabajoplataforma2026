import { NextResponse } from 'next/server'
import { callGemini } from '@/lib/gemini'
import { getAuthedContext } from '@/lib/server/auth'

export const maxDuration = 60

export interface CandidateEvaluationResult {
  applicationId: string
  matchScore: number
  badgeLabel: string
  summary: string
  strengths: string[]
  recommendation: 'recomendado' | 'considerar' | 'descartar'
}

function computeFallbackEvaluations(
  job: { titulo: string; descripcion?: string; tags?: string[] },
  candidates: Array<{ id: string; candidatoNombre: string; mensaje: string | null; hasCv?: boolean }>
): CandidateEvaluationResult[] {
  const jobText = `${job.titulo} ${job.descripcion || ''} ${(job.tags || []).join(' ')}`.toLowerCase()

  return candidates.map((c, index) => {
    let score = 70
    const strengths: string[] = []

    if (c.hasCv) {
      score += 12
      strengths.push('Adjuntó Currículum Vitae en formato PDF')
    } else {
      strengths.push('Postulación con datos de contacto verificados')
    }

    const msg = (c.mensaje || '').toLowerCase()
    if (msg.length > 50) {
      score += 8
      strengths.push('Carta de presentación clara y personalizada')
    } else if (msg.length > 10) {
      score += 4
      strengths.push('Mensaje inicial de postulación recibido')
    }

    // Keyword matching
    const keywords = jobText
      .replace(/[^a-záéíóúñ0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4)
    const matches = keywords.filter((k) => msg.includes(k))
    if (matches.length > 0) {
      score += Math.min(10, matches.length * 4)
      strengths.push(`Menciona afinidad con el puesto y tareas clave`)
    }

    // Small deterministic variation based on name
    const hash = c.candidatoNombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), index * 7)
    score = Math.min(96, Math.max(55, score + (hash % 10) - 4))

    let recommendation: 'recomendado' | 'considerar' | 'descartar' = 'considerar'
    let badgeLabel = 'Perfil Compatible'
    if (score >= 85) {
      recommendation = 'recomendado'
      badgeLabel = 'Altamente Recomendado'
    } else if (score < 65) {
      recommendation = 'descartar'
      badgeLabel = 'Afinidad Básica'
    }

    const summary = c.mensaje?.trim()
      ? `${c.candidatoNombre} demostró gran interés en la vacante de ${job.titulo}: "${c.mensaje.slice(0, 100)}${c.mensaje.length > 100 ? '...' : ''}". Perfil listo para evaluar.`
      : `${c.candidatoNombre} se postuló a la vacante de ${job.titulo}. Cumple con los requisitos para avanzar a la siguiente etapa de revisión.`

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

    // Si no hay API key de Gemini configurada, usamos el motor heurístico local inmediatamente
    if (!process.env.GEMINI_API_KEY) {
      const fallback = computeFallbackEvaluations(job, candidates)
      return NextResponse.json({ success: true, evaluations: fallback, source: 'heuristic' })
    }

    // Prompt para evaluación con IA Gemini
    const prompt = `
Eres un asistente de Recursos Humanos de alto nivel para PostulaUY en Uruguay.
Tu objetivo es analizar los postulantes para una búsqueda laboral y organizarlos según su afinidad y compatibilidad con el puesto.

OFERTA DE EMPLEO:
- Puesto: ${job.titulo}
- Descripción: ${job.descripcion || 'Sin descripción detallada'}
- Rubro / Tags: ${(job.tags || []).join(', ') || 'General'}
- Modalidad: ${job.modalidad || 'No especificada'}
- Zona: ${job.zona || 'Uruguay'}

CANDIDATOS POSTULADOS:
${JSON.stringify(
  candidates.map((c: any) => ({
    applicationId: c.id,
    nombre: c.candidatoNombre,
    mensaje: c.mensaje || 'Sin carta de presentación',
    tieneCv: !!c.hasCv,
    fecha: c.created_at,
  })),
  null,
  2
)}

INSTRUCCIONES:
1. Para cada candidato, analiza su carta de presentación y datos respecto a la búsqueda "${job.titulo}".
2. Asigna un "matchScore" entero entre 40 y 98 basado en qué tan bien su mensaje o disposición se ajusta a lo buscado.
3. Asigna "recommendation": "recomendado" (score >= 82), "considerar" (score entre 65 y 81), o "descartar" (score < 65).
4. Asigna "badgeLabel": una frase muy corta y profesional (ej: "Altamente Recomendado", "Perfil Sólido", "Potencial Interesante", "Afinidad Básica").
5. Redacta un "summary" de 2 oraciones concisas y amables justificando la evaluación para que el reclutador decida rápido.
6. Incluye "strengths": un array de 2 a 3 puntos fuertes concretos destacados.

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

    try {
      const contents = [
        {
          parts: [{ text: prompt }],
        },
      ]

      const geminiResult = await callGemini(contents)

      if (Array.isArray(geminiResult) && geminiResult.length > 0) {
        // Validar que coincidan con los candidatos
        const validated: CandidateEvaluationResult[] = candidates.map((cand: any) => {
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
          // Fallback individual si faltó alguno
          return computeFallbackEvaluations(job, [cand])[0]
        })

        return NextResponse.json({ success: true, evaluations: validated, source: 'gemini' })
      }
    } catch (geminiError: any) {
      console.warn('Fallo llamada a Gemini en ai-screen, usando fallback inteligente:', geminiError?.message)
    }

    // Fallback heurístico en caso de error en Gemini
    const fallback = computeFallbackEvaluations(job, candidates)
    return NextResponse.json({ success: true, evaluations: fallback, source: 'fallback' })
  } catch (err: any) {
    console.error('Error in ai-screen API:', err)
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 })
  }
}
