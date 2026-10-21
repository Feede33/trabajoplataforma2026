import { isSupabaseConfigured, createClient } from './supabase/client'
import { MOCK_JOBS, MOCK_APPLICATIONS, MOCK_INFORMAL_JOBS } from './mock-data'
import { JobWithEmpresa, ApplicationWithDetails, Job, JobEstado, ApplicationEstado, InformalJob } from './supabase/database.types'

const LOCAL_STORAGE_JOBS_KEY = 'empleos_custom_jobs'
const LOCAL_STORAGE_APPS_KEY = 'empleos_custom_apps'
const LOCAL_STORAGE_INFORMAL_KEY = 'empleos_custom_informal_jobs'

function getStoredJobs(): JobWithEmpresa[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_JOBS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredJobs(jobs: JobWithEmpresa[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_JOBS_KEY, JSON.stringify(jobs))
  } catch {}
}

function getStoredApplications(): ApplicationWithDetails[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_APPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredApplications(apps: ApplicationWithDetails[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_APPS_KEY, JSON.stringify(apps))
  } catch {}
}

function getStoredInformalJobs(): InformalJob[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_INFORMAL_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredInformalJobs(jobs: InformalJob[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_INFORMAL_KEY, JSON.stringify(jobs))
  } catch {}
}

export async function fetchJobs(): Promise<JobWithEmpresa[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          empresa:profiles(nombre, avatar_url, website, ubicacion)
        `)
        .eq('estado', 'activo')
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return data as unknown as JobWithEmpresa[]
      }
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to local data', err)
    }
  }

  // Fallback to mock + local storage
  const custom = getStoredJobs()
  return [...custom, ...MOCK_JOBS]
}

export async function fetchJobsByEmpresa(empresaId: string): Promise<JobWithEmpresa[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          empresa:profiles(nombre, avatar_url, website, ubicacion)
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as unknown as JobWithEmpresa[]
      }
    } catch (err) {
      console.warn('Supabase fetch company jobs failed', err)
    }
  }

  const custom = getStoredJobs()
  const companyCustom = custom.filter((j) => j.empresa_id === empresaId)
  if (companyCustom.length > 0) return companyCustom
  return MOCK_JOBS
}

export async function fetchJobBySlug(slug: string): Promise<JobWithEmpresa | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          empresa:profiles(nombre, avatar_url, website, ubicacion)
        `)
        .eq('slug', slug)
        .single()

      if (!error && data) {
        return data as unknown as JobWithEmpresa
      }
    } catch (err) {
      console.warn('Supabase fetch by slug failed, checking mock data', err)
    }
  }

  const custom = getStoredJobs()
  const all = [...custom, ...MOCK_JOBS]
  return all.find((j) => j.slug === slug) || null
}

export async function createJob(jobData: Omit<Job, 'id' | 'created_at' | 'updated_at'>, empresaNombre: string): Promise<JobWithEmpresa> {
  const newJob: JobWithEmpresa = {
    ...jobData,
    id: 'job-' + Date.now(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    empresa: {
      nombre: empresaNombre || 'Mi Empresa',
      avatar_url: 'https://images.unsplash.com/photo-1549923746-c502d488b3ea?auto=format&fit=crop&w=120&h=120&q=80',
      website: '',
      ubicacion: jobData.zona,
    }
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('jobs').insert([jobData]).select().single()
      if (!error && data) {
        return {
          ...data,
          empresa: newJob.empresa,
        } as unknown as JobWithEmpresa
      }
    } catch (err) {
      console.warn('Supabase insert failed, saving locally', err)
    }
  }

  const existing = getStoredJobs()
  saveStoredJobs([newJob, ...existing])
  return newJob
}

export async function toggleJobState(jobId: string, newState: JobEstado): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('jobs').update({ estado: newState }).eq('id', jobId)
      if (!error) return true
    } catch {}
  }

  const existing = getStoredJobs()
  const updated = existing.map((j) => (j.id === jobId ? { ...j, estado: newState } : j))
  saveStoredJobs(updated)
  return true
}

export async function fetchApplicationsForEmpresa(empresaId?: string): Promise<ApplicationWithDetails[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(titulo, slug),
          candidato:profiles(nombre, email, cv_url, bio, ubicacion)
        `)
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as unknown as ApplicationWithDetails[]
      }
    } catch (err) {
      console.warn('Supabase fetch applications failed', err)
    }
  }

  const custom = getStoredApplications()
  return [...custom, ...MOCK_APPLICATIONS]
}

export async function fetchApplicationsForCandidate(candidatoId: string): Promise<ApplicationWithDetails[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(titulo, slug),
          candidato:profiles(nombre, email, cv_url, bio, ubicacion)
        `)
        .eq('candidato_id', candidatoId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        return data as unknown as ApplicationWithDetails[]
      }
    } catch (err) {}
  }

  const custom = getStoredApplications()
  return [...custom, ...MOCK_APPLICATIONS]
}

