import { NextResponse } from 'next/server'
import {
  extractCompanyContactsFromImage,
  extractCompanyContactsFromText,
  ExtractedCompanyContact,
} from '@/lib/gemini'
import { getAuthedContext, isBackendConfigured } from '@/lib/server/auth'

export async function POST(request: Request) {
  try {
    const backendReady = isBackendConfigured()

    // Solo los administradores pueden usar la extracción masiva de empresas
    if (backendReady) {
      const ctx = await getAuthedContext(request)
      if (!ctx) {
        return NextResponse.json(
          { error: 'No autorizado. Debes iniciar sesión como administrador.' },
          { status: 401 }
        )
      }
      if (!ctx.isAdmin) {
        return NextResponse.json(
          { error: 'Acceso denegado. Solo administradores pueden importar contactos de empresas.' },
          { status: 403 }
        )
      }
    }

    const body = await request.json()
    const { image, mimeType, text } = body

    let extracted: ExtractedCompanyContact[] = []

    if (image && typeof image === 'string') {
      extracted = await extractCompanyContactsFromImage(image, mimeType || 'image/jpeg')
    } else if (text && typeof text === 'string' && text.trim().length > 0) {
      extracted = await extractCompanyContactsFromText(text)
    } else {
      return NextResponse.json(
        { error: 'Debes proporcionar una imagen o texto con datos de empresas.' },
        { status: 400 }
      )
    }

    if (!extracted || extracted.length === 0) {
      return NextResponse.json(
        { error: 'No se detectaron contactos de empresas en el contenido proporcionado.' },
        { status: 422 }
      )
    }

    return NextResponse.json({
      success: true,
      count: extracted.length,
      contacts: extracted,
    })
  } catch (err: any) {
    console.error('Error en /api/admin/company-contacts-ai:', err)
    return NextResponse.json(
      { error: err.message || 'Error procesando contactos con IA' },
      { status: 500 }
    )
  }
}
