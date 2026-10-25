export type UserRole = 'empresa' | 'candidato' | 'admin'
export type JobModalidad = 'presencial' | 'remoto' | 'hibrido'
export type JobTipoContrato = 'full-time' | 'part-time' | 'freelance' | 'pasantia'
export type JobEstado = 'activo' | 'cerrado' | 'borrador'
export type ApplicationEstado = 'pendiente' | 'visto' | 'entrevista' | 'seleccionado' | 'rechazado'

export interface Profile {
  id: string
  role: UserRole
  is_admin?: boolean
  nombre: string | null
  email: string | null
  avatar_url: string | null
  bio: string | null
  ubicacion: string | null
  cv_url: string | null
  website: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  empresa_id: string
  titulo: string
  descripcion: string
  rubro: string
  zona: string
  modalidad: JobModalidad
  tipo_contrato: JobTipoContrato
  salario_rango: string | null
  estado: JobEstado
  slug: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Application {
  id: string
  job_id: string
  candidato_id: string
  mensaje: string | null
  estado: ApplicationEstado
  created_at: string
}

export type JobWithEmpresa = Job & {
  empresa: Pick<Profile, 'nombre' | 'avatar_url' | 'website' | 'ubicacion'>
}

export interface CompanyContact {
  id: string
  nombre: string
  whatsapp: string
  categoria: string
  zona?: string | null
  nota?: string | null
  activo: boolean
  created_at: string
  updated_at?: string
}

export interface InformalJob {
  id: string
  titulo: string
  cargo: string
  rubro: string
  zona: string | null
  horario: string | null
  descripcion: string
  whatsapp: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  contacto_whatsapp?: string | null
  contacto_indicaciones: string | null
  salario: string | null
  raw_text: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export type ApplicationWithDetails = Application & {
  job: Pick<Job, 'titulo' | 'slug'>
  candidato: Pick<Profile, 'nombre' | 'email' | 'cv_url' | 'bio' | 'ubicacion'>
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & Pick<Profile, 'id' | 'role'>
        Update: Partial<Profile>
      }
      jobs: {
        Row: Job
        Insert: Omit<Job, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<Job, 'id'>>
      }
      applications: {
        Row: Application
        Insert: Omit<Application, 'id' | 'created_at'> & {
          id?: string
          created_at?: string
        }
        Update: Partial<Omit<Application, 'id'>>
      }
      informal_jobs: {
        Row: InformalJob
        Insert: Omit<InformalJob, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<InformalJob, 'id'>>
      }
    }
  }
}
