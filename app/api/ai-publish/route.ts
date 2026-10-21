import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseInformalJobWithAI } from '@/lib/data'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    let jobData: any = {}

    // Si le envían texto libre crudo (como el texto copiado de WhatsApp o Facebook)
    if (body.text && typeof body.text === 'string') {
      const parsed = parseInformalJobWithAI(body.text)
      jobData = {
        ...parsed,
        salario: body.salario || 'A convenir',
        activo: true,
      }
    } else if (body.cargo && body.zona && body.contacto_whatsapp) {
      // Si el agente de IA ya envía los datos estructurados
      jobData = {
        titulo: body.titulo || `${body.cargo} en ${body.zona}`,
        cargo: body.cargo,
        rubro: body.rubro || 'General',
        zona: body.zona,
        horario: body.horario || 'A convenir',
        descripcion: body.descripcion || body.text || `${body.cargo} en ${body.zona}`,
        contacto_whatsapp: body.contacto_whatsapp,
        contacto_indicaciones: body.contacto_indicaciones || 'Contactar por WhatsApp',
        salario: body.salario || null,
        raw_text: body.raw_text || body.text || null,
        activo: true,
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Debes enviar un campo "text" con el aviso para que la IA lo interprete, o los campos estructurados (cargo, zona, contacto_whatsapp).',
        },
        { status: 400 }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (url && key && !url.includes('your-supabase-project')) {
      const supabase = createClient(url, key)
      const { data, error } = await supabase
        .from('informal_jobs')
        .insert([jobData])
        .select()
        .single()

      if (error) {
        console.error('Error insertando empleo informal vía API:', error)
        return NextResponse.json(
          { error: 'Error guardando en la base de datos: ' + error.message, parsedPreview: jobData },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Aviso de empleo informal publicado exitosamente',
        job: data,
      })
    }

    return NextResponse.json({
      success: true,
      simulated: true,
      message: 'Aviso interpretado con éxito (Supabase no configurado en entorno)',
      job: {
        id: 'inf-' + Date.now(),
        ...jobData,
        created_at: new Date().toISOString(),
      },
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
    description: 'Endpoint de ingesta de avisos informales para IA',
    examplePayload: {
      text: 'Estamos buscando personal para local de comidas, ubicado en la zona del Paso Molino, para el turno vespertino 17 a 01am.\nPara el cargo : CAJERA\nNuestro contacto para enviar cv es:\nWhatsApp ( no llamar porfavor)\n* 092327302 •.',
    },
  })
}
