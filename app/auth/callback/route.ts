import { NextResponse, type NextRequest } from 'next/server'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server'
import { isProfileAdmin } from '@/lib/auth-utils'
import { UserRole } from '@/lib/supabase/database.types'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')
  const oauthErrorDescription = searchParams.get('error_description')
  const requestedRole = searchParams.get('role')
  const nextParam = searchParams.get('next') || searchParams.get('redirect')

  // Validar que la redirección sea una ruta interna segura
  const safeNext =
    nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//')
      ? nextParam
      : null

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent('Supabase no está configurado en el servidor.')}`,
        origin
      )
    )
  }

  if (oauthError) {
    const errorMsg =
      oauthErrorDescription || 'Cancelaste o falló la autenticación con Google.'
    return NextResponse.redirect(
      new URL(`/auth/login?error=${encodeURIComponent(errorMsg)}`, origin)
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent('Código de autorización no recibido.')}`,
        origin
      )
    )
  }

  try {
    const supabase = await createClient()
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError || !data.user) {
      return NextResponse.redirect(
        new URL(
          `/auth/login?error=${encodeURIComponent(
            exchangeError?.message || 'No se pudo validar la sesión con Google.'
          )}`,
          origin
        )
      )
    }

    const user = data.user
    const metadata = user.user_metadata || {}

    const googleName: string =
      metadata.nombre ||
      metadata.full_name ||
      metadata.name ||
      user.email?.split('@')[0] ||
      ''
    const googleAvatar: string | null =
      metadata.avatar_url || metadata.picture || null

    // Consultar el perfil actual en public.profiles
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    const isFirstOAuthSetup = !metadata.role
    const sanitizedRequestedRole: UserRole | null =
      requestedRole === 'empresa'
        ? 'empresa'
        : requestedRole === 'candidato'
        ? 'candidato'
        : null

    let finalRole: UserRole = existingProfile?.role || 'candidato'
    let finalIsAdmin: boolean = isProfileAdmin(existingProfile || { email: user.email })

    if (!existingProfile) {
      // El trigger aún no creó la fila o no estaba activo: crear perfil explícitamente
      finalRole = sanitizedRequestedRole || (metadata.role as UserRole) || 'candidato'
      const { data: insertedProfile } = await supabase
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email || '',
            nombre: googleName,
            avatar_url: googleAvatar,
            role: finalRole,
          },
          { onConflict: 'id' }
        )
        .select('*')
        .single()

      if (insertedProfile) {
        finalRole = insertedProfile.role
        finalIsAdmin = isProfileAdmin(insertedProfile)
      }

      await supabase.auth.updateUser({
        data: { role: finalRole, nombre: googleName },
      })
    } else {
      // El perfil ya existe (creado por el trigger handle_new_user o en un registro previo)
      const updates: Record<string, any> = {}

      // Si es el primer ingreso con Google y vino desde /auth/registro con un rol elegido,
      // asignamos el rol solicitado (sin alterar cuentas administradoras)
      if (
        isFirstOAuthSetup &&
        sanitizedRequestedRole &&
        existingProfile.role !== 'admin' &&
        !existingProfile.is_admin
      ) {
        updates.role = sanitizedRequestedRole
        finalRole = sanitizedRequestedRole
      }

      if (!existingProfile.nombre && googleName) {
        updates.nombre = googleName
      }

      if (!existingProfile.avatar_url && googleAvatar) {
        updates.avatar_url = googleAvatar
      }

      if (!existingProfile.email && user.email) {
        updates.email = user.email
      }

      if (Object.keys(updates).length > 0) {
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', user.id)
          .select('*')
          .single()

        if (updatedProfile) {
          finalRole = updatedProfile.role
          finalIsAdmin = isProfileAdmin(updatedProfile)
        }
      }

      if (isFirstOAuthSetup) {
        await supabase.auth.updateUser({
          data: {
            role: finalRole,
            nombre: existingProfile.nombre || googleName,
          },
        })
      }
    }

    // Determinar ruta de destino
    if (safeNext) {
      return NextResponse.redirect(new URL(safeNext, origin))
    }

    if (finalIsAdmin) {
      return NextResponse.redirect(new URL('/empleos-informales', origin))
    }

    if (finalRole === 'empresa') {
      return NextResponse.redirect(new URL('/empresa/dashboard', origin))
    }

    return NextResponse.redirect(new URL('/candidato/dashboard', origin))
  } catch (err: any) {
    console.error('Error en /auth/callback:', err)
    return NextResponse.redirect(
      new URL(
        `/auth/login?error=${encodeURIComponent(
          err?.message || 'Error inesperado al procesar la autenticación con Google.'
        )}`,
        origin
      )
    )
  }
}
