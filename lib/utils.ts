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
