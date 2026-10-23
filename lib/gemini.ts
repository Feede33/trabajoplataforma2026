import https from 'node:https'

export interface ExtractedInformalJob {
  titulo: string
  cargo: string
  rubro: string
  zona: string | null
  horario: string | null
  descripcion: string
  whatsapp: string | null
  telefono: string | null
  email: string | null
  direccion: string | null
  salario: string | null
  contacto_indicaciones: string | null
  raw_text?: string | null
}

const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
]

const SYSTEM_EXTRACTION_PROMPT = `
Eres un asistente experto en digitalizar avisos clasificados y ofertas de trabajo para Uruguay (Montevideo e Interior).
Tu tarea es analizar el texto o la imagen de avisos de empleo (pueden ser recortes de diarios clasificados como El Gallito Luis, avisos pegados en vidrieras, capturas de pantalla de historias de Instagram, Facebook o chats de WhatsApp).

IMPORTANTE: Si en una misma imagen o texto hay MÁS DE UN aviso de empleo, debes extraer CADA UNO por separado en el array JSON.

Devuelve EXCLUSIVAMENTE un array JSON válido con la siguiente estructura para cada empleo:
[
  {
    "titulo": "Título atractivo y conciso (ej: 'Ayudante de Cocina - Pocitos')",
    "cargo": "Puesto o vacante principal (ej: 'Ayudante de Cocina', 'Cadete con moto', 'Mozo/a', 'Cajera', 'Peón')",
    "rubro": "Debe ser uno de: 'Gastronomía', 'Limpieza', 'Construcción', 'Comercio', 'Logística', 'Administración', 'Atención al Cliente', 'Belleza y Cuidado', 'Seguridad', o 'General'",
    "zona": "Barrio de Montevideo o localidad/departamento del Interior si se menciona (ej: 'Paso Molino', 'Pocitos', 'Centro', 'Las Piedras', 'Ciudad de la Costa'). Si no se menciona o no es claro, usa null",
    "horario": "Días y horarios de trabajo si se mencionan (ej: 'Turno tarde 14:00 a 22:00', 'Lunes a viernes 8hs'). Si no, null",
    "descripcion": "Descripción clara, prolija y completa de las tareas y requisitos del aviso.",
    "whatsapp": "Número de WhatsApp limpio en formato uruguayo estándar (ej: '099123456', '094920807') o null si no hay",
    "telefono": "Teléfono fijo o celular para llamadas comunes o null si coincide con whatsapp o no hay",
    "email": "Correo electrónico de contacto o null si no hay",
    "direccion": "Dirección física para presentarse (si el aviso dice presentarse en tal calle o local) o null",
    "salario": "Sueldo o jornal estimado si se especifica (ej: '$28.000', 'Leyes sociales', 'A convenir'). Si no se menciona, null",
    "contacto_indicaciones": "Indicaciones adicionales (ej: 'Enviar CV con foto al WhatsApp', 'Presentarse de 9 a 12 hs con libreta de conducir', 'Llamar solo en horario comercial') o null"
  }
]

Reglas:
1. Sé muy preciso extrayendo teléfonos y números de WhatsApp uruguayos (suelen empezar con 09 o tener 8 o 9 dígitos).
2. Si un aviso busca varios puestos afines (ej: "Se precisa Bachero y Ayudante de Cocina"), puedes poner el cargo combinado o separar si son totalmente distintos.
3. El campo rubro debe categorizarse lógicamente.
4. Responde ÚNICAMENTE con la estructura JSON, sin markdown adicional ni comentarios.
`

function makeHttpsPost(urlStr: string, payload: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr)
    const postData = JSON.stringify(payload)

    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        rejectUnauthorized: false, // Evita conflictos con certificados de antivirus/proxies en Windows
        timeout: 60000,
      },
      (res) => {
        let responseBody = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          responseBody += chunk
        })
        res.on('end', () => {
          try {
            const parsed = JSON.parse(responseBody)
            resolve({ statusCode: res.statusCode || 200, data: parsed })
          } catch (e) {
            reject(new Error(`Respuesta no es JSON válido (Status ${res.statusCode}): ${responseBody.slice(0, 200)}`))
          }
        })
      }
    )

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Tiempo de espera agotado al conectar con Google Gemini (timeout 60s)'))
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.write(postData)
    req.end()
  })
}

async function callGemini(contents: any[]): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Falta la variable de entorno GEMINI_API_KEY en el servidor (.env.local)')
  }

  let lastError: any = null

  for (const model of CANDIDATE_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

      const payload = {
        contents,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      }

      const { statusCode, data } = await makeHttpsPost(url, payload)

      if (statusCode !== 200) {
        // Si el modelo está con alta demanda (503) o no existe (404), intentamos el siguiente
        if (statusCode === 503 || statusCode === 404 || statusCode === 429) {
          lastError = new Error(`Modelo ${model} no disponible (${statusCode}): ${data?.error?.message || 'Error temporal'}`)
          continue
        }
        throw new Error(`Error en API Gemini (${statusCode}): ${data?.error?.message || 'Desconocido'}`)
      }

      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!rawText) {
        throw new Error('Gemini no devolvió texto en la respuesta')
      }

      // Limpiar posibles bloques markdown si Gemini añade ```json ... ```
      const cleanedText = rawText.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      return JSON.parse(cleanedText)
    } catch (err: any) {
      console.warn(`Intento fallido con modelo ${model}:`, err.message)
      lastError = err
    }
  }

  throw lastError || new Error('No se pudo comunicar con ningún modelo de Gemini disponible')
}

/**
 * Interpreta una imagen (recorte de diario, foto, captura de WhatsApp) y extrae las ofertas de empleo
 */
export async function extractJobsFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedInformalJob[]> {
  let cleanBase64 = imageBase64
  let detectedMime = mimeType

  if (imageBase64.includes(';base64,')) {
    const parts = imageBase64.split(';base64,')
    const matchMime = parts[0].match(/data:(image\/[a-zA-Z0-9\+\-\.]+)/)
    if (matchMime) {
      detectedMime = matchMime[1]
    }
    cleanBase64 = parts[1]
  }

  // Normalizar formatos de MIME para la API de Gemini
  if (detectedMime === 'image/jpg') {
    detectedMime = 'image/jpeg'
  }

  // Eliminar espacios en blanco o saltos de línea de la cadena base64
  cleanBase64 = cleanBase64.replace(/\s+/g, '')

  const contents = [
    {
      parts: [
        { text: SYSTEM_EXTRACTION_PROMPT + '\nAnaliza la imagen adjunta y extrae todos los avisos de empleo:' },
        {
          inline_data: {
            mime_type: detectedMime,
            data: cleanBase64,
          },
        },
      ],
    },
  ]

  const result = await callGemini(contents)
  return Array.isArray(result) ? result : [result]
}

/**
 * Interpreta texto crudo (copiado de WhatsApp o clasificados) y extrae las ofertas de empleo
 */
export async function extractJobsFromText(text: string): Promise<ExtractedInformalJob[]> {
  const contents = [
    {
      parts: [
        {
          text:
            SYSTEM_EXTRACTION_PROMPT +
            `\nAnaliza el siguiente texto y extrae todos los avisos de empleo:\n\n${text.trim()}`,
        },
      ],
    },
  ]

  const result = await callGemini(contents)
  return Array.isArray(result) ? result : [result]
}
