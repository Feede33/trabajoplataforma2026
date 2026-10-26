import { isSupabaseConfigured, createClient } from './supabase/client'
import { MOCK_JOBS, MOCK_APPLICATIONS, MOCK_INFORMAL_JOBS } from './mock-data'
import { JobWithEmpresa, ApplicationWithDetails, Job, JobEstado, ApplicationEstado, InformalJob, CompanyContact, SavedJob } from './supabase/database.types'
export type { CompanyContact, SavedJob } from './supabase/database.types'

const LOCAL_STORAGE_JOBS_KEY = 'empleos_custom_jobs'
const LOCAL_STORAGE_APPS_KEY = 'empleos_custom_apps'
const LOCAL_STORAGE_INFORMAL_KEY = 'empleos_custom_informal_jobs'
const LOCAL_STORAGE_CONTACTS_KEY = 'empleos_custom_company_contacts'
const LOCAL_STORAGE_SAVED_JOBS_KEY = 'empleos_saved_jobs'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(value?: string | null): boolean {
  return !!value && UUID_REGEX.test(value.trim())
}

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
  } catch { }
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
  } catch { }
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
  } catch { }
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
  const custom = getStoredJobs().filter((j) => j.empresa_id === empresaId)

  if (isSupabaseConfigured() && isValidUUID(empresaId)) {
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
        const dbJobs = data as unknown as JobWithEmpresa[]
        const merged = [...dbJobs, ...custom.filter((c) => !dbJobs.some((d) => d.id === c.id))]
        return merged
      }
    } catch (err) {
      console.warn('Supabase fetch company jobs failed', err)
    }
  }

  if (custom.length > 0) return custom
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

  if (isSupabaseConfigured() && isValidUUID(jobData.empresa_id)) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from('jobs').insert([jobData]).select().single()
      if (!error && data) {
        return {
          ...data,
          empresa: newJob.empresa,
        } as unknown as JobWithEmpresa
      }

      // Límites del plan: la base de datos rechaza la publicación y no debe guardarse localmente
      const message = error?.message || ''
      if (message.includes('QUOTA_EXCEEDED')) {
        const quotaError = new Error('Alcanzaste el límite de avisos de tu plan este mes.')
          ; (quotaError as any).code = 'QUOTA_EXCEEDED'
        throw quotaError
      }
      if (message.includes('ROLE_NOT_ALLOWED')) {
        const roleError = new Error('Solo las cuentas de Empresa pueden publicar empleos.')
          ; (roleError as any).code = 'ROLE_NOT_ALLOWED'
        throw roleError
      }
    } catch (err: any) {
      if (err?.code === 'QUOTA_EXCEEDED' || err?.code === 'ROLE_NOT_ALLOWED') throw err
      console.warn('Supabase insert failed, saving locally', err)
    }
  }

  const existing = getStoredJobs()
  saveStoredJobs([newJob, ...existing])
  return newJob
}

export async function toggleJobState(jobId: string, newState: JobEstado): Promise<boolean> {
  if (isSupabaseConfigured() && isValidUUID(jobId)) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('jobs').update({ estado: newState }).eq('id', jobId)
      if (!error) return true
    } catch { }
  }

  const existing = getStoredJobs()
  const updated = existing.map((j) => (j.id === jobId ? { ...j, estado: newState } : j))
  saveStoredJobs(updated)
  return true
}

export async function updateJob(
  jobId: string,
  updates: Partial<Omit<Job, 'id' | 'empresa_id' | 'created_at'>>
): Promise<JobWithEmpresa> {
  if (isSupabaseConfigured() && isValidUUID(jobId)) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('jobs')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', jobId)
        .select(`
          *,
          empresa:profiles(nombre, avatar_url, website, ubicacion)
        `)
        .single()

      if (error) {
        throw new Error(error.message || 'Error al actualizar el empleo')
      }
      if (data) {
        return data as unknown as JobWithEmpresa
      }
    } catch (err: any) {
      if (err?.message) throw err
      console.warn('Supabase update failed, saving locally', err)
    }
  }

  const existing = getStoredJobs()
  const idx = existing.findIndex((j) => j.id === jobId)
  if (idx !== -1) {
    const updated: JobWithEmpresa = {
      ...existing[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    }
    existing[idx] = updated
    saveStoredJobs(existing)
    return updated
  }

  throw new Error('No se encontró el empleo para actualizar')
}

