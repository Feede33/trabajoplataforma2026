import React from 'react'

interface FormattedJobDescriptionProps {
  content: string
  className?: string
}

/**
 * Parsea formato inline Markdown (**negrita**, *cursiva*, `código` y [enlaces](url))
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  if (!text) return []

  // Tokenizar enlaces [texto](url), negritas **texto** o __texto__, y código `texto`
  const tokenRegex = /(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|`([^`]+)`|\*([^*]+)\*)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    if (match[2] && match[3]) {
      // Enlace [texto](url)
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
      // Negrita **texto** o __texto__
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900 dark:text-white">
          {match[4] || match[5]}
        </strong>
      )
    } else if (match[6]) {
      // Código `texto`
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
        >
          {match[6]}
        </code>
      )
    } else if (match[7]) {
      // Cursiva *texto*
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

export function FormattedJobDescription({ content, className = '' }: FormattedJobDescriptionProps) {
  if (!content || !content.trim()) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400 italic">
        Sin descripción detallada disponible.
      </p>
    )
  }

  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: React.ReactNode[] = []

  let currentBullets: string[] = []
  let currentNumbered: string[] = []
  let currentParagraph: string[] = []

  const flushParagraph = (keyPrefix: string) => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim()
      if (text) {
        blocks.push(
          <p
            key={`p-${keyPrefix}`}
            className="text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
          >
            {renderInlineMarkdown(text)}
          </p>
        )
      }
      currentParagraph = []
    }
  }

  const flushBullets = (keyPrefix: string) => {
    if (currentBullets.length > 0) {
      blocks.push(
        <ul key={`ul-${keyPrefix}`} className="space-y-2.5 my-2 pl-1">
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
        <ol key={`ol-${keyPrefix}`} className="space-y-2.5 my-2 pl-1">
          {currentNumbered.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-2.5 text-sm sm:text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed"
            >
              <span className="mt-0.5 w-5 h-5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1">{renderInlineMarkdown(item)}</span>
            </li>
          ))}
        </ol>
      )
      currentNumbered = []
    }
  }

  const flushAll = (keyPrefix: string) => {
    flushParagraph(keyPrefix)
    flushBullets(keyPrefix)
    flushNumbered(keyPrefix)
  }

  lines.forEach((rawLine, lineIdx) => {
    const line = rawLine.trim()
    const key = String(lineIdx)

    // 1. Línea vacía -> separa bloques de párrafo/lista
    if (!line) {
      flushAll(key)
      return
    }

    // 2. Encabezados Markdown (#, ##, ###, ####)
    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushAll(key)
      const level = headingMatch[1].length
      const titleText = headingMatch[2].replace(/^[#*-\s]+|[#*:\s]+$/g, '').trim()

      blocks.push(
        <h3
          key={`h-${key}`}
          className={`font-bold text-slate-900 dark:text-white flex items-center gap-2 ${
            blocks.length > 0 ? 'pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80' : ''
          } ${level === 1 ? 'text-base sm:text-lg' : 'text-sm sm:text-base'}`}
        >
          <span className="w-1 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
          <span>{renderInlineMarkdown(titleText)}</span>
        </h3>
      )
      return
    }

    // 3. Línea que es únicamente un subtítulo en negrita (ej: "**Responsabilidades:**" o "**Requisitos**")
    const boldHeadingMatch = line.match(/^\*\*([^*]{2,60})\*\*:?$/)
    if (boldHeadingMatch) {
      flushAll(key)
      const titleText = boldHeadingMatch[1].replace(/:$/, '').trim()
      blocks.push(
        <h3
          key={`bh-${key}`}
          className={`text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 ${
            blocks.length > 0 ? 'pt-4 mt-2 border-t border-slate-100 dark:border-slate-800/80' : ''
          }`}
        >
          <span className="w-1 h-4 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
          <span>{titleText}</span>
        </h3>
      )
      return
    }

    // 4. Viñetas (- item, * item, • item)
    const bulletMatch = line.match(/^[-*•]\s+(.+)$/)
    if (bulletMatch) {
      flushParagraph(key)
      flushNumbered(key)
      currentBullets.push(bulletMatch[1].trim())
      return
    }

    // 5. Listas numeradas (1. item, 2) item)
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)$/)
    if (numberedMatch) {
      flushParagraph(key)
      flushBullets(key)
      currentNumbered.push(numberedMatch[1].trim())
      return
    }

    // 6. Texto normal de párrafo
    flushBullets(key)
    flushNumbered(key)
    currentParagraph.push(line)
  })

  flushAll('end')

  return <div className={`space-y-3 ${className}`}>{blocks}</div>
}
