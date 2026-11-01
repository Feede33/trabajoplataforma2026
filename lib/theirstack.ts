if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import { ExtractedExternalJob } from '@/lib/gemini'
import { cleanUrl } from '@/lib/crawler'
import { getServiceClient } from '@/lib/server/auth'
import { slugify } from '@/lib/utils'

export interface TheirStackSearchFilterParams {
  apiKey?: string
  sourcePortal?: 'all_uy' | 'computrabajo' | 'portales_uy' | 'custom'
  customDomains?: string[]
  countryCodes?: string[]
  jobTitles?: string[]
  descriptionKeywords?: string[]
  companyNames?: string[]
  postedAtMaxAgeDays?: number
  workplaceTypes?: Array<'on_site' | 'remote' | 'hybrid'>
  limit?: number
  page?: number
  skipExisting?: boolean
}

export interface TheirStackCreditBalance {
  api_credits: number
  used_api_credits: number
  remaining_api_credits: number
  ui_credits?: number
  used_ui_credits?: number
  earliest_expiration?: string | null
}

export interface TheirStackJobItem {
  id: number
  job_title?: string | null
  normalized_title?: string | null
  company?: string | null
  company_domain?: string | null
  company_object?: {
    name?: string | null
    domain?: string | null
    logo?: string | null
    industry?: string | null
    country_code?: string | null
  } | null
  url?: string | null
  final_url?: string | null
  source_url?: string | null
  description?: string | null
  date_posted?: string | null
  discovered_at?: string | null
  location?: string | null
  short_location?: string | null
  long_location?: string | null
  cities?: string[] | null
  locations?: Array<{
    name?: string | null
    state?: string | null
    admin1_name?: string | null
    country_code?: string | null
    country_name?: string | null
    display_name?: string | null
  }> | null
  country_code?: string | null
  country_codes?: string[] | null
  remote?: boolean | null
  hybrid?: boolean | null
  employment_statuses?: string[] | null
  salary_string?: string | null
  min_annual_salary?: number | null
  max_annual_salary?: number | null
  salary_currency?: string | null
  technology_slugs?: string[] | null
  keyword_slugs?: string[] | null
  seniority?: string | null
}

export interface TheirStackSearchResult {
  jobs: ExtractedExternalJob[]
  rawReturnedCount: number
  skippedCount: number
  totalResults?: number | null
  creditsUsedEstimate: number
}

/**
 * Limpia dominios o URLs ingresadas por el usuario (ej. "https://uy.computrabajo.com/ofertas" -> "uy.computrabajo.com")
 */
