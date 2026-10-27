if (typeof process !== 'undefined' && process.env) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

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
  fecha_detectada?: string | null
  raw_text?: string | null
}

export const CANDIDATE_MODELS = [
  'gemini-3-flash-preview',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
]

const SYSTEM_EXTRACTION_PROMPT = `
Eres un asistente experto en digitalizar avisos clasificados y ofertas de trabajo para Uruguay (Montevideo e Interior).
Tu tarea es analizar el texto, conversación de chat o imagen (pueden ser recortes de diarios clasificados como El Gallito Luis, avisos en vidrieras, capturas de pantalla o conversaciones enteras copiadas de grupos de WhatsApp/Telegram/Facebook).

IMPORTANTE - FILTRADO INTELIGENTE DE CONVERSACIONES:
1. Si el contenido es una conversación entre varias personas, FILTRA Y DESCARTA todos los mensajes que NO sean ofertas de empleo reales:
   - DESCARTA personas que están pidiendo o buscando trabajo para sí mismas (ej: "Hola busco trabajo de limpieza", "Me ofrezco como cuidadora", "Alguien sabe de algún empleo").
   - DESCARTA saludos, agradecimientos, preguntas ("info", "sigue disponible?", "cuánto pagan?", "pasame número"), charlas casuales o spam.
   - DESCARTA ofertas que en la misma conversación se aclara que ya fueron cubiertas o cerradas (ej: "Ya se cubrió la vacante", "No llamen más").
   - EXTRAE ÚNICAMENTE las publicaciones donde un empleador, comercio o intermediario ofrece una vacante o puesto de trabajo real.
2. Si hay MÁS DE UNA oferta de empleo válida, extrae CADA UNA por separado en el array JSON. Si ninguna parte del texto es una oferta real, devuelve un array vacío [].
3. INTERPRETACIÓN DE FECHAS Y REMITENTES EN CHATS:
   - Si el mensaje tiene fecha/hora (ej: "[23/10/2026, 14:30]" o referencias como "hoy", "ayer"), evalúa qué tan reciente es respecto a la fecha actual indicada y resúmelo en el campo "fecha_detectada" (ej: "Hoy 14:30 (23/10)", "Ayer (22/10)", "Hace 3 días (20/10)").
   - Si un mensaje de WhatsApp no menciona un teléfono en el cuerpo del texto pero en el encabezado del mensaje aparece el número del remitente que publicó la oferta (ej: "[23/10/2026 14:30] +598 99 123 456: Preciso peón..."), utiliza ese número de remitente como "whatsapp" limpio en formato uruguayo (ej: "099123456").

Devuelve EXCLUSIVAMENTE un array JSON válido con la siguiente estructura para cada empleo válido:
[
  {
    "titulo": "Título atractivo y conciso (ej: 'Ayudante de Cocina - Pocitos')",
    "cargo": "Puesto o vacante principal (ej: 'Ayudante de Cocina', 'Cadete con moto', 'Mozo/a', 'Cajera', 'Peón')",
    "rubro": "Debe ser uno de: 'Gastronomía', 'Limpieza', 'Construcción', 'Comercio', 'Logística', 'Administración', 'Atención al Cliente', 'Belleza y Cuidado', 'Seguridad', o 'General'",
    "zona": "Barrio de Montevideo o localidad/departamento del Interior si se menciona (ej: 'Paso Molino', 'Pocitos', 'Centro', 'Las Piedras', 'Ciudad de la Costa'). Si no se menciona o no es claro, usa null",
    "horario": "Días y horarios de trabajo si se mencionan (ej: 'Turno tarde 14:00 a 22:00', 'Lunes a viernes 8hs'). Si no, null",
    "descripcion": "Descripción clara, prolija y completa de las tareas, de qué trata el empleo y requisitos del aviso.",
    "whatsapp": "Número de WhatsApp limpio en formato uruguayo estándar (ej: '099123456', '094920807') o null si no hay",
    "telefono": "Teléfono fijo o celular para llamadas comunes o null si coincide con whatsapp o no hay",
    "email": "Correo electrónico de contacto o null si no hay",
    "direccion": "Dirección física para presentarse (si el aviso dice presentarse en tal calle o local) o null",
    "salario": "Sueldo o jornal estimado si se especifica (ej: '$28.000', 'Leyes sociales', 'A convenir'). Si no se menciona, null",
    "contacto_indicaciones": "Indicaciones adicionales (ej: 'Enviar CV con foto al WhatsApp', 'Presentarse de 9 a 12 hs con libreta de conducir', 'Llamar solo en horario comercial') o null",
    "fecha_detectada": "Fecha/hora y antigüedad detectada en el chat o aviso (ej: 'Hoy 14:30 (Reciente)', '22/10/2026 (Ayer)') o null si no figura fecha"
  }
]

Reglas adicionales:
1. Sé muy preciso extrayendo teléfonos y números de WhatsApp uruguayos (suelen empezar con 09 o tener 8 o 9 dígitos; convierte '+598 9X XXX XXX' a '09XXXXXXX').
2. Si un aviso busca varios puestos afines (ej: "Se precisa Bachero y Ayudante de Cocina"), puedes poner el cargo combinado o separar si son totalmente distintos.
3. El campo rubro debe categorizarse lógicamente.
4. Responde ÚNICAMENTE con la estructura JSON, sin markdown adicional ni comentarios.
`

