/**
 * Utilidades centralizadas para verificación dinámica de roles y permisos desde Supabase.
 */

/**
 * Determina si un perfil es administrador basándose EXCLUSIVAMENTE en la base de datos de Supabase.
 * Si en la base de datos se coloca `is_admin = false`, el usuario NO ES ADMINISTRADOR.
 * Si en la base de datos se coloca `is_admin = true`, el usuario TIENE TODOS LOS PRIVILEGIOS.
 */
export function isProfileAdmin(
  profile?: { is_admin?: boolean; role?: string; email?: string | null } | null
): boolean {
  if (!profile) return false

  // 1. La columna `is_admin` de Supabase es la fuente de verdad definitiva:
  if (typeof profile.is_admin === 'boolean') {
    return profile.is_admin
  }

  // 2. Si el rol es 'admin' y is_admin no es false explícito:
  if (profile.role === 'admin') {
    return true
  }

  return false
}

/**
 * Función auxiliar para verificación por email sólo cuando no hay perfil disponible
 */
export function isUserAdmin(email?: string | null): boolean {
  return false
}