export function normalizeDomainEntry(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ''
  try {
    const withProto = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`
    const parsed = new URL(withProto)
    return parsed.hostname.replace(/^www\./, '')
  } catch {
    return trimmed
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split('/')[0]
      .trim()
  }
}

/**
 * Clasifica automáticamente el rubro oficial de PostulaUY según título, industria y descripción
 */
function inferRubroFromTheirStackJob(job: TheirStackJobItem): string {
  const title = (job.job_title || job.normalized_title || '').toLowerCase()
  const industry = (job.company_object?.industry || '').toLowerCase()
  const desc = (job.description || '').slice(0, 1200).toLowerCase()
  const techs = (job.technology_slugs || []).join(' ').toLowerCase()
  const combined = `${title} ${industry} ${techs} ${desc}`

  if (
    /\b(desarrollador|developer|software|frontend|backend|fullstack|full-stack|full stack|devops|qa|tester|data|datos|sistemas|it|programador|analista funcional|cloud|cyber|seguridad inform[aá]tica|soporte t[eé]cnico|helpdesk|redes|sysadmin|react|node|python|java|\.net|aws|genexus)\b/i.test(
      title
    ) ||
    (job.technology_slugs && job.technology_slugs.length >= 2)
  ) {
    return 'Tecnología'
  }

  if (
    /\b(contador|contable|administrativ|facturaci[oó]n|finanzas|tesorer[ií]a|auditor|impuestos|secretari|recepcionista|backoffice|back office|auxiliar contable|gesti[oó]n)\b/i.test(
      title
    )
  ) {
    return 'Administración'
  }

  if (
    /\b(vendedor|ventas|comercial|cajer[oa]|repositor|reponedor|tienda|retail|promotor|ejecutivo de cuentas|asesor comercial|encargado de local|supermercado|sal[oó]n)\b/i.test(
      title
    )
  ) {
    return 'Comercio'
  }

  if (
    /\b(log[ií]stica|dep[oó]sito|almac[eé]n|chofer|conductor|repartidor|cadete|autoelevador|picking|supply chain|compras|abastecimiento|comercio exterior|aduana|despachante)\b/i.test(
      title
    )
  ) {
    return 'Logística'
  }

  if (
    /\b(atenci[oó]n al cliente|call center|telemarketing|customer|soporte al cliente|contact center|operador telef[oó]nico|recepci[oó]n)\b/i.test(
      title
    )
  ) {
    return 'Atención al Cliente'
  }

  if (
    /\b(marketing|community manager|redes sociales|dise[ñn]ador|publicidad|seo|sem|content|audiovisual|comunicaci[oó]n|brand|growth|copywriter)\b/i.test(
      title
    )
  ) {
    return 'Marketing'
  }

  if (
    /\b(recursos humanos|rrhh|hr|selecci[oó]n|recruiter|reclutador|talent|liquidaci[oó]n de sueldos|n[oó]mina|people|psic[oó]logo laboral)\b/i.test(
      title
    )
  ) {
    return 'Recursos Humanos'
  }

  if (
    /\b(cociner[oa]|gastronom[ií]a|mozo|camarer[oa]|barista|panader[oa]|reposter[oa]|ayudante de cocina|chef|bachero|restaurante|hotel)\b/i.test(
      title
    )
  ) {
    return 'Gastronomía'
  }

  if (
    /\b(enfermer[oa]|m[eé]dic[oa]|salud|farmacia|qu[ií]mic[oa]|laboratorio|acompa[ñn]ante|cuidador|odont[oó]logo|psic[oó]logo|fisioterapeuta|nutricionista)\b/i.test(
      title
    )
  ) {
    return 'Salud'
  }

  if (
    /\b(arquitect[oa]|ingenier[oa]|obra|construcci[oó]n|alba[ñn]il|electricista|sanitario|mantenimiento|t[eé]cnico electromec[aá]nico|mec[aá]nico|soldador|operario|planta|producci[oó]n|prevencionista)\b/i.test(
      title
    )
  ) {
    return 'Construcción'
  }

  if (/\b(docente|profesor|maestr[oa]|educaci[oó]n|tutor|capacitador|instructor)\b/i.test(title)) {
    return 'Educación'
  }

  if (combined.includes('software') || combined.includes('information technology')) {
    return 'Tecnología'
  }

  return 'General'
}

/**
 * Extrae y normaliza la zona/departamento de Uruguay a partir de los metadatos de ubicación
 */
function inferZonaFromTheirStackJob(job: TheirStackJobItem): string {
  const candidates = [
    job.short_location,
    job.location,
    job.long_location,
    ...(job.cities || []),
    ...(job.locations || []).map((l) => l.name || l.admin1_name || l.state || l.display_name || ''),
  ]
    .filter(Boolean)
    .map((s) => String(s).trim())

  const joined = candidates.join(' | ')

  const uruguayDepts = [
    'Montevideo',
    'Canelones',
    'Maldonado',
    'Punta del Este',
    'Ciudad de la Costa',
    'Las Piedras',
    'Pando',
    'Colonia',
    'Salto',
    'Paysandú',
    'Rivera',
    'Tacuarembó',
    'Cerro Largo',
    'Melo',
    'San José',
    'Soriano',
    'Mercedes',
    'Río Negro',
    'Fray Bentos',
    'Rocha',
    'Lavalleja',
    'Minas',
    'Florida',
    'Durazno',
    'Treinta y Tres',
    'Artigas',
    'Flores',
    'Trinidad',
  ]

  for (const dept of uruguayDepts) {
    if (new RegExp(`\\b${dept}\\b`, 'i').test(joined)) {
      return dept
    }
  }

  if (candidates.length > 0) {
    const firstClean = candidates[0]
      .replace(/,\s*Uruguay$/i, '')
      .replace(/\bDepartamento de\s+/i, '')
      .trim()
    if (firstClean && firstClean.toLowerCase() !== 'uruguay') {
      return firstClean.slice(0, 60)
    }
  }

  if (job.remote) {
    return 'Uruguay (Remoto)'
  }

  return 'Montevideo'
}

function inferModalidad(job: TheirStackJobItem): 'presencial' | 'remoto' | 'hibrido' {
  if (job.hybrid) return 'hibrido'
  if (job.remote) return 'remoto'
  const text = `${job.job_title || ''} ${(job.description || '').slice(0, 600)}`.toLowerCase()
  if (/\b(h[ií]brido|hybrid)\b/.test(text)) return 'hibrido'
  if (/\b(100%\s*remoto|teletrabajo|home\s*office|fully\s*remote)\b/.test(text)) return 'remoto'
  return 'presencial'
}

function inferTipoContrato(job: TheirStackJobItem): 'full-time' | 'part-time' | 'freelance' | 'pasantia' {
  const statuses = (job.employment_statuses || []).map((s) => s.toLowerCase())
  if (statuses.includes('internship')) return 'pasantia'
  if (statuses.includes('part_time')) return 'part-time'
  if (statuses.includes('contract') || statuses.includes('freelance') || statuses.includes('temporary')) {
    return 'freelance'
  }
  const title = (job.job_title || '').toLowerCase()
  if (/\b(pasant[ií]a|pasante|becario|trainee)\b/.test(title)) return 'pasantia'
  if (/\b(part[\s-]?time|medio\s*horario|4\s*hs|6\s*hs|media\s*jornada)\b/.test(title)) return 'part-time'
  return 'full-time'
}

function inferFuenteName(urlStr: string): string {
  if (!urlStr) return 'TheirStack'
  try {
    const host = new URL(urlStr).hostname.toLowerCase()
    if (host.includes('computrabajo')) return 'Computrabajo'
    if (host.includes('buscojobs')) return 'BuscoJobs'
    if (host.includes('smarttalent')) return 'SmartTalent'
    if (host.includes('linkedin')) return 'LinkedIn'
    if (host.includes('indeed')) return 'Indeed'
    if (host.includes('gallito')) return 'El Gallito'
    if (host.includes('bumeran')) return 'Bumeran'
    if (host.includes('workable')) return 'Workable'
    if (host.includes('greenhouse')) return 'Greenhouse'
    if (host.includes('lever')) return 'Lever'
    return host.replace(/^www\./, '')
  } catch {
    return 'TheirStack'
  }
}

export async function getTheirStackCreditBalance(customApiKey?: string): Promise<TheirStackCreditBalance | null> {
  const apiKey = (customApiKey || process.env.THEIRSTACK_API_KEY || '').trim()
  if (!apiKey || apiKey.includes('tu-theirstack')) return null

  try {
    const res = await fetch('https://api.theirstack.com/v0/billing/credit-balance', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const total = Number(data?.api_credits) || 0
    const used = Number(data?.used_api_credits) || 0
    return {
      api_credits: total,
      used_api_credits: used,
      remaining_api_credits: Math.max(total - used, 0),
      ui_credits: data?.ui_credits,
      used_ui_credits: data?.used_ui_credits,
      earliest_expiration: data?.earliest_expiration || null,
    }
  } catch {
    return null
  }
}

function buildTags(job: TheirStackJobItem, rubro: string): string[] {
  const rawSlugs = [...(job.technology_slugs || []), ...(job.keyword_slugs || [])]
  const cleanTags: string[] = []

  for (const slug of rawSlugs) {
    if (!slug || typeof slug !== 'string') continue
    const formatted = slug
      .split('-')
      .map((w) => (w.length <= 3 ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)))
      .join(' ')
    if (!cleanTags.includes(formatted)) {
      cleanTags.push(formatted)
    }
    if (cleanTags.length >= 5) break
  }

  if (cleanTags.length === 0) {
    cleanTags.push(rubro)
    if (job.seniority) {
      const senMap: Record<string, string> = {
        junior: 'Junior',
        mid_level: 'Semi Senior',
        senior: 'Senior',
        staff: 'Staff',
        c_level: 'Gerencial',
      }
      if (senMap[job.seniority]) cleanTags.push(senMap[job.seniority])
    }
  }

  return cleanTags.slice(0, 5)
}

export function mapTheirStackJobToExternalJob(job: TheirStackJobItem): ExtractedExternalJob {
  const rawTitle = (job.job_title || job.normalized_title || 'Vacante de Empleo').trim()
  const rawCompany = (
    job.company ||
    job.company_object?.name ||
    'Importante Empresa'
  ).trim()

  // Priorizar URL de Computrabajo, BuscoJobs o URL directa de la oferta (final_url / url)
  const candidateUrls = [job.final_url, job.url, job.source_url].filter(
    (u): u is string => Boolean(u && (u.startsWith('http://') || u.startsWith('https://')))
  )
  const preferredPortalUrl = candidateUrls.find(
    (u) =>
      u.toLowerCase().includes('computrabajo') ||
      u.toLowerCase().includes('buscojobs') ||
      u.toLowerCase().includes('smarttalent')
  )
  const chosenUrl = cleanUrl(preferredPortalUrl || candidateUrls[0] || '')

  const rubro = inferRubroFromTheirStackJob(job)
  const zona = inferZonaFromTheirStackJob(job)
  const modalidad = inferModalidad(job)
  const tipo_contrato = inferTipoContrato(job)
  const fuente = inferFuenteName(chosenUrl || job.source_url || job.url || '')

  let descripcion = (job.description || '').trim()
  if (!descripcion) {
    descripcion = `## Descripción del Puesto\nVacante para **${rawTitle}** en **${rawCompany}** (${zona}).\n\nPostulate directamente a través del enlace oficial de la oferta.`
  }

  let salario_rango: string | null = job.salary_string || null
  if (!salario_rango && (job.min_annual_salary || job.max_annual_salary)) {
    const curr = job.salary_currency || 'USD'
    if (job.min_annual_salary && job.max_annual_salary) {
      salario_rango = `${curr} ${job.min_annual_salary.toLocaleString()} - ${job.max_annual_salary.toLocaleString()} / año`
    } else if (job.min_annual_salary) {
      salario_rango = `Desde ${curr} ${job.min_annual_salary.toLocaleString()} / año`
    }
  }

  return {
    titulo: rawTitle,
    empresa_nombre: rawCompany,
    empresa_logo: job.company_object?.logo || null,
    descripcion,
    rubro,
    zona,
    modalidad,
    tipo_contrato,
    salario_rango,
    tags: buildTags(job, rubro),
    url_postulacion_externa: chosenUrl,
    fuente,
  }
}

