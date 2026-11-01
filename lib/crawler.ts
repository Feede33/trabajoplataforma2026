if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import * as cheerio from 'cheerio'
import { extractExternalJobsFromContent, extractExternalJobsBatch, ExtractedExternalJob } from '@/lib/gemini'
import { getServiceClient } from '@/lib/server/auth'
import { searchTheirStackJobs } from '@/lib/theirstack'

const JOB_PATH_PATTERNS = [
  /-ID-\d+\/?$/i, // Vacantes individuales de BuscoJobs (ej: /analista-en-montevideo-ID-278210)
  /\/ofertas-de-trabajo\/oferta-de-trabajo-/i, // Vacantes individuales de Computrabajo
  /\/anuncio\//i, // Vacantes individuales de El Gallito (ej: /anuncio/peon-para-planta-industrial-d8u33)
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
  /linkedin\.com\/shareArticle/i,
  /api\.whatsapp\.com\/send/i,
  /wa\.me\//i,
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
  /\/paginas\//i,
  /\/avisolegal\/?/i,
  /aviso[-_]?legal/i,
  /\/_next\/static\//i,
  /\/static\/img\//i,
  /\.pdf$/i,
  /\.jpg$/i,
  /\.png$/i,
  /\.svg$/i,
  /\.webp$/i,
]

