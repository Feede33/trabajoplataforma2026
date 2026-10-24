'use client'

import React, { useMemo } from 'react'
import { cleanChatText } from '@/lib/chat-format'
import { cn } from '@/lib/utils'

interface ChatMarkdownProps {
  content: string
  role?: 'user' | 'assistant'
  className?: string
}

/**
 * Parsea texto en línea (negritas, cursivas, links, emails, código inline)
 */
function renderInlineFormatting(text: string, isUser: boolean): React.ReactNode[] {
  // Regex para tokens:
  // 1. Links markdown: [texto](url)
  // 2. Emails: usuario@dominio.com
  // 3. Negrita: **texto** o __texto__
  // 4. Código inline: `codigo`
  // 5. Cursiva: *texto* o _texto_
  const tokenRegex = /(\[.*?\]\(https?:\/\/[^\s)]+\)|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|\*\*.*?\*\*|__.*?__|_.*?_|\*.*?\*|`.*?`)/g

  const parts = text.split(tokenRegex)

  return parts.map((part, idx) => {
    if (!part) return null

    // Link markdown: [label](url)
    const linkMatch = part.match(/^\[(.*?)\]\((https?:\/\/[^\s)]+)\)$/)
    if (linkMatch) {
      const [, label, url] = linkMatch
      return (
        <a
          key={idx}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'underline underline-offset-2 transition-colors font-medium',
            isUser ? 'text-sky-200 hover:text-white' : 'text-sky-600 dark:text-sky-400 hover:text-sky-700'
          )}
        >
          {label}
        </a>
      )
    }

    // Email directo: contacto@empresa.com
    if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
      return (
        <a
          key={idx}
          href={`mailto:${part}`}
          className={cn(
            'underline underline-offset-2 transition-colors font-medium',
            isUser ? 'text-sky-200 hover:text-white' : 'text-sky-600 dark:text-sky-400 hover:text-sky-700'
          )}
        >
          {part}
        </a>
      )
    }

    // Negrita: **texto** o __texto__
    if ((part.startsWith('**') && part.endsWith('**') && part.length >= 4) ||
        (part.startsWith('__') && part.endsWith('__') && part.length >= 4)) {
      const boldText = part.slice(2, -2)
      return (
        <strong
          key={idx}
          className={cn(
            'font-bold',
            isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'
          )}
        >
          {renderInlineFormatting(boldText, isUser)}
        </strong>
      )
    }

    // Código inline: `codigo`
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const codeText = part.slice(1, -1)
      return (
        <code
          key={idx}
          className={cn(
            'px-1.5 py-0.5 rounded text-xs font-mono',
            isUser ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
          )}
        >
          {codeText}
        </code>
      )
    }

    // Cursiva: *texto* o _texto_ (evitando asteriscos sueltos o sólo espacios)
    if ((part.startsWith('*') && part.endsWith('*') && part.length >= 3 && !part.slice(1, -1).includes('*')) ||
        (part.startsWith('_') && part.endsWith('_') && part.length >= 3 && !part.slice(1, -1).includes('_'))) {
      const italicText = part.slice(1, -1)
      return (
        <em key={idx} className="italic">
          {italicText}
        </em>
      )
    }

    // Limpiar cualquier asterisco suelto que no haya formado parte de un token válido
    const cleanedText = part.replace(/\*/g, '')

    return <React.Fragment key={idx}>{cleanedText}</React.Fragment>
  })
}

// Regex para capturar emojis completos al inicio de línea (incluyendo variaciones de color y selectores)
const EMOJI_PREFIX_REGEX = new RegExp(
  '^([\\p{Extended_Pictographic}\\u2600-\\u27BF\\u{1F300}-\\u{1FAFF}][\\uFE0E\\uFE0F]?(?:\\u200D[\\p{Extended_Pictographic}\\u2600-\\u27BF\\u{1F300}-\\u{1FAFF}][\\uFE0E\\uFE0F]?)*)\\s*(.*)$',
  'u'
)