/**
 * Convierte la descripción HTML/texto de un JobPosting JSON-LD de Computrabajo en Markdown limpio
 */
function formatComputrabajoDescription(rawDesc: string): string {
  if (!rawDesc) return ''
  let text = rawDesc
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n\s*·\s*/g, '\n\n### ')
    .replace(/-\s*Requerimientos\s*-/gi, '\n\n## Requisitos\n-')
    .replace(/\nPalabras clave:.*$/is, '')
    .trim()

  if (!text.startsWith('#')) {
    text = `## Descripción de la Vacante\n\n${text}`
  }
  return text
}

/**
 * Extrae vacantes directamente desde Computrabajo (ej. https://uy.computrabajo.com)
 * leyendo su estructura oficial JSON-LD (JobPosting) sin bloqueos y sin gastar créditos de API.
 */
export async function fetchComputrabajoDirectJobs(
  params: TheirStackSearchFilterParams
): Promise<{ jobs: ExtractedExternalJob[]; rawDiscoveredCount: number; preSkippedCount: number }> {
  const countryMap: Record<string, { subdomain: string; defaultPath: string }> = {
    UY: { subdomain: 'uy', defaultPath: '/empleos-en-montevideo' },
    AR: { subdomain: 'ar', defaultPath: '/empleos-en-buenos-aires-gba' },
    CL: { subdomain: 'cl', defaultPath: '/empleos-en-rmetropolitana' },
    CO: { subdomain: 'co', defaultPath: '/empleos-en-bogota-dc' },
    PE: { subdomain: 'pe', defaultPath: '/empleos-en-lima' },
    MX: { subdomain: 'mx', defaultPath: '/empleos-en-ciudad-de-mexico' },
    ES: { subdomain: 'es', defaultPath: '/empleos-en-madrid' },
  }

  const firstCountry = (params.countryCodes?.[0] || 'UY').toUpperCase()
  const cfg = countryMap[firstCountry] || countryMap.UY
  const baseUrl = `https://${cfg.subdomain}.computrabajo.com`
  const pageNum = Math.max(Number(params.page) || 0, 0) + 1
  const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 30)

  // Construir URLs de búsqueda en Computrabajo según los filtros de cargo o ubicación
  const searchPaths: string[] = []
  const cleanTitles = (params.jobTitles || []).map((t) => t.trim()).filter(Boolean)

  if (cleanTitles.length > 0) {
    for (const title of cleanTitles.slice(0, 3)) {
      const slug = slugify(title)
      if (slug) {
        searchPaths.push(`/trabajo-de-${slug}${pageNum > 1 ? `?p=${pageNum}` : ''}`)
      }
    }
  }

  if (searchPaths.length === 0) {
    searchPaths.push(`${cfg.defaultPath}${pageNum > 1 ? `?p=${pageNum}` : ''}`)
    if (firstCountry === 'UY' && pageNum === 1) {
      searchPaths.push('/empleos-en-canelones')
    }
  }

  const discoveredOfferUrls = new Set<string>()
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-UY,es;q=0.9,en;q=0.8',
  }

  await Promise.allSettled(
    searchPaths.map(async (path) => {
      const res = await fetch(`${baseUrl}${path}`, {
        headers,
        signal: AbortSignal.timeout(7000),
      })
      if (!res.ok) return
      const html = await res.text()
      const matches = html.match(/\/ofertas-de-trabajo\/oferta-de-trabajo-[a-zA-Z0-9_-]+/g) || []
      for (const rel of matches) {
        discoveredOfferUrls.add(cleanUrl(`${baseUrl}${rel}`))
      }
    })
  )

  const allOfferUrls = Array.from(discoveredOfferUrls)
  if (allOfferUrls.length === 0) {
    return { jobs: [], rawDiscoveredCount: 0, preSkippedCount: 0 }
  }

  // Filtrar previamente contra Supabase las URLs ya publicadas para no descargarlas de nuevo
  // y poder completar el cupo `limit` con ofertas realmente nuevas de la página
  let candidateOfferUrls = allOfferUrls
  let preSkippedCount = 0

  if (params.skipExisting !== false) {
    const service = getServiceClient()
    if (service) {
      try {
        const { data: existing } = await service
          .from('jobs')
          .select('url_postulacion_externa')
          .in('url_postulacion_externa', allOfferUrls)

        if (existing && existing.length > 0) {
          const existingSet = new Set(existing.map((e) => cleanUrl(e.url_postulacion_externa || '')))
          candidateOfferUrls = allOfferUrls.filter((u) => {
            if (existingSet.has(cleanUrl(u))) {
              preSkippedCount++
              return false
            }
            return true
          })
        }
      } catch (err) {
        console.warn('[ComputrabajoDirect] Error verificando URLs existentes:', err)
      }
    }
  }

  if (candidateOfferUrls.length === 0) {
    return {
      jobs: [],
      rawDiscoveredCount: preSkippedCount,
      preSkippedCount,
    }
  }

  // Tomar un margen extra para aplicar filtros de empresa/descripción si fueron indicados
  const hasExtraFilters =
    (params.companyNames && params.companyNames.length > 0) ||
    (params.descriptionKeywords && params.descriptionKeywords.length > 0) ||
    (params.workplaceTypes && params.workplaceTypes.length > 0)

  const urlsToFetch = candidateOfferUrls.slice(0, hasExtraFilters ? Math.min(limit * 2, 24) : limit)
  const extractedJobs: ExtractedExternalJob[] = []

  const detailResponses = await Promise.allSettled(
    urlsToFetch.map(async (offerUrl) => {
      const res = await fetch(offerUrl, {
        headers,
        signal: AbortSignal.timeout(7000),
      })
      if (!res.ok) return null
      const html = await res.text()
      return { offerUrl, html }
    })
  )

  for (const item of detailResponses) {
    if (item.status !== 'fulfilled' || !item.value) continue
    const { offerUrl, html } = item.value

    const ldMatches = html.match(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || []
    let jobPosting: any = null

    for (const block of ldMatches) {
      const inner = block.replace(/^<script[^>]*>/i, '').replace(/<\/script>$/i, '').trim()
      try {
        const parsed = JSON.parse(inner)
        const graph = Array.isArray(parsed?.['@graph']) ? parsed['@graph'] : [parsed]
        const found = graph.find((node: any) => node?.['@type'] === 'JobPosting')
        if (found) {
          jobPosting = found
          break
        }
      } catch {}
    }

    if (!jobPosting || !jobPosting.title) continue

    const rawTitle = String(jobPosting.title).trim()
    const rawCompany = String(jobPosting.hiringOrganization?.name || 'Importante Empresa').trim()
    const rawLogo = jobPosting.hiringOrganization?.logo || null
    const rawDesc = String(jobPosting.description || '')
    const locality =
      jobPosting.jobLocation?.address?.addressLocality ||
      jobPosting.jobLocation?.address?.addressRegion ||
      'Montevideo'

    const empType = String(jobPosting.employmentType || 'FULL_TIME').toUpperCase()
    const employmentStatuses =
      empType === 'PART_TIME'
        ? ['part_time']
        : empType === 'INTERN'
        ? ['internship']
        : empType === 'CONTRACTOR' || empType === 'TEMPORARY'
        ? ['contract']
        : ['full_time']

    // Extraer palabras clave del final de la descripción de Computrabajo si existen
    const kwMatch = rawDesc.match(/Palabras clave:\s*([^\n<]+)/i)
    const rawKeywords = kwMatch
      ? kwMatch[1]
          .split(',')
          .map((k) => k.trim())
          .filter((k) => k.length > 2 && !/^[a-z]+$/i.test(k) === false)
          .slice(0, 4)
      : []

    const pseudoItem: TheirStackJobItem = {
      id: 0,
      job_title: rawTitle,
      company: rawCompany,
      company_object: {
        name: rawCompany,
        logo: rawLogo,
        industry: jobPosting.industry || null,
      },
      url: offerUrl,
      final_url: offerUrl,
      source_url: offerUrl,
      description: formatComputrabajoDescription(rawDesc),
      date_posted: jobPosting.datePosted || null,
      location: locality,
      short_location: locality,
      employment_statuses: employmentStatuses,
      keyword_slugs: rawKeywords,
    }

    const mapped = mapTheirStackJobToExternalJob(pseudoItem)
    mapped.fuente = 'Computrabajo'

    // Filtrar por empresa si el usuario especificó companyNames
    if (params.companyNames && params.companyNames.length > 0) {
      const matchesCompany = params.companyNames.some((c) =>
        mapped.empresa_nombre.toLowerCase().includes(c.toLowerCase())
      )
      if (!matchesCompany) continue
    }

    // Filtrar por palabras en descripción si el usuario especificó descriptionKeywords
    if (params.descriptionKeywords && params.descriptionKeywords.length > 0) {
      const fullText = `${mapped.titulo} ${mapped.descripcion}`.toLowerCase()
      const matchesDesc = params.descriptionKeywords.some((w) => fullText.includes(w.toLowerCase()))
      if (!matchesDesc) continue
    }

    // Filtrar por modalidad si el usuario especificó workplaceTypes
    if (params.workplaceTypes && params.workplaceTypes.length > 0) {
      const wpMap: Record<string, string> = {
        on_site: 'presencial',
        remote: 'remoto',
        hybrid: 'hibrido',
      }
      const allowedModalidades = params.workplaceTypes.map((w) => wpMap[w])
      if (!allowedModalidades.includes(mapped.modalidad)) continue
    }

    extractedJobs.push(mapped)
    if (extractedJobs.length >= limit) break
  }

  return {
    jobs: extractedJobs,
    rawDiscoveredCount: extractedJobs.length + preSkippedCount,
    preSkippedCount,
  }
}