export async function deleteJob(jobId: string, accessToken?: string | null): Promise<boolean> {
  if (!isValidUUID(jobId)) {
    const existing = getStoredJobs()
    saveStoredJobs(existing.filter((j) => j.id !== jobId))
    return true
  }

  let token = accessToken
  if (!token && typeof window !== 'undefined' && isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token || null
    } catch { }
  }

  if (token) {
    const res = await fetch('/api/admin/delete-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId, type: 'formal' }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar el empleo')
    }

    const existing = getStoredJobs()
    saveStoredJobs(existing.filter((j) => j.id !== jobId))
    return true
  }

  const existing = getStoredJobs()
  saveStoredJobs(existing.filter((j) => j.id !== jobId))
  return true
}

export async function fetchApplicationsForEmpresa(empresaId?: string): Promise<ApplicationWithDetails[]> {
  const custom = getStoredApplications()

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
        const dbApps = data as unknown as ApplicationWithDetails[]
        const merged = [...dbApps, ...custom.filter((c) => !dbApps.some((d) => d.id === c.id))]
        return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    } catch (err) {
      console.warn('Supabase fetch applications failed', err)
    }
  }

  return [...custom, ...MOCK_APPLICATIONS]
}

export async function fetchApplicationsForCandidate(candidatoId: string): Promise<ApplicationWithDetails[]> {
  const custom = getStoredApplications().filter((a) => a.candidato_id === candidatoId)

  if (isSupabaseConfigured() && isValidUUID(candidatoId)) {
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
        const dbApps = data as unknown as ApplicationWithDetails[]
        const merged = [
          ...dbApps,
          ...custom.filter((c) => !dbApps.some((d) => d.id === c.id || d.job_id === c.job_id)),
        ]
        return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      }
    } catch (err) {
      console.warn('Supabase fetch candidate applications failed', err)
    }
  }

  if (custom.length > 0) return custom
  return MOCK_APPLICATIONS.filter((a) => a.candidato_id === candidatoId)
}

