if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import { NextResponse } from 'next/server'
import { extractExternalJobsFromContent, ExtractedExternalJob } from '@/lib/gemini'
import { deepCrawlCompany } from '@/lib/crawler'
import { getAuthedContext, getServiceClient, isBackendConfigured } from '@/lib/server/auth'
import { slugify } from '@/lib/utils'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

async function fetchPageMarkdown(targetUrl: string): Promise<string> {
  const cleanUrl = targetUrl.trim()
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    throw new Error('La URL debe comenzar con http:// o https://')
  }

  // 1. Intentar mediante Jina Reader (convierte páginas web complejas a markdown limpio)
  try {
    const jinaUrl = `https://r.jina.ai/${cleanUrl}`
    const res = await fetch(jinaUrl, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'PostulaUY-JobAggregator/1.0',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const text = await res.text()
      if (text && text.trim().length > 100) {
        return text
      }
    }
  } catch (err) {
    console.warn('[JobAggregator] Jina Reader falló o agotó tiempo, usando fetch directo:', err)
  }

  // 2. Fallback: Fetch directo y limpieza básica de HTML a texto
  const directRes = await fetch(cleanUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,text/plain',
    },
    signal: AbortSignal.timeout(6000),
  })

  if (!directRes.ok) {
    throw new Error(`No se pudo acceder a la página web (HTTP ${directRes.status})`)
  }

  const html = await directRes.text()
  // Preservar enlaces HTML como markdown antes de limpiar tags
  const text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<a\b[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis, (_, href, inner) => {
      let cleanHref = String(href).trim()
      if (!cleanHref.startsWith('http://') && !cleanHref.startsWith('https://')) {
        try {
          cleanHref = new URL(cleanHref, cleanUrl).href
        } catch {}
      }
      const cleanInner = String(inner).replace(/<[^>]+>/g, '').trim()
      return cleanInner ? ` [${cleanInner}](${cleanHref}) ` : ' '
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return text
}

export async function GET(request: Request) {
  try {
    const backendReady = isBackendConfigured()
    if (backendReady) {
      const ctx = await getAuthedContext(request)
      if (!ctx || !ctx.isAdmin) {
        return NextResponse.json(
          { error: 'No autorizado. Solo administradores pueden ver las fuentes de rastreo.' },
          { status: 403 }
        )
      }
    }

    const service = getServiceClient()
    if (!service) {
      return NextResponse.json({ error: 'Base de datos no configurada.' }, { status: 500 })
    }

    const { data: sources, error } = await service
      .from('crawler_sources')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sources: sources || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al obtener fuentes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const backendReady = isBackendConfigured()

    // Solo los administradores pueden utilizar el agregador de empleos
    if (backendReady) {
      const ctx = await getAuthedContext(request)
      if (!ctx) {
        return NextResponse.json(
          { error: 'No autorizado. Debes iniciar sesión como administrador.' },
          { status: 401 }
        )
      }
      if (!ctx.isAdmin) {
        return NextResponse.json(
          { error: 'Acceso denegado. Solo administradores pueden utilizar el Agregador de Empleos.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { action } = body

    // ─────────────────────────────────────────────────────────────
    // 0. Deep Crawler: Rastrear enlaces internos de la página raíz
    // ─────────────────────────────────────────────────────────────
    if (action === 'deep_crawl') {
      const { url, companyHint, maxJobs } = body
      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'Debes proporcionar una URL válida para rastrear.' }, { status: 400 })
      }

      const result = await deepCrawlCompany(url, {
        maxJobs: Math.min(Number(maxJobs) || 8, 20),
        companyHint,
        skipExisting: true,
      })

      return NextResponse.json({
        success: true,
        mode: result.mode,
        discoveredCount: result.discoveredUrls.length,
        discoveredUrls: result.discoveredUrls,
        skippedCount: result.skippedUrls.length,
        count: result.jobs.length,
        jobs: result.jobs,
      })
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Extraer desde URL pública (Página única)
    // ─────────────────────────────────────────────────────────────
    if (action === 'extract_url') {
      const { url, companyHint } = body
      if (!url || typeof url !== 'string') {
        return NextResponse.json({ error: 'Debes proporcionar una URL válida.' }, { status: 400 })
      }

      const content = await fetchPageMarkdown(url)
      if (!content || content.length < 50) {
        return NextResponse.json(
          { error: 'No se pudo obtener contenido de la URL indicada o la página está vacía.' },
          { status: 422 }
        )
      }

      const extractedJobs = await extractExternalJobsFromContent(content, url, companyHint)
      return NextResponse.json({
        success: true,
        count: extractedJobs.length,
        jobs: extractedJobs,
      })
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Extraer desde Texto libre pegado por el admin
    // ─────────────────────────────────────────────────────────────
    if (action === 'extract_text') {
      const { text, sourceUrl, companyHint } = body
      if (!text || typeof text !== 'string' || text.trim().length < 20) {
        return NextResponse.json({ error: 'Debes ingresar un texto con información de empleos.' }, { status: 400 })
      }

      const extractedJobs = await extractExternalJobsFromContent(text, sourceUrl, companyHint)
      return NextResponse.json({
        success: true,
        count: extractedJobs.length,
        jobs: extractedJobs,
      })
    }

    // ─────────────────────────────────────────────────────────────
    // 3. Publicar lote de empleos aprobados en Supabase
    // ─────────────────────────────────────────────────────────────
    if (action === 'publish_batch') {
      const { jobs } = body as { jobs: ExtractedExternalJob[] }
      if (!Array.isArray(jobs) || jobs.length === 0) {
        return NextResponse.json({ error: 'No hay ofertas de empleo para publicar.' }, { status: 400 })
      }

      const service = getServiceClient()
      if (!service) {
        return NextResponse.json(
          { error: 'El servicio de base de datos no está configurado.' },
          { status: 500 }
        )
      }

      const now = new Date().toISOString()
      const insertedJobs = []
      const errors = []

      for (const item of jobs) {
        try {
          const randomSuffix = Math.floor(1000 + Math.random() * 9000)
          const baseSlug = slugify(item.titulo || 'empleo')
          const companySlug = item.empresa_nombre ? slugify(item.empresa_nombre) : 'uy'
          const slug = `${baseSlug}-${companySlug}-${randomSuffix}`

          const jobRecord = {
            titulo: item.titulo,
            empresa_id: null,
            empresa_nombre: item.empresa_nombre || 'Empresa Externa',
            empresa_logo: item.empresa_logo || null,
            descripcion: item.descripcion,
            rubro: item.rubro || 'General',
            zona: item.zona || 'Montevideo',
            modalidad: item.modalidad || 'presencial',
            tipo_contrato: item.tipo_contrato || 'full-time',
            salario_rango: item.salario_rango || null,
            estado: 'activo',
            slug,
            tags: item.tags || [],
            es_externo: true,
            url_postulacion_externa: item.url_postulacion_externa || null,
            fuente: item.fuente || 'Web Externa',
            created_at: now,
            updated_at: now,
          }

          const { data, error } = await service.from('jobs').insert([jobRecord]).select().single()
          if (error) {
            console.error('[JobAggregator] Error al insertar empleo:', error)
            errors.push({ titulo: item.titulo, error: error.message })
          } else {
            insertedJobs.push(data)
          }
        } catch (itemErr: any) {
          errors.push({ titulo: item.titulo, error: itemErr.message })
        }
      }

      return NextResponse.json({
        success: true,
        count: insertedJobs.length,
        inserted: insertedJobs,
        errors: errors.length > 0 ? errors : undefined,
      })
    }

    // ─────────────────────────────────────────────────────────────
    // 4. Gestión de Fuentes del Crawler (crawler_sources)
    // ─────────────────────────────────────────────────────────────
    if (action === 'add_source') {
      const service = getServiceClient()
      if (!service) {
        return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 })
      }
      const { source } = body
      if (!source?.nombre || !source?.url) {
        return NextResponse.json({ error: 'El nombre y la URL son requeridos' }, { status: 400 })
      }

      const { data, error } = await service
        .from('crawler_sources')
        .insert([
          {
            nombre: source.nombre.trim(),
            url: source.url.trim(),
            empresa_hint: source.empresa_hint?.trim() || null,
            rubro_default: source.rubro_default?.trim() || 'General',
            max_jobs_per_run: Number(source.max_jobs_per_run) || 8,
            activo: true,
          },
        ])
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true, source: data })
    }

    if (action === 'toggle_source') {
      const service = getServiceClient()
      if (!service) {
        return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 })
      }
      const { id, activo } = body
      if (!id) {
        return NextResponse.json({ error: 'ID de fuente requerido' }, { status: 400 })
      }

      const { error } = await service
        .from('crawler_sources')
        .update({ activo: Boolean(activo), updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'delete_source') {
      const service = getServiceClient()
      if (!service) {
        return NextResponse.json({ error: 'Base de datos no disponible' }, { status: 500 })
      }
      const { id } = body
      if (!id) {
        return NextResponse.json({ error: 'ID de fuente requerido' }, { status: 400 })
      }

      const { error } = await service.from('crawler_sources').delete().eq('id', id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
  } catch (err: any) {
    console.error('[JobAggregator] Error general:', err)
    return NextResponse.json(
      { error: err.message || 'Ocurrió un error inesperado al procesar la solicitud.' },
      { status: 500 }
    )
  }
}
