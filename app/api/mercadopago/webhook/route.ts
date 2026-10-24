import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { getServiceClient } from '@/lib/server/auth'

/**
 * Webhook de Mercado Pago.
 * Seguridad:
 *  1. Si MERCADOPAGO_WEBHOOK_SECRET está configurado, se valida la firma x-signature.
 *  2. Nunca se confía en el contenido de la notificación: se consulta el pago real a la API
 *     de Mercado Pago con nuestro token y se verifica estado, moneda y monto.
 *  3. La acreditación es atómica e idempotente (función fulfill_order en Postgres).
 */

function verifySignature(request: Request, dataId: string, secret: string): boolean {
  const xSignature = request.headers.get('x-signature')
  const xRequestId = request.headers.get('x-request-id')
  if (!xSignature || !xRequestId || !dataId) return false

  let ts = ''
  let v1 = ''
  for (const part of xSignature.split(',')) {
    const [key, value] = part.split('=')
    if (key?.trim() === 'ts') ts = value?.trim() || ''
    if (key?.trim() === 'v1') v1 = value?.trim() || ''
  }
  if (!ts || !v1) return false

  const manifest = `id:${dataId.toLowerCase()};request-id:${xRequestId};ts:${ts};`
  const computed = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  const a = Buffer.from(computed, 'utf8')
  const b = Buffer.from(v1, 'utf8')
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

export async function POST(request: Request) {
  try {
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const service = getServiceClient()
    if (!accessToken || !service) {
      return NextResponse.json({ error: 'Pagos no configurados' }, { status: 503 })
    }

    const url = new URL(request.url)
    const body = await request.json().catch(() => ({}))

    const type = url.searchParams.get('type') || url.searchParams.get('topic') || body?.type || body?.topic
    const dataId = String(url.searchParams.get('data.id') || body?.data?.id || body?.id || '')

    // Solo nos interesan los eventos de pago; el resto se confirma sin procesar
    if (type !== 'payment' || !dataId) {
      return NextResponse.json({ received: true })
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (secret && !verifySignature(request, dataId, secret)) {
      return NextResponse.json({ error: 'Firma inválida' }, { status: 401 })
    }

    // Consultar el pago real a Mercado Pago
    const payRes = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!payRes.ok) {
      // Un error al consultar debe reintentarse: devolvemos 500 para que Mercado Pago reenvíe
      console.error('No se pudo consultar el pago', dataId, payRes.status)
      return NextResponse.json({ error: 'No se pudo verificar el pago' }, { status: 500 })
    }

    const payment = await payRes.json()

    if (payment.status !== 'approved' || payment.currency_id !== 'UYU' || !payment.external_reference) {
      return NextResponse.json({ received: true, processed: false })
    }

    const { data: result, error } = await service.rpc('fulfill_order', {
      p_order: String(payment.external_reference),
      p_payment: String(payment.id),
      p_amount: Number(payment.transaction_amount),
    })

    if (error) {
      console.error('Error acreditando la orden:', error)
      return NextResponse.json({ error: 'Error acreditando la orden' }, { status: 500 })
    }

    if (result === 'amount_mismatch' || result === 'not_found') {
      console.error('Pago no acreditado:', result, 'orden', payment.external_reference, 'pago', payment.id)
    }

    // Sincronización de seguridad: si la orden es de Claude o ChatGPT y fulfill_order en la BD
    // aún no se migró a la versión 012, aseguramos que los créditos vayan a la columna correcta
    if (result === 'ok' || result === 'already_paid') {
      try {
        const { data: order } = await service
          .from('orders')
          .select('product, creditos, user_id, kind')
          .eq('id', String(payment.external_reference))
          .single()

        if (order && order.kind === 'credits') {
          const { data: credRow } = await service.from('ai_credits').select('*').eq('user_id', order.user_id).maybeSingle()
          const cData = credRow as Record<string, any> | null

          if (order.product === 'candidato_claude' && cData && 'balance_claude' in cData) {
            if ((cData.balance_claude || 0) < order.creditos && cData.balance >= order.creditos) {
              await service
                .from('ai_credits')
                .update({
                  balance_claude: (cData.balance_claude || 0) + order.creditos,
                  balance: Math.max(0, (cData.balance || 0) - order.creditos),
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', order.user_id)
            }
          } else if (order.product === 'candidato_chatgpt' && cData && 'balance_chatgpt' in cData) {
            if ((cData.balance_chatgpt || 0) < order.creditos && cData.balance >= order.creditos) {
              await service
                .from('ai_credits')
                .update({
                  balance_chatgpt: (cData.balance_chatgpt || 0) + order.creditos,
                  balance: Math.max(0, (cData.balance || 0) - order.creditos),
                  updated_at: new Date().toISOString(),
                })
                .eq('user_id', order.user_id)
            }
          }
        }
      } catch (syncErr) {
        console.warn('Advertencia en sincronización de saldos de webhook:', syncErr)
      }
    }

    return NextResponse.json({ received: true, result })
  } catch (error: any) {
    console.error('Error en webhook de Mercado Pago:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'online' })
}
