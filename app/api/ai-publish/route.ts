import { NextResponse } from 'next/server'
import { extractJobsFromImage, extractJobsFromText, ExtractedInformalJob } from '@/lib/gemini'
import { getAuthedContext, getServiceClient, isBackendConfigured } from '@/lib/server/auth'
import { AI_ALLOWED_ROLES, MAX_AVISOS_POR_USO_IA } from '@/lib/billing'

function normalizePhone(phone?: string | null): string {
  if (!phone) return ''
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('598')) digits = digits.substring(3)
  if (digits.startsWith('0')) digits = digits.substring(1)
  return digits
}

function normalizeText(value?: string | null): string {
  if (!value) return ''
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isSameInformalJob(
  a: {
    titulo?: string | null
    cargo?: string | null
    descripcion?: string | null
    whatsapp?: string | null
    telefono?: string | null
    email?: string | null
    direccion?: string | null
  },
  b: {
    titulo?: string | null
    cargo?: string | null
    descripcion?: string | null
    whatsapp?: string | null
    telefono?: string | null
    email?: string | null
    direccion?: string | null
  }
): boolean {
  const descA = normalizeText(a.descripcion)
  const descB = normalizeText(b.descripcion)
  if (descA.length >= 25 && descA === descB) {
    return true
  }

  const phonesA = [normalizePhone(a.whatsapp), normalizePhone(a.telefono)].filter((p) => p.length >= 7)
  const phonesB = [normalizePhone(b.whatsapp), normalizePhone(b.telefono)].filter((p) => p.length >= 7)
  const hasSamePhone = phonesA.length > 0 && phonesA.some((p) => phonesB.includes(p))

  const emailA = (a.email || '').trim().toLowerCase()
  const emailB = (b.email || '').trim().toLowerCase()
  const hasSameEmail = emailA.length >= 5 && emailA === emailB

  const dirA = normalizeText(a.direccion)
  const dirB = normalizeText(b.direccion)
  const hasSameDir = dirA.length >= 6 && dirA === dirB

  const sharesContact = hasSamePhone || hasSameEmail || hasSameDir
  if (!sharesContact) return false

  const cargoA = normalizeText(a.cargo)
  const cargoB = normalizeText(b.cargo)
  if (cargoA && cargoB && (cargoA === cargoB || cargoA.includes(cargoB) || cargoB.includes(cargoA))) {
    return true
  }

  const tituloA = normalizeText(a.titulo)
  const tituloB = normalizeText(b.titulo)
  if (tituloA && tituloB && tituloA === tituloB) {
    return true
  }

  return false
}

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

    // Los usuarios no admin pueden usar la IA enviando una imagen o texto y siempre se publica directo.
    const sendsImage = typeof body.image === 'string' && body.image.length > 0
    const sendsText = typeof body.text === 'string' && body.text.trim().length > 0
    if (backendReady && !isAdmin && !sendsImage && !sendsText) {
      await refundCredit()
      return NextResponse.json(
        { error: 'Solo se pueden publicar avisos enviando una imagen, captura o texto para interpretar con IA.' },
        { status: 400 }
      )
    }

    const autoPublish = isAdmin || !backendReady ? body.autoPublish !== false : true // true por defecto

    let extractedJobs: ExtractedInformalJob[] = []

    // 1. Caso: Imagen enviada (Base64 o Data URL)
    if (sendsImage) {
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
    // 2. Caso: Texto o conversación pegada
    else if (sendsText) {
      try {
        extractedJobs = await extractJobsFromText(body.text)
      } catch (geminiErr: any) {
        console.error('Error procesando texto con Gemini:', geminiErr)
        await refundCredit()
        return NextResponse.json(
          { error: `Error interpretando texto con IA: ${geminiErr.message}` },
          { status: 500 }
        )
      }
    }
    // 3. Caso: El cliente ya envía los datos estructurados directamente (solo admin tras revisar vista previa)
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
            'Debes enviar una imagen ("image") o un texto ("text") para interpretar con IA.',
        },
        { status: 400 }
      )
    }

    if (!extractedJobs || extractedJobs.length === 0) {
      await refundCredit()
      return NextResponse.json(
        { error: 'No se detectó ninguna oferta de empleo real en el contenido proporcionado (se descartaron mensajes que no eran vacantes).' },
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
      raw_text: job.raw_text || (job.fecha_detectada ? `Fecha detectada: ${job.fecha_detectada}` : null),
      activo: true,
    }))

    // Deduplicar primero dentro de la misma extracción
    const uniqueWithinBatch: typeof jobsToInsert = []
    for (const candidate of jobsToInsert) {
      const alreadyInBatch = uniqueWithinBatch.some((prev) => isSameInformalJob(candidate, prev))
      if (!alreadyInBatch) {
        uniqueWithinBatch.push(candidate)
      }
    }

    // Si solo se solicitó interpretar sin publicar (solo admin)
    if (!autoPublish) {
      return NextResponse.json({
        success: true,
        autoPublish: false,
        count: uniqueWithinBatch.length,
        jobs: uniqueWithinBatch.map((item, idx) => ({
          ...item,
          fecha_detectada: extractedJobs[idx]?.fecha_detectada || null,
        })),
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

      // Consultar avisos recientes activos para omitir duplicados automáticamente
      const { data: existingJobs } = await service
        .from('informal_jobs')
        .select('titulo, cargo, descripcion, whatsapp, telefono, email, direccion')
        .eq('activo', true)
        .order('created_at', { ascending: false })
        .limit(200)

      const existingList = existingJobs || []
      const nonDuplicateJobs = uniqueWithinBatch.filter(
        (candidate) => !existingList.some((existing) => isSameInformalJob(candidate, existing))
      )
      const skippedDuplicates = jobsToInsert.length - nonDuplicateJobs.length

      if (nonDuplicateJobs.length === 0) {
        await refundCredit()
        return NextResponse.json({
          success: true,
          skippedDuplicates,
          message: 'Aviso(s) duplicado(s) omitido(s) automáticamente',
          count: 0,
          jobs: [],
        })
      }

      const { data, error } = await service.from('informal_jobs').insert(nonDuplicateJobs).select()

      if (error) {
        console.error('Error insertando empleos informales en Supabase:', error)
        await refundCredit()
        return NextResponse.json(
          {
            error: 'Error guardando en la base de datos: ' + error.message,
            extracted: nonDuplicateJobs,
          },
          { status: 500 }
        )
      }

      refundUserId = null // el crédito quedó consumido correctamente

      return NextResponse.json({
        success: true,
        skippedDuplicates,
        message: `${data.length} aviso(s) publicado(s) exitosamente`,
        count: data.length,
        jobs: data,
      })
    }

    // Simulación local en caso de que Supabase no esté conectado
    return NextResponse.json({
      success: true,
      simulated: true,
      skippedDuplicates: jobsToInsert.length - uniqueWithinBatch.length,
      message: `${uniqueWithinBatch.length} aviso(s) interpretado(s) exitosamente (Modo simulación)`,
      count: uniqueWithinBatch.length,
      jobs: uniqueWithinBatch.map((j) => ({
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