export function ChatMarkdown({ content, role = 'assistant', className }: ChatMarkdownProps) {
  const isUser = role === 'user'

  const renderedBlocks = useMemo(() => {
    // Normalizar y reparar asteriscos conflictivos y pseudotags de iconos
    const normalized = cleanChatText(content)
    const lines = normalized.split('\n')

    const blocks: React.ReactNode[] = []
    let currentParagraph: string[] = []

    function flushParagraph() {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join('\n').trim()
        if (text) {
          blocks.push(
            <p key={`p-${blocks.length}`} className="my-1.5 leading-relaxed whitespace-pre-wrap">
              {renderInlineFormatting(text, isUser)}
            </p>
          )
        }
        currentParagraph = []
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const trimmed = line.trim()

      if (!trimmed) {
        flushParagraph()
        continue
      }

      // Separador horizontal
      if (trimmed === '---' || trimmed === '***') {
        flushParagraph()
        blocks.push(
          <hr
            key={`hr-${blocks.length}`}
            className={cn('my-3 border-t', isUser ? 'border-white/20' : 'border-slate-200 dark:border-slate-800')}
          />
        )
        continue
      }

      // Encabezados con hashes (# Título, ## Título, ### Título)
      const headerMatch = trimmed.match(/^(#{1,3})\s+(.*)$/)
      if (headerMatch) {
        flushParagraph()
        const [, hashes, titleText] = headerMatch
        const level = hashes.length
        blocks.push(
          <div
            key={`h-${blocks.length}`}
            className={cn(
              'font-bold mt-3.5 mb-1.5',
              level === 1 ? 'text-base sm:text-lg' : level === 2 ? 'text-base' : 'text-sm font-semibold',
              isUser ? 'text-white' : 'text-slate-900 dark:text-slate-100'
            )}
          >
            {renderInlineFormatting(titleText, isUser)}
          </div>
        )
        continue
      }

      // Subtítulo en negrita al inicio de línea (ej: **Auxiliar de Logística** o **Auxiliar de Logística** 📍 Montevideo)
      const boldTitleMatch = trimmed.match(/^\*\*(.+?)\*\*(?:\s+(.*))?$/)
      if (boldTitleMatch) {
        flushParagraph()
        const [, titleText, restText] = boldTitleMatch
        blocks.push(
          <div
            key={`bold-h-${blocks.length}`}
            className={cn(
              'font-bold text-base sm:text-lg mt-4 mb-1.5 leading-snug flex items-center flex-wrap gap-2',
              isUser ? 'text-white' : 'text-slate-900 dark:text-white'
            )}
          >
            <span>{renderInlineFormatting(titleText, isUser)}</span>
            {restText && (
              <span className="font-normal text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {renderInlineFormatting(restText, isUser)}
              </span>
            )}
          </div>
        )
        continue
      }

      // Detección de lista numerada (ej: 1. **Personal para Verdulería** o 1. Asistente)
      const numberedMatch = trimmed.match(/^(\d+)[.)]\s+(.*)$/)
      if (numberedMatch) {
        flushParagraph()
        const [, num, itemText] = numberedMatch
        const isBoldTitle = itemText.includes('**')
        blocks.push(
          <div
            key={`num-${blocks.length}`}
            className={cn(
              'flex items-start gap-2.5 leading-relaxed pl-0.5',
              isBoldTitle ? 'mt-4 mb-1.5 font-semibold text-base sm:text-lg' : 'my-1.5 text-[15px] sm:text-base'
            )}
          >
            <span
              className={cn(
                'shrink-0 select-none font-bold text-xs px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mt-0.5',
                isUser && 'bg-white/20 text-white'
              )}
            >
              {num}
            </span>
            <span className={cn('flex-1 min-w-0', isBoldTitle && 'text-slate-900 dark:text-white')}>
              {renderInlineFormatting(itemText, isUser)}
            </span>
          </div>
        )
        continue
      }

      // Detección de línea que empieza con un emoji directo como viñeta
      // (ej: "   🏢 Comercio (Verdulería)" o "📍 Pocitos")
      const emojiBulletMatch = trimmed.match(EMOJI_PREFIX_REGEX)
      if (emojiBulletMatch) {
        flushParagraph()
        const [, emoji, itemText] = emojiBulletMatch
        const isIndented = line.startsWith('   ') || line.startsWith('\t') || line.startsWith('  ')
        blocks.push(
          <div
            key={`emoji-item-${blocks.length}`}
            className={cn(
              'flex items-start gap-2.5 my-1.5 leading-relaxed text-[15px] sm:text-base',
              isIndented ? 'pl-4 sm:pl-6' : 'pl-0.5'
            )}
          >
            <span className="shrink-0 select-none text-base leading-snug" aria-hidden="true">
              {emoji}
            </span>
            <span className="flex-1 min-w-0">
              {renderInlineFormatting(itemText, isUser)}
            </span>
          </div>
        )
        continue
      }

      // Detección de viñetas tradicionales (* o - o •)
      const bulletMatch = trimmed.match(/^[*•-]\s+(.*)$/)
      if (bulletMatch) {
        flushParagraph()
        const [, itemText] = bulletMatch
        blocks.push(
          <div key={`bullet-${blocks.length}`} className="flex items-start gap-2 my-1.5 leading-relaxed text-[15px] sm:text-base pl-1">
            <span
              className={cn(
                'shrink-0 select-none text-xs mt-1',
                isUser ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
              )}
              aria-hidden="true"
            >
              •
            </span>
            <span className="flex-1 min-w-0">
              {renderInlineFormatting(itemText, isUser)}
            </span>
          </div>
        )
        continue
      }

      // Línea de texto ordinaria, acumular en el párrafo actual
      currentParagraph.push(line)
    }

    flushParagraph()
    return blocks
  }, [content, isUser])

  return (
    <div
      className={cn(
        'chat-message-content text-[15px] sm:text-base leading-relaxed',
        isUser ? 'text-white' : 'text-slate-800 dark:text-slate-200',
        className
      )}
      style={{
        fontFamily: 'inherit',
      }}
    >
      {renderedBlocks}
    </div>
  )
}