export async function fetchCandidateApplicationForJob(
  jobId: string,
  candidatoId: string,
  jobSlug?: string
): Promise<ApplicationWithDetails | null> {
  if (!jobId || !candidatoId) return null

  const customMatch = getStoredApplications().find(
    (a) =>
      a.candidato_id === candidatoId &&
      (a.job_id === jobId || (jobSlug && a.job?.slug === jobSlug))
  )

  if (isSupabaseConfigured() && isValidUUID(jobId) && isValidUUID(candidatoId)) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          job:jobs(titulo, slug),
          candidato:profiles(nombre, email, cv_url, bio, ubicacion)
        `)
        .eq('job_id', jobId)
        .eq('candidato_id', candidatoId)
        .maybeSingle()

      if (!error && data) {
        return data as unknown as ApplicationWithDetails
      }
    } catch (err) {
      console.warn('Supabase check existing application failed', err)
    }
  }

  return customMatch || null
}

export async function uploadCV(file: File, userId: string): Promise<string> {
  const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB (coincide con bucket 'cvs' en Supabase)
  if (file.size > MAX_SIZE_BYTES) {
    throw new Error('El archivo de currículum supera el tamaño máximo permitido de 5 MB.')
  }

  const rawExt = (file.name.split('.').pop() || 'pdf').toLowerCase()
  const allowedExts: Record<string, string> = {
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  }

  if (!allowedExts[rawExt]) {
    throw new Error('Formato de archivo no válido. Por favor subí tu CV en formato PDF o Word (.pdf, .doc, .docx).')
  }

  if (isSupabaseConfigured()) {
    const supabase = createClient()
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '') || 'candidato'
    const fileName = `${safeUserId}/${Date.now()}.${rawExt}`
    const contentType = allowedExts[rawExt]

    const { data, error } = await supabase.storage
      .from('cvs')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
        contentType,
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
  const existing = getStoredApplications()
  if (existing.some((a) => a.job_id === data.job_id && a.candidato_id === data.candidato_id)) {
    throw new Error('Ya te has postulado a este empleo anteriormente.')
  }

  const newApp: ApplicationWithDetails = {
    id: 'app-' + Date.now(),
    job_id: data.job_id,
    candidato_id: data.candidato_id,
    mensaje: data.mensaje,
    estado: 'pendiente',
    created_at: new Date().toISOString(),
    job: {
      id: data.job_id,
      titulo: data.job_titulo,
      slug: data.job_slug,
    },
    candidato: {
      nombre: data.candidato_nombre,
      email: data.candidato_email,
      cv_url: data.cv_url || null,
      bio: '',
      ubicacion: 'Uruguay',
    }
  }

  // Solo insertamos en la tabla 'applications' de Supabase cuando tanto job_id como candidato_id
  // son UUIDs válidos de la base de datos (evita el error 'invalid input syntax for type uuid: "job-1"'
  // cuando se postula a avisos de demostración o locales).
  if (isSupabaseConfigured() && isValidUUID(data.job_id) && isValidUUID(data.candidato_id)) {
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
      if (error.code === '23505' || error.message?.includes('unique_job_candidato')) {
        throw new Error('Ya te has postulado a este empleo anteriormente.')
      }
      // Si el aviso no existe en la tabla remota (23503) o error de formato UUID (22P02), respaldamos en local
      if (error.code !== '23503' && error.code !== '22P02') {
        console.error('Error insertando postulación en Supabase:', error)
        throw new Error(error.message || 'No se pudo registrar la postulación.')
      }
    } else if (inserted) {
      return {
        ...inserted,
        job: newApp.job,
        candidato: newApp.candidato,
      } as unknown as ApplicationWithDetails
    }
  }

  saveStoredApplications([newApp, ...existing])
  return newApp
}

export async function updateApplicationStatus(appId: string, nuevoEstado: ApplicationEstado): Promise<boolean> {
  if (isSupabaseConfigured() && isValidUUID(appId)) {
    try {
      const supabase = createClient()
      const { error } = await supabase.from('applications').update({ estado: nuevoEstado }).eq('id', appId)
      if (!error) return true

      // Fallback si la restricción CHECK remota aún no incluye 'seleccionado'
      if (nuevoEstado === 'seleccionado') {
        const { error: fallbackErr } = await supabase.from('applications').update({ estado: 'entrevista' }).eq('id', appId)
        if (!fallbackErr) {
          const existing = getStoredApplications()
          const updated = existing.map((a) => (a.id === appId ? { ...a, estado: nuevoEstado } : a))
          saveStoredApplications(updated)
          return true
        }
      }
    } catch { }
  }

  const existing = getStoredApplications()
  const updated = existing.map((a) => (a.id === appId ? { ...a, estado: nuevoEstado } : a))
  saveStoredApplications(updated)
  return true
}

export async function selectCandidateAndRejectOthers(selectedAppId: string, jobId: string): Promise<string[]> {
  const rejectedIds: string[] = []

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      // 1. Marcar como seleccionado al candidato elegido
      if (isValidUUID(selectedAppId)) {
        await supabase.from('applications').update({ estado: 'seleccionado' }).eq('id', selectedAppId)
      }
      // 2. Descartar automáticamente a los demás postulantes del mismo empleo: "Si la empresa seleccionó a otra persona te descartó"
      if (isValidUUID(jobId)) {
        const { data: others } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', jobId)
          .neq('id', selectedAppId)

        if (others && others.length > 0) {
          const ids = others.map((o) => o.id)
          await supabase.from('applications').update({ estado: 'rechazado' }).in('id', ids)
          rejectedIds.push(...ids)
        }
      }
    } catch (err) {
      console.warn('Error en selectCandidateAndRejectOthers Supabase:', err)
    }
  }

  // Actualizar también en el almacenamiento local
  const existing = getStoredApplications()
  const updated = existing.map((a) => {
    if (a.id === selectedAppId) {
      return { ...a, estado: 'seleccionado' as ApplicationEstado }
    }
    const matchesJob = a.job_id === jobId || (a.job && (a.job.id === jobId || a.job.slug === jobId))
    if (matchesJob && a.id !== selectedAppId) {
      rejectedIds.push(a.id)
      return { ...a, estado: 'rechazado' as ApplicationEstado }
    }
    return a
  })
  saveStoredApplications(updated)

  return Array.from(new Set(rejectedIds))
}

export async function markApplicationsAsSeen(appIds: string[]): Promise<boolean> {
  if (!appIds || appIds.length === 0) return true

  const validUuids = appIds.filter(isValidUUID)
  if (isSupabaseConfigured() && validUuids.length > 0) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('applications')
        .update({ estado: 'visto' })
        .in('id', validUuids)
      if (error) {
        console.warn('Error marcando postulaciones como vistas en Supabase:', error)
      }
    } catch (err) {
      console.warn('Error en markApplicationsAsSeen:', err)
    }
  }

  const existing = getStoredApplications()
  const idSet = new Set(appIds)
  const updated = existing.map((a) => (idSet.has(a.id) ? { ...a, estado: 'visto' as ApplicationEstado } : a))
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

export async function deleteInformalJob(jobId: string, accessToken?: string | null): Promise<boolean> {
  if (!isValidUUID(jobId)) {
    const existing = getStoredInformalJobs()
    saveStoredInformalJobs(existing.filter((j) => j.id !== jobId))
    return true
  }

  let token = accessToken
  if (!token && typeof window !== 'undefined' && isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      token = session?.access_token || null
    } catch { }
  }

  if (token) {
    const res = await fetch('/api/admin/delete-job', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ jobId, type: 'informal' }),
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Error al eliminar el aviso')
    }

    const existing = getStoredInformalJobs()
    saveStoredInformalJobs(existing.filter((j) => j.id !== jobId))
    return true
  }

  // Fallback si no hay supabase o modo local
  const existing = getStoredInformalJobs()
  saveStoredInformalJobs(existing.filter((j) => j.id !== jobId))
  return true
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
  const msg = encodeURIComponent(`¡Hola! Vi el aviso de "${jobTitle}" en postulauy.com y me gustaría comunicarme.`)
  return `https://wa.me/${cleaned}?text=${msg}`
}

