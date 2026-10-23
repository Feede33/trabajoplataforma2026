import { NextResponse } from 'next/server'
import { parseInformalJobWithAI } from '@/lib/data'
import { extractJobsFromImage, extractJobsFromText, ExtractedInformalJob } from '@/lib/gemini'
import { getAuthedContext, getServiceClient, isBackendConfigured } from '@/lib/server/auth'
import { AI_ALLOWED_ROLES, MAX_AVISOS_POR_USO_IA } from '@/lib/billing'

export async function POST(request: Request) {
  let refundUserId: string | null = null
  const service = getServiceClient()

  const refundCredit = async () => {
    if (refundUserId && service) {
      const { error } = await service.rpc('refund_ai_credit', { p_user: refundUserId })
      if (error) console.error('No se pudo devolver el crédito de IA:', error)
      refundUserId = null
    }
  }

  try {
    const backendReady = isBackendConfigured()
    let isAdmin = false

    // Verificación de seguridad: Autenticación y Autorización (admin o usuario con créditos)
    if (backendReady) {
      const ctx = await getAuthedContext(request)

      if (!ctx) {
        return NextResponse.json(
          { error: 'No autorizado. Debes iniciar sesión para utilizar esta función.' },
          { status: 401 }
        )
      }

      isAdmin = ctx.isAdmin

      if (!isAdmin) {
        if (!ctx.role || !AI_ALLOWED_ROLES.includes(ctx.role as 'candidato' | 'empresa')) {
          return NextResponse.json(
            {
              error:
                'Acceso denegado. La publicación con IA está disponible para el administrador y para usuarios con cuenta de Candidato que compren créditos.',
            },
            { status: 403 }
          )
        }

        if (!service) {
          return NextResponse.json(
            { error: 'El servicio no está configurado correctamente. Contactá al administrador.' },
            { status: 503 }
          )
        }

        // Cobro: 1 crédito por uso. Se descuenta de forma atómica antes de llamar a la IA.
        const { data: consumed, error: creditError } = await service.rpc('consume_ai_credit', { p_user: ctx.userId })
        if (creditError) {
          console.error('Error consumiendo crédito de IA:', creditError)
          return NextResponse.json({ error: 'No se pudo verificar tu saldo de créditos.' }, { status: 500 })
        }
        if (!consumed) {
          return NextResponse.json(
            { error: 'No tenés créditos de IA disponibles. Comprá un paquete para continuar.', code: 'NO_CREDITS' },
            { status: 402 }
          )
        }
        refundUserId = ctx.userId
      }
    }

    const body = await request.json()

    // Los usuarios no admin solo pueden usar la IA (imagen o texto) y siempre se publica directo.
    // Así se evita publicar avisos estructurados a mano sin pagar el uso.
    const sendsRawContent = (typeof body.image === 'string' && body.image) || (typeof body.text === 'string' && body.text)
    if (backendReady && !isAdmin && !sendsRawContent) {
      await refundCredit()
      return NextResponse.json(
        { error: 'Solo se pueden publicar avisos enviando una imagen o un texto para interpretar con IA.' },
        { status: 400 }
      )
    }

    const autoPublish = isAdmin || !backendReady ? body.autoPublish !== false : true // true por defecto

    let extractedJobs: ExtractedInformalJob[] = []

    // 1. Caso: Imagen enviada (Base64 o Data URL)
    if (body.image && typeof body.image === 'string') {
      try {
        extractedJobs = await extractJobsFromImage(body.image, body.mimeType || 'image/jpeg')
      } catch (geminiErr: any) {
        console.error('Error procesando imagen con Gemini:', geminiErr)
        await refundCredit()
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
    // 3. Caso: El cliente ya envía los datos estructurados directamente (solo admin)
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
      await refundCredit()
      return NextResponse.json(
        {
          error:
            'Debes enviar una imagen en base64 ("image"), un texto clasificado ("text"), o los datos estructurados del empleo.',
        },
        { status: 400 }
      )
    }

    if (!extractedJobs || extractedJobs.length === 0) {
      await refundCredit()
      return NextResponse.json(
        { error: 'No se detectó ninguna oferta de empleo en el contenido proporcionado.' },
        { status: 422 }
      )
    }

    // Un uso de IA publica como máximo N avisos (el admin no tiene tope)
    if (backendReady && !isAdmin) {
      extractedJobs = extractedJobs.slice(0, MAX_AVISOS_POR_USO_IA)
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

    // Si solo se solicitó interpretar sin publicar (solo admin)
    if (!autoPublish) {
      return NextResponse.json({
        success: true,
        autoPublish: false,
        count: jobsToInsert.length,
        jobs: jobsToInsert,
      })
    }

    // Publicar en Supabase si está configurado
    if (backendReady) {
      if (!service) {
        await refundCredit()
        return NextResponse.json(
          { error: 'El servicio no está configurado para publicar avisos (falta SUPABASE_SERVICE_ROLE_KEY).' },
          { status: 503 }
        )
      }

      const { data, error } = await service.from('informal_jobs').insert(jobsToInsert).select()

      if (error) {
        console.error('Error insertando empleos informales en Supabase:', error)
        await refundCredit()
        return NextResponse.json(
          {
            error: 'Error guardando en la base de datos: ' + error.message,
            extracted: jobsToInsert,
          },
          { status: 500 }
        )
      }

      refundUserId = null // el crédito quedó consumido correctamente

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
    await refundCredit()
    return NextResponse.json(
      { error: error.message || 'Error procesando la solicitud' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    description: 'Endpoint protegido de ingesta e interpretación con Google Gemini Vision (administradores y usuarios con créditos)',
  })
}
