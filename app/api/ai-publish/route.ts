import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { parseInformalJobWithAI } from '@/lib/data'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    let jobData: any = {}

    // Si le envían texto libre crudo (como el texto copiado de clasificados o WhatsApp)
    if (body.text && typeof body.text === 'string') {
      const parsed = parseInformalJobWithAI(body.text)
      jobData = {
        ...parsed,
        activo: true,
      }
    } else if (body.cargo) {
      // Si el agente de IA ya envía los datos estructurados
      jobData = {
        titulo: body.titulo || (body.zona ? `${body.cargo} (${body.zona})` : body.cargo),
        cargo: body.cargo,
        rubro: body.rubro || 'General',
        zona: body.zona || null,
        horario: body.horario || null,
        descripcion: body.descripcion || body.text || body.cargo,
        whatsapp: body.whatsapp || body.contacto_whatsapp || null,
        telefono: body.telefono || null,
        email: body.email || null,
        direccion: body.direccion || null,
        contacto_whatsapp: body.whatsapp || body.contacto_whatsapp || null,
        contacto_indicaciones: body.contacto_indicaciones || null,
        salario: body.salario || null,
        raw_text: body.raw_text || body.text || null,
        activo: true,
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Debes enviar un campo "text" con el aviso para que la IA lo interprete, o los campos estructurados.',
        },
        { status: 400 }
      )
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
        message: 'Aviso de empleo publicado exitosamente',
        job: data,
      })
    }

    return NextResponse.json({
      success: true,
      simulated: true,
      message: 'Aviso interpretado con éxito',
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
      text: 'CHOFERES para taxi diurno nocturno o trabajar solo, radio taxi 141 con o sin experiencia; enviar foto de libreta al WhatsApp cel 093609479 - 094920807 Cod.Web.298982761',
    },
  })
}