export function formatGmailUrl(email: string, jobTitle: string): string {
  const subject = `Postulación: ${jobTitle} - postulauy.com`
  const body = `Hola,

Vi la postulación para el puesto de "${jobTitle}" en postulauy.com y me pongo en contacto para postularme.

Procedo a adjuntar mi Currículum Vitae (CV) para su consideración.

Muchas gracias, quedo a las órdenes.`

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export const DEFAULT_COMPANY_CONTACTS: CompanyContact[] = [
  {
    id: 'cc0265cd-02b6-4b28-9242-1fb8eec39788',
    nombre: 'Empresa 1',
    whatsapp: '096123123',
    categoria: 'Limpieza',
    zona: 'Montevideo',
    nota: 'Contacto directo para personal de limpieza y mantenimiento',
    activo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '119e704d-e855-49bb-a230-0def67602681',
    nombre: 'Distribuidora Logística Sur',
    whatsapp: '099555444',
    categoria: 'Logística',
    zona: 'Canelones',
    nota: 'Recepción de CVs para fletes y repartos',
    activo: true,
    created_at: new Date().toISOString(),
  },
  {
    id: '931d98e2-78da-4d88-8505-838c35b4844d',
    nombre: 'Servicios Gastronómicos UY',
    whatsapp: '091223344',
    categoria: 'Gastronomía',
    zona: 'Punta del Este',
    nota: 'Contrataciones de cocineros y bacheros',
    activo: true,
    created_at: new Date().toISOString(),
  },
]

function getStoredCompanyContacts(): CompanyContact[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CONTACTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredCompanyContacts(contacts: CompanyContact[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_CONTACTS_KEY, JSON.stringify(contacts))
  } catch { }
}

export async function fetchCompanyContacts(): Promise<CompanyContact[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_contacts')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: false })

      if (!error && data && data.length > 0) {
        return data as CompanyContact[]
      }
    } catch (err) {
      console.warn('Error al consultar company_contacts en Supabase, usando respaldo local:', err)
    }
  }

  const stored = getStoredCompanyContacts()
  if (stored.length > 0) return stored
  return DEFAULT_COMPANY_CONTACTS
}