/**
 * Consulta el endpoint POST https://api.theirstack.com/v1/jobs/search (search_jobs_v1)
 * y lo combina con extracción directa JSON-LD de Computrabajo cuando corresponde.
 */
export async function searchTheirStackJobs(
  params: TheirStackSearchFilterParams
): Promise<TheirStackSearchResult> {
  const apiKey = (params.apiKey || process.env.THEIRSTACK_API_KEY || '').trim()
  const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 50)
  const page = Math.max(Number(params.page) || 0, 0)
  const postedAtMaxAgeDays = Math.min(Math.max(Number(params.postedAtMaxAgeDays) || 14, 1), 90)
  const sourcePortal = params.sourcePortal || 'all_uy'

  // Normalizar dominios personalizados (quita https://, www., rutas, etc.)
  const cleanedCustomDomains = (params.customDomains || [])
    .map((d) => normalizeDomainEntry(d))
    .filter(Boolean)

  // Determinar si el usuario está pidiendo explícitamente Computrabajo (ya sea en el selector o en dominios personalizados)
  const isCustomComputrabajo =
    sourcePortal === 'custom' &&
    cleanedCustomDomains.some((d) => d.includes('computrabajo'))

  const wantsComputrabajoDirect =
    sourcePortal === 'computrabajo' ||
    sourcePortal === 'portales_uy' ||
    isCustomComputrabajo

  let collectedJobs: ExtractedExternalJob[] = []
  let rawReturnedCount = 0
  let preSkippedTotal = 0
  let creditsUsedEstimate = 0

  // 1. Si el usuario seleccionó Computrabajo o puso uy.computrabajo.com en dominios personalizados,
  // extraer directamente las vacantes estructuradas de Computrabajo (JSON-LD)
  if (wantsComputrabajoDirect) {
    try {
      const directCt = await fetchComputrabajoDirectJobs(params)
      if (directCt.jobs.length > 0 || directCt.preSkippedCount > 0) {
        collectedJobs.push(...directCt.jobs)
        rawReturnedCount += directCt.rawDiscoveredCount
        preSkippedTotal += directCt.preSkippedCount
      }
    } catch (ctErr) {
      console.warn('[ComputrabajoDirect] Error al extraer directamente de Computrabajo:', ctErr)
    }
  }

  // 2. Consultar TheirStack API si aún necesitamos completar hasta `limit` o si el modo no era exclusivamente Computrabajo ya satisfecho
  const remainingNeeded = Math.max(limit - collectedJobs.length, 0)
  const shouldCallTheirStack =
    Boolean(apiKey) &&
    remainingNeeded > 0 &&
    !(sourcePortal === 'computrabajo' && collectedJobs.length >= limit) &&
    !(isCustomComputrabajo && cleanedCustomDomains.length === 1 && collectedJobs.length >= limit)

  if (shouldCallTheirStack) {
    const payload: Record<string, any> = {
      posted_at_max_age_days: postedAtMaxAgeDays,
      limit: remainingNeeded,
      page,
      is_closed: false,
    }

    const countries = (params.countryCodes || ['UY']).map((c) => c.trim().toUpperCase()).filter(Boolean)
    if (countries.length > 0 && !countries.includes('ALL')) {
      payload.job_country_code_or = countries
    }

    if (sourcePortal === 'computrabajo') {
      payload.url_domain_or = ['computrabajo.com', 'uy.computrabajo.com', 'computrabajo.com.uy']
    } else if (sourcePortal === 'portales_uy') {
      payload.url_domain_or = [
        'computrabajo.com',
        'uy.computrabajo.com',
        'computrabajo.com.uy',
        'buscojobs.com.uy',
        'buscojobs.com',
        'indeed.com',
        'smarttalent.uy',
      ]
    } else if (sourcePortal === 'custom' && cleanedCustomDomains.length > 0) {
      // Expandir subdominios como "uy.computrabajo.com" para incluir también el dominio raíz "computrabajo.com"
      const expandedDomains = new Set<string>()
      for (const dom of cleanedCustomDomains) {
        expandedDomains.add(dom)
        const parts = dom.split('.')
        if (parts.length >= 3 && parts[0].length === 2) {
          expandedDomains.add(parts.slice(1).join('.'))
        }
      }
      payload.url_domain_or = Array.from(expandedDomains)
    }

    if (params.jobTitles && params.jobTitles.length > 0) {
      const cleanTitles = params.jobTitles.map((t) => t.trim()).filter(Boolean)
      if (cleanTitles.length > 0) {
        payload.job_title_or = cleanTitles
      }
    }

    if (params.descriptionKeywords && params.descriptionKeywords.length > 0) {
      const cleanWords = params.descriptionKeywords.map((w) => w.trim()).filter(Boolean)
      if (cleanWords.length > 0) {
        payload.job_description_contains_or = cleanWords
      }
    }

    if (params.companyNames && params.companyNames.length > 0) {
      const cleanCompanies = params.companyNames.map((c) => c.trim()).filter(Boolean)
      if (cleanCompanies.length > 0) {
        payload.company_name_partial_match_or = cleanCompanies
      }
    }

    if (params.workplaceTypes && params.workplaceTypes.length > 0) {
      payload.workplace_types_or = params.workplaceTypes
    }

    const res = await fetch('https://api.theirstack.com/v1/jobs/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    })

    if (!res.ok && collectedJobs.length === 0) {
      const errText = await res.text().catch(() => '')
      let detail = errText
      try {
        const parsed = JSON.parse(errText)
        detail = parsed?.detail || parsed?.message || parsed?.error || errText
        if (typeof detail === 'object') {
          detail = JSON.stringify(detail)
        }
      } catch {}

      if (res.status === 401 || res.status === 403) {
        throw new Error(`API Key de TheirStack inválida o sin permisos (HTTP ${res.status}). Verifica tu token.`)
      }
      if (res.status === 402) {
        throw new Error(
          `Sin créditos disponibles en tu cuenta de TheirStack (HTTP 402). Revisa tu balance en app.theirstack.com.`
        )
      }
      throw new Error(`Error en TheirStack API (HTTP ${res.status}): ${detail || res.statusText}`)
    }

    if (res.ok) {
      const json = await res.json()
      let rawData: TheirStackJobItem[] = Array.isArray(json?.data) ? json.data : []

      // Si devolvió 0 con url_domain_or estricto y aún no tenemos empleos, hacer fallback al país completo
      if (rawData.length === 0 && collectedJobs.length === 0 && payload.url_domain_or) {
        const fallbackPayload = { ...payload }
        delete fallbackPayload.url_domain_or

        const fallbackRes = await fetch('https://api.theirstack.com/v1/jobs/search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(fallbackPayload),
          signal: AbortSignal.timeout(25000),
        })

        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json()
          if (Array.isArray(fallbackJson?.data) && fallbackJson.data.length > 0) {
            rawData = fallbackJson.data
          }
        }
      }

      creditsUsedEstimate += rawData.length
      rawReturnedCount += rawData.length

      const tsMapped = rawData
        .map((item) => mapTheirStackJobToExternalJob(item))
        .filter((j) => Boolean(j.titulo && j.url_postulacion_externa))

      collectedJobs.push(...tsMapped)
    }
  } else if (!apiKey && collectedJobs.length === 0) {
    throw new Error(
      'Falta la API Key de TheirStack. Configura THEIRSTACK_API_KEY en tu archivo .env.local o ingrésala en el campo de configuración del panel.'
    )
  }

  // Deduplicar URLs y títulos repetidos dentro del mismo lote
  const seenUrls = new Set<string>()
  const seenTitleCompany = new Set<string>()
  const uniqueBatchJobs: ExtractedExternalJob[] = []
  for (const j of collectedJobs) {
    const key = cleanUrl(j.url_postulacion_externa)
    const tcKey = `${j.titulo.toLowerCase().trim()}|${j.empresa_nombre.toLowerCase().trim()}`
    if (!key || seenUrls.has(key) || seenTitleCompany.has(tcKey)) continue
    seenUrls.add(key)
    seenTitleCompany.add(tcKey)
    uniqueBatchJobs.push(j)
  }

  // Deduplicar contra vacantes ya publicadas en Supabase (por URL exacta y por Título + Empresa)
  let finalJobs = uniqueBatchJobs
  let skippedCount = preSkippedTotal

  if (params.skipExisting !== false && uniqueBatchJobs.length > 0) {
    const service = getServiceClient()
    if (service) {
      try {
        const candidateUrls = uniqueBatchJobs.map((j) => j.url_postulacion_externa).filter(Boolean)
        const candidateTitles = uniqueBatchJobs.map((j) => j.titulo).filter(Boolean)

        const [{ data: existingByUrl }, { data: existingByTitle }] = await Promise.all([
          candidateUrls.length > 0
            ? service.from('jobs').select('url_postulacion_externa').in('url_postulacion_externa', candidateUrls)
            : Promise.resolve({ data: [] as any[] }),
          candidateTitles.length > 0
            ? service.from('jobs').select('titulo, empresa_nombre').in('titulo', candidateTitles)
            : Promise.resolve({ data: [] as any[] }),
        ])

        const existingUrlSet = new Set(
          (existingByUrl || []).map((e: any) => cleanUrl(e.url_postulacion_externa || ''))
        )
        const existingTitleCompanySet = new Set(
          (existingByTitle || []).map(
            (e: any) =>
              `${String(e.titulo || '').toLowerCase().trim()}|${String(e.empresa_nombre || '').toLowerCase().trim()}`
          )
        )

        finalJobs = uniqueBatchJobs.filter((j) => {
          const urlKey = cleanUrl(j.url_postulacion_externa)
          const tcKey = `${j.titulo.toLowerCase().trim()}|${j.empresa_nombre.toLowerCase().trim()}`
          if (existingUrlSet.has(urlKey) || existingTitleCompanySet.has(tcKey)) {
            skippedCount++
            return false
          }
          return true
        })
      } catch (err) {
        console.warn('[TheirStack] No se pudo verificar duplicados en Supabase:', err)
      }
    }
  }

  return {
    jobs: finalJobs.slice(0, limit),
    rawReturnedCount,
    skippedCount,
    totalResults: rawReturnedCount,
    creditsUsedEstimate,
  }
}
