import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isUserAdmin, isProfileAdmin } from '@/lib/auth-utils'

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!url || !key || url.includes('your-supabase-project')) {
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

    // 2. Validar sesión con Supabase Auth
    const supabase = createClient(url, key)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

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

    // Verificar si es admin dinámicamente en Supabase
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('is_admin, role, email')
      .eq('id', user.id)
      .single()

    const isAdmin = isProfileAdmin(userProfile || { email: user.email })
    const isFormalJob = type === 'formal'

    // 4. Comprobación estricta de permisos:
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
        const { data: job, error: jobError } = await supabase
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

    // 5. Ejecutar eliminación
    const tableName = isFormalJob ? 'jobs' : 'informal_jobs'
    const { error: deleteError } = await supabase.from(tableName).delete().eq('id', jobId)

    if (deleteError) {
      // Si hay restricciones de integridad referencial, realizar soft-delete
      const updateData = isFormalJob ? { estado: 'cerrado' } : { activo: false }
      const { error: updateError } = await supabase.from(tableName).update(updateData).eq('id', jobId)

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