export async function createCompanyContact(
  contactData: Omit<CompanyContact, 'id' | 'created_at' | 'updated_at'>
): Promise<CompanyContact> {
  const newContact: CompanyContact = {
    ...contactData,
    id: 'cnt-' + Date.now(),
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_contacts')
        .insert([contactData])
        .select()
        .single()

      if (!error && data) {
        return data as CompanyContact
      }
    } catch (err) {
      console.warn('Error al insertar company_contact en Supabase, guardando en local:', err)
    }
  }

  const existing = getStoredCompanyContacts()
  const list = existing.length > 0 ? existing : DEFAULT_COMPANY_CONTACTS
  const updated = [newContact, ...list]
  saveStoredCompanyContacts(updated)
  return newContact
}

export function normalizePhoneNumberForComparison(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('598')) {
    digits = digits.substring(3)
  }
  if (digits.startsWith('0')) {
    digits = digits.substring(1)
  }
  return digits
}

export async function createCompanyContactsBulk(
  contactsData: Omit<CompanyContact, 'id' | 'created_at' | 'updated_at'>[]
): Promise<CompanyContact[]> {
  if (contactsData.length === 0) return []

  const newContacts: CompanyContact[] = contactsData.map((cd, index) => ({
    ...cd,
    id: 'cnt-' + (Date.now() + index),
    activo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('company_contacts')
        .insert(contactsData)
        .select()

      if (!error && data && data.length > 0) {
        return data as CompanyContact[]
      }
      if (error) {
        console.warn('Error al insertar contactos en lote en Supabase, guardando en local:', error)
      }
    } catch (err) {
      console.warn('Error de red insertando contactos en lote en Supabase:', err)
    }
  }

  const existing = getStoredCompanyContacts()
  const list = existing.length > 0 ? existing : DEFAULT_COMPANY_CONTACTS
  const updated = [...newContacts, ...list]
  saveStoredCompanyContacts(updated)
  return newContacts
}


export async function deleteCompanyContact(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('company_contacts')
        .delete()
        .eq('id', id)

      if (!error) return true
    } catch (err) {
      console.warn('Error al eliminar company_contact en Supabase:', err)
    }
  }

  const existing = getStoredCompanyContacts()
  const list = existing.length > 0 ? existing : DEFAULT_COMPANY_CONTACTS
  const updated = list.filter((c) => c.id !== id)
  saveStoredCompanyContacts(updated)
  return true
}

export function formatContactWhatsAppUrl(phone: string, companyName: string, categoria?: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('09') && cleaned.length === 9) {
    cleaned = '598' + cleaned.substring(1)
  } else if (cleaned.startsWith('9') && cleaned.length === 8) {
    cleaned = '598' + cleaned
  }
  const msg = encodeURIComponent(
    `¡Hola ${companyName}! Vi su contacto en postulauy.com para el rubro ${categoria || 'empleo'} y me gustaría comunicarme por oportunidades laborales.`
  )
  return `https://wa.me/${cleaned}?text=${msg}`
}

