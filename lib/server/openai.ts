import https from 'node:https'

export const OPENAI_MODELS = [
  'gpt-5.4',
  'gpt-5.2',
  'gpt-4o',
  'gpt-4o-mini',
  'o3-mini',
]

export interface OpenAiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | Array<Record<string, any>> | null
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
  tool_call_id?: string
}

export function makeOpenAiPost(payload: any): Promise<{ statusCode: number; data: any }> {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return reject(new Error('Falta OPENAI_API_KEY en .env.local'))
    }

    const postData = JSON.stringify(payload)

    const req = https.request(
      {
        protocol: 'https:',
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
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
            reject(new Error(`Respuesta inválida de OpenAI (${res.statusCode}): ${responseBody.slice(0, 200)}`))
          }
        })
      }
    )

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('Timeout al conectar con la API de OpenAI (60s)'))
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.write(postData)
    req.end()
  })
}

export function formatToolsForOpenAi(geminiTools: any[]) {
  return geminiTools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: {
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
    },
  }))
}

/**
 * Llama a la API de OpenAI Chat Completions con soporte de herramientas (function calling).
 */
export async function callOpenAiChat(opts: {
  messages: OpenAiMessage[]
  tools?: any[]
  model?: string
}): Promise<{
  message: {
    role: 'assistant'
    content: string | null
    tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>
  }
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }
}> {
  const modelsToTry = opts.model ? [opts.model, ...OPENAI_MODELS.filter((m) => m !== opts.model)] : OPENAI_MODELS

  let lastError: Error | null = null

  for (const model of modelsToTry) {
    try {
      const payload: Record<string, any> = {
        model,
        messages: opts.messages,
      }

      if (opts.tools && opts.tools.length > 0) {
        payload.tools = opts.tools
        payload.tool_choice = 'auto'
      }

      const { statusCode, data } = await makeOpenAiPost(payload)

      if (statusCode === 200 && data?.choices?.[0]?.message) {
        return {
          message: data.choices[0].message,
          usage: data.usage,
        }
      }

      if (data?.error?.message) {
        throw new Error(`OpenAI error (${statusCode}): ${data.error.message}`)
      }

      throw new Error(`Error en API de OpenAI (${statusCode})`)
    } catch (err: any) {
      console.warn(`Intento fallido con modelo OpenAI ${model}:`, err.message)
      lastError = err

      // Si el error es saldo agotado (insufficient_quota / credit_balance_exhausted), no tiene sentido reintentar otros modelos
      if (err.message?.includes('insufficient_quota') || err.message?.includes('no credits remaining')) {
        throw new Error('Tu saldo en OpenAI está agotado. Cargá créditos en platform.openai.com/settings/organization/billing.')
      }
    }
  }

  throw lastError || new Error('No se pudo comunicar con la API de OpenAI')
}
