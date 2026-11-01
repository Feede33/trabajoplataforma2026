import React from 'react'

interface FormattedJobDescriptionProps {
  content: string
  className?: string
}

/**
 * Desescapa secuencias Markdown escapadas por Jina/Turndown (ej: "1\.", "\-", "\*", "\#")
 */
function normalizeEscapedMarkdown(raw: string): string {
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\\([.*#\-+_~()[\]])/g, '$1')
}

/**
 * Parsea formato inline Markdown (**negrita**, *cursiva*, `código` y [enlaces](url))
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return []

  const tokenRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*]+)\*)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[2] && match[3]) {
      parts.push(
        <a
          key={match.index}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
        >
          {match[2]}
        </a>
      )
    } else if (match[4] || match[5]) {
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
          {match[4] || match[5]}
        </strong>
      )
    } else if (match[6]) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
        >
          {match[6]}
        </code>
      )
    } else if (match[7]) {
      parts.push(
        <em key={match.index} className="italic text-slate-800 dark:text-slate-200">
          {match[7]}
        </em>
      )
    }

    lastIndex = tokenRegex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

const SECTION_HEADING_REGEX =
  /^(?:objetivos?(?: del (?:rol|puesto|cargo))?|responsabilidades(?: principales)?|principales (?:tareas|responsabilidades|funciones)|funciones(?: principales| del puesto| del cargo)?|tareas(?: principales| a realizar)?|requisitos(?: del (?:puesto|cargo|rol)| excluyentes| deseables)?|requerimientos|perfil(?: buscado| requerido| del candidato)?|¿?qu[eé] (?:buscamos|ofrecemos|necesitas|har[aá]s)\??|se ofrece|ofrecemos|beneficios|condiciones(?: laborales| de trabajo)?|acerca (?:de la empresa|del puesto|del rol)|sobre (?:nosotros|la empresa|el rol|el puesto))$/i

const SUBHEADING_REGEX =
  /^(?:formaci[oó]n(?: acad[eé]mica)?|educaci[oó]n|experiencia(?: laboral| previa| requerida)?|habilidades(?: y competencias| blandas| t[eé]cnicas)?|competencias(?: clave)?|conocimientos(?: t[eé]cnicos)?|idiomas|horario(?: de trabajo)?|zona(?: de trabajo)?|ubicaci[oó]n|modalidad|se valora(?:r[aá])?|excluyente|deseable)$/i

function isAllCapsHeading(line: string): boolean {
  const clean = line.replace(/[:\s\-–—/0-9()]/g, '')
  if (clean.length < 4 || line.length > 75) return false
  if (/[.;]$/.test(line)) return false
  return clean === clean.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(clean)
}

export function FormattedJobDescription({ content, className = '' }: FormattedJobDescriptionProps) {
  if (!content || !content.trim()) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        Sin descripción detallada disponible.
      </p>
    )
  }

  const normalized = normalizeEscapedMarkdown(content)
  const rawLines = normalized.split('\n').map((l) => l.trim())
  // Filtrar líneas vacías consecutivas manteniendo estructura
  const nonEmptyNextLine = (fromIdx: number): string => {
    for (let i = fromIdx + 1; i < rawLines.length; i++) {
      if (rawLines[i]) return rawLines[i]
    }
    return ''
  }

  const blocks: React.ReactNode[] = []
  let currentBullets: string[] = []
  let currentNumbered: Array<{ num: string; text: string }> = []

  const flushBullets = (keyPrefix: string) => {
    if (currentBullets.length > 0) {
      blocks.push(
        <ul key={`ul-${keyPrefix}`} className="space-y-2 my-2 pl-1">
          {currentBullets.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
            >
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0" />
              <span className="flex-1">{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ul>
      )
      currentBullets = []
    }
  }

  const flushNumbered = (keyPrefix: string) => {
    if (currentNumbered.length > 0) {
      blocks.push(
        <ol key={`ol-${keyPrefix}`} className="space-y-2 my-2 pl-1">
          {currentNumbered.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
            >
              <span className="mt-0.5 w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                {item.num}
              </span>
              <span className="flex-1">{renderInlineMarkdown(item.text)}</span>
            </li>
          ))}
        </ol>
      )
      currentNumbered = []
    }
  }

  const flushLists = (keyPrefix: string) => {
    flushBullets(keyPrefix)
    flushNumbered(keyPrefix)
  }

  const renderSectionHeading = (title: string, key: string) => {
    flushLists(key)
    const cleanTitle = title.replace(/^[#*-\s]+|[#*:\s]+$/g, '').trim()
    blocks.push(
      <h3
        key={`h3-${key}`}
        className={`text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 ${
          blocks.length > 0 ? 'pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80' : ''
        }`}
      >
        <span className="w-1 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
        <span>{renderInlineMarkdown(cleanTitle)}</span>
      </h3>
    )
  }

  const renderSubheading = (title: string, key: string, badgeNum?: string) => {
    flushLists(key)
    const cleanTitle = title.replace(/^[#*-\s]+|[#*:\s]+$/g, '').trim()
    blocks.push(
      <h4
        key={`h4-${key}`}
        className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200 pt-2 flex items-center gap-2"
      >
        {badgeNum ? (
          <span className="w-5 h-5 rounded-md bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-extrabold flex items-center justify-center shrink-0">
            {badgeNum}
          </span>
        ) : (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
        )}
        <span>{renderInlineMarkdown(cleanTitle)}</span>
      </h4>
    )
  }

  rawLines.forEach((line, lineIdx) => {
    const key = String(lineIdx)
    if (!line) {
      flushLists(key)
      return
    }

    const strippedForTest = line.replace(/^\*\*|\*\*$/g, '').replace(/:$/, '').trim()

    // 1. Encabezado Markdown explícito (#, ##, ###, ####)
    const mdHeadingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (mdHeadingMatch) {
      renderSectionHeading(mdHeadingMatch[2], key)
      return
    }

    // 2. Encabezado en MAYÚSCULAS o título de sección clásico ("RESPONSABILIDADES PRINCIPALES", "Requisitos:", "¿Qué buscamos?")
    if (isAllCapsHeading(strippedForTest) || SECTION_HEADING_REGEX.test(strippedForTest)) {
      renderSectionHeading(strippedForTest, key)
      return
    }

    // 3. Subtítulo conocido ("Formación académica", "Experiencia", "Habilidades y competencias") o línea entera en **negrita**
    const boldHeadingMatch = line.match(/^\*\*([^*]{2,70})\*\*:?$/)
    if (boldHeadingMatch || SUBHEADING_REGEX.test(strippedForTest)) {
      const text = boldHeadingMatch ? boldHeadingMatch[1] : strippedForTest
      renderSubheading(text, key)
      return
    }

    // 4. Línea corta tipo subtítulo (< 48 caracteres, sin punto final) seguida inmediatamente por una lista de viñetas
    const nextLine = nonEmptyNextLine(lineIdx)
    if (
      line.length <= 48 &&
      !/[.;,!]$/.test(line) &&
      !/^[-*•–—\d]/.test(line) &&
      /^[-*•–—]\s+/.test(nextLine)
    ) {
      renderSubheading(strippedForTest, key)
      return
    }

    // 5. Viñetas (- item, * item, • item, – item)
    const bulletMatch = line.match(/^[-*•–—›✓✔]\s+(.+)$/)
    if (bulletMatch) {
      flushNumbered(key)
      currentBullets.push(bulletMatch[1].trim())
      return
    }

    // 6. Ítems o subtítulos numerados ("1. Prospección y desarrollo de cartera")
    const numberedMatch = line.match(/^(\d+)[.)]\s+(.+)$/)
    if (numberedMatch) {
      const num = numberedMatch[1]
      const itemText = numberedMatch[2].trim()
      // Si el ítem numerado es un título corto seguido por viñetas (- ...), renderizarlo como subtítulo numerado
      if (itemText.length <= 85 && !/[.]$/.test(itemText) && /^[-*•–—]\s+/.test(nextLine)) {
        renderSubheading(itemText, key, num)
      } else {
        flushBullets(key)
        currentNumbered.push({ num, text: itemText })
      }
      return
    }

    // 7. Línea con "**Etiqueta:** Valor" en la misma línea
    const inlineLabelMatch = line.match(/^([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s/]{2,32}):\s+(.+)$/)
    if (inlineLabelMatch && !line.startsWith('http')) {
      flushLists(key)
      blocks.push(
        <p
          key={`lbl-${key}`}
          className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
        >
          <strong className="font-bold text-slate-900 dark:text-white">
            {inlineLabelMatch[1]}:{' '}
          </strong>
          <span>{renderInlineMarkdown(inlineLabelMatch[2])}</span>
        </p>
      )
      return
    }

    // 8. Párrafo normal (cada línea independiente como su propio párrafo para no pegar oraciones sueltas)
    flushLists(key)
    blocks.push(
      <p
        key={`p-${key}`}
        className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
      >
        {renderInlineMarkdown(line)}
      </p>
    )
  })

  flushLists('end')

  return <div className={`space-y-2.5 ${className}`}>{blocks}</div>
}
