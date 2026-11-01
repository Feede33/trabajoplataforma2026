if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import { ExtractedExternalJob } from '@/lib/gemini'
import { cleanUrl } from '@/lib/crawler'
import { getServiceClient } from '@/lib/server/auth'

export interface TheirStackSearchFilterParams {
  apiKey?: string
  sourcePortal?: 'computrabajo' | 'all_uy' | 'custom'
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
 * Clasifica automáticamente el rubro oficial de PostulaUY según título, industria y descripción
 */
function inferRubroFromTheirStackJob(job: TheirStackJobItem): string {
  const title = (job.job_title || job.normalized_title || '').toLowerCase()
  const industry = (job.company_object?.industry || '').toLowerCase()
  const desc = (job.description || '').slice(0, 1200).toLowerCase()
  const techs = (job.technology_slugs || []).join(' ').toLowerCase()
  const combined = `${title} ${industry} ${techs} ${desc}`

  if (
    /\b(desarrollador|developer|software|frontend|backend|fullstack|full-stack|full stack|devops|qa|tester|data|datos|sistemas|it|programador|analista funcional|cloud|cyber|seguridad inform[aá]tica|soporte t[eé]cnico|helpdesk|redes|sysadmin|react|node|python|java|\.net|aws)\b/i.test(
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
    /\b(vendedor|ventas|comercial|cajer[oa]|repositor|tienda|retail|promotor|ejecutivo de cuentas|asesor comercial|encargado de local|supermercado)\b/i.test(
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
    /\b(recursos humanos|rrhh|hr|selecci[oó]n|recruiter|reclutador|talent|liquidaci[oó]n de sueldos|n[oó]mina|people)\b/i.test(
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
    /\b(arquitect[oa]|ingenier[oa] civil|obra|construcci[oó]n|alba[ñn]il|electricista|sanitario|mantenimiento|t[eé]cnico electromec[aá]nico|mec[aá]nico|soldador|operario|planta|producci[oó]n|prevencionista)\b/i.test(
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
 * Extrae y normaliza la zona/departamento de Uruguay a partir de los metadatos de ubicación de TheirStack
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
  if (!urlStr) return 'Computrabajo'
  try {
    const host = new URL(urlStr).hostname.toLowerCase()
    if (host.includes('computrabajo')) return 'Computrabajo'
    if (host.includes('buscojobs')) return 'BuscoJobs'
    if (host.includes('smarttalent')) return 'SmartTalent'
    if (host.includes('linkedin')) return 'LinkedIn'
    if (host.includes('gallito')) return 'El Gallito'
    if (host.includes('bumeran')) return 'Bumeran'
    return host.replace(/^www\./, '')
  } catch {
    return 'Computrabajo'
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

  // Priorizar URL de Computrabajo (source_url o url) o final_url
  const candidateUrls = [job.url, job.source_url, job.final_url].filter(
    (u): u is string => Boolean(u && (u.startsWith('http://') || u.startsWith('https://')))
  )
  const computrabajoUrl = candidateUrls.find((u) => u.toLowerCase().includes('computrabajo'))
  const chosenUrl = cleanUrl(computrabajoUrl || candidateUrls[0] || '')

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
 * Consulta el endpoint POST https://api.theirstack.com/v1/jobs/search (search_jobs_v1)
 */
export async function searchTheirStackJobs(
  params: TheirStackSearchFilterParams
): Promise<TheirStackSearchResult> {
  const apiKey = (params.apiKey || process.env.THEIRSTACK_API_KEY || '').trim()

  if (!apiKey) {
    throw new Error(
      'Falta la API Key de TheirStack. Configura THEIRSTACK_API_KEY en tu archivo .env.local o ingrésala en el campo de configuración del panel.'
    )
  }

  const limit = Math.min(Math.max(Number(params.limit) || 10, 1), 50)
  const page = Math.max(Number(params.page) || 0, 0)
  // Regla obligatoria de TheirStack: siempre enviar posted_at_max_age_days (por defecto 14 días)
  const postedAtMaxAgeDays = Math.min(Math.max(Number(params.postedAtMaxAgeDays) || 14, 1), 90)

  const payload: Record<string, any> = {
    posted_at_max_age_days: postedAtMaxAgeDays,
    limit,
    page,
    is_closed: false,
  }

  // Filtro de país (por defecto Uruguay: ["UY"])
  const countries = (params.countryCodes || ['UY']).map((c) => c.trim().toUpperCase()).filter(Boolean)
  if (countries.length > 0 && !countries.includes('ALL')) {
    payload.job_country_code_or = countries
  }

  // Filtro de dominio de origen (Computrabajo por defecto)
  const sourcePortal = params.sourcePortal || 'computrabajo'
  if (sourcePortal === 'computrabajo') {
    payload.url_domain_or = ['computrabajo.com', 'uy.computrabajo.com', 'computrabajo.com.uy']
  } else if (sourcePortal === 'custom' && params.customDomains && params.customDomains.length > 0) {
    payload.url_domain_or = params.customDomains.map((d) => d.trim().toLowerCase()).filter(Boolean)
  }

  // Filtro por título del puesto (job_title_or)
  if (params.jobTitles && params.jobTitles.length > 0) {
    const cleanTitles = params.jobTitles.map((t) => t.trim()).filter(Boolean)
    if (cleanTitles.length > 0) {
      payload.job_title_or = cleanTitles
    }
  }

  // Filtro por palabras clave en la descripción (job_description_contains_or)
  if (params.descriptionKeywords && params.descriptionKeywords.length > 0) {
    const cleanWords = params.descriptionKeywords.map((w) => w.trim()).filter(Boolean)
    if (cleanWords.length > 0) {
      payload.job_description_contains_or = cleanWords
    }
  }

  // Filtro por nombre de empresa (company_name_partial_match_or)
  if (params.companyNames && params.companyNames.length > 0) {
    const cleanCompanies = params.companyNames.map((c) => c.trim()).filter(Boolean)
    if (cleanCompanies.length > 0) {
      payload.company_name_partial_match_or = cleanCompanies
    }
  }

  // Filtro por modalidad (workplace_types_or: on_site, remote, hybrid)
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

  if (!res.ok) {
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

  const json = await res.json()
  const rawData: TheirStackJobItem[] = Array.isArray(json?.data) ? json.data : []

  const mappedJobs = rawData
    .map((item) => mapTheirStackJobToExternalJob(item))
    .filter((j) => Boolean(j.titulo && j.url_postulacion_externa))

  // Deduplicar contra vacantes ya publicadas en Supabase
  let finalJobs = mappedJobs
  let skippedCount = 0

  if (params.skipExisting !== false && mappedJobs.length > 0) {
    const service = getServiceClient()
    if (service) {
      try {
        const candidateUrls = mappedJobs.map((j) => j.url_postulacion_externa).filter(Boolean)
        if (candidateUrls.length > 0) {
          const { data: existing } = await service
            .from('jobs')
            .select('url_postulacion_externa')
            .in('url_postulacion_externa', candidateUrls)

          if (existing && existing.length > 0) {
            const existingSet = new Set(existing.map((e) => cleanUrl(e.url_postulacion_externa || '')))
            finalJobs = mappedJobs.filter((j) => {
              if (existingSet.has(cleanUrl(j.url_postulacion_externa))) {
                skippedCount++
                return false
              }
              return true
            })
          }
        }
      } catch (err) {
        console.warn('[TheirStack] No se pudo verificar duplicados en Supabase:', err)
      }
    }
  }

  return {
    jobs: finalJobs,
    rawReturnedCount: rawData.length,
    skippedCount,
    totalResults: json?.metadata?.total_results ?? null,
    creditsUsedEstimate: rawData.length,
  }
}