// Páginas de listados, catálogos o filtros generales de portales que NO son una vacante individual
const LISTING_PAGE_PATTERNS = [
  /\/empleos-en-/i,
  /\/ofertas-en-/i,
  /\/trabajo-en-/i,
  /\/trabajos-en-/i,
  /\/salarios-en-/i,
  /\/ofertas-de-trabajo\/?$/i,
  /\/ofertas\/_/i, // Listados por departamento/filtro en BuscoJobs (ej: /ofertas/_montevideo)
  /\/ofertas\/[a-z0-9-]+_\/?$/i, // Categorías en BuscoJobs (ej: /ofertas/confiteria_)
  /\/ofertas\/[a-z0-9-]+\/trabajo-/i, // Subfiltros en BuscoJobs (ej: /ofertas/mt/trabajo-teletrabajo/_montevideo)
  /\/empleos\/?$/i,
  /\/vacantes\/?$/i,
  /\/jobs\/?$/i,
  /\/careers\/?$/i,
  /\/buscar\/?$/i,
  /[?&](p|page|pagina|jornada|fechainicio)=/i,
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

  // 2b. Capturar enlaces Markdown anidados que contienen imágenes dentro del texto: [... ![img](...) ...](https://...)
  const nestedMdRegex = /\]\((https?:\/\/[^\s\)\"\']+)\)/g
  let nestedMatch: RegExpExecArray | null
  while ((nestedMatch = nestedMdRegex.exec(content)) !== null) {
    rawCandidates.push({
      href: nestedMatch[1].trim(),
      text: 'ver oferta',
    })
  }

  // 3. Extraer URLs de bloques JSON-LD ("url": "https://...") como usa BuscoJobs en su HTML SSR
  const jsonLdUrlRegex = /"url"\s*:\s*"(https?:\/\/[^"\s]+)"/gi
  let ldMatch: RegExpExecArray | null
  while ((ldMatch = jsonLdUrlRegex.exec(content)) !== null) {
    rawCandidates.push({
      href: ldMatch[1].trim(),
      text: 'ver oferta',
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

  const isBlockedOrChallengeText = (text: string) => {
    const trimmed = text.trim()
    if (trimmed.length <= 150) return true
    if (
      /Target URL returned error (403|401|503)/i.test(trimmed) ||
      (/Title:\s*Just a moment/i.test(trimmed) && trimmed.length < 2500) ||
      (/Enable JavaScript and cookies to continue/i.test(trimmed) && trimmed.length < 2500) ||
      (/Attention Required!\s*\|\s*Cloudflare/i.test(trimmed) && trimmed.length < 4000)
    ) {
      return true
    }
    return false
  }

  // 1. Fetch directo ultrarrápido (~150-600ms, sin límite de rate-limit externo)
  try {
    const directRes = await fetch(cleaned, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-UY,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(5000),
    })

    if (directRes.ok) {
      const html = await directRes.text()
      if (html && !isBlockedOrChallengeText(html) && html.length > 500) {
        return html
      }
    }
  } catch (err) {
    console.warn(`[DeepCrawler] Fetch directo falló para ${cleaned}, probando Jina Reader:`, err)
  }

  // 2. Fallback a Jina Reader (para SPAs complejas o páginas que requieran renderizado)
  const jinaUrl = `https://r.jina.ai/${cleaned}`
  const res = await fetch(jinaUrl, {
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'PostulaUY-DeepCrawler/1.0',
    },
    signal: AbortSignal.timeout(6500),
  })

  if (!res.ok) {
    throw new Error(`Error HTTP ${res.status} al leer ${cleaned}`)
  }

  const text = await res.text()
  if (isBlockedOrChallengeText(text)) {
    throw new Error(`El sitio ${new URL(cleaned).hostname} bloqueó el acceso automático (Cloudflare/403).`)
  }

  return text
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
    deadlineMs?: number
  } = {}
): Promise<{
  discoveredUrls: string[]
  jobs: ExtractedExternalJob[]
  skippedUrls: string[]
  mode: 'multi_page' | 'single_page'
}> {
  const { maxJobs = 20, companyHint, skipExisting = true, deadlineMs } = options

  // Si es una URL de Computrabajo o TheirStack y hay API Key configurada, usar TheirStack como vía principal o respaldo ante bloqueo Cloudflare
  const isComputrabajoUrl = /computrabajo\.com/i.test(rootUrl) || /theirstack\.com/i.test(rootUrl)

  // 1. Obtener HTML de la página raíz
  let rootHtml = ''
  try {
    if (/api\.theirstack\.com/i.test(rootUrl)) {
      throw new Error('Use TheirStack API')
    }
    rootHtml = await fetchCleanPageContent(rootUrl)
  } catch (fetchErr: any) {
    if (isComputrabajoUrl && process.env.THEIRSTACK_API_KEY) {
      console.log('[DeepCrawler] Usando TheirStack API para Computrabajo:', rootUrl)
      const tsResult = await searchTheirStackJobs({
        sourcePortal: 'computrabajo',
        countryCodes: ['UY'],
        limit: maxJobs,
        postedAtMaxAgeDays: 14,
        skipExisting,
      })
      return {
        discoveredUrls: tsResult.jobs.map((j) => j.url_postulacion_externa),
        jobs: tsResult.jobs,
        skippedUrls: Array(tsResult.skippedCount).fill('skipped'),
        mode: 'multi_page',
      }
    }
    throw fetchErr
  }

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

  // 4. Si encontramos enlaces individuales, descargar su HTML en paralelo y extraer en lotes con IA
  if (targetUrls.length > 0) {
    const collectedJobs: ExtractedExternalJob[] = []
    const fetchedPages: Array<{ url: string; content: string }> = []

    // 4a. Descargar páginas HTML en paralelo (de 6 en 6, toma < 1s con fetch directo)
    const FETCH_CONCURRENCY = 6
    for (let i = 0; i < targetUrls.length; i += FETCH_CONCURRENCY) {
      if (deadlineMs && Date.now() > deadlineMs) break
      const slice = targetUrls.slice(i, i + FETCH_CONCURRENCY)
      const fetched = await Promise.allSettled(
        slice.map(async (jobUrl) => ({
          url: jobUrl,
          content: await fetchCleanPageContent(jobUrl),
        }))
      )
      fetched.forEach((res) => {
        if (res.status === 'fulfilled' && res.value.content) {
          fetchedPages.push(res.value)
        }
      })
    }

    // 4b. Extraer con IA agrupando de a 4 vacantes por llamada a Gemini (20 vacantes = solo 5 llamadas)
    const AI_BATCH_SIZE = 4
    const aiBatches: Array<Array<{ url: string; content: string }>> = []
    for (let i = 0; i < fetchedPages.length; i += AI_BATCH_SIZE) {
      aiBatches.push(fetchedPages.slice(i, i + AI_BATCH_SIZE))
    }

    let lastAiError: any = null

    // Ejecutar hasta 2 lotes de IA en paralelo por ola (8 vacantes por ola)
    const AI_WAVE_CONCURRENCY = 2
    for (let w = 0; w < aiBatches.length; w += AI_WAVE_CONCURRENCY) {
      if (deadlineMs && Date.now() > deadlineMs) {
        console.log(`[DeepCrawler] Límite de tiempo alcanzado, devolviendo ${collectedJobs.length} empleos extraídos.`)
        break
      }

      const wave = aiBatches.slice(w, w + AI_WAVE_CONCURRENCY)
      const waveResults = await Promise.allSettled(
        wave.map(async (batch) => {
          try {
            return await extractExternalJobsBatch(batch, companyHint)
          } catch (err) {
            lastAiError = err
            console.warn('[DeepCrawler] Error en lote IA:', err)
            return []
          }
        })
      )

      waveResults.forEach((res) => {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          collectedJobs.push(...res.value)
        }
      })
    }

    // Si los subenlaces no devolvieron empleos, intentar extraer de la página raíz
    if (collectedJobs.length === 0 && rootHtml && (!deadlineMs || Date.now() <= deadlineMs)) {
      try {
        const directJobs = await extractExternalJobsFromContent(rootHtml, rootUrl, companyHint)
        collectedJobs.push(...directJobs)
      } catch (err) {
        lastAiError = err
        console.warn('[DeepCrawler] Fallback de página principal falló:', err)
      }
    }

    if (collectedJobs.length === 0 && lastAiError) {
      throw lastAiError
    }

    return {
      discoveredUrls: allDiscovered,
      jobs: collectedJobs,
      skippedUrls,
      mode: 'multi_page',
    }
  }

  //Si todos los enlaces descubiertos ya existían en la base de datos, no volver a extraer de la raíz
  if (allDiscovered.length > 0 && urlsToCrawl.length === 0) {
    return {
      discoveredUrls: allDiscovered,
      jobs: [],
      skippedUrls,
      mode: 'multi_page',
    }
  }

  // 5. Fallback: Si no tiene enlaces a páginas individuales, la página raíz lista todo en un solo bloque
  const directExtracted = await extractExternalJobsFromContent(rootHtml, rootUrl, companyHint)
  let filteredDirect = directExtracted

  if (skipExisting && directExtracted.length > 0) {
    const service = getServiceClient()
    if (service) {
      try {
        const candidateUrls = directExtracted
          .map((j) => cleanUrl(j.url_postulacion_externa))
          .filter(Boolean)
        if (candidateUrls.length > 0) {
          const { data: existing } = await service
            .from('jobs')
            .select('url_postulacion_externa')
            .in('url_postulacion_externa', candidateUrls)
          if (existing && existing.length > 0) {
            const existingSet = new Set(existing.map((e) => cleanUrl(e.url_postulacion_externa || '')))
            filteredDirect = directExtracted.filter((j) => {
              const u = cleanUrl(j.url_postulacion_externa)
              if (u && existingSet.has(u) && u !== cleanUrl(rootUrl)) {
                skippedUrls.push(u)
                return false
              }
              return true
            })
          }
        }
      } catch (err) {
        console.warn('[DeepCrawler] Error verificando duplicados en modo single_page:', err)
      }
    }
  }

  return {
    discoveredUrls: [rootUrl],
    jobs: filteredDirect,
    skippedUrls,
    mode: 'single_page',
  }
}
