import https from 'node:https'

export const CLAUDE_MODELS = [
  'claude-3-7-sonnet-20250219',
  'claude-3-5-sonnet-20241022',
  'claude-3-5-haiku-20241022',
]

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string | Array<Record<string, any>>
}

export function makeClaudePost(payload: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return reject(new Error('Falta ANTHROPIC_API_KEY en .env.local'))
    }

    const postData = JSON.stringify(payload)

    const req = https.request(
      {
        protocol: 'https:',
        hostname: 'api.anthropic.com',
        port: 443,
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'content-length': Buffer.byteLength(postData),
        },
        rejectUnauthorized: false, // Soporte certificados Windows/antivirus local
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
          } catch {
            reject(new Error(`Respuesta inválida de Anthropic (${res.statusCode}): ${responseBody.slice(0, 200)}`))
          }
        })
      }
    )

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timeout al conectar con la API de Anthropic (60s)'))
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.write(postData)
    req.end()
  })
}

export function formatToolsForClaude(geminiTools: any[]) {
  return geminiTools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(t.parameters?.properties || {}).map(([k, v]: [string, any]) => [
          k,
          {
            type: (v.type || 'string').toLowerCase(),
            description: v.description,
            ...(v.items ? { items: { type: (v.items.type || 'string').toLowerCase() } } : {}),
          },
        ])
      ),
      required: t.parameters?.required || [],
    },
  }))
}

/**
 * Llama a la API de Claude con soporte para tool calling (function calling).
 */
export async function callClaudeChat(opts: {
  system: string
  messages: ClaudeMessage[]
  tools?: Array<{
    name: string
    description: string
    input_schema: Record<string, any>
  }>
  model?: string
}): Promise<{
  content: Array<{ type: 'text' | 'tool_use'; text?: string; id?: string; name?: string; input?: Record<string, any> }>
  usage?: { input_tokens: number; output_tokens: number }
}> {
  const modelsToTry = opts.model ? [opts.model, ...CLAUDE_MODELS.filter((m) => m !== opts.model)] : CLAUDE_MODELS

  let lastError: Error | null = null

  for (const model of modelsToTry) {
    try {
      const payload: Record<string, any> = {
        model,
        max_tokens: 3000,
        system: opts.system,
        messages: opts.messages,
      }

      if (opts.tools && opts.tools.length > 0) {
        payload.tools = opts.tools
      }

      const { statusCode, data } = await makeClaudePost(payload)

      if (statusCode === 200 && data?.content) {
        return {
          content: data.content,
          usage: data.usage,
        }
      }

      if (data?.error?.message) {
        throw new Error(`Anthropic error (${statusCode}): ${data.error.message}`)
      }

      throw new Error(`Error en API de Anthropic (${statusCode})`)
    } catch (err: any) {
      console.warn(`Intento fallido con modelo ${model}:`, err.message)
      lastError = err
      // Si el error es falta de créditos (400 credit balance), no sirve intentar otros modelos
      if (err.message?.includes('credit balance is too low')) {
        throw new Error('Tu saldo en Anthropic es insuficiente. Cargá créditos en console.anthropic.com para usar Claude.')
      }
    }
  }

  throw lastError || new Error('No se pudo comunicar con la API de Claude')
}
