if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import * as cheerio from 'cheerio'
import { extractExternalJobsFromContent, ExtractedExternalJob } from '@/lib/gemini'
import { getServiceClient } from '@/lib/server/auth'

const JOB_PATH_PATTERNS = [
  /\/ofertas?[-_a-z0-9]*\//i,
  /\/oferta-de-trabajo/i,
  /\/jobs?[-_a-z0-9]*\//i,
  /\/empleos?[-_a-z0-9]*\//i,
  /\/vacantes?[-_a-z0-9]*\//i,
  /\/posic(?:ion|iones)[-_a-z0-9]*\//i,
  /\/carreras?[-_a-z0-9]*\//i,
  /\/careers?[-_a-z0-9]*\//i,
  /\/puestos?[-_a-z0-9]*\//i,
  /\/oportunidad(?:es)?[-_a-z0-9]*\//i,
  /\/trabaja[-_]con[-_]nosotros/i,
  /\/trabaja_con_nosotros/i,
  /\/postulac(?:ion|iones)[-_a-z0-9]*\//i,
  /\/busquedas?[-_a-z0-9]*\//i,
  /\/detalle\//i,
  /\/detail\//i,
  /\/view\//i,
  /\/v\/\d+/i,
  /\/p\/\d+/i,
  /\/aviso\//i,
  /\/avisos?[-_a-z0-9]*\//i,
  /\/trabajo\//i,
  /\/viewjob/i,
  /id=\d+/i,
  /job_id=/i,
  /posting/i,
  /[a-f0-9]{32}/i, // Identificadores hash de vacantes (Computrabajo, etc.)
]

const SOCIAL_OR_JUNK_PATTERNS = [
  /facebook\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /instagram\.com/i,
  /youtube\.com/i,
  /tiktok\.com/i,
  /linkedin\.com\/company/i,
  /linkedin\.com\/in/i,
  /policies/i,
  /privacy/i,
  /terminos/i,
  /terms/i,
  /contacto/i,
  /contact-us/i,
  /acceso/i,
  /ingreso/i,
  /login/i,
  /register/i,
  /signup/i,
  /signin/i,
  /mi-cuenta/i,
  /cuenta/i,
  /cookies/i,
  /\/empresas\//i, // Perfiles de empresas en portales, no la vacante
  /\/avisolegal\/?/i,
  /aviso[-_]?legal/i,
  /\.pdf$/i,
  /\.jpg$/i,
  /\.png$/i,
]

// Páginas de listados, catálogos o filtros generales de portales que NO son una vacante individual
const LISTING_PAGE_PATTERNS = [
  /\/empleos-en-/i,
  /\/ofertas-en-/i,
  /\/trabajo-en-/i,
  /\/trabajos-en-/i,
  /\/salarios-en-/i,
  /\/ofertas-de-trabajo\/?$/i,
  /\/empleos\/?$/i,
  /\/vacantes\/?$/i,
  /\/jobs\/?$/i,
  /\/careers\/?$/i,
  /[?&]p=\d+/i,
]

export function cleanUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl)
    // Remover parámetros de tracking comunes
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid']
    trackingParams.forEach((param) => parsed.searchParams.delete(param))
    parsed.hash = ''
    return parsed.href
  } catch {
    return rawUrl.trim()
  }
}

