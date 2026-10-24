/**
 * Utilidades para normalizar y limpiar el texto generado por la IA en el chat.
 * Corrige patrones donde la IA genera asteriscos en lugar de emojis o antes de ellos.
 */

const ICON_FALLBACK_MAP: [RegExp, string][] = [
  [/\*(?:icono|icon|emoji)\*/gi, '✨'],
  [/\*(?:malet[ií]n|trabajo|empleo|puesto|vacante|cargo)\*/gi, '💼'],
  [/\*(?:empresa|compañ[ií]a|negocio|comercio)\*/gi, '🏢'],
  [/\*(?:ubicaci[oó]n|zona|barrio|lugar|direcci[oó]n|mapa)\*/gi, '📍'],
  [/\*(?:sueldo|salario|dinero|pago|remuneraci[oó]n)\*/gi, '💰'],
  [/\*(?:reloj|horario|tiempo|turno|jornada)\*/gi, '🕒'],
  [/\*(?:correo|email|mail)\*/gi, '✉️'],
  [/\*(?:tel[eé]fono|whatsapp|celular|contacto)\*/gi, '📞'],
  [/\*(?:check|tilde|visto|ok|listo|verificado)\*/gi, '✅'],
  [/\*(?:estrella|destacado|top)\*/gi, '⭐'],
  [/\*(?:alerta|aviso|atenci[oó]n|importante|ojo)\*/gi, '⚠️'],
  [/\*(?:cv|curriculum|hoja de vida|documento|perfil)\*/gi, '📄'],
  [/\*(?:cohete|vamos|exito|éxito|postular)\*/gi, '🚀'],
  [/\*(?:fuego|caliente|urgente)\*/gi, '🔥'],
  [/\*(?:mano|aplauso|saludo|hola)\*/gi, '👋'],
]

export function cleanChatText(raw: string): string {
  if (!raw || typeof raw !== 'string') return ''

  let text = raw

  // 1. Reemplazar pseudotags de iconos (*icono*, *check*, etc.)
  for (const [pattern, emoji] of ICON_FALLBACK_MAP) {
    text = text.replace(pattern, emoji)
  }

  // 2. Reparar ** sin cerrar antes de un emoji en la misma línea
  // ej: "**Auxiliar de Logística y Depósito📍 Montevideo" -> "**Auxiliar de Logística y Depósito** 📍 Montevideo"
  text = text.replace(
    /(^|\n)([ \t]*(?:\d+[.)]\s+)?)\*\*([^*\n]+?)\s*([\p{Extended_Pictographic}\u2600-\u27BF\u{1F300}-\u{1FAFF}])/gu,
    '$1$2**$3** $4'
  )

  // 3. Reparar cualquier línea que tenga un número impar de ** cerrando la negrita al final
  text = text
    .split('\n')
    .map((line) => {
      const boldCount = (line.match(/\*\*/g) || []).length
      if (boldCount % 2 !== 0) {
        return line + '**'
      }
      return line
    })
    .join('\n')

  // 4. Eliminar asteriscos, viñetas o guiones que anteceden directamente a un emoji
  // ej: "* 🏢" -> "🏢", "- 📍" -> "📍", "• 🕒" -> "🕒"
  text = text.replace(
    /(^|\n)([ \t]*)[*•-][ \t]*([\p{Extended_Pictographic}\u2600-\u27BF\u{1F300}-\u{1FAFF}])/gu,
    '$1$2$3'
  )

  // 5. Limpiar asteriscos huérfanos sueltos que anteceden a emojis en cualquier parte de la línea
  text = text.replace(/(?<!\*)\*[ \t]*([\p{Extended_Pictographic}\u2600-\u27BF\u{1F300}-\u{1FAFF}])/gu, ' $1')

  // 6. Normalizar separadores triples de asteriscos (* * * o ***) a una línea limpia
  text = text.replace(/^[ \t]*(\*[ \t]*){3,}[ \t]*$/gm, '---')

  return text
}
