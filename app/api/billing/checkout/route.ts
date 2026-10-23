import { NextResponse } from 'next/server'
import { getAuthedContext, getServiceClient, getSiteUrl, isBackendConfigured } from '@/lib/server/auth'
import { PRODUCTS, isProductId, totalConIva } from '@/lib/billing'

/**
 * Crea una orden pendiente y una preferencia de Checkout Pro en Mercado Pago.
 * El precio sale SIEMPRE del catálogo del servidor (lib/billing.ts), nunca del navegador.
 */
export async function POST(request: Request) {
  try {
    if (!isBackendConfigured()) {
      return NextResponse.json({ error: 'El sistema de pagos no está disponible en modo simulación.' }, { status: 503 })
    }

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN
    const service = getServiceClient()
    if (!accessToken || !service) {
      return NextResponse.json(
        { error: 'El sistema de pagos todavía no está configurado. Contactá al administrador.' },
        { status: 503 }
      )
    }

    const ctx = await getAuthedContext(request)
    if (!ctx) {
      return NextResponse.json({ error: 'Iniciá sesión para continuar con la compra.' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const productId: unknown = body.product
    if (!isProductId(productId)) {
      return NextResponse.json({ error: 'Producto inválido.' }, { status: 400 })
    }

    const product = PRODUCTS[productId]
    if (!ctx.role || !product.roles.includes(ctx.role as 'empresa' | 'candidato')) {
      const who = product.roles[0] === 'empresa' ? 'cuentas de Empresa' : 'cuentas de Candidato'
      return NextResponse.json({ error: `Este producto está disponible solo para ${who}.` }, { status: 403 })
    }

    const total = totalConIva(product.neto)

    // 1. Orden pendiente (la acreditación solo ocurre cuando Mercado Pago confirma el pago)
    const { data: order, error: orderError } = await service
      .from('orders')
      .insert({
        user_id: ctx.userId,
        product: product.id,
        kind: product.kind,
        amount_uyu: total,
        dias: product.dias ?? null,
        avisos_mes_limite: product.avisosMes ?? null,
        creditos: product.creditos ?? null,
        status: 'pending',
      })
      .select('id')
      .single()

    if (orderError || !order) {
      console.error('Error creando orden:', orderError)
      return NextResponse.json({ error: 'No se pudo iniciar la compra. Intentá nuevamente.' }, { status: 500 })
    }

    // 2. Preferencia de Checkout Pro
    const siteUrl = getSiteUrl(request)
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)/.test(siteUrl)

    const preference: Record<string, unknown> = {
      items: [
        {
          id: product.id,
          title: `${product.nombre} - Postulauy.com (IVA incluido)`,
          description: product.descripcion,
          category_id: 'services',
          quantity: 1,
          currency_id: 'UYU',
          unit_price: total,
        },
      ],
      payer: ctx.email ? { email: ctx.email } : undefined,
      external_reference: order.id,
      back_urls: {
        success: `${siteUrl}/planes?status=success`,
        pending: `${siteUrl}/planes?status=pending`,
        failure: `${siteUrl}/planes?status=failure`,
      },
      statement_descriptor: 'POSTULAUY',
    }

    // Mercado Pago rechaza auto_return y webhooks con direcciones locales
    if (!isLocal) {
      preference.auto_return = 'approved'
      preference.notification_url = `${siteUrl}/api/mercadopago/webhook`
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(preference),
    })

    const mpData = await mpRes.json().catch(() => ({}))
    if (!mpRes.ok || !mpData.init_point) {
      console.error('Error creando preferencia en Mercado Pago:', mpRes.status, mpData)
      await service.from('orders').update({ status: 'cancelled' }).eq('id', order.id)
      return NextResponse.json(
        { error: 'Mercado Pago no pudo iniciar el pago. Intentá nuevamente en unos minutos.' },
        { status: 502 }
      )
    }

    // Con credenciales de prueba (TEST-...) se usa el checkout de pruebas
    const url = accessToken.startsWith('TEST-') && mpData.sandbox_init_point ? mpData.sandbox_init_point : mpData.init_point

    return NextResponse.json({ url, orderId: order.id })
  } catch (error: any) {
    console.error('Error en /api/billing/checkout:', error)
    return NextResponse.json({ error: 'Error interno al iniciar el pago.' }, { status: 500 })
  }
}