export function discoverJobLinksFromHtml(rootUrl: string, content: string): string[] {
  const discovered = new Set<string>()

  let baseParsed: URL
  try {
    baseParsed = new URL(rootUrl)
  } catch {
    return []
  }

  const rawCandidates: Array<{ href: string; text: string }> = []

  // 1. Extraer enlaces HTML (vía Cheerio)
  try {
    const $ = cheerio.load(content)
    $('a[href]').each((_, el) => {
      const rawHref = $(el).attr('href')?.trim()
      const anchorText = $(el).text().toLowerCase().trim()
      if (rawHref) {
        rawCandidates.push({ href: rawHref, text: anchorText })
      }
    })
  } catch {
    // Si no es HTML válido, continúa con Markdown
  }

  // 2. Extraer enlaces Markdown [texto](url) en caso de que Jina Reader haya devuelto Markdown
  const mdRegex = /\[([^\]]*)\]\((https?:\/\/[^\s\)\"\']+|[^\s\)\"\']+)\)/g
  let mdMatch: RegExpExecArray | null
  while ((mdMatch = mdRegex.exec(content)) !== null) {
    rawCandidates.push({
      href: mdMatch[2].trim(),
      text: mdMatch[1].toLowerCase().trim(),
    })
  }

  for (const { href: rawHref, text: anchorText } of rawCandidates) {
    if (
      !rawHref ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref === '#'
    ) {
      continue
    }

    let absoluteUrl: string
    try {
      absoluteUrl = new URL(rawHref, rootUrl).href
    } catch {
      continue
    }

    // Filtrar enlaces de redes sociales, auth o páginas basura
    if (SOCIAL_OR_JUNK_PATTERNS.some((p) => p.test(absoluteUrl))) {
      continue
    }

    // Filtrar páginas de listado/búsqueda general (para no confundirlas con una vacante individual)
    if (LISTING_PAGE_PATTERNS.some((p) => p.test(absoluteUrl))) {
      continue
    }

    // Mismo dominio o subdominios de empleo comunes (ej. jobs.lever.co, computrabajo, etc.)
    const linkParsed = new URL(absoluteUrl)
    const isSameHost =
      linkParsed.hostname === baseParsed.hostname || linkParsed.hostname.endsWith('.' + baseParsed.hostname)
    const isKnownAts = [
      'lever.co',
      'greenhouse.io',
      'bamboohr.com',
      'workable.com',
      'myworkdayjobs.com',
      'smartrecruiters.com',
      'computrabajo.com',
      'buscojobs.com',
      'smarttalent.uy',
    ].some((ats) => linkParsed.hostname.includes(ats))

    if (!isSameHost && !isKnownAts) {
      continue
    }

    // No queremos el root URL en sí
    if (cleanUrl(absoluteUrl) === cleanUrl(rootUrl)) {
      continue
    }

    // Coincidencia por patrón de URL o por texto del enlace
    const matchesPath = JOB_PATH_PATTERNS.some((pattern) => pattern.test(linkParsed.pathname + linkParsed.search))
    const matchesText = [
      'postular',
      'postulate',
      'aplicar',
      'ver vacante',
      'ver empleo',
      'ver oferta',
      'ver detalle',
      'más información',
      'mas informacion',
      'inscribirme',
      'postularme',
    ].some((keyword) => anchorText.includes(keyword))

    if (matchesPath || matchesText) {
      discovered.add(cleanUrl(absoluteUrl))
    }
  }

  return Array.from(discovered)
}

export async function fetchCleanPageContent(targetUrl: string): Promise<string> {
  const cleaned = cleanUrl(targetUrl)

  // 1. Jina Reader
  try {
    const jinaUrl = `https://r.jina.ai/${cleaned}`
    const res = await fetch(jinaUrl, {
      headers: {
        Accept: 'text/plain',
        'User-Agent': 'PostulaUY-DeepCrawler/1.0',
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
    console.warn(`[DeepCrawler] Jina falló para ${cleaned}, probando fetch directo:`, err)
  }

  // 2. Fetch directo
  const directRes = await fetch(cleaned, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,text/plain',
    },
    signal: AbortSignal.timeout(6000),
  })

  if (!directRes.ok) {
    throw new Error(`Error HTTP ${directRes.status} al leer ${cleaned}`)
  }

  return await directRes.text()
}

export interface DeepCrawlProgress {
  step: 'discovering' | 'crawling_jobs' | 'parsing_ai' | 'completed' | 'error'
  discoveredUrls: string[]
  currentJobUrl?: string
  processedCount: number
  totalToProcess: number
  message: string
}

export async function deepCrawlCompany(
  rootUrl: string,
  options: {
    maxJobs?: number
    companyHint?: string
    skipExisting?: boolean
  } = {}
): Promise<{
  discoveredUrls: string[]
  jobs: ExtractedExternalJob[]
  skippedUrls: string[]
  mode: 'multi_page' | 'single_page'
}> {
  const { maxJobs = 10, companyHint, skipExisting = true } = options

  // 1. Obtener HTML de la página raíz
  const rootHtml = await fetchCleanPageContent(rootUrl)

  // 2. Descubrir enlaces de vacantes
  const allDiscovered = discoverJobLinksFromHtml(rootUrl, rootHtml)

  // 3. Opcional: Descartar URLs ya guardadas en Supabase para no repetir scraping
  let urlsToCrawl = allDiscovered
  const skippedUrls: string[] = []

  if (skipExisting && allDiscovered.length > 0) {
    const service = getServiceClient()
    if (service) {
      try {
        const { data: existing } = await service
          .from('jobs')
          .select('url_postulacion_externa')
          .in('url_postulacion_externa', allDiscovered)

        if (existing && existing.length > 0) {
          const existingSet = new Set(existing.map((e) => e.url_postulacion_externa))
          urlsToCrawl = allDiscovered.filter((u) => {
            if (existingSet.has(u)) {
              skippedUrls.push(u)
              return false
            }
            return true
          })
        }
      } catch (err) {
        console.warn('[DeepCrawler] No se pudo verificar duplicados en DB, continuando:', err)
      }
    }
  }

  // Limitar al máximo solicitado
  const targetUrls = urlsToCrawl.slice(0, maxJobs)

  // 4. Si encontramos enlaces individuales, rastrear cada uno en lotes
  if (targetUrls.length > 0) {
    const collectedJobs: ExtractedExternalJob[] = []

    // Procesar en chunks de 2 en 2 para garantizar velocidad y confiabilidad
    const CHUNK_SIZE = 2
    for (let i = 0; i < targetUrls.length; i += CHUNK_SIZE) {
      const chunk = targetUrls.slice(i, i + CHUNK_SIZE)
      const chunkPromises = chunk.map(async (jobUrl) => {
        try {
          const pageContent = await fetchCleanPageContent(jobUrl)
          const extracted = await extractExternalJobsFromContent(pageContent, jobUrl, companyHint)
          return extracted
        } catch (err) {
          console.warn(`[DeepCrawler] Error extrayendo ${jobUrl}:`, err)
          return []
        }
      })

      const results = await Promise.allSettled(chunkPromises)
      results.forEach((res) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          collectedJobs.push(...res.value)
        }
      })
    }

    // Si los subenlaces no devolvieron empleos (o estaban vacíos/bloqueados), extraer de la página raíz
    if (collectedJobs.length === 0 && rootHtml) {
      try {
        const directJobs = await extractExternalJobsFromContent(rootHtml, rootUrl, companyHint)
        collectedJobs.push(...directJobs)
      } catch (err) {
        console.warn('[DeepCrawler] Fallback de página principal falló:', err)
      }
    }

    return {
      discoveredUrls: allDiscovered,
      jobs: collectedJobs,
      skippedUrls,
      mode: 'multi_page',
    }
  }

  // 5. Fallback: Si no tiene enlaces a páginas individuales, la página raíz lista todo en un solo bloque
  const directExtracted = await extractExternalJobsFromContent(rootHtml, rootUrl, companyHint)
  return {
    discoveredUrls: [rootUrl],
    jobs: directExtracted,
    skippedUrls,
    mode: 'single_page',
  }
}