export function makeHttpsPost(urlStr: string, payload: any): Promise<{ statusCode: number; data: any }> {
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
        timeout: 35000,
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
      reject(new Error('Tiempo de espera agotado al conectar con Google Gemini (timeout 35s)'))
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.write(postData)
    req.end()
  })
}

export async function callGemini(contents: any[]): Promise<any> {
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

  const nowUy = new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' })

  const contents = [
    {
      parts: [
        {
          text:
            SYSTEM_EXTRACTION_PROMPT +
            `\nFecha y hora actual de referencia en Uruguay: ${nowUy}.\nAnaliza la imagen adjunta y extrae únicamente las ofertas reales de empleo:`,
        },
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
  const nowUy = new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' })

  const contents = [
    {
      parts: [
        {
          text:
            SYSTEM_EXTRACTION_PROMPT +
            `\nFecha y hora actual de referencia en Uruguay: ${nowUy}.\nAnaliza el siguiente texto o conversación, descarta los mensajes que no sean ofertas de trabajo reales, evalúa qué tan recientes son y extrae todas las ofertas de empleo válidas:\n\n${text.trim()}`,
        },
      ],
    },
  ]

  const result = await callGemini(contents)
  return Array.isArray(result) ? result : [result]
}

export interface ExtractedCompanyContact {
  nombre: string
  whatsapp: string
  categoria: string
  zona?: string | null
  nota?: string | null
}

const COMPANY_CONTACTS_EXTRACTION_PROMPT = `
Eres un asistente experto en digitalizar listas de contactos y directorios de empresas para Uruguay.
Tu tarea es analizar la imagen o texto (que pueden ser planillas, fotos de carteleras, volantes, capturas de chats de WhatsApp o directorios de empresas) y extraer todas las empresas, comercios o servicios con sus teléfonos o WhatsApp de contacto.

IMPORTANTE: Extrae CADA empresa por separado en el array JSON. Si hay múltiples empresas en la imagen o texto, debes extraer todas individualmente.

Devuelve EXCLUSIVAMENTE un array JSON válido con la siguiente estructura para cada empresa:
[
  {
    "nombre": "Nombre de la empresa o negocio (ej: 'Limpiezas Pro', 'Distribuidora del Plata', 'Pinturas Morales')",
    "whatsapp": "Número de teléfono o WhatsApp uruguayo limpio (ej: '099123456', '094920807', '29001234')",
    "categoria": "Categoría o rubro principal. Debe ser preferentemente uno de: 'Limpieza', 'Gastronomía', 'Logística / Fletes', 'Construcción', 'Administración', 'Comercio / Ventas', 'Seguridad', 'Mantenimiento', u 'Otro'",
    "zona": "Ciudad, departamento o barrio si se menciona (ej: 'Montevideo', 'Canelones', 'Pocitos', 'Maldonado'). Si no se menciona, usa null",
    "nota": "Breve descripción de los servicios o perfil de personal que buscan si se indica en el texto. Si no, usa null"
  }
]

Reglas:
1. Sé muy preciso extrayendo números de celular y WhatsApp uruguayos (generalmente 9 dígitos comenzando con 09, o fijos de 8 dígitos).
2. Si una empresa tiene varios números, extrae el principal apto para WhatsApp o llamadas.
3. El nombre debe ser prolijo y representativo.
4. Responde ÚNICAMENTE con la estructura JSON, sin markdown adicional ni comentarios.
`

/**
 * Interpreta una imagen con listados o volantes de empresas y extrae contactos
 */
export async function extractCompanyContactsFromImage(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<ExtractedCompanyContact[]> {
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

  if (detectedMime === 'image/jpg') {
    detectedMime = 'image/jpeg'
  }

  cleanBase64 = cleanBase64.replace(/\s+/g, '')

  const contents = [
    {
      parts: [
        { text: COMPANY_CONTACTS_EXTRACTION_PROMPT + '\nAnaliza la imagen adjunta y extrae todos los contactos de empresas:' },
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
 * Interpreta texto con listado de empresas y extrae contactos
 */
export async function extractCompanyContactsFromText(text: string): Promise<ExtractedCompanyContact[]> {
  const contents = [
    {
      parts: [
        {
          text:
            COMPANY_CONTACTS_EXTRACTION_PROMPT +
            `\nAnaliza el siguiente texto y extrae todos los contactos de empresas:\n\n${text.trim()}`,
        },
      ],
    },
  ]

  const result = await callGemini(contents)
  return Array.isArray(result) ? result : [result]
}
export interface ExtractedExternalJob {
  titulo: string
  empresa_nombre: string
  empresa_logo?: string | null
  descripcion: string
  rubro: string
  zona: string
  modalidad: 'presencial' | 'remoto' | 'hibrido'
  tipo_contrato: 'full-time' | 'part-time' | 'freelance' | 'pasantia'
  salario_rango?: string | null
  tags: string[]
  url_postulacion_externa: string
  fuente?: string | null
}


function cleanJobContent(raw: string): string {
  if (!raw) return ''
  return raw
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const EXTERNAL_JOBS_EXTRACTION_PROMPT = `
Eres un asistente experto en recopilación, estructuración y normalización de ofertas de empleo formales para Uruguay (Montevideo e Interior).
Tu tarea es analizar el texto, contenido Markdown o HTML extraído de una página web corporativa, portal de empleo o aviso clasificado y estructurar cada vacante de trabajo válida.

REGLAS DE EXTRACCIÓN Y NORMALIZACIÓN:
1. Extrae únicamente ofertas reales de empleo donde una empresa u organización esté buscando personal.
2. Descarta contenido no relacionado (menús de navegación, políticas de privacidad, enlaces genéricos, promociones o testimonios).
3. Si en el contenido hay más de una vacante, extrae CADA UNA como un elemento independiente del array. Si no hay ofertas de empleo reales, devuelve un array vacío [].
4. "titulo": Título claro, prolijo y conciso del puesto (ej: "Desarrollador Full Stack Node/React", "Analista Contable Senior", "Cajero / Repositor", "Ejecutivo de Ventas").
5. "empresa_nombre": Nombre exacto de la empresa empleadora (ej: "Mercado Libre", "Tienda Inglesa", "Ta-Ta", "PedidosYa", "Banco Santander", "dLocal", "Globant", "Zonamerica"). Si no se menciona explícitamente pero se deduce claramente del contexto o de la URL, indícalo.
6. "empresa_logo": URL del logo si aparece en el texto o null.
7. "rubro": Debe ser uno de los rubros oficiales de PostulaUY:
   - "Tecnología", "Administración", "Comercio", "Gastronomía", "Logística", "Salud", "Educación", "Construcción", "Atención al Cliente", "Marketing", "Recursos Humanos", o "General".
8. "zona": Departamento o barrio de Uruguay (ej: "Montevideo", "Pocitos", "Aguada", "Canelones", "Maldonado", "Punta del Este", "Interior"). Si la modalidad es remota y no especifica zona, usa "Uruguay (Remoto)".
9. "modalidad": Debe ser estrictamente uno de: "presencial", "remoto", "hibrido".
10. "tipo_contrato": Debe ser estrictamente uno de: "full-time", "part-time", "freelance", "pasantia".
11. "descripcion": Descripción prolija, atractiva y completa en formato Markdown con subtítulos como ## Responsabilidades y ## Requisitos, usando viñetas con guiones (-).
12. "salario_rango": Rango o monto salarial si se menciona (ej: "$50.000 - $70.000 líquidos", "A convenir"). Si no se especifica, null.
13. "tags": Array con 3 a 5 palabras clave representativas (ej: ["React", "TypeScript", "Node.js"] o ["Excel", "Facturación", "Conciliaciones"]).
14. "url_postulacion_externa": La URL directa donde el candidato puede postularse (debe comenzar con http:// o https://). Si se proporcionó una URL de origen y no hay enlace específico, usa la URL de origen.
15. "fuente": Nombre del portal o portal origen (ej: "Web de la empresa", "SmartTalent", "LinkedIn", "Computrabajo", etc.).

Devuelve EXCLUSIVAMENTE un array JSON válido sin ningún texto explicativo adicional:
[
  {
    "titulo": "string",
    "empresa_nombre": "string",
    "empresa_logo": null,
    "descripcion": "string (en markdown prolijo)",
    "rubro": "string",
    "zona": "string",
    "modalidad": "presencial" | "remoto" | "hibrido",
    "tipo_contrato": "full-time" | "part-time" | "freelance" | "pasantia",
    "salario_rango": "string" | null,
    "tags": ["tag1", "tag2"],
    "url_postulacion_externa": "string",
    "fuente": "string"
  }
]
`

/**
 * Analiza texto/markdown extraído de una web externa y extrae ofertas de empleo estructuradas
 */
export async function extractExternalJobsFromContent(
  content: string,
  sourceUrl?: string,
  companyHint?: string
): Promise<ExtractedExternalJob[]> {
  const promptContext = [
    EXTERNAL_JOBS_EXTRACTION_PROMPT,
    sourceUrl ? `URL de origen de la página: ${sourceUrl}` : '',
    companyHint ? `Empresa sugerida o contexto: ${companyHint}` : '',
    `\nCONTENIDO A ANALIZAR:\n\n${cleanJobContent(content).slice(0, 12000)}`,
  ]
    .filter(Boolean)
    .join('\n')

  const contents = [
    {
      parts: [{ text: promptContext }],
    },
  ]

  const result = await callGemini(contents)
  const items = Array.isArray(result) ? result : [result]

  return items.map((item: any) => ({
    titulo: String(item.titulo || 'Vacante de Empleo').trim(),
    empresa_nombre: String(item.empresa_nombre || companyHint || 'Empresa').trim(),
    empresa_logo: item.empresa_logo || null,
    descripcion: String(item.descripcion || '').trim(),
    rubro: String(item.rubro || 'General').trim(),
    zona: String(item.zona || 'Montevideo').trim(),
    modalidad: ['presencial', 'remoto', 'hibrido'].includes(item.modalidad) ? item.modalidad : 'presencial',
    tipo_contrato: ['full-time', 'part-time', 'freelance', 'pasantia'].includes(item.tipo_contrato) ? item.tipo_contrato : 'full-time',
    salario_rango: item.salario_rango || null,
    tags: Array.isArray(item.tags) ? item.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
    url_postulacion_externa: String(item.url_postulacion_externa || sourceUrl || '').trim(),
    fuente: item.fuente || (sourceUrl ? new URL(sourceUrl).hostname : 'Web Externa'),
  }))
}
