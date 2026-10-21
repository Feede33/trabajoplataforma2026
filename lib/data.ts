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
  zona: string | null
  horario: string | null
  whatsapp: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  contacto_whatsapp: string | null
  contacto_indicaciones: string | null
  salario: string | null
  descripcion: string
  raw_text: string
} {
  const raw_text = text.trim()
  // Limpiar códigos de rastreo web como "Cod.Web.298982761"
  const clean = raw_text.replace(/Cod\.Web\.\d+/gi, '').trim()

  // 1. Cargo (Detecta palabras en mayúscula al inicio típicas de clasificados o palabras clave)
  let cargo = ''
  const firstWordMatch = clean.match(/^([A-ZÁÉÍÓÚÑ]{3,}(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]{2,}){0,3})/i)
  const explicitCargoMatch = clean.match(/(?:cargo|puesto|vacante|buscamos|precisamos|se precisa|se necesita|se busca)\s*(?:a|para|de)?\s*[:]?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,35})/i)

  if (explicitCargoMatch) {
    cargo = explicitCargoMatch[1].trim()
  } else if (firstWordMatch) {
    cargo = firstWordMatch[1].trim()
  } else if (/chofer|chófer/i.test(clean)) cargo = 'Chofer de taxi'
  else if (/limpiavidrios/i.test(clean)) cargo = 'Limpiavidrios'
  else if (/manicura/i.test(clean)) cargo = 'Manicura'
  else if (/mec[aá]nico/i.test(clean)) cargo = 'Mecánico'
  else if (/carpintero/i.test(clean)) cargo = 'Carpintero'
  else if (/colorista/i.test(clean)) cargo = 'Colorista'
  else if (/cajera|cajero/i.test(clean)) cargo = 'Cajera'
  else if (/cocinero|cocinera|ayudante de cocina/i.test(clean)) cargo = 'Ayudante de cocina'
  else if (/cadete|delivery|repartidor/i.test(clean)) cargo = 'Cadete / Delivery'
  else cargo = 'Personal de trabajo'

  // Normalizar mayúscula inicial
  cargo = cargo.charAt(0).toUpperCase() + cargo.slice(1).trim()

  // 2. Canales de Contacto: Email
  let email: string | null = null
  const emailMatch = clean.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i)
  if (emailMatch) {
    email = emailMatch[0].trim()
  }

  // 3. Canales de Contacto: Dirección física para presentarse
  let direccion: string | null = null
  const dirMatch = clean.match(/(?:tratar|presentarse|dirigirse|acercarse)\s*(?:en|a)?\s*([^\n\.,;]+)/i)
  if (dirMatch) {
    direccion = dirMatch[1].trim()
  }

  // 4. Canales de Contacto: Teléfono y WhatsApp
  let whatsapp: string | null = null
  let telefono: string | null = null

  // Encontrar todos los números de teléfono (celulares 09... o teléfonos 8-9 dígitos)
  const phoneMatches = clean.match(/(?:(?:09|\+?598\s*9)\d[\s.-]?\d{3}[\s.-]?\d{3}|\b\d{8,9}\b)/g)

  if (phoneMatches && phoneMatches.length > 0) {
    const cleanedPhones = phoneMatches.map((p) => p.replace(/[\s.-]/g, ''))
    
    // Si dice explícitamente WhatsApp o Whapp
    const hasExplicitWhatsApp = /whapp|whatsapp|wpp|wapp/i.test(clean)

    if (hasExplicitWhatsApp) {
      whatsapp = cleanedPhones[0]
      if (cleanedPhones.length > 1) {
        telefono = cleanedPhones[1]
      }
    } else {
      // Si empieza con 09 es celular en Uruguay, puede usarse tanto WhatsApp como llamada
      if (cleanedPhones[0].startsWith('09')) {
        whatsapp = cleanedPhones[0]
        telefono = cleanedPhones.length > 1 ? cleanedPhones[1] : cleanedPhones[0]
      } else {
        telefono = cleanedPhones[0]
      }
    }
  }

  // 5. Indicaciones de contacto
  let contacto_indicaciones: string | null = null
  if (/no llamar/i.test(clean)) {
    contacto_indicaciones = 'Solo mensajes por WhatsApp (no llamar por favor)'
  } else if (/enviar foto de libreta/i.test(clean)) {
    contacto_indicaciones = 'Enviar foto de libreta de conducir al WhatsApp'
  } else if (/enviar cv|dejar cv/i.test(clean)) {
    contacto_indicaciones = email ? `Enviar CV a ${email}` : 'Enviar CV al contacto indicado'
  } else if (direccion) {
    contacto_indicaciones = `Tratar personalmente en ${direccion}`
  }

  // 6. Zona / Ubicación (ADAPTABLE: SOLO SI EL AVISO LA INDICA EXPLÍCITAMENTE)
  let zona: string | null = null
  const zonaExplicit = clean.match(/(?:zona\s*(?:del?|en)?|barrio)\s*[:]?\s*([a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{3,30})/i)
  if (zonaExplicit) {
    zona = zonaExplicit[1].replace(/para|con|todas|las|los|de|el/gi, '').trim()
  } else {
    // Buscar menciones específicas de barrios o localidades uruguayas
    const zonasConocidas = [
      'Paso Carrasco',
      'Paso Molino',
      'Piedras Blancas',
      'Pocitos',
      'Punta Carretas',
      'Centro',
      'Cordón',
      'La Unión',
      'Malvín',
      'Sayago',
      'Colón',
      'Cerro',
      'Pando',
      'Las Piedras',
      'Ciudad de la Costa',
      'Carrasco',
      'Buceo',
      'Maroñas',
      'Aguada',
      'Reducto',
      'Prado',
      'La Teja',
      'Montevideo'
    ]
    for (const z of zonasConocidas) {
      const reg = new RegExp(`\\b${z}\\b`, 'i')
      if (reg.test(clean)) {
        zona = z
        break
      }
    }
  }

  // 7. Horario / Turno (ADAPTABLE: SOLO SI EL AVISO LO INDICA)
  let horario: string | null = null
  const horarioMatch = clean.match(/(?:diurno\s*(?:o\s*)?nocturno|turno\s*(?:de|del)?\s*[^\n\.,;]{3,30}|horario\s*[:]?\s*[^\n\.,;]{3,30}|\d{1,2}(?::\d{2})?\s*(?:a|hasta)\s*\d{1,2}(?::\d{2})?\s*(?:am|pm|hs)?)/i)
  if (horarioMatch) {
    horario = horarioMatch[0].trim()
  }

  // 8. Salario (ADAPTABLE: SOLO SI EL AVISO LO INDICA)
  let salario: string | null = null
  const salarioMatch = clean.match(/\$\s*[\d\.]+/i)
  if (salarioMatch) {
    salario = salarioMatch[0].trim()
  }

  // 9. Rubro (Clasificación temática)
  let rubro = 'General'
  if (/taxi|ch[oó]fer|uber|flete|cadete|moto|delivery|repartidor/i.test(clean)) {
    rubro = 'Transporte y Choferes'
  } else if (/mec[aá]nico|lubricentro|taller|cambios de aceite|neum[aá]ticos/i.test(clean)) {
    rubro = 'Mecánica y Talleres'
  } else if (/carpintero|aluminio|vidrier[ií]a|aberturas|herramientas|alucriss|madera/i.test(clean)) {
    rubro = 'Oficios y Mantenimiento'
  } else if (/manicura|peluquer[ií]a|colorista|depiladora|est[eé]tica|barber[ií]a/i.test(clean)) {
    rubro = 'Belleza y Estética'
  } else if (/limpiavidrios|limpieza|dom[eé]stica|porter[ií]a/i.test(clean)) {
    rubro = 'Servicios y Limpieza'
  } else if (/comida|cocina|cajera|restaurante|bar|pizzer[ií]a|rotiser[ií]a/i.test(clean)) {
    rubro = 'Gastronomía'
  } else if (/tienda|minimarket|supermercado|almac[eé]n|kiosco|local/i.test(clean)) {
    rubro = 'Comercio'
  }

  // 10. Título claro y conciso
  let titulo = cargo
  if (zona) {
    titulo = `${cargo} (${zona})`
  }

  return {
    titulo,
    cargo,
    rubro,
    zona,
    horario,
    whatsapp,
    telefono,
    email,
    direccion,
    contacto_whatsapp: whatsapp,
    contacto_indicaciones,
    salario,
    descripcion: clean,
    raw_text,
  }
}

export function formatWhatsAppUrl(phone: string, jobTitle: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('09') && cleaned.length === 9) {
    cleaned = '598' + cleaned.substring(1)
  } else if (cleaned.startsWith('9') && cleaned.length === 8) {
    cleaned = '598' + cleaned
  }
  const msg = encodeURIComponent(`¡Hola! Vi el aviso de "${jobTitle}" en EmpleosYa y me gustaría comunicarme.`)
  return `https://wa.me/${cleaned}?text=${msg}`
}
