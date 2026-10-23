import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isUserAdmin, isProfileAdmin } from '@/lib/auth-utils'

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !anonKey || url.includes('your-supabase-project')) {
      return NextResponse.json({ success: true, simulated: true })
    }

    // 1. Verificar Token Bearer
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null

    if (!token) {
      return NextResponse.json(
        { error: 'No autorizado. Se requiere token de sesión para eliminar publicaciones.' },
        { status: 401 }
      )
    }

    // 2. Validar sesión con Supabase Auth (anon key, solo para verificar identidad)
    const supabaseAuth = createClient(url, anonKey)
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Sesión inválida o expirada. Por favor iniciá sesión nuevamente.' },
        { status: 401 }
      )
    }

    // 3. Procesar datos del body
    const body = await request.json()
    const { jobId, type } = body

    if (!jobId) {
      return NextResponse.json({ error: 'Falta el parámetro jobId' }, { status: 400 })
    }

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!UUID_REGEX.test(String(jobId).trim())) {
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Aviso local eliminado exitosamente',
        jobId,
      })
    }

    // 4. Verificar perfil y permisos usando anon client (respeta RLS de lectura)
    const { data: userProfile } = await supabaseAuth
      .from('profiles')
      .select('is_admin, role, email')
      .eq('id', user.id)
      .single()

    const isAdmin = isProfileAdmin(userProfile || { email: user.email })
    const isFormalJob = type === 'formal'

    // 5. Comprobación estricta de permisos:
    if (!isFormalJob) {
      // Para empleos informales: ÚNICAMENTE el administrador puede eliminar
      if (!isAdmin) {
        return NextResponse.json(
          { error: 'Acceso denegado. Solo el administrador tiene permiso para eliminar avisos clasificados.' },
          { status: 403 }
        )
      }
    } else {
      // Para empleos formales: Puede eliminar el administrador O la empresa dueña del aviso
      if (!isAdmin) {
        const { data: job, error: jobError } = await supabaseAuth
          .from('jobs')
          .select('empresa_id')
          .eq('id', jobId)
          .single()

        if (jobError || !job) {
          return NextResponse.json({ error: 'Empleo no encontrado' }, { status: 404 })
        }

        if (job.empresa_id !== user.id) {
          return NextResponse.json(
            { error: 'Acceso denegado. No tienes permiso para eliminar esta oferta de empleo.' },
            { status: 403 }
          )
        }
      }
    }

    // 6. Ejecutar eliminación con service role key (bypasea RLS tras verificar permisos)
    // Si no hay service key disponible, usar anon key (puede fallar por RLS)
    const supabaseAdmin = serviceKey
      ? createClient(url, serviceKey)
      : supabaseAuth

    const tableName = isFormalJob ? 'jobs' : 'informal_jobs'
    const { error: deleteError } = await supabaseAdmin.from(tableName).delete().eq('id', jobId)

    if (deleteError) {
      console.error('Error al eliminar:', deleteError)
      // Si hay restricciones de integridad referencial, realizar soft-delete
      const updateData = isFormalJob ? { estado: 'cerrado' } : { activo: false }
      const { error: updateError } = await supabaseAdmin.from(tableName).update(updateData).eq('id', jobId)

      if (updateError) {
        return NextResponse.json(
          { error: 'Error al eliminar en la base de datos: ' + updateError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Aviso eliminado exitosamente',
      jobId,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
