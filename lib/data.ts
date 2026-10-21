import { isSupabaseConfigured, createClient } from './supabase/client'
import { MOCK_JOBS, MOCK_APPLICATIONS } from './mock-data'
import { JobWithEmpresa, ApplicationWithDetails, Job, JobEstado, ApplicationEstado } from './supabase/database.types'

const LOCAL_STORAGE_JOBS_KEY = 'empleos_custom_jobs'
const LOCAL_STORAGE_APPS_KEY = 'empleos_custom_apps'

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
