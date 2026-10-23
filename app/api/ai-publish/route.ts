import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseInformalJobWithAI } from '@/lib/data'
import { extractJobsFromImage, extractJobsFromText, ExtractedInformalJob } from '@/lib/gemini'
import { isUserAdmin, isProfileAdmin } from '@/lib/auth-utils'

export async function POST(request: Request) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Verificación de seguridad: Autenticación y Autorización de Administrador
    if (url && key && !url.includes('your-supabase-project')) {
      const authHeader = request.headers.get('authorization')
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null

      if (!token) {
        return NextResponse.json(
          { error: 'No autorizado. Debes iniciar sesión como administrador para utilizar esta función.' },
          { status: 401 }
        )
      }

      const supabaseAuth = createClient(url, key)
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

      // Verificar si es admin dinámicamente en la base de datos o por email de respaldo
      const { data: userProfile } = await supabaseAuth
        .from('profiles')
        .select('is_admin, role, email')
        .eq('id', user.id)
        .single()

      if (!isProfileAdmin(userProfile || { email: user.email })) {
        return NextResponse.json(
          {
            error:
              'Acceso denegado. Solo el administrador de la plataforma tiene permisos para publicar o procesar avisos con IA.',
          },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const autoPublish = body.autoPublish !== false // true por defecto

    let extractedJobs: ExtractedInformalJob[] = []

    // 1. Caso: Imagen enviada (Base64 o Data URL)
    if (body.image && typeof body.image === 'string') {
      try {
        extractedJobs = await extractJobsFromImage(body.image, body.mimeType || 'image/jpeg')
      } catch (geminiErr: any) {
        console.error('Error procesando imagen con Gemini:', geminiErr)
        return NextResponse.json(
          { error: `Error interpretando imagen con IA: ${geminiErr.message}` },
          { status: 500 }
        )
      }
    }
    // 2. Caso: Texto sin procesar (Avisos de clasificados o WhatsApp)
    else if (body.text && typeof body.text === 'string') {
      if (process.env.GEMINI_API_KEY) {
        try {
          extractedJobs = await extractJobsFromText(body.text)
        } catch (geminiErr: any) {
          console.warn('Gemini falló con el texto, usando analizador de respaldo local:', geminiErr)
          const fallback = parseInformalJobWithAI(body.text)
          extractedJobs = [fallback]
        }
      } else {
        const fallback = parseInformalJobWithAI(body.text)
        extractedJobs = [fallback]
      }
    }
    // 3. Caso: El cliente ya envía los datos estructurados directamente
    else if (body.cargo) {
      extractedJobs = [
        {
          titulo: body.titulo || (body.zona ? `${body.cargo} (${body.zona})` : body.cargo),
          cargo: body.cargo,
          rubro: body.rubro || 'General',
          zona: body.zona || null,
          horario: body.horario || null,
          descripcion: body.descripcion || body.cargo,
          whatsapp: body.whatsapp || body.contacto_whatsapp || null,
          telefono: body.telefono || null,
          email: body.email || null,
          direccion: body.direccion || null,
          salario: body.salario || null,
          contacto_indicaciones: body.contacto_indicaciones || null,
          raw_text: body.raw_text || null,
        },
      ]
    } else {
      return NextResponse.json(
        {
          error:
            'Debes enviar una imagen en base64 ("image"), un texto clasificado ("text"), o los datos estructurados del empleo.',
        },
        { status: 400 }
      )
    }

    if (!extractedJobs || extractedJobs.length === 0) {
      return NextResponse.json(
        { error: 'No se detectó ninguna oferta de empleo en el contenido proporcionado.' },
        { status: 422 }
      )
    }

    // Preparar registros para la base de datos
    const jobsToInsert = extractedJobs.map((job) => ({
      titulo: job.titulo || (job.zona ? `${job.cargo} (${job.zona})` : job.cargo),
      cargo: job.cargo,
      rubro: job.rubro || 'General',
      zona: job.zona || null,
      horario: job.horario || null,
      descripcion: job.descripcion || job.cargo,
      whatsapp: job.whatsapp || null,
      telefono: job.telefono || null,
      email: job.email || null,
      direccion: job.direccion || null,
      contacto_whatsapp: job.whatsapp || null,
      contacto_indicaciones: job.contacto_indicaciones || null,
      salario: job.salario || null,
      raw_text: job.raw_text || (body.text ? body.text.slice(0, 500) : null),
      activo: true,
    }))

    // Si solo se solicitó interpretar sin publicar
    if (!autoPublish) {
      return NextResponse.json({
        success: true,
        autoPublish: false,
        count: jobsToInsert.length,
        jobs: jobsToInsert,
      })
    }

    // Publicar en Supabase si está configurado
    if (url && key && !url.includes('your-supabase-project')) {
      const supabase = createClient(url, key)
      const { data, error } = await supabase
        .from('informal_jobs')
        .insert(jobsToInsert)
        .select()

      if (error) {
        console.error('Error insertando empleos informales en Supabase:', error)
        return NextResponse.json(
          {
            error: 'Error guardando en la base de datos: ' + error.message,
            extracted: jobsToInsert,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `${data.length} aviso(s) publicado(s) exitosamente`,
        count: data.length,
        jobs: data,
      })
    }

    // Simulación local en caso de que Supabase no esté conectado
    return NextResponse.json({
      success: true,
      simulated: true,
      message: `${jobsToInsert.length} aviso(s) interpretado(s) exitosamente (Modo simulación)`,
      count: jobsToInsert.length,
      jobs: jobsToInsert.map((j) => ({
        id: 'inf-' + Math.random().toString(36).substring(2, 9),
        ...j,
        created_at: new Date().toISOString(),
      })),
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error procesando la solicitud' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    description: 'Endpoint protegido de ingesta e interpretación con Google Gemini Vision para administradores',
  })
}
