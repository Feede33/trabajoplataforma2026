import { NextResponse } from 'next/server'
import { deepCrawlCompany } from '@/lib/crawler'
import { getAuthedContext, getServiceClient, isBackendConfigured } from '@/lib/server/auth'
import { slugify } from '@/lib/utils'

export const maxDuration = 60 // 60 segundos de ejecución máxima en Vercel
export const dynamic = 'force-dynamic'

async function handleSync(request: Request) {
  try {
    const service = getServiceClient()
    if (!service) {
      return NextResponse.json({ error: 'Base de datos no configurada.' }, { status: 500 })
    }

    // ─────────────────────────────────────────────────────────────
    // 1. Verificación de Seguridad
    // ─────────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization')
    const cronKey = request.headers.get('x-cron-key')
    const secret = process.env.CRON_SECRET

    let isAuthorized = false

    // A) Autorizado por CRON_SECRET (Vercel Cron o GitHub Action)
    if (secret) {
      if (cronKey === secret || authHeader === `Bearer ${secret}`) {
        isAuthorized = true
      }
    }

    // B) Autorizado por Usuario Administrador logueado en la web
    if (!isAuthorized && isBackendConfigured()) {
      const ctx = await getAuthedContext(request)
      if (ctx?.isAdmin) {
        isAuthorized = true
      }
    }

    // Si aún no está configurado CRON_SECRET en desarrollo local, permitir ejecución de prueba
    if (!isAuthorized && process.env.NODE_ENV === 'development') {
      isAuthorized = true
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'No autorizado para ejecutar la sincronización automática.' },
        { status: 401 }
      )
    }

    // ─────────────────────────────────────────────────────────────
    // 2. Obtener las fuentes (todas las activas o una fuente específica)
    // ─────────────────────────────────────────────────────────────
    let targetSourceId: string | null = null
    try {
      const urlObj = new URL(request.url)
      targetSourceId = urlObj.searchParams.get('sourceId')
      if (!targetSourceId && request.method === 'POST') {
        const clone = request.clone()
        const body = await clone.json().catch(() => ({}))
        if (body?.sourceId) {
          targetSourceId = body.sourceId
        }
      }
    } catch {
      // Ignorar errores de lectura de body
    }

    let query = service.from('crawler_sources').select('*')
    if (targetSourceId) {
      query = query.eq('id', targetSourceId)
    } else {
      // Ordenamos por ultima_ejecucion ascendente (NULLS FIRST) para priorizar las más antiguas
      query = query
        .eq('activo', true)
        .order('ultima_ejecucion', { ascending: true, nullsFirst: true })
        .limit(6) // Procesar hasta 6 fuentes por tanda para no exceder timeout
    }

    const { data: sources, error: sourcesErr } = await query

    if (sourcesErr) {
      throw new Error(`Error al leer fuentes de rastreo: ${sourcesErr.message}`)
    }

    if (!sources || sources.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No hay fuentes de rastreo activas configuradas.',
        sources_processed: 0,
        total_new_jobs_published: 0,
      })
    }

    const now = new Date().toISOString()
    let totalNewPublished = 0
    const results = []

    // ─────────────────────────────────────────────────────────────
    // 3. Ejecutar Deep Crawl para cada fuente
    // ─────────────────────────────────────────────────────────────
    for (const source of sources) {
      try {
        console.log(`[AutoSync] Rastreando fuente: ${source.nombre} (${source.url})`)

        const crawlResult = await deepCrawlCompany(source.url, {
          maxJobs: source.max_jobs_per_run || 8,
          companyHint: source.empresa_hint || source.nombre,
          skipExisting: true,
        })

        let publishedInSource = 0

        // Publicar solo las ofertas nuevas extraídas
        if (crawlResult.jobs && crawlResult.jobs.length > 0) {
          for (const item of crawlResult.jobs) {
            try {
              const randomSuffix = Math.floor(1000 + Math.random() * 9000)
              const baseSlug = slugify(item.titulo || 'empleo')
              const companySlug = item.empresa_nombre ? slugify(item.empresa_nombre) : 'uy'
              const slug = `${baseSlug}-${companySlug}-${randomSuffix}`

              const jobRecord = {
                titulo: item.titulo,
                empresa_id: null,
                empresa_nombre: item.empresa_nombre || source.nombre,
                empresa_logo: item.empresa_logo || null,
                descripcion: item.descripcion,
                rubro: item.rubro || source.rubro_default || 'General',
                zona: item.zona || 'Montevideo',
                modalidad: item.modalidad || 'presencial',
                tipo_contrato: item.tipo_contrato || 'full-time',
                salario_rango: item.salario_rango || null,
                estado: 'activo',
                slug,
                tags: item.tags || [],
                es_externo: true,
                url_postulacion_externa: item.url_postulacion_externa || null,
                fuente: item.fuente || source.nombre,
                created_at: now,
                updated_at: now,
              }

              const { error: insertErr } = await service.from('jobs').insert([jobRecord])
              if (!insertErr) {
                publishedInSource++
                totalNewPublished++
              } else {
                console.warn(`[AutoSync] Error al insertar vacante ${item.titulo}:`, insertErr.message)
              }
            } catch (jobErr) {
              console.warn(`[AutoSync] Error en registro de vacante:`, jobErr)
            }
          }
        }

        // Actualizar estadísticas de la fuente
        await service
          .from('crawler_sources')
          .update({
            ultima_ejecucion: now,
            total_publicadas: (source.total_publicadas || 0) + publishedInSource,
            updated_at: now,
          })
          .eq('id', source.id)

        results.push({
          fuente: source.nombre,
          url: source.url,
          enlaces_descubiertos: crawlResult.discoveredUrls.length,
          omitidas_existentes: crawlResult.skippedUrls.length,
          nuevas_publicadas: publishedInSource,
        })
      } catch (sourceErr: any) {
        console.error(`[AutoSync] Error al procesar ${source.nombre}:`, sourceErr)
        results.push({
          fuente: source.nombre,
          error: sourceErr.message || 'Error en rastreo',
        })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now,
      sources_processed: sources.length,
      total_new_jobs_published: totalNewPublished,
      details: results,
    })
  } catch (err: any) {
    console.error('[AutoSync] Error general:', err)
    return NextResponse.json(
      { error: err.message || 'Error durante la sincronización automática de empleos' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handleSync(request)
}

export async function POST(request: Request) {
  return handleSync(request)
}