export function formatPhoneNumberDisplay(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 9 && digits.startsWith('09')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`
  }
  return phone
}

export interface StoredSavedJob {
  jobId: string
  candidatoId?: string
  createdAt: string
  job?: JobWithEmpresa
}

function getStoredSavedJobs(): StoredSavedJob[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_JOBS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveStoredSavedJobs(items: StoredSavedJob[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LOCAL_STORAGE_SAVED_JOBS_KEY, JSON.stringify(items))
  } catch {}
}

export async function fetchSavedJobIds(candidatoId?: string): Promise<string[]> {
  const localItems = getStoredSavedJobs()
  const localIds = (candidatoId
    ? localItems.filter((i) => !i.candidatoId || i.candidatoId === candidatoId)
    : localItems
  ).map((i) => i.jobId)

  if (isSupabaseConfigured() && candidatoId && isValidUUID(candidatoId)) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('candidato_id', candidatoId)

      if (!error && data) {
        const dbIds = data.map((d: any) => d.job_id).filter(Boolean) as string[]
        return Array.from(new Set([...dbIds, ...localIds]))
      }
    } catch (err) {
      console.warn('Supabase fetchSavedJobIds failed, fallback to local', err)
    }
  }

  return Array.from(new Set(localIds))
}

export async function fetchSavedJobs(candidatoId?: string): Promise<JobWithEmpresa[]> {
  const localItems = getStoredSavedJobs()
  const filteredLocal = candidatoId
    ? localItems.filter((i) => !i.candidatoId || i.candidatoId === candidatoId)
    : localItems

  let dbJobs: JobWithEmpresa[] = []

  if (isSupabaseConfigured() && candidatoId && isValidUUID(candidatoId)) {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('saved_jobs')
        .select(`
          job_id,
          created_at,
          job:jobs(
            *,
            empresa:profiles(nombre, avatar_url, website, ubicacion)
          )
        `)
        .eq('candidato_id', candidatoId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        dbJobs = data
          .map((d: any) => d.job)
          .filter(Boolean) as JobWithEmpresa[]
      }
    } catch (err) {
      console.warn('Supabase fetchSavedJobs failed, fallback to local', err)
    }
  }

  // Also collect any jobs that were saved locally with full job objects or mock jobs
  const allCurrentJobs = await fetchJobs()
  const localSavedFullJobs = filteredLocal
    .map((item) => item.job || allCurrentJobs.find((j) => j.id === item.jobId))
    .filter(Boolean) as JobWithEmpresa[]

  const seen = new Set<string>()
  const merged: JobWithEmpresa[] = []

  for (const j of [...dbJobs, ...localSavedFullJobs]) {
    if (j && j.id && !seen.has(j.id)) {
      seen.add(j.id)
      merged.push(j)
    }
  }

  return merged
}

export async function toggleSavedJob(
  jobId: string,
  candidatoId?: string,
  jobData?: JobWithEmpresa
): Promise<boolean> {
  if (!jobId) return false

  const localItems = getStoredSavedJobs()
  const isAlreadyLocal = localItems.some(
    (i) => i.jobId === jobId && (!candidatoId || !i.candidatoId || i.candidatoId === candidatoId)
  )

  let willBeSaved = !isAlreadyLocal

  // Try Supabase if valid UUIDs
  if (isSupabaseConfigured() && candidatoId && isValidUUID(candidatoId) && isValidUUID(jobId)) {
    try {
      const supabase = createClient()
      const { data: existing, error: checkErr } = await supabase
        .from('saved_jobs')
        .select('id')
        .eq('job_id', jobId)
        .eq('candidato_id', candidatoId)
        .maybeSingle()

      if (!checkErr) {
        if (existing) {
          // Unsave
          await supabase
            .from('saved_jobs')
            .delete()
            .eq('id', existing.id)
          willBeSaved = false
        } else {
          // Save
          await supabase
            .from('saved_jobs')
            .insert([{ job_id: jobId, candidato_id: candidatoId }])
          willBeSaved = true
        }
      }
    } catch (err) {
      console.warn('Supabase toggleSavedJob failed, fallback to local', err)
    }
  }

  // Update local storage
  if (willBeSaved) {
    const newEntry: StoredSavedJob = {
      jobId,
      candidatoId,
      createdAt: new Date().toISOString(),
      job: jobData,
    }
    const updated = [newEntry, ...localItems.filter((i) => i.jobId !== jobId)]
    saveStoredSavedJobs(updated)
  } else {
    const updated = localItems.filter((i) => i.jobId !== jobId)
    saveStoredSavedJobs(updated)
  }

  return willBeSaved
}

export async function isJobSaved(jobId: string, candidatoId?: string): Promise<boolean> {
  if (!jobId) return false
  const ids = await fetchSavedJobIds(candidatoId)
  return ids.includes(jobId)
}