export async function uploadCV(file: File, userId: string): Promise<string> {
  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const fileExt = file.name.split('.').pop() || 'pdf'
    const fileName = `${userId}/${Date.now()}.${fileExt}`

    const { data, error } = await supabase.storage
      .from('cvs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (error) {
      console.error('Error subiendo CV a Supabase Storage:', error)
      throw new Error(`Error al subir el CV: ${error.message}`)
    }

    const { data: publicData } = supabase.storage
      .from('cvs')
      .getPublicUrl(data.path)

    return publicData.publicUrl
  }

  return URL.createObjectURL(file)
}

export async function submitApplication(data: {
  job_id: string
  job_titulo: string
  job_slug: string
  candidato_id: string
  candidato_nombre: string
  candidato_email: string
  mensaje: string
  cv_url?: string
}): Promise<ApplicationWithDetails> {
  const newApp: ApplicationWithDetails = {
    id: 'app-' + Date.now(),
    job_id: data.job_id,
    candidato_id: data.candidato_id,
    mensaje: data.mensaje,
    estado: 'pendiente',
    created_at: new Date().toISOString(),
    job: {
      titulo: data.job_titulo,
      slug: data.job_slug,
    },
    candidato: {
      nombre: data.candidato_nombre,
      email: data.candidato_email,
      cv_url: data.cv_url || null,
      bio: '',
      ubicacion: 'Argentina',
    }
  }

  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const { data: inserted, error } = await supabase
      .from('applications')
      .insert([{
        job_id: data.job_id,
        candidato_id: data.candidato_id,
        mensaje: data.mensaje,
      }])
      .select()
      .single()

    if (error) {
      console.error('Error insertando postulación en Supabase:', error)
      if (error.code === '23505' || error.message?.includes('unique_job_candidato')) {
        throw new Error('Ya te has postulado a este empleo anteriormente.')
      }
      throw new Error(error.message || 'No se pudo registrar la postulación.')
    }

    if (inserted) {
      return {
        ...inserted,
        job: newApp.job,
        candidato: newApp.candidato,
      } as unknown as ApplicationWithDetails
    }
  }

  const existing = getStoredApplications()
  saveStoredApplications([newApp, ...existing])
  return newApp
}

export async function updateApplicationStatus(appId: string, nuevoEstado: ApplicationEstado): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('applications').update({ estado: nuevoEstado }).eq('id', appId)
      if (!error) return true
    } catch {}
  }

  const existing = getStoredApplications()
  const updated = existing.map((a) => (a.id === appId ? { ...a, estado: nuevoEstado } : a))
  saveStoredApplications(updated)
  return true
}

export async function fetchInformalJobs(): Promise<InformalJob[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('informal_jobs')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return data as InformalJob[]
      }
    } catch (err) {
      console.warn('Error al consultar informal_jobs en Supabase, usando respaldo local:', err)
    }
  }

  const custom = getStoredInformalJobs()
  return [...custom, ...MOCK_INFORMAL_JOBS]
}

export async function createInformalJob(
  jobData: Omit<InformalJob, 'id' | 'created_at' | 'updated_at'>
): Promise<InformalJob> {
  const newJob: InformalJob = {
    ...jobData,
    id: 'inf-' + Date.now(),
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('informal_jobs')
        .insert([jobData])
        .select()
        .single()

      if (!error && data) {
        return data as InformalJob
      } else if (error) {
        console.warn('Error insertando informal_job en Supabase, guardando en local:', error)
      }
    } catch (err) {
      console.warn('Fallo de red con Supabase al crear empleo informal:', err)
    }
  }

  const existing = getStoredInformalJobs()
  saveStoredInformalJobs([newJob, ...existing])
  return newJob
}

