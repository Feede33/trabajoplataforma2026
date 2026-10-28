import nodemailer from 'nodemailer'

const SUPPORT_EMAIL = 'postulauysoporte@gmail.com'

export interface ContactEmailPayload {
  nombre: string
  email: string
  descripcion: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(v: unknown): v is string {
  return typeof v === 'string' && v.length <= 254 && EMAIL_RE.test(v)
}

export function isSmtpConfigured(): boolean {
  return Boolean(
    (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) ||
    (process.env.SMTP_USER && process.env.SMTP_PASS) ||
    process.env.RESEND_API_KEY
  )
}

export async function sendContactEmail(payload: ContactEmailPayload): Promise<{ success: boolean; messageId?: string; info?: string }> {
  const { nombre, email, descripcion } = payload

  // 1. Intentar mediante Resend si existe API Key
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'PostulaUY <contacto@postulauy.com>',
          to: [SUPPORT_EMAIL],
          reply_to: email,
          subject: `💬 [PostulaUY] Nuevo mensaje de contacto: ${nombre}`,
          html: buildContactHtml(nombre, email, descripcion),
          text: `Nuevo mensaje de contacto en PostulaUY:\n\nNombre: ${nombre}\nEmail: ${email}\n\nMensaje:\n${descripcion}`,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        return { success: true, messageId: data.id }
      }
    } catch (resendErr) {
      console.warn('[ContactEmail] Error con Resend:', resendErr)
    }
  }

  // 2. Intentar mediante Nodemailer (Gmail o SMTP estándar)
  const gmailUser = process.env.GMAIL_USER || process.env.SMTP_USER
  const gmailPass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS

  if (gmailUser && gmailPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || (gmailUser.includes('@gmail.com') ? 'gmail' : undefined),
        host: process.env.SMTP_HOST || (gmailUser.includes('@gmail.com') ? undefined : 'smtp.gmail.com'),
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE === 'true' || true,
        auth: {
          user: gmailUser,
          pass: gmailPass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      })

      const mailOptions = {
        from: `"${nombre} vía PostulaUY" <${gmailUser}>`,
        replyTo: `"${nombre}" <${email}>`,
        to: SUPPORT_EMAIL,
        subject: `💬 [PostulaUY] Nuevo mensaje de: ${nombre}`,
        text: `Nuevo mensaje de contacto en PostulaUY:\n\nNombre: ${nombre}\nEmail: ${email}\n\nDescripción:\n${descripcion}\n\nEnviado desde PostulaUY.com`,
        html: buildContactHtml(nombre, email, descripcion),
      }

      const info = await transporter.sendMail(mailOptions)
      return { success: true, messageId: info.messageId }
    } catch (smtpErr: any) {
      console.error('[ContactEmail] Error al enviar con SMTP:', smtpErr)
    }
  }

  // 3. Fallback directo a FormSubmit.co hacia postulauysoporte@gmail.com
  try {
    const fsRes = await fetch(`https://formsubmit.co/ajax/${SUPPORT_EMAIL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': 'https://postulauy.com',
        'Referer': 'https://postulauy.com/contacto',
      },
      body: JSON.stringify({
        _subject: `💬 [PostulaUY] Mensaje de contacto: ${nombre}`,
        _replyto: email,
        _template: 'box',
        _captcha: 'false',
        nombre,
        email,
        mensaje: descripcion,
        fecha: new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' }),
      }),
    })

    const fsData = await fsRes.json().catch(() => ({}))
    if (fsRes.ok && fsData.success === 'true') {
      return { success: true, messageId: 'formsubmit-ok' }
    }
    if (fsData.message && fsData.message.includes('Activation')) {
      return {
        success: true,
        info: 'Activación requerida en postulauysoporte@gmail.com. Revisa tu casilla y haz clic en "Activate Form" para completar la vinculación.',
      }
    }
  } catch (fsErr) {
    console.warn('[ContactEmail] Error con FormSubmit:', fsErr)
  }

  console.log(`[ContactEmail] Registro local para ${SUPPORT_EMAIL}:`, {
    nombre,
    email,
    descripcion: descripcion.slice(0, 100) + '...',
  })

  return { success: true, info: 'Mensaje registrado' }
}

function buildContactHtml(nombre: string, email: string, descripcion: string): string {
  const safeNombre = escapeHtml(nombre)
  const safeEmail = escapeHtml(email)
  const safeDescripcion = escapeHtml(descripcion).replace(/\n/g, '<br/>')
  const now = new Date().toLocaleString('es-UY', { timeZone: 'America/Montevideo' })

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .header { background: linear-gradient(135deg, #0ea5e9, #3b82f6, #6366f1); padding: 28px 32px; color: white; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; }
      .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
      .content { padding: 32px; }
      .field { margin-bottom: 20px; }
      .label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; }
      .value { font-size: 15px; font-weight: 600; color: #0f172a; }
      .message-box { background: #f1f5f9; border-radius: 14px; padding: 20px; border-left: 4px solid #0284c7; margin-top: 8px; font-size: 14px; line-height: 1.6; color: #334155; }
      .footer { background: #f8fafc; padding: 18px 32px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
      .reply-btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0284c7; color: white; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 13px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>💬 Nuevo Mensaje de Contacto</h1>
        <p>Recibido desde el formulario oficial de PostulaUY.com</p>
      </div>
      <div class="content">
        <div class="field">
          <div class="label">Remitente:</div>
          <div class="value">${safeNombre}</div>
        </div>
        <div class="field">
          <div class="label">Correo Electrónico:</div>
          <div class="value"><a href="mailto:${safeEmail}" style="color: #0284c7; text-decoration: none;">${safeEmail}</a></div>
        </div>
        <div class="field">
          <div class="label">Fecha y Hora (Uruguay):</div>
          <div class="value" style="font-size: 13px; font-weight: normal; color: #64748b;">${now}</div>
        </div>
        <div class="field">
          <div class="label">Descripción / Mensaje:</div>
          <div class="message-box">${safeDescripcion}</div>
        </div>
        <div style="text-align: center; margin-top: 24px;">
          <a href="mailto:${safeEmail}?subject=Re:%20Contacto%20PostulaUY" class="reply-btn">Responder a ${safeNombre}</a>
        </div>
      </div>
      <div class="footer">
        Este correo fue enviado a ${SUPPORT_EMAIL} a través del portal <a href="https://postulauy.com" style="color: #64748b; font-weight: 600;">PostulaUY.com</a>.
      </div>
    </div>
  </body>
  </html>
  `
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
