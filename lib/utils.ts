import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function formatRelativeTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  // Recién publicado o sesgo de reloj menor a 1 minuto
  if (diffMs < 60 * 1000) {
    return 'Hace instantes'
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Menos de 1 hora -> minutos
  if (diffHours < 1) {
    return diffMinutes === 1 ? 'Hace 1 minuto' : `Hace ${diffMinutes} minutos`
  }

  // Menos de 24 horas -> horas
  if (diffDays < 1) {
    return diffHours === 1 ? 'Hace 1 hora' : `Hace ${diffHours} horas`
  }

  // Primer día transcurrido (24hs a 47hs) -> ej: "Hace 1 día y 6 hs"
  if (diffDays === 1) {
    const remainingHours = diffHours % 24
    if (remainingHours > 0) {
      return `Hace 1 día y ${remainingHours} hs`
    }
    return 'Hace 1 día'
  }

  // De 2 a 6 días
  if (diffDays < 7) {
    return `Hace ${diffDays} días`
  }

  // De 1 a 4 semanas
  const weeks = Math.floor(diffDays / 7)
  if (diffDays < 30) {
    return weeks === 1 ? 'Hace 1 semana' : `Hace ${weeks} semanas`
  }

  // De 1 a 11 meses
  const months = Math.floor(diffDays / 30)
  if (diffDays < 365) {
    return months === 1 ? 'Hace 1 mes' : `Hace ${months} meses`
  }

  // Años
  const years = Math.floor(diffDays / 365)
  return years === 1 ? 'Hace 1 año' : `Hace ${years} años`
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${day}/${month}/${year} a las ${hours}:${minutes} hs`
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}

export function formatTime(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes} hs`
}


export const RUBROS = [
  'Tecnología', 'Marketing', 'Ventas', 'Administración', 'Finanzas',
  'Recursos Humanos', 'Diseño', 'Logística', 'Salud', 'Educación',
  'Construcción', 'Gastronomía', 'Legal', 'Atención al cliente', 'Otro'
]

export const MODALIDADES = [
  { value: 'presencial', label: 'Presencial' },
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
]

export const TIPOS_CONTRATO = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'pasantia', label: 'Pasantía' },
]

export const DEPARTAMENTOS_UY = [
  'Montevideo',
  'Canelones',
  'Maldonado',
  'Colonia',
  'Salto',
  'Paysandú',
  'Rivera',
  'Tacuarembó',
  'Cerro Largo',
  'Rocha',
  'San José',
  'Soriano',
  'Florida',
  'Lavalleja',
  'Durazno',
  'Río Negro',
  'Treinta y Tres',
  'Flores',
  'Artigas',
  'Remoto',
]

export interface AiBadgeInfo {
  label: string
  badgeClass: string
  scoreColor: string
}

/**
 * Retorna el estado y diseño visual de la afinidad IA según el puntaje de match (0 a 100%)
 * - 90% a 100%: "Candidato Ideal"
 * - 75% a 89%:  "Alta Afinidad"
 * - 55% a 74%:  "Perfil Compatible"
 * - 35% a 54%:  "Afinidad Media"
 * - Menor a 35% (ej. 25%): "Afinidad Básica"
 */
export function getAiBadgeDetails(score: number): AiBadgeInfo {
  if (score >= 90) {
    return {
      label: 'Candidato Ideal',
      badgeClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
      scoreColor: 'text-emerald-700 dark:text-emerald-300',
    }
  }
  if (score >= 75) {
    return {
      label: 'Alta Afinidad',
      badgeClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
      scoreColor: 'text-indigo-700 dark:text-indigo-300',
    }
  }
  if (score >= 55) {
    return {
      label: 'Perfil Compatible',
      badgeClass: 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      scoreColor: 'text-purple-700 dark:text-purple-300',
    }
  }
  if (score >= 35) {
    return {
      label: 'Afinidad Media',
      badgeClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      scoreColor: 'text-amber-700 dark:text-amber-300',
    }
  }
  return {
    label: 'Afinidad Básica',
    badgeClass: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    scoreColor: 'text-rose-700 dark:text-rose-300',
  }
}