export function parseInformalJobWithAI(text: string): {
  titulo: string
  cargo: string
  rubro: string
  zona: string
  horario: string
  contacto_whatsapp: string
  contacto_indicaciones: string
  descripcion: string
  raw_text: string
} {
  const clean = text.trim()

  // 1. Cargo
  let cargo = ''
  const cargoMatch = clean.match(/(?:cargo|puesto|vacante|buscamos|precisamos|necesitamos)\s*(?:a|para|de)?\s*[:]?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,35})/i)
  if (cargoMatch) {
    cargo = cargoMatch[1].trim()
  } else if (/cajera|cajero/i.test(clean)) cargo = 'Cajera'
  else if (/cocinero|cocinera|ayudante de cocina/i.test(clean)) cargo = 'Ayudante de Cocina'
  else if (/mozo|moza|camarero/i.test(clean)) cargo = 'Mozo / Camarero'
  else if (/cadete|delivery|repartidor/i.test(clean)) cargo = 'Cadete / Delivery'
  else if (/limpieza/i.test(clean)) cargo = 'Personal de Limpieza'
  else if (/atenci[oó]n/i.test(clean)) cargo = 'Atención al Cliente'
  else cargo = 'Personal General'

  cargo = cargo.charAt(0).toUpperCase() + cargo.slice(1).toLowerCase()

  // 2. Zona / Barrio
  let zona = ''
  const zonaMatch = clean.match(/(?:zona\s*(?:del?|en)?|ubicad[oa]\s*en|barrio)\s*[:]?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,35})/i)
  if (zonaMatch) {
    zona = zonaMatch[1].replace(/para|turno|con|de|el|la|los/gi, '').trim()
  }
  if (!zona) {
    if (/paso molino/i.test(clean)) zona = 'Paso Molino'
    else if (/pocitos/i.test(clean)) zona = 'Pocitos'
    else if (/centro/i.test(clean)) zona = 'Centro'
    else if (/cord[oó]n/i.test(clean)) zona = 'Cordón'
    else if (/uni[oó]n/i.test(clean)) zona = 'La Unión'
    else if (/malv[ií]n/i.test(clean)) zona = 'Malvín'
    else if (/carrasco/i.test(clean)) zona = 'Carrasco'
    else zona = 'Montevideo'
  }

  // 3. Horario / Turno
  let horario = ''
  const horarioMatch = clean.match(/(?:turno|horario)\s*[:]?\s*([^\n\.,;]{4,50})/i)
  if (horarioMatch) {
    horario = horarioMatch[1].trim()
  } else {
    const timeMatch = clean.match(/\d{1,2}(?::\d{2})?\s*(?:a|hasta)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|hs)?/i)
    if (timeMatch) horario = timeMatch[0].trim()
  }

  // 4. Contacto WhatsApp
  let contacto_whatsapp = ''
  const phoneMatch = clean.match(/(?:(?:09|\+?598\s*9)\d[\s.-]?\d{3}[\s.-]?\d{3}|\d{8,9})/)
  if (phoneMatch) {
    contacto_whatsapp = phoneMatch[0].replace(/[\s.-]/g, '')
  }

  // 5. Indicaciones
  let contacto_indicaciones = 'Contactar directamente por WhatsApp'
  if (/no llamar/i.test(clean)) {
    contacto_indicaciones = 'WhatsApp únicamente (no llamar por favor)'
  }

  // 6. Rubro
  let rubro = 'Comercio y Gastronomía'
  if (/comida|restaurante|bar|pizzer[ií]a|rotiser[ií]a|cocina|cafeter[ií]a|local de comidas/i.test(clean)) {
    rubro = 'Gastronomía'
  } else if (/cadete|moto|delivery|reparto|env[ií]os/i.test(clean)) {
    rubro = 'Logística y Envíos'
  } else if (/tienda|minimarket|supermercado|almac[eé]n|kiosco|local/i.test(clean)) {
    rubro = 'Comercio'
  } else if (/limpieza|dom[eé]stico/i.test(clean)) {
    rubro = 'Servicios y Limpieza'
  }

  // 7. Título atractivo
  let titulo = `${cargo} para ${rubro.toLowerCase()}`
  if (zona) {
    titulo = `${cargo} en ${zona}`
  }

  return {
    titulo,
    cargo,
    rubro,
    zona,
    horario: horario || 'A convenir con el empleador',
    contacto_whatsapp,
    contacto_indicaciones,
    descripcion: clean,
    raw_text: clean,
  }
}

export function formatWhatsAppUrl(phone: string, jobTitle: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('09') && cleaned.length === 9) {
    cleaned = '598' + cleaned.substring(1)
  } else if (cleaned.startsWith('9') && cleaned.length === 8) {
    cleaned = '598' + cleaned
  }
  const msg = encodeURIComponent(`¡Hola! Vi el aviso de "${jobTitle}" en EmpleosYa y me gustaría postularme.`)
  return `https://wa.me/${cleaned}?text=${msg}`
}
