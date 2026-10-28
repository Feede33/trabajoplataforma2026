import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/server/auth'
import { sendContactEmail } from '@/lib/server/email'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 })
    }

    const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim() : ''
    const descripcion = typeof body.descripcion === 'string' ? body.descripcion.trim() : ''

    if (!nombre || nombre.length < 2) {
      return NextResponse.json({ error: 'Por favor ingresa tu nombre completo.' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Por favor ingresa un correo electrónico (Gmail u otro) válido.' }, { status: 400 })
    }

    if (!descripcion || descripcion.length < 5) {
      return NextResponse.json({ error: 'Por favor escribe una descripción o mensaje con al menos 5 caracteres.' }, { status: 400 })
    }

    // 1. Guardar en Supabase (si la tabla existe)
    try {
      const service = getServiceClient()
      if (service) {
        await service.from('contact_messages').insert([
          {
            nombre,
            email,
            descripcion,
            destinatario: 'postulauysoporte@gmail.com',
            estado: 'recibido',
          },
        ])
      }
    } catch (dbErr) {
      console.warn('[ContactAPI] No se pudo guardar en Supabase (tabla contact_messages pendiente):', dbErr)
    }

    // 2. Enviar el correo electrónico
    const emailResult = await sendContactEmail({
      nombre,
      email,
      descripcion,
    })

    return NextResponse.json({
      success: true,
      message: '¡Tu mensaje ha sido enviado correctamente! Nos pondremos en contacto a la brevedad.',
      emailResult,
    })
  } catch (err: any) {
    console.error('[ContactAPI] Error:', err)
    return NextResponse.json(
      { error: err.message || 'Ocurrió un error al procesar tu mensaje. Intenta nuevamente.' },
      { status: 500 }
    )
  }
}
