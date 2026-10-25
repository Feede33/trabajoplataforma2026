'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUp,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Inbox,
  Loader2,
  MoreHorizontal,
  PanelLeft,
  Pencil,
  Pin,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Trash2,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/context/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { BillingStatus, fetchBillingStatus } from '@/lib/billing-client'
import { Switch } from '@/components/ui/switch'
import { GlassContainer } from '@/components/ui/glass-container'
import { ChatMarkdown } from './ChatMarkdown'
import { useTheme } from 'next-themes'
import { ShinyButton } from '@/components/ui/shiny-button'
import { LiquidMetalButton } from '@/components/ui/liquid-metal-button'

// Proveedores principales para el selector superior (solo nombre de la empresa/marca)
const MODELS = [
  {
    id: 'gemini',
    name: 'Gemini',
    badge: 'Gratis',
    description: 'Rápido y liviano. Incluido gratis en tu cuenta.',
    available: true,
    requiresCredits: false,
    defaultButtonLabel: 'Flash',
  },
  {
    id: 'claude',
    name: 'Claude',
    badge: 'Pack Claude',
    description: 'Redacción superior de CV, cartas y correos.',
    available: true,
    requiresCredits: true,
    defaultButtonLabel: 'Sonnet',
  },
  {
    id: 'gpt',
    name: 'OpenAI',
    badge: 'Pack ChatGPT',
    description: 'Razonamiento avanzado y 1M de contexto.',
    available: true,
    requiresCredits: true,
    defaultButtonLabel: 'GPT',
  },
]

export interface SubModelOption {
  id: string
  name: string
  shortLabel?: string
  description: string
  badge?: string
}

const SUB_MODELS: Record<string, SubModelOption[]> = {
  gemini: [
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', shortLabel: 'Gemini 3.5 Flash', description: 'Equilibrio y velocidad' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', shortLabel: 'Gemini 3.8 Flash', description: 'Ayuda completa' },
    { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash Lite', shortLabel: 'Gemini 3.5 Flash Lite', description: 'Respuestas rápidas' },
  ],
  claude: [
    { id: 'claude-sonnet-5.5', name: 'Claude Sonnet 5.5', shortLabel: 'Claude Sonnet 5.5', description: 'Redacción y análisis de CV' },
    { id: 'claude-haiku-5.5', name: 'Claude Haiku 5.5', shortLabel: 'Claude Haiku 5.5', description: 'Respuestas rápidas y breves' },
    { id: 'claude-opus-5.5', name: 'Claude Opus 5.5', shortLabel: 'Claude Opus 5.5', description: 'Razonamiento profundo' },
  ],
  gpt: [
    { id: 'gpt-5.4', name: 'GPT-5.4', shortLabel: 'GPT-5.4', description: 'Razonamiento de vanguardia' },
    { id: 'gpt-5.2', name: 'GPT-5.2', shortLabel: 'GPT-5.2', description: 'Equilibrio y velocidad' },
  ],
}

type ConversationRow = { id: string; title: string; updated_at: string }

type Pending = { job_id: string; titulo: string; empresa: string | null; mensaje: string }

type PendingEmail = {
  to: string
  subject: string
  body: string
  attach_cv: boolean
  empresa?: string
  puesto?: string
  selected?: boolean
}
type PendingProfile = { nombre?: string; bio?: string; ubicacion?: string }
type WhatsAppContact = {
  id?: string
  nombre: string
  puesto?: string
  whatsapp: string
  rubro?: string
  zona?: string
  salario?: string
  descripcion?: string
  mensaje?: string
}
type AttachedFile = { name: string; mime: string; data: string }

function cleanNewlines(str?: string): string {
  if (!str) return ''
  return str.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n')
}

function formatWhatsAppUrl(phone: string, text: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('09') && cleaned.length === 9) {
    cleaned = '598' + cleaned.substring(1)
  } else if (cleaned.startsWith('9') && cleaned.length === 8) {
    cleaned = '598' + cleaned
  }
  return `https://wa.me/${cleaned}?text=${encodeURIComponent(text)}`
}

function personalizeEmailText(
  template: string,
  meta: { empresa?: string; puesto?: string; candidateName?: string }
): string {
  if (!template) return ''
  let res = cleanNewlines(template)

  const empresaVal = meta.empresa?.trim() || ''
  const puestoVal = meta.puesto?.trim() || ''
  const nombreVal = meta.candidateName?.trim() || ''

  if (empresaVal) {
    res = res.replace(/\{\s*empresa[0-9]*\s*\}/gi, empresaVal)
  }
  if (puestoVal) {
    res = res.replace(/\{\s*(puesto|cargo|vacante)[0-9]*\s*\}/gi, puestoVal)
  }
  if (nombreVal) {
    res = res.replace(/\{\s*(nombre|candidato)\s*\}/gi, nombreVal)
  }

  return res
}

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_FILES = 4
const MAX_PHOTOS = 3
const MAX_PDFS = 2
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB por foto
const MAX_PDF_BYTES = 15 * 1024 * 1024 // 15 MB por PDF (la IA lo maneja fluidamente)
const MAX_TOTAL_BYTES = 20 * 1024 * 1024 // 20 MB total
const DEFAULT_ATTACHMENT_PROMPT = 'Analizá la imagen o archivo que te adjunto y decime qué es o qué contiene.'

function openAttachment(file: AttachedFile) {
  try {
    const byteCharacters = atob(file.data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: file.mime })
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
  } catch {
    const win = window.open()
    if (win && file.mime.startsWith('image/')) {
      win.document.write(`<img src="data:${file.mime};base64,${file.data}" style="max-width:100%;height:auto;margin:auto;display:block;" />`)
    }
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(new Error('No se pudo leer el archivo'))
    r.readAsDataURL(file)
  })
}

/**
 * Optimiza fotos/imágenes grandes en el navegador para que suban al instante,
 * manteniendo resolución óptima (hasta 2048px) y lectura nítida para la IA (OCR y visión multimodal).
 */
async function processImageAttachment(file: File): Promise<{ data: string; mime: string }> {
  // Si no es imagen o pesa menos de 1 MB, se envía en su calidad original directamente
  if (!file.type.startsWith('image/') || file.size <= 1024 * 1024) {
    const data = await fileToBase64(file)
    return { data, mime: file.type }
  }

  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = reject
      image.src = dataUrl
    })

    const MAX_DIM = 2048 // Máxima dimensión para detalle nítido sin sobrecargar tokens ni payload
    let { width, height } = img

    if (width > MAX_DIM || height > MAX_DIM) {
      if (width > height) {
        height = Math.round((height * MAX_DIM) / width)
        width = MAX_DIM
      } else {
        width = Math.round((width * MAX_DIM) / height)
        height = MAX_DIM
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas context not available')

    ctx.drawImage(img, 0, 0, width, height)

    const outMime = file.type === 'image/png' && file.size < 2.5 * 1024 * 1024 ? 'image/png' : 'image/jpeg'
    const outDataUrl = canvas.toDataURL(outMime, 0.88)
    const base64 = outDataUrl.split(',')[1] || ''

    if (base64.length > 0 && Math.floor((base64.length * 3) / 4) < file.size) {
      return { data: base64, mime: outMime }
    }
  } catch {
    // Si no se puede procesar en canvas, fallback seguro al archivo original
  }

  const fallbackData = await fileToBase64(file)
  return { data: fallbackData, mime: file.type }
}

/**
 * Genera un PDF válido en memoria (Blob URL) a partir de los datos del perfil/CV
 * para mostrar la vista previa del PDF en un contenedor con bordes redondeados.
 */
function generateCvPdfBlobUrl(data: {
  nombre?: string | null
  email?: string | null
  ubicacion?: string | null
  bio?: string | null
}): string {
  const toPdfString = (str: string) => {
    const clean = str
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[•·]/g, '-')
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
      .replace(/—|–/g, '-')
    let out = ''
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i)
      if (code >= 32 && code <= 126) {
        out += clean[i]
      } else if (code >= 160 && code <= 255) {
        out += '\\' + code.toString(8).padStart(3, '0')
      } else {
        out += ' '
      }
    }
    return out
  }

  const wrapLines = (text: string, maxChars: number): string[] => {
    const result: string[] = []
    for (const rawParagraph of text.split(/\r?\n/)) {
      const p = rawParagraph.trim()
      if (!p) {
        result.push('')
        continue
      }
      const words = p.split(/\s+/)
      let current = ''
      for (const word of words) {
        if (!current) {
          current = word
        } else if (current.length + 1 + word.length <= maxChars) {
          current += ' ' + word
        } else {
          result.push(current)
          current = word
        }
      }
      if (current) result.push(current)
    }
    return result
  }

  const nombre = (data.nombre || 'Candidato').trim()
  const subline = [data.ubicacion?.trim(), data.email?.trim()].filter(Boolean).join('  |  ')
  const bioLines = wrapLines(data.bio || 'Sin resumen cargado.', 82)

  const ops: string[] = []
  // Encabezado decorativo
  ops.push('0.95 0.96 0.98 rg 40 740 515 65 re f')
  ops.push('0.31 0.27 0.90 rg 40 740 4 65 re f')

  // Nombre
  ops.push('BT /F2 18 Tf 0.08 0.10 0.16 rg 56 778 Td (' + toPdfString(nombre) + ') Tj ET')
  // Subtítulo (ubicación y correo)
  if (subline) {
    ops.push('BT /F1 10 Tf 0.35 0.40 0.48 rg 56 756 Td (' + toPdfString(subline) + ') Tj ET')
  }

  // Sección Perfil Profesional
  ops.push('BT /F2 11 Tf 0.31 0.27 0.90 rg 45 712 Td (' + toPdfString('PERFIL Y RESUMEN PROFESIONAL') + ') Tj ET')
  ops.push('0.85 0.87 0.92 RG 0.8 w 45 704 m 555 704 l S')

  let y = 684
  for (const line of bioLines) {
    if (y < 55) break
    if (!line) {
      y -= 8
      continue
    }
    const isHeading =
      line.length < 48 &&
      (line === line.toUpperCase() || line.endsWith(':')) &&
      !/^[-*]/.test(line)
    if (isHeading) {
      y -= 4
      ops.push('BT /F2 10.5 Tf 0.12 0.15 0.22 rg 45 ' + y + ' Td (' + toPdfString(line) + ') Tj ET')
      y -= 15
    } else {
      ops.push('BT /F1 10 Tf 0.20 0.24 0.32 rg 45 ' + y + ' Td (' + toPdfString(line) + ') Tj ET')
      y -= 14
    }
  }

  const streamContent = ops.join('\n')
  const objects: string[] = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
    `6 0 obj\n<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream\nendobj\n`,
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = [0]
  for (const obj of objects) {
    offsets.push(pdf.length)
    pdf += obj
  }
  const xrefPos = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  for (let i = 1; i <= objects.length; i++) {
    pdf += offsets[i].toString().padStart(10, '0') + ' 00000 n \n'
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`

  const bytes = new Uint8Array(pdf.length)
  for (let i = 0; i < pdf.length; i++) {
    bytes[i] = pdf.charCodeAt(i) & 0xff
  }
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

type GmailStatus = { configured: boolean; connected: boolean; email?: string | null; comingSoon?: boolean; message?: string }

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Postulaciones propuestas por la IA que esperan confirmación del usuario */
  pending?: Pending[]
  pendingState?: 'idle' | 'sending' | 'done'
  /** Correo propuesto por la IA (editable) que espera confirmación */
  email?: PendingEmail
  /** Lote de correos propuestos por la IA para postulación simultánea */
  emails?: PendingEmail[]
  emailState?: 'idle' | 'sending' | 'done'
  needsGmail?: boolean
  /** Nombres de archivos adjuntos por el usuario en este mensaje */
  files?: string[]
  /** Archivos adjuntos completos (con base64 y mime) para vista previa */
  attachments?: AttachedFile[]
  /** Cambios de perfil/CV propuestos por la IA (editables) */
  profile?: PendingProfile
  profileState?: 'idle' | 'sending' | 'done'
  /** Contactos y empleos con WhatsApp para contacto directo */
  whatsappContacts?: WhatsAppContact[]
}

type SendOptions = {
  autoApply: boolean
  attachments: AttachedFile[]
  includeCv: boolean
  deepSearch: boolean
  model?: string
}

async function sendToAgent(
  history: Message[],
  token: string,
  opts: SendOptions
): Promise<{
  reply: string
  pending: Pending[]
  email: PendingEmail | null
  emails: PendingEmail[]
  needsGmail: boolean
  profile: PendingProfile | null
  whatsappContacts: WhatsAppContact[]
}> {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      model: opts.model,
      autoApply: opts.autoApply,
      attachments: opts.attachments,
      includeCv: opts.includeCv,
      deepSearch: opts.deepSearch,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error al contactar a la IA')
  const rawEmails: PendingEmail[] = (Array.isArray(data.pendingEmails) && data.pendingEmails.length > 0
    ? data.pendingEmails
    : (data.pendingEmail ? [data.pendingEmail] : [])
  ).map((e: PendingEmail) => ({
    ...e,
    subject: cleanNewlines(e.subject),
    body: cleanNewlines(e.body),
  }))
  const singleEmail = data.pendingEmail
    ? {
        ...data.pendingEmail,
        subject: cleanNewlines(data.pendingEmail.subject),
        body: cleanNewlines(data.pendingEmail.body),
      }
    : null
  return {
    reply: data.reply || '',
    pending: data.pending || [],
    email: singleEmail,
    emails: rawEmails,
    needsGmail: !!data.needsGmail,
    profile: data.pendingProfile || null,
    whatsappContacts: Array.isArray(data.whatsappContacts) ? data.whatsappContacts : [],
  }
}

async function saveProfile(profile: PendingProfile, token: string) {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmProfile: profile }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'No se pudo guardar el perfil')
}

async function gmailApi(token: string, method: 'POST' | 'DELETE', body?: object): Promise<GmailStatus & { url?: string }> {
  const res = await fetch('/api/google/connect', {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body || {}),
  })
  return res.json().catch(() => ({ configured: false, connected: false }))
}

async function confirmEmail(email: PendingEmail, token: string) {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmEmail: email }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'No se pudo enviar el correo')
  return data as { sent: boolean; to: string }
}

async function confirmEmails(emails: PendingEmail[], token: string) {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirmEmails: emails }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'No se pudieron enviar los correos')
  return data as { sent: boolean; count: number; recipients: string[]; failed?: { to: string; error: string }[] }
}

async function confirmApplications(pending: Pending[], token: string) {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ confirm: pending.map((p) => ({ job_id: p.job_id, mensaje: p.mensaje })) }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'No se pudo enviar')
  return data as { applied: { titulo: string }[]; skipped: { reason: string }[] }
}

function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z" />
    </svg>
  )
}

function AttachFileIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 -960 960 960"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M720-330q0 104-73 177T470-80q-104 0-177-73t-73-177v-370q0-75 52.5-127.5T400-880q75 0 127.5 52.5T580-700v350q0 46-32 78t-78 32q-46 0-78-32t-32-78v-370h80v370q0 13 8.5 21.5T470-320q13 0 21.5-8.5T500-350v-350q-1-42-29.5-71T400-800q-42 0-71 29t-29 71v370q-1 71 49 120.5T470-160q70 0 119-49.5T640-330v-390h80v390Z" />
    </svg>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.456 5.711 1.457h.004c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

const SUGGESTIONS = [
  { icon: Search, label: '¿Qué empleos hay hoy para mi perfil?' },
  { icon: FileText, label: 'Ajustá mi CV para una vacante' },
  { icon: Briefcase, label: 'Postulate a 5 empleos por mí' },
  { icon: MailIcon, label: 'Redactá una postulación por email' },
]

const ATTACH_OPTIONS = [
  { id: 'files', icon: AttachFileIcon, label: 'Agregar fotos y archivos' },
  { id: 'cv', icon: FileText, label: 'Usar mi CV del perfil' },
  { id: 'deep', icon: Search, label: 'Búsqueda profunda de empleos' },
  { id: 'cvfix', icon: Wand2, label: 'Ajustar CV con IA' },
  { id: 'email', icon: MailIcon, label: 'Postular por Gmail' },
] as const

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value?: string | number | readonly string[]
}

const AutoResizeTextarea = React.forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null)

    const setRefs = (element: HTMLTextAreaElement | null) => {
      internalRef.current = element
      if (typeof ref === 'function') {
        ref(element)
      } else if (ref) {
        ;(ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = element
      }
    }

    const adjustHeight = () => {
      const el = internalRef.current
      if (!el) return
      el.style.height = 'auto'
      if (el.scrollHeight > 0) {
        const borderOffset = el.offsetHeight - el.clientHeight
        el.style.height = `${el.scrollHeight + borderOffset}px`
      }
    }

    useIsomorphicLayoutEffect(() => {
      adjustHeight()
      const rafId = requestAnimationFrame(adjustHeight)
      return () => cancelAnimationFrame(rafId)
    }, [value])

    useEffect(() => {
      const handleResize = () => adjustHeight()
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }, [])

    return (
      <textarea
        ref={setRefs}
        value={value}
        onChange={(e) => {
          onChange?.(e)
          adjustHeight()
        }}
        className={cn('resize-none overflow-hidden', className)}
        {...props}
      />
    )
  }
)
AutoResizeTextarea.displayName = 'AutoResizeTextarea'

/**
 * Componente de vista previa del PDF con bordes redondeados (rounded-2xl).
 * Se muestra cuando la IA entrega un CV/perfil o un correo/postulación con CV adjunto para revisar y confirmar.
 */
function RoundedPdfPreview({
  pdfUrl,
  title,
  subtitle,
  nombre,
  email,
  ubicacion,
  bio,
  defaultExpanded = true,
  rightSlot,
}: {
  pdfUrl?: string | null
  title: string
  subtitle?: string
  nombre?: string | null
  email?: string | null
  ubicacion?: string | null
  bio?: string | null
  defaultExpanded?: boolean
  rightSlot?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (pdfUrl) {
      setGeneratedUrl(null)
      return
    }
    const url = generateCvPdfBlobUrl({ nombre, email, ubicacion, bio })
    setGeneratedUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pdfUrl, nombre, email, ubicacion, bio])

  const effectivePdfUrl = pdfUrl || generatedUrl

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/80 dark:bg-slate-900/70 overflow-hidden shadow-sm transition-all">
      {/* Cabecera de la tarjeta PDF */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-white/90 dark:bg-slate-800/80 border-b border-slate-200/70 dark:border-slate-700/60">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 font-bold text-[10px] border border-rose-500/20">
            PDF
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{title}</p>
            {subtitle && <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {rightSlot}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {expanded ? 'Ocultar vista previa' : 'Ver PDF'}
          </button>
          {effectivePdfUrl && (
            <a
              href={effectivePdfUrl}
              target="_blank"
              rel="noreferrer"
              download={!pdfUrl ? `${(nombre || 'CV').replace(/\s+/g, '_')}_PostulaUY.pdf` : undefined}
              title={pdfUrl ? 'Abrir PDF en pestaña nueva' : 'Descargar PDF'}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/70 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              {pdfUrl ? <ExternalLink className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
            </a>
          )}
        </div>
      </div>

      {/* Cuerpo de la vista previa con bordes redondeados */}
      {expanded && (
        <div className="p-3 bg-slate-100/70 dark:bg-slate-950/50">
          <div className="rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-white shadow-inner">
            {effectivePdfUrl ? (
              <iframe
                src={`${effectivePdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`}
                title={title}
                className="w-full h-64 sm:h-72 border-0 bg-white block"
              />
            ) : (
              <div className="p-5 space-y-2 text-xs text-slate-700 bg-white">
                <p className="text-sm font-bold text-slate-900">{nombre || 'Mi Currículum'}</p>
                {ubicacion && <p className="text-slate-500">{ubicacion}</p>}
                <hr className="border-slate-200 my-2" />
                <p className="whitespace-pre-wrap leading-relaxed">{bio}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function AIChat() {
  const router = useRouter()
  const { profile, isAdmin, isLoading, getAccessToken } = useAuth()
  const { resolvedTheme } = useTheme()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isLoading && profile?.role === 'empresa' && !isAdmin) {
      router.replace('/empresa/dashboard')
    }
  }, [isLoading, profile?.role, isAdmin, router])

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [autoApply, setAutoApply] = useState(false)
  const [gmail, setGmail] = useState<GmailStatus | null>(null)
  const [gmailBanner, setGmailBanner] = useState<{ type: 'success' | 'warning'; text: string } | null>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [recentsExpanded, setRecentsExpanded] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedIds, setPinnedIds] = useState<string[]>([])
  const [chatMenuId, setChatMenuId] = useState<string | null>(null)
  const [billing, setBilling] = useState<BillingStatus | null>(null)
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [includeCv, setIncludeCv] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)
  const [previewCompany, setPreviewCompany] = useState<Record<string, number>>({})
  const [notice, setNotice] = useState('')
  const [editingProfileIds, setEditingProfileIds] = useState<Record<string, boolean>>({})
  const [customWaMessages, setCustomWaMessages] = useState<Record<string, string>>({})
  const [editingWaContactId, setEditingWaContactId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modelOpen, setModelOpen] = useState(false)
  const [modelId, setModelId] = useState(MODELS[0].id)
  const [subModelId, setSubModelId] = useState<string>(SUB_MODELS.gemini[0].id)
  const [subModelButtonLabel, setSubModelButtonLabel] = useState<string>('Flash')
  const [subModelOpen, setSubModelOpen] = useState(false)
  const subModelMenuRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const composerBoxRef = useRef<HTMLDivElement>(null)
  const [isMultiLine, setIsMultiLine] = useState(false)

  const onSelectCompany = (id: string) => {
    setModelId(id)
    setModelOpen(false)
    const company = MODELS.find((m) => m.id === id)
    if (company?.defaultButtonLabel) {
      setSubModelButtonLabel(company.defaultButtonLabel)
    }
    const defaultSub = SUB_MODELS[id]?.[0]
    if (defaultSub) {
      setSubModelId(defaultSub.id)
    }
  }

  const currentSubList = SUB_MODELS[modelId] || SUB_MODELS.gemini

  useEffect(() => {
    setAutoApply(localStorage.getItem('ia-chat-auto') === '1')
    const savedSidebar = localStorage.getItem('ia-chat-sidebar')
    if (savedSidebar === '0') setSidebarOpen(false)
    try {
      const savedPins = JSON.parse(localStorage.getItem('ia-chat-pinned') || '[]')
      if (Array.isArray(savedPins)) setPinnedIds(savedPins)
    } catch {}
  }, [])

  function togglePin(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setPinnedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [id, ...prev]
      localStorage.setItem('ia-chat-pinned', JSON.stringify(next))
      return next
    })
  }

  function toggleSidebar() {
    setSidebarOpen((prev) => {
      const next = !prev
      localStorage.setItem('ia-chat-sidebar', next ? '1' : '0')
      return next
    })
  }

  useEffect(() => {
    if (!profile) return
    fetchBillingStatus(profile.id)
      .then(setBilling)
      .catch(() => setBilling(null))
  }, [profile?.id])

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const token = await getAccessToken()
      if (!token) return
      setGmail(await gmailApi(token, 'POST'))
      const flag = new URLSearchParams(window.location.search).get('gmail')
      if (flag) {
        window.history.replaceState({}, '', '/ia-chat')
        if (flag === 'connected') {
          setGmailBanner({
            type: 'success',
            text: 'Gmail conectado. Ya puedo preparar postulaciones, redactar borradores y enviar correos por vos.',
          })
        } else if (flag === 'denied') {
          setGmailBanner({
            type: 'warning',
            text: 'No diste permiso para enviar correos con Gmail.',
          })
        } else {
          setGmailBanner({
            type: 'warning',
            text: 'No se pudo conectar Gmail. Intentá de nuevo.',
          })
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function connectGmail() {
    if (!isAdmin) {
      setNotice('La función de postular por Gmail estará disponible muy pronto (en proceso de verificación con Google).')
      return
    }
    const token = await getAccessToken()
    if (!token) return
    const st = await gmailApi(token, 'POST', { reconnect: true })
    if (st.url) window.location.href = st.url
    else if (st.comingSoon) {
      setNotice(st.message || 'La función de Gmail estará disponible muy pronto.')
    }
  }

  async function disconnectGmail() {
    const token = await getAccessToken()
    if (!token) return
    await gmailApi(token, 'DELETE')
    setGmail({ configured: true, connected: false })
    setGmailBanner(null)
  }

  async function refreshConversations() {
    if (!profile) return
    const { data } = await createClient()
      .from('ai_conversations')
      .select('id, title, updated_at')
      .order('updated_at', { ascending: false })
      .limit(30)
    setConversations((data as ConversationRow[]) || [])
  }

  useEffect(() => {
    refreshConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  /** Guarda la conversación (solo texto; las tarjetas pendientes no se persisten). */
  async function saveConversation(msgs: Message[], id: string | null): Promise<string | null> {
    if (!profile) return id
    const supabase = createClient()
    const slim = msgs.map((m) => ({ id: m.id, role: m.role, content: m.content, files: m.files, attachments: m.attachments }))
    const firstUser = msgs.find((m) => m.role === 'user')?.content || 'Nueva conversación'
    const title = firstUser.length > 60 ? firstUser.slice(0, 57) + '…' : firstUser
    try {
      if (id) {
        await supabase
          .from('ai_conversations')
          .update({ messages: slim, updated_at: new Date().toISOString() })
          .eq('id', id)
        return id
      }
      const { data } = await supabase
        .from('ai_conversations')
        .insert({ user_id: profile.id, title, messages: slim })
        .select('id')
        .single()
      return (data as { id: string } | null)?.id ?? null
    } catch {
      return id
    } finally {
      refreshConversations()
    }
  }

  function newChat() {
    setMessages([])
    setConvId(null)
    setMobileSidebarOpen(false)
  }

  async function openConversation(id: string) {
    const { data } = await createClient().from('ai_conversations').select('messages').eq('id', id).single()
    const msgs = ((data as { messages: Message[] } | null)?.messages || []) as Message[]
    setMessages(msgs)
    setConvId(id)
    setMobileSidebarOpen(false)
  }

  async function deleteConversation(id: string) {
    await createClient().from('ai_conversations').delete().eq('id', id)
    if (id === convId) newChat()
    refreshConversations()
  }

  async function onFilesPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files || [])
    e.target.value = ''
    setNotice('')
    if (picked.length === 0) return

    const next = [...attachments]
    let currentPhotos = next.filter((f) => f.mime.startsWith('image/')).length
    let currentPdfs = next.filter((f) => f.mime === 'application/pdf').length
    let total = next.reduce((n, f) => n + Math.floor((f.data.length * 3) / 4), 0)

    for (const f of picked) {
      if (!ALLOWED_FILE_TYPES.includes(f.type)) {
        setNotice('Solo podés subir fotos (PNG, JPG, WebP) o documentos PDF.')
        continue
      }

      const isImage = f.type.startsWith('image/')
      const isPdf = f.type === 'application/pdf'

      if (isImage) {
        if (currentPhotos >= MAX_PHOTOS) {
          setNotice(`Podés adjuntar hasta un máximo de ${MAX_PHOTOS} fotos por mensaje.`)
          continue
        }
        if (f.size > MAX_IMAGE_BYTES) {
          setNotice(`La foto "${f.name}" supera el límite de 10 MB.`)
          continue
        }
      }

      if (isPdf) {
        if (currentPdfs >= MAX_PDFS) {
          setNotice(`Podés adjuntar hasta un máximo de ${MAX_PDFS} documentos PDF por mensaje.`)
          continue
        }
        if (f.size > MAX_PDF_BYTES) {
          setNotice(`El documento PDF "${f.name}" supera el límite de 15 MB.`)
          continue
        }
      }

      if (next.length >= MAX_FILES) {
        setNotice(`Podés adjuntar hasta ${MAX_FILES} archivos en total por mensaje.`)
        break
      }

      if (total + f.size > MAX_TOTAL_BYTES) {
        setNotice('Los archivos no pueden superar los 20 MB en total.')
        continue
      }

      try {
        let fileData = ''
        let fileMime = f.type

        if (isImage) {
          const processed = await processImageAttachment(f)
          fileData = processed.data
          fileMime = processed.mime
        } else {
          fileData = await fileToBase64(f)
        }

        const effectiveSize = Math.floor((fileData.length * 3) / 4)
        if (total + effectiveSize > MAX_TOTAL_BYTES) {
          setNotice('Los archivos no pueden superar los 20 MB en total.')
          continue
        }

        next.push({ name: f.name, mime: fileMime, data: fileData })
        total += effectiveSize
        if (isImage) currentPhotos++
        if (isPdf) currentPdfs++
      } catch {
        setNotice(`No se pudo leer el archivo "${f.name}".`)
      }
    }
    setAttachments(next)
  }

  function onMenuAction(id: (typeof ATTACH_OPTIONS)[number]['id']) {
    setMenuOpen(false)
    setNotice('')
    if (id === 'files') fileInputRef.current?.click()
    else if (id === 'cv') setIncludeCv((v) => !v)
    else if (id === 'deep') setDeepSearch((v) => !v)
    else if (id === 'cvfix') {
      setIncludeCv(true)
      if (!input.trim()) setInput('Revisá mi CV y proponeme una versión mejorada de mi perfil.')
      textareaRef.current?.focus()
    } else if (id === 'email') {
      if (!isAdmin) {
        setNotice('La función de postular por Gmail estará disponible muy pronto (en proceso de verificación con Google).')
        return
      }
      if (!gmail?.configured) {
        setNotice('El envío por Gmail todavía no está habilitado en la plataforma.')
      } else if (!gmail.connected) {
        connectGmail()
      } else {
        setIncludeCv(true)
        if (!input.trim()) setInput('Quiero postularme por email a: ')
        textareaRef.current?.focus()
      }
    }
  }

  function editProfile(id: string, patch: Partial<PendingProfile>) {
    setMessages((ms) => ms.map((m) => (m.id === id && m.profile ? { ...m, profile: { ...m.profile, ...patch } } : m)))
  }

  async function confirmProfileSave(msg: Message) {
    if (!msg.profile) return
    setMessages((ms) => ms.map((m) => (m.id === msg.id ? { ...m, profileState: 'sending' } : m)))
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Tu sesión expiró.')
      await saveProfile(msg.profile, token)
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, profileState: 'done' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: 'Listo, actualicé tu perfil.' },
      ])
    } catch (e: any) {
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, profileState: 'idle' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: e?.message || 'No se pudo guardar.' },
      ])
    }
  }

  function toggleAuto() {
    setAutoApply((v) => {
      localStorage.setItem('ia-chat-auto', v ? '0' : '1')
      return !v
    })
  }

  // Scroll solo dentro del panel de mensajes
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // El chat ocupa toda la pantalla: se bloquea el scroll de la página mientras está abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const hasAttachments = attachments.length > 0 || includeCv || deepSearch
  const hasNewLine = input.includes('\n')
  const isExpanded = hasAttachments || hasNewLine || isMultiLine

  // Detección para expandir a dos filas cuando el texto se acerca a los botones de la derecha
  useEffect(() => {
    if (hasAttachments || hasNewLine) {
      if (!isMultiLine) setIsMultiLine(true)
      return
    }
    if (!input.trim()) {
      if (isMultiLine) setIsMultiLine(false)
      return
    }

    const boxWidth = composerBoxRef.current?.offsetWidth || 700
    const occupiedWidth = boxWidth < 500 ? 175 : 210
    const availableTextWidth = Math.max(100, boxWidth - occupiedWidth)

    let textWidth = 0
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        textWidth = ctx.measureText(input).width
      }
    }

    if (!isMultiLine && textWidth >= availableTextWidth - 15) {
      setIsMultiLine(true)
    } else if (isMultiLine && textWidth < availableTextWidth - 35) {
      setIsMultiLine(false)
    }
  }, [input, hasAttachments, hasNewLine, isMultiLine])

  useEffect(() => {
    const handleResize = () => {
      if (!composerBoxRef.current || !input.trim() || hasAttachments || hasNewLine) return
      const boxWidth = composerBoxRef.current.offsetWidth
      const occupiedWidth = boxWidth < 500 ? 175 : 210
      const availableTextWidth = Math.max(100, boxWidth - occupiedWidth)
      let textWidth = 0
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        textWidth = ctx.measureText(input).width
      }
      setIsMultiLine(textWidth >= availableTextWidth - 15)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [input, hasAttachments, hasNewLine])

  // Ajuste de altura del textarea para expandirse hacia arriba sin generar scrollbar
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    if (!isExpanded) {
      el.style.height = '42px'
      el.style.overflowY = 'hidden'
    } else {
      el.style.height = 'auto'
      const newHeight = Math.min(el.scrollHeight, 260)
      el.style.height = `${newHeight}px`
      el.style.overflowY = el.scrollHeight > 260 ? 'auto' : 'hidden'
    }
  }, [input, isExpanded])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
      if (subModelMenuRef.current && !subModelMenuRef.current.contains(e.target as Node)) {
        setSubModelOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Bloquear el scroll del body en la vista de chat para que el navbar permanezca siempre fijo y no scrollee en móvil
  useEffect(() => {
    const origOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = origOverflow
    }
  }, [])

  async function send(text: string) {
    const typed = text.trim()
    if ((!typed && attachments.length === 0) || loading) return

    // Validar créditos específicos para modelos de pago (Claude o GPT) en candidatos
    const currentModel = (subModelId || modelId).toLowerCase()
    const isClaude = currentModel.includes('claude')
    const isOpenAi = currentModel.includes('gpt') || currentModel.includes('openai')
    const isPaid = isClaude || isOpenAi

    if (isPaid && !isAdmin) {
      const claudeCredits = billing?.creditosClaude ?? 0
      const gptCredits = billing?.creditosChatgpt ?? 0

      if (isClaude && claudeCredits <= 0) {
        setNotice('No tenés consultas de Claude disponibles. Podés adquirir el Pack Claude en Planes o usar Gemini Gratis.')
        return
      }
      if (isOpenAi && gptCredits <= 0) {
        setNotice('No tenés consultas de ChatGPT disponibles. Podés adquirir el Pack ChatGPT en Planes o usar Gemini Gratis.')
        return
      }
    }

    const content = typed || DEFAULT_ATTACHMENT_PROMPT
    const sendOpts: SendOptions = { autoApply, attachments, includeCv, deepSearch, model: subModelId || modelId }
    const next: Message[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        files: attachments.length ? attachments.map((a) => a.name) : undefined,
        attachments: attachments.length ? [...attachments] : undefined,
      },
    ]
    setMessages(next)
    setInput('')
    setAttachments([])
    setIncludeCv(false)
    setDeepSearch(false)
    setNotice('')
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Tu sesión expiró. Volvé a iniciar sesión.')
      const { reply, pending, email, emails, needsGmail, profile: proposed, whatsappContacts } = await sendToAgent(next, token, sendOpts)
      const withReply: Message[] = [
        ...next,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply || 'Listo.',
          pending: pending.length ? pending : undefined,
          pendingState: 'idle',
          email: email || undefined,
          emails: emails.length > 0 ? emails : undefined,
          emailState: 'idle',
          needsGmail,
          profile: proposed || undefined,
          profileState: 'idle',
          whatsappContacts: whatsappContacts.length > 0 ? whatsappContacts : undefined,
        },
      ]
      setMessages(withReply)
      const savedId = await saveConversation(withReply, convId)
      if (savedId) setConvId(savedId)
    } catch (e: any) {
      setMessages([
        ...next,
        { id: crypto.randomUUID(), role: 'assistant', content: e?.message || 'Ocurrió un error. Intentá de nuevo.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function confirm(msg: Message) {
    if (!msg.pending) return
    setMessages((ms) => ms.map((m) => (m.id === msg.id ? { ...m, pendingState: 'sending' } : m)))
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Tu sesión expiró.')
      const { applied, skipped } = await confirmApplications(msg.pending, token)
      const text =
        `Listo: te postulé a ${applied.length} empleo(s).` +
        (skipped.length ? ` Omitidos ${skipped.length}: ${Array.from(new Set(skipped.map((s) => s.reason))).join(', ')}.` : '')
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, pendingState: 'done' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: text },
      ])
    } catch (e: any) {
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, pendingState: 'idle' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: e?.message || 'No se pudo enviar.' },
      ])
    }
  }

  function editEmail(id: string, patch: Partial<PendingEmail>) {
    setMessages((ms) => ms.map((m) => (m.id === id && m.email ? { ...m, email: { ...m.email, ...patch } } : m)))
  }

  async function sendEmail(msg: Message) {
    if (!msg.email) return
    setMessages((ms) => ms.map((m) => (m.id === msg.id ? { ...m, emailState: 'sending' } : m)))
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Tu sesión expiró.')
      const { to } = await confirmEmail(msg.email, token)
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, emailState: 'done' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: `Correo enviado a ${to} desde tu Gmail.` },
      ])
    } catch (e: any) {
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, emailState: 'idle' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: e?.message || 'No se pudo enviar el correo.' },
      ])
    }
  }

  function editBatchEmails(id: string, patch: { subject?: string; body?: string; attach_cv?: boolean }) {
    setMessages((ms) =>
      ms.map((m) => {
        if (m.id !== id || !m.emails) return m
        const updated = m.emails.map((e) => ({
          ...e,
          ...(patch.subject !== undefined ? { subject: patch.subject } : {}),
          ...(patch.body !== undefined ? { body: patch.body } : {}),
          ...(patch.attach_cv !== undefined ? { attach_cv: patch.attach_cv } : {}),
        }))
        return {
          ...m,
          emails: updated,
          email: updated[0] ? { ...updated[0] } : m.email,
        }
      })
    )
  }

  function editEmailByIndex(id: string, index: number, patch: Partial<PendingEmail>) {
    setMessages((ms) =>
      ms.map((m) => {
        if (m.id !== id || !m.emails) return m
        const updated = m.emails.map((e, idx) => (idx === index ? { ...e, ...patch } : e))
        return {
          ...m,
          emails: updated,
          email: updated[0] ? { ...updated[0] } : m.email,
        }
      })
    )
  }

  function toggleBatchRecipient(id: string, emailToToggle: string) {
    setMessages((ms) =>
      ms.map((m) => {
        if (m.id !== id || !m.emails) return m
        const updated = m.emails.map((e) =>
          e.to === emailToToggle ? { ...e, selected: e.selected === false ? true : false } : e
        )
        return { ...m, emails: updated }
      })
    )
  }

  async function sendBatchEmails(msg: Message) {
    if (!msg.emails || msg.emails.length === 0) return
    const activeEmails = msg.emails.filter((e) => e.selected !== false)
    if (activeEmails.length === 0) {
      setNotice('Seleccioná al menos una empresa para enviar.')
      return
    }

    const candidateName = profile?.nombre || undefined
    const personalizedList = activeEmails.map((e) => ({
      ...e,
      subject: personalizeEmailText(e.subject, { empresa: e.empresa, puesto: e.puesto, candidateName }),
      body: personalizeEmailText(e.body, { empresa: e.empresa, puesto: e.puesto, candidateName }),
    }))

    setMessages((ms) => ms.map((m) => (m.id === msg.id ? { ...m, emailState: 'sending' } : m)))
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Tu sesión expiró.')
      const res = await confirmEmails(personalizedList, token)
      const count = res.count || activeEmails.length
      const failed = res.failed || []
      const successMsg = `Correos enviados simultáneamente a ${count} empresa(s) desde tu Gmail: ${res.recipients.join(', ')}.`
      const failMsg = failed.length > 0 ? `\n(Hubo fallas en: ${failed.map((f) => f.to).join(', ')})` : ''
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, emailState: 'done' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: successMsg + failMsg },
      ])
    } catch (e: any) {
      setMessages((ms) => [
        ...ms.map((m) => (m.id === msg.id ? { ...m, emailState: 'idle' as const } : m)),
        { id: crypto.randomUUID(), role: 'assistant', content: e?.message || 'No se pudieron enviar los correos.' },
      ])
    }
  }

  if (!isLoading && profile?.role === 'empresa' && !isAdmin) {
    return null
  }

  if (!isLoading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-5 px-4 text-center font-google-sans">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Iniciá sesión para usar el chat de IA</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          La IA necesita tu perfil y CV para recomendarte empleos y postularte por vos.
        </p>
        <Link
          href="/auth/login"
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
        >
          Iniciar sesión
        </Link>
      </div>
    )
  }

  const empty = messages.length === 0

  // Cuadro de escritura (composer):
  // 1 línea unificada: [ + ] [ Preguntale a la IA sobre empleos... ] [ Auto ] [ Enviar ]
  // Multilínea/expandido: Textarea arriba a todo el ancho, y controles abajo ([ + ] a la izquierda, [ Auto ] [ Enviar ] a la derecha)
  const composer = (
    <div className="w-full max-w-[700px] mx-auto">
      <div
        ref={composerBoxRef}
        className={cn(
          'relative border border-slate-200/90 dark:border-slate-700/80 bg-white dark:bg-slate-900 shadow-sm focus-within:shadow-md focus-within:border-slate-300 dark:focus-within:border-slate-600 transition-all duration-200',
          isExpanded
            ? 'rounded-3xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-y-2.5'
            : 'rounded-full px-2.5 sm:px-3.5 py-1.5 sm:py-2.5 min-h-[52px] sm:min-h-[56px] flex flex-nowrap items-center gap-1.5 sm:gap-2.5'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={onFilesPicked}
        />

        {/* Zona de archivos adjuntos / badges (CV, Búsqueda profunda) */}
        {(attachments.length > 0 || includeCv || deepSearch) && (
          <div className="w-full order-1 flex flex-wrap items-center gap-2.5 px-2 pt-1 pb-2">
            {attachments.map((f, i) => (
              <div
                key={f.name + i}
                className="relative group w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden border border-transparent bg-slate-100 dark:bg-slate-800 shadow-xs shrink-0 transition-transform hover:scale-[1.02]"
              >
                {f.mime.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${f.mime};base64,${f.data}`}
                    alt={f.name}
                    className="w-full h-full object-cover select-none"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center select-none bg-slate-50 dark:bg-slate-800/90">
                    <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px] mb-1">
                      PDF
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 max-w-full break-all font-medium leading-tight">
                      {f.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                  aria-label="Quitar archivo"
                  className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/65 hover:bg-black/85 text-white flex items-center justify-center transition-colors shadow-xs cursor-pointer z-10"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {includeCv && (
              <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-sky-50 dark:bg-sky-500/15 text-xs text-sky-700 dark:text-white border border-sky-200/60 dark:border-sky-500/30">
                <FileText className="w-3 h-3 text-sky-600 dark:text-white" /> Mi CV
                <button
                  type="button"
                  onClick={() => setIncludeCv(false)}
                  aria-label="Quitar CV"
                  className="p-0.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-500/30 text-sky-700 dark:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {deepSearch && (
              <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-xs text-indigo-700 dark:text-white border border-indigo-200/60 dark:border-indigo-500/30">
                <Search className="w-3 h-3 text-indigo-600 dark:text-white" /> Búsqueda profunda
                <button
                  type="button"
                  onClick={() => setDeepSearch(false)}
                  aria-label="Quitar búsqueda profunda"
                  className="p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-500/30 text-indigo-700 dark:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Caja de texto (textarea). Permanece en el DOM para preservar foco y cursor */}
        <div
          className={cn(
            'min-w-0 transition-all',
            isExpanded ? 'w-full order-2 px-2 pt-1 pb-1' : 'flex-1 order-2'
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            rows={1}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Preguntale a la IA..."
            className={cn(
              'w-full block resize-none !bg-transparent border-0 text-xs sm:text-base text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-0 font-google-sans',
              isExpanded
                ? 'px-1 py-1 max-h-[260px] leading-relaxed whitespace-pre-wrap'
                : 'px-1 sm:px-2 py-2 h-[38px] sm:h-[42px] max-h-[38px] sm:max-h-[42px] leading-normal whitespace-nowrap overflow-hidden text-ellipsis'
            )}
          />
        </div>

        {/* Botón + con su menú desplegable (a la izquierda en modo inline, o abajo a la izquierda en modo expandido) */}
        <div
          className={cn('relative shrink-0', isExpanded ? 'order-3' : 'order-1')}
          ref={menuRef}
        >
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Más opciones"
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-600 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Plus className={cn('w-5 h-5 transition-transform text-slate-600 dark:text-white', menuOpen && 'rotate-45')} />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full mb-2.5 left-0 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/90 dark:border-[#333538] bg-white dark:bg-[#1e1f20] shadow-2xl shadow-black/40 p-1.5 z-40 animate-in fade-in slide-in-from-bottom-2 font-google-sans">
              {ATTACH_OPTIONS.map(({ id, icon: Icon, label }) => {
                const status = id === 'cv' ? includeCv : id === 'deep' ? deepSearch : false
                const showDivider = id === 'deep'
                return (
                  <React.Fragment key={id}>
                    {showDivider && (
                      <div className="my-1 border-t border-slate-200 dark:border-[#2d2e30]" />
                    )}
                    <button
                      type="button"
                      onClick={() => onMenuAction(id)}
                      className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[15px] sm:text-base font-normal text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-[#2d2e30] text-left transition-colors"
                    >
                      <span className="w-5 h-5 shrink-0 flex items-center justify-center text-slate-600 dark:text-white">
                        <Icon className="w-[18px] h-[18px] shrink-0 text-slate-600 dark:text-white" />
                      </span>
                      <span className="flex-1 truncate leading-none pt-0.5">{label}</span>
                      {id === 'email' ? (
                        !isAdmin ? (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 leading-none">
                            Próximamente
                          </span>
                        ) : gmail?.connected ? (
                          <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-rose-500 dark:text-rose-400 shrink-0 leading-none">
                            No conectado
                          </span>
                        )
                      ) : (
                        status && (
                          <span className="w-5 h-5 shrink-0 flex items-center justify-center">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                          </span>
                        )
                      )}
                    </button>
                  </React.Fragment>
                )
              })}
            </div>
          )}
        </div>

        {/* Acciones de la derecha: Selector de versión de modelo + Switch Auto + Botón Enviar */}
        <div
          className={cn(
            'flex items-center gap-1.5 sm:gap-2.5 shrink-0 select-none',
            isExpanded ? 'order-4 ml-auto' : 'order-3'
          )}
        >
          {/* Selector de sub-modelo: botón pill con menú desplegable hacia arriba adaptado al tema */}
          <div className="relative" ref={subModelMenuRef}>
            <button
              type="button"
              onClick={() => setSubModelOpen((o) => !o)}
              className="h-8 px-2 sm:px-3.5 rounded-full bg-slate-100 hover:bg-slate-200/90 text-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 border border-slate-200/90 dark:border-slate-700/80 text-[11px] sm:text-[13px] font-medium transition-all flex items-center gap-1 sm:gap-1.5 shadow-2xs active:scale-95 cursor-pointer select-none font-google-sans max-w-[85px] sm:max-w-none"
              title="Versión del modelo"
            >
              <span className="truncate max-w-[55px] sm:max-w-none">{subModelButtonLabel}</span>
              <ChevronUp
                className={cn(
                  'w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 stroke-[2.2] shrink-0',
                  subModelOpen && 'rotate-180'
                )}
              />
            </button>

            {subModelOpen && (
              <div className="absolute bottom-full mb-2.5 right-0 z-40 animate-in fade-in zoom-in-95 duration-150">
                <div className="w-[260px] sm:w-[275px] max-w-[calc(100vw-2rem)] p-2 rounded-[22px] border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl shadow-slate-900/15 dark:shadow-black/70 font-google-sans select-none">
                  <div className="space-y-0.5">
                    {currentSubList.map((sub) => {
                      const isSelected = sub.id === subModelId
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSubModelId(sub.id)
                            setSubModelButtonLabel(sub.name)
                            setSubModelOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-3 py-2 rounded-[16px] text-left transition-colors cursor-pointer',
                            isSelected
                              ? 'bg-slate-100/90 dark:bg-slate-800/90 text-slate-900 dark:text-white'
                              : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                          )}
                        >
                          <div className="w-4 h-4 shrink-0 flex items-center justify-center">
                            {isSelected && (
                              <Check className="w-4 h-4 text-blue-600 dark:text-blue-400 stroke-[2.5]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13.5px] font-semibold text-slate-900 dark:text-white leading-tight">
                              {sub.name}
                            </p>
                            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
                              {sub.description}
                            </p>
                          </div>
                          {sub.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300/60 dark:border-slate-700 shrink-0 ml-1.5">
                              {sub.badge}
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            className="flex items-center gap-1 sm:gap-2"
            title="Auto: la IA se postula automáticamente sin pedir confirmación previa"
          >
            <label
              htmlFor="auto-apply-switch"
              className="hidden sm:inline text-xs sm:text-sm font-medium text-slate-700 dark:text-white cursor-pointer"
            >
              Auto
            </label>
            <Switch
              id="auto-apply-switch"
              checked={autoApply}
              onCheckedChange={(checked) => {
                setAutoApply(checked)
                localStorage.setItem('ia-chat-auto', checked ? '1' : '0')
              }}
              className="scale-90 sm:scale-100 origin-center"
              aria-label="Modo automático"
            />
          </div>
          {!isMounted || resolvedTheme === 'dark' ? (
            <ShinyButton
              size="icon"
              type="button"
              onClick={() => send(input)}
              disabled={(!input.trim() && attachments.length === 0) || loading}
              aria-label="Enviar"
              title="Enviar"
              className="w-9 h-9 shrink-0 shadow-sm"
            >
              <ArrowUp className="w-4.5 h-4.5 text-white shrink-0" />
            </ShinyButton>
          ) : (
            <LiquidMetalButton
              viewMode="icon"
              width={36}
              height={36}
              onClick={() => send(input)}
              disabled={(!input.trim() && attachments.length === 0) || loading}
              aria-label="Enviar"
              title="Enviar"
              className="shrink-0"
            >
              <ArrowUp className="w-4.5 h-4.5 text-white shrink-0" />
            </LiquidMetalButton>
          )}
        </div>
      </div>

      {notice && <p className="text-xs text-rose-500 text-center mt-2">{notice}</p>}
      {gmail?.configured && gmail.connected && (
        <div className="flex justify-center mt-2">
          <span className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <MailIcon className="w-3.5 h-3.5 text-emerald-500" />
            Gmail conectado{gmail.email ? `: ${gmail.email}` : ''}
            <button onClick={disconnectGmail} className="underline text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-1">
              Desconectar
            </button>
          </span>
        </div>
      )}
    </div>
  )

  // Iniciales del usuario y etiqueta de su plan actual
  const displayName = profile?.nombre?.trim() || profile?.email?.split('@')[0] || 'Usuario'
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || 'U'

  const chatCreditsCount = (billing?.creditosClaude ?? 0) + (billing?.creditosChatgpt ?? 0)
  const planLabel = isAdmin
    ? 'Admin'
    : billing?.plan === 'anual'
    ? 'Plan Anual'
    : billing?.plan === 'mensual'
    ? 'Plan Mensual'
    : chatCreditsCount > 0
    ? `Pro · ${chatCreditsCount} consultas`
    : 'Free'

  const hasActiveSubscription = !!billing && (billing.plan === 'mensual' || billing.plan === 'anual')
  const showUpgradeButton = !isAdmin && !hasActiveSubscription

  const filteredConversations = [...conversations]
    .filter((c) => !searchQuery.trim() || c.title.toLowerCase().includes(searchQuery.trim().toLowerCase()))
    .sort((a, b) => {
      const aPinned = pinnedIds.includes(a.id) ? 1 : 0
      const bPinned = pinnedIds.includes(b.id) ? 1 : 0
      return bPinned - aPinned
    })

  // Contenido del panel lateral de historial fiel al diseño de ChatGPT pero con el fondo azul oscuro de la página
  const sidebarContent = (
    <div className="flex flex-col h-full w-[260px] bg-slate-50/95 dark:bg-[#020617] border-r border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-slate-100 select-none">
      {/* Fila superior: Título + Buscar + Plegar sidebar */}
      <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2">
        <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
          PostulaIA
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setSearchOpen((v) => {
                if (v) setSearchQuery('')
                return !v
              })
            }}
            aria-label="Buscar en chats"
            title="Buscar en chats"
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              searchOpen
                ? 'bg-slate-200/80 dark:bg-[#0f172a] text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#0f172a] hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Search className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              toggleSidebar()
              setMobileSidebarOpen(false)
            }}
            aria-label="Ocultar barra lateral"
            title="Ocultar barra lateral"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-[#0f172a] hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Buscador desplegable opcional */}
      {searchOpen && (
        <div className="px-2.5 pb-2">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar conversación…"
              autoFocus
              className="w-full pl-8 pr-7 py-1.5 rounded-lg text-xs !bg-slate-200/70 dark:!bg-[#0f172a] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-transparent focus:border-slate-300 dark:focus:border-slate-700 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Botón "New chat" / "Nuevo chat" en cápsula redondeada */}
      <div className="px-2.5 pb-3">
        <button
          type="button"
          onClick={newChat}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-200/75 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-[#16203a] border border-transparent dark:border-slate-800/70 text-[13px] font-medium text-slate-900 dark:text-white transition-colors"
        >
          <SquarePen className="w-4 h-4 shrink-0" />
          <span>Nuevo chat</span>
        </button>
      </div>

      {/* Sección Recientes (Recents) con su respectivo hover estilo ChatGPT */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        <button
          type="button"
          onClick={() => setRecentsExpanded((v) => !v)}
          className="group flex items-center gap-1 w-full px-2.5 py-1.5 text-left text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <span>Recientes</span>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-all',
              !recentsExpanded && '-rotate-90 opacity-100'
            )}
          />
        </button>

        {recentsExpanded && (
          <div className="space-y-0.5 pt-0.5">
            {filteredConversations.length === 0 ? (
              <p className="px-2.5 py-3 text-xs text-slate-400 dark:text-slate-500">
                {searchQuery.trim() ? 'Sin resultados.' : 'Todavía no tenés chats recientes.'}
              </p>
            ) : (
              filteredConversations.map((c) => {
                const active = c.id === convId
                const isPinned = pinnedIds.includes(c.id)
                const menuOpenForRow = chatMenuId === c.id
                return (
                  <div
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={cn(
                      'group relative flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[13px] cursor-pointer transition-colors',
                      active || menuOpenForRow
                        ? 'bg-slate-200/85 dark:bg-[#0f172a] text-slate-900 dark:text-white'
                        : 'text-slate-700 dark:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-[#0f172a]'
                    )}
                  >
                    <span className="truncate flex-1 pr-1">{c.title}</span>

                    {/* Acciones que aparecen en hover (… y Pin) igual que en ChatGPT */}
                    <div
                      className={cn(
                        'flex items-center gap-0.5 shrink-0 transition-opacity',
                        isPinned || menuOpenForRow
                          ? 'opacity-100'
                          : 'opacity-0 group-hover:opacity-100'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => setChatMenuId((prev) => (prev === c.id ? null : c.id))}
                        aria-label="Más opciones"
                        title="Opciones"
                        className="p-1 rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                      >
                        <MoreHorizontal className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => togglePin(c.id, e)}
                        aria-label={isPinned ? 'Desfijar chat' : 'Fijar chat'}
                        title={isPinned ? 'Desfijar chat' : 'Fijar arriba'}
                        className={cn(
                          'p-1 rounded-md transition-colors',
                          isPinned
                            ? 'text-sky-500 dark:text-sky-400'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
                        )}
                      >
                        <Pin className="w-3.5 h-3.5 rotate-45" />
                      </button>
                    </div>

                    {/* Menú contextual de los 3 puntos (…) */}
                    {menuOpenForRow && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-2 top-9 z-30 w-40 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-[#0f172a] shadow-xl py-1 animate-in fade-in"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            togglePin(c.id, e)
                            setChatMenuId(null)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-left"
                        >
                          <Pin className="w-3.5 h-3.5 rotate-45" />
                          <span>{isPinned ? 'Desfijar' : 'Fijar chat'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setChatMenuId(null)
                            deleteConversation(c.id)
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-left"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Pie del sidebar: Cuenta registrada + Plan + Botón Upgrade */}
      <div className="p-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/80 space-y-2.5">
        <Link
          href={profile?.role === 'empresa' ? '/empresa/dashboard' : '/candidato/perfil'}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-slate-200/60 dark:hover:bg-[#0f172a] transition-colors"
        >
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#10a37f] text-white text-xs font-bold flex items-center justify-center shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight truncate">
              {displayName}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 truncate">
              {planLabel}
            </p>
          </div>
        </Link>

        {showUpgradeButton && (
          <Link
            href="/planes"
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-full border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-[#091024] hover:bg-slate-100 dark:hover:bg-[#0f172a] text-xs font-semibold text-slate-900 dark:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Upgrade</span>
          </Link>
        )}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-10 flex bg-background overflow-hidden font-google-sans">
      {/* Sidebar escritorio (estilo ChatGPT) */}
      <aside
        className={cn(
          'hidden md:block h-full shrink-0 transition-all duration-200 overflow-hidden',
          sidebarOpen ? 'w-[260px]' : 'w-0'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Drawer lateral móvil */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 top-16 z-40 flex md:hidden">
          <div
            className="fixed inset-0 top-16 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Área principal del chat */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Barra superior sin barrita divisoria (border-b) */}
        <header className="h-14 shrink-0 px-3 sm:px-5 flex items-center justify-between bg-transparent z-20">
          <div className="flex items-center gap-1.5">
            {/* Botón para abrir historial en móvil */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Abrir historial"
              title="Abrir historial"
              className="md:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <PanelLeft className="w-4 h-4" />
            </button>

            {/* Botón para mostrar historial en escritorio cuando está plegado */}
            {!sidebarOpen && (
              <div className="hidden md:flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label="Mostrar historial"
                  title="Mostrar panel lateral"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={newChat}
                  aria-label="Nuevo chat"
                  title="Nuevo chat"
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Selector de modelos con efecto Glassy (GlassContainer) */}
          <div className="relative" ref={modelMenuRef}>
            <GlassContainer
              blur={3}
              variant="prominent"
              tint="warm"
              onClick={() => setModelOpen((o) => !o)}
              className="!rounded-full !px-4 !py-1.5 text-[14px] sm:text-[15px] font-medium transition-all duration-300 select-none flex items-center justify-center cursor-pointer shadow-md active:scale-[0.98]"
            >
              <div className="flex items-center gap-2 text-slate-900 dark:text-white font-google-sans">
                {modelId === 'claude' ? (
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                ) : modelId === 'gpt' ? (
                  <Zap className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400 shrink-0" />
                )}
                <span className="tracking-tight">{MODELS.find((m) => m.id === modelId)?.name}</span>
                <ChevronDown
                  className={cn(
                    'w-3.5 h-3.5 text-slate-500 dark:text-white/80 transition-transform duration-200',
                    modelOpen && 'rotate-180'
                  )}
                />
              </div>
            </GlassContainer>

            {modelOpen && (
              <div className="absolute top-11 left-1/2 -translate-x-1/2 z-30 animate-in fade-in slide-in-from-top-2">
                <GlassContainer
                  blur={16}
                  variant="prominent"
                  tint="warm"
                  hover={false}
                  className="!p-1.5 !rounded-2xl w-[calc(100vw-2rem)] max-w-xs sm:w-80 shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden font-google-sans bg-white/70 dark:bg-slate-900/80"
                >
                  {MODELS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={!m.available}
                      onClick={() => {
                        if (m.available) {
                          onSelectCompany(m.id)
                        }
                      }}
                      className={cn(
                        'w-full flex items-start gap-3 px-3.5 py-2.5 rounded-xl text-left transition-colors',
                        m.available
                          ? 'hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">{m.name}</p>
                          {m.id === 'gemini' && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800">
                              Base
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{m.description}</p>
                      </div>
                      {m.id === modelId ? (
                        <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold mt-0.5 shrink-0">
                          {m.id === 'claude'
                            ? billing?.creditosClaude && billing.creditosClaude > 0
                              ? `${billing.creditosClaude} disp.`
                              : 'Pack'
                            : m.id === 'gpt'
                            ? billing?.creditosChatgpt && billing.creditosChatgpt > 0
                              ? `${billing.creditosChatgpt} disp.`
                              : 'Pack'
                            : m.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </GlassContainer>
              </div>
            )}
          </div>

          {/* Espaciador derecho para mantener el selector centrado */}
          <div className="w-9 md:w-16" />
        </header>

        {/* Aviso de conexión con Gmail bien espaciado debajo del header (nunca se solapa con el selector) */}
        {gmailBanner && (
          <div className="px-4 pt-3 shrink-0">
            <div
              className={cn(
                'max-w-3xl mx-auto flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl border text-xs',
                gmailBanner.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              )}
            >
              <div className="flex items-center gap-2">
                <MailIcon className="w-4 h-4 shrink-0" />
                <span>{gmailBanner.text}</span>
              </div>
              <button
                type="button"
                onClick={() => setGmailBanner(null)}
                aria-label="Cerrar aviso"
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {empty ? (
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-6 gap-7">
            <div className="text-center space-y-3.5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
                <Sparkles className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                ¿Qué empleo buscamos hoy?
              </h1>
              <p className="text-sm sm:text-lg text-slate-500 dark:text-slate-400">
                Dejá que la IA encuentre vacantes, mejore tu CV y se postule por vos.
              </p>
            </div>
            {composer}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 max-w-3xl px-2">
              {SUGGESTIONS.map(({ icon: Icon, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => send(label)}
                  className="inline-flex items-center gap-2 sm:gap-2.5 px-3.5 sm:px-5 py-2.5 sm:py-3 min-h-[40px] sm:min-h-[44px] rounded-full border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-colors shadow-xs leading-normal"
                >
                  <Icon className="w-4 h-4 text-slate-400 dark:text-white shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
              <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((m) => {
                  const isEditingProfile = !!editingProfileIds[m.id]
                  return (
                    <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      {m.role === 'user' ? (
                        <div className="flex flex-col items-end gap-2 max-w-[85%]">
                          {/* Previsualización de archivos / imágenes enviadas (por encima de la burbuja) */}
                          {m.attachments && m.attachments.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-2.5">
                              {m.attachments.map((f, i) =>
                                f.mime.startsWith('image/') ? (
                                  <button
                                    type="button"
                                    key={f.name + i}
                                    onClick={() => openAttachment(f)}
                                    title={`Ver ${f.name} en tamaño completo`}
                                    className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl sm:rounded-3xl overflow-hidden border border-transparent shadow-md bg-transparent group cursor-pointer transition-transform hover:scale-[1.01]"
                                  >
                                    <img
                                      src={`data:${f.mime};base64,${f.data}`}
                                      alt={f.name}
                                      className="w-full h-full object-cover select-none"
                                    />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    key={f.name + i}
                                    onClick={() => openAttachment(f)}
                                    title={`Abrir ${f.name}`}
                                    className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 dark:bg-slate-800/90 text-white text-xs border border-white/10 shadow-sm hover:bg-slate-800 cursor-pointer transition-colors"
                                  >
                                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold text-[10px]">
                                      PDF
                                    </span>
                                    <span className="font-medium truncate max-w-[180px]">{f.name}</span>
                                  </button>
                                )
                              )}
                            </div>
                          ) : m.files && m.files.length > 0 ? (
                            <div className="flex flex-wrap justify-end gap-1.5">
                              {m.files.map((n, i) => (
                                <span
                                  key={n + i}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-slate-800/90 text-white text-xs font-medium border border-white/10"
                                >
                                  <FileText className="w-3.5 h-3.5 text-indigo-400" /> {n}
                                </span>
                              ))}
                            </div>
                          ) : null}

                          {/* Burbuja de texto enviada por el usuario (debajo de la vista previa) */}
                          {m.content &&
                            m.content !== DEFAULT_ATTACHMENT_PROMPT &&
                            m.content !== 'Analizá el archivo adjunto.' && (
                            <div className="bg-slate-900 dark:bg-[#282a2c] text-white rounded-3xl rounded-br-lg px-4 py-2.5 shadow-xs whitespace-pre-wrap text-sm leading-relaxed border border-transparent dark:border-white/5">
                              {m.content}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full max-w-[92%] text-slate-800 dark:text-slate-100 text-[15px] sm:text-base leading-relaxed">
                          <ChatMarkdown content={m.content} role="assistant" />

                        {/* Propuesta de Perfil / CV con vista previa de PDF en rectángulo con bordes redondeados */}
                        {m.profile && (
                          <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 space-y-3.5 whitespace-normal shadow-sm">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                                <Wand2 className="w-3.5 h-3.5 text-indigo-500" />
                                Propuesta de CV / Perfil lista para revisar y confirmar
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingProfileIds((prev) => ({ ...prev, [m.id]: !prev[m.id] }))
                                }
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                                {isEditingProfile ? 'Ver vista previa PDF' : 'Editar contenido'}
                              </button>
                            </div>

                            {/* Vista previa en rectángulo con bordes redondeados del PDF */}
                            <RoundedPdfPreview
                              nombre={m.profile.nombre ?? profile?.nombre}
                              email={profile?.email}
                              ubicacion={m.profile.ubicacion ?? profile?.ubicacion ?? undefined}
                              bio={m.profile.bio ?? profile?.bio ?? undefined}
                              title={`CV_${(m.profile.nombre || profile?.nombre || 'Candidato').replace(/\s+/g, '_')}.pdf`}
                              subtitle="Vista previa del documento generado por la IA"
                              defaultExpanded={!isEditingProfile}
                            />

                            {/* Campos editables si el usuario desea retocar antes de confirmar */}
                            {isEditingProfile && (
                              <div className="space-y-2.5 pt-1">
                                {m.profile.nombre !== undefined && (
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Nombre</label>
                                    <input
                                      value={m.profile.nombre}
                                      onChange={(e) => editProfile(m.id, { nombre: e.target.value })}
                                      disabled={m.profileState !== 'idle'}
                                      className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                                      aria-label="Nombre"
                                    />
                                  </div>
                                )}
                                {m.profile.ubicacion !== undefined && (
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">Ubicación</label>
                                    <input
                                      value={m.profile.ubicacion}
                                      onChange={(e) => editProfile(m.id, { ubicacion: e.target.value })}
                                      disabled={m.profileState !== 'idle'}
                                      className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                                      aria-label="Ubicación"
                                    />
                                  </div>
                                )}
                                {m.profile.bio !== undefined && (
                                  <div>
                                    <label className="block text-[11px] font-medium text-slate-500 mb-1">
                                      Resumen profesional y experiencia
                                    </label>
                                    <AutoResizeTextarea
                                      value={m.profile.bio}
                                      onChange={(e) => editProfile(m.id, { bio: e.target.value })}
                                      disabled={m.profileState !== 'idle'}
                                      className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 leading-relaxed"
                                      aria-label="Resumen profesional"
                                    />
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => confirmProfileSave(m)}
                                disabled={m.profileState !== 'idle'}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-60 transition-colors"
                              >
                                {m.profileState === 'sending' ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : m.profileState === 'done' ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : null}
                                {m.profileState === 'done' ? 'Guardado en tu perfil' : 'Confirmar y guardar en mi perfil'}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Postulaciones listas para confirmar con preview redondeada del CV PDF adjunto */}
                        {m.pending && (
                          <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 space-y-3 whitespace-normal shadow-sm">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                              Postulaciones listas para revisar y confirmar
                            </p>
                            <div className="space-y-1.5">
                              {m.pending.map((p) => (
                                <div
                                  key={p.job_id}
                                  className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                                >
                                  <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span className="font-medium text-slate-800 dark:text-slate-100">{p.titulo}</span>
                                  {p.empresa && <span className="text-slate-400">· {p.empresa}</span>}
                                </div>
                              ))}
                            </div>

                            {profile && (
                              <RoundedPdfPreview
                                pdfUrl={profile.cv_url}
                                nombre={profile.nombre}
                                email={profile.email}
                                ubicacion={profile.ubicacion ?? undefined}
                                bio={profile.bio ?? undefined}
                                title={profile.cv_url ? 'Mi_CV_Adjunto.pdf' : `CV_${(profile.nombre || 'Candidato').replace(/\s+/g, '_')}.pdf`}
                                subtitle="CV que se enviará con tu postulación"
                                defaultExpanded={false}
                              />
                            )}

                            <button
                              type="button"
                              onClick={() => confirm(m)}
                              disabled={m.pendingState !== 'idle'}
                              className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-60 transition-colors"
                            >
                              {m.pendingState === 'sending' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : m.pendingState === 'done' ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : null}
                              {m.pendingState === 'done' ? 'Enviadas' : `Confirmar y postular (${m.pending.length})`}
                            </button>
                          </div>
                        )}

                        {/* Lote de correos para postulación simultánea (2 o más empresas) */}
                        {m.emails && m.emails.length > 1 ? (
                          <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 sm:p-5 space-y-4 whitespace-normal shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                <MailIcon className="w-4 h-4 text-emerald-500" />
                                Postulación simultánea por correo ({m.emails.filter((e) => e.selected !== false).length} de {m.emails.length} empresas seleccionadas)
                              </p>
                              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-500/20">
                                Envío simultáneo en 1 clic
                              </span>
                            </div>

                            {/* Lista de empresas destinatarias con checkboxes */}
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                Empresas destinatarias (podés desmarcar si no querés postularte a alguna):
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {m.emails.map((e, idx) => {
                                  const isSelected = e.selected !== false
                                  return (
                                    <div
                                      key={e.to + idx}
                                      onClick={() => m.emailState === 'idle' && toggleBatchRecipient(m.id, e.to)}
                                      className={cn(
                                        'flex items-center gap-2.5 p-2.5 rounded-2xl border text-xs transition-all cursor-pointer select-none',
                                        isSelected
                                          ? 'border-indigo-200 dark:border-indigo-500/40 bg-indigo-50/50 dark:bg-indigo-950/20 text-slate-800 dark:text-slate-100 shadow-xs'
                                          : 'border-slate-200 dark:border-slate-700/60 bg-slate-50/60 dark:bg-slate-800/40 opacity-60 text-slate-500'
                                      )}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        disabled={m.emailState !== 'idle'}
                                        onChange={() => {}}
                                        className="rounded text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                                      />
                                      <div className="min-w-0 flex-1">
                                        <div className="font-semibold truncate flex items-center gap-1.5">
                                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span className="truncate">{e.empresa || 'Empresa'}</span>
                                          {e.puesto && (
                                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal truncate">
                                              ({e.puesto})
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                          {e.to}
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Selector de empresa: solo pestañas adaptadas para cada empresa */}
                            <div className="space-y-2.5 pt-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                  Redacción adaptada para cada empresa:
                                </label>
                                <div className="flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
                                  {m.emails.map((e, idx) => {
                                    const isCurrent = (previewCompany[m.id] ?? 0) === idx
                                    return (
                                      <button
                                        key={e.to + idx}
                                        type="button"
                                        onClick={() => setPreviewCompany((prev) => ({ ...prev, [m.id]: idx }))}
                                        className={cn(
                                          'px-2.5 py-1 rounded-lg text-xs transition-colors cursor-pointer shrink-0 flex items-center gap-1.5',
                                          isCurrent
                                            ? 'bg-emerald-600 text-white font-medium shadow-xs'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                        )}
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span className="truncate max-w-[140px] font-medium">{e.empresa || `Empresa ${idx + 1}`}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>

                              {(() => {
                                const targetIdx = previewCompany[m.id] ?? 0
                                const targetEmail = m.emails[targetIdx] || m.emails[0]
                                const candidateName = profile?.nombre || undefined
                                const rawSub = targetEmail.subject || ''
                                const rawBody = targetEmail.body || ''
                                const previewSub = personalizeEmailText(rawSub, {
                                  empresa: targetEmail.empresa,
                                  puesto: targetEmail.puesto,
                                  candidateName,
                                })
                                const previewBody = personalizeEmailText(rawBody, {
                                  empresa: targetEmail.empresa,
                                  puesto: targetEmail.puesto,
                                  candidateName,
                                })
                                return (
                                  <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                                        <Eye className="w-3.5 h-3.5" />
                                        Redacción para: {targetEmail.empresa || 'Empresa'} ({targetEmail.to})
                                      </span>
                                      {targetEmail.puesto && (
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                          Postulación: {targetEmail.puesto}
                                        </span>
                                      )}
                                    </div>
                                    <input
                                      value={previewSub}
                                      onChange={(e) => editEmailByIndex(m.id, targetIdx, { subject: e.target.value })}
                                      disabled={m.emailState !== 'idle'}
                                      placeholder="Asunto para esta empresa"
                                      className="w-full text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 bg-white dark:bg-slate-900"
                                      aria-label="Asunto adaptado"
                                    />
                                    <AutoResizeTextarea
                                      value={previewBody}
                                      onChange={(e) => editEmailByIndex(m.id, targetIdx, { body: e.target.value })}
                                      disabled={m.emailState !== 'idle'}
                                      placeholder="Cuerpo del mensaje para esta empresa"
                                      className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 leading-relaxed bg-white dark:bg-slate-900"
                                      aria-label="Mensaje adaptado"
                                    />
                                  </div>
                                )
                              })()}
                            </div>

                            {/* Preview del PDF adjunto en rectángulo con bordes redondeados */}
                            {m.emails[0]?.attach_cv ? (
                              <RoundedPdfPreview
                                pdfUrl={profile?.cv_url}
                                nombre={profile?.nombre}
                                email={profile?.email}
                                ubicacion={profile?.ubicacion ?? undefined}
                                bio={profile?.bio ?? undefined}
                                title={
                                  profile?.cv_url
                                    ? `CV_${(profile?.nombre || 'Candidato').replace(/\s+/g, '_')}.pdf`
                                    : 'CV del perfil (PDF)'
                                }
                                subtitle={
                                  profile?.cv_url
                                    ? 'Documento PDF adjunto a cada correo para enviar a las empresas'
                                    : 'Vista previa de tu CV (subí un archivo PDF en Mi Perfil si querés reemplazarlo)'
                                }
                                defaultExpanded={true}
                                rightSlot={
                                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(m.emails[0]?.attach_cv)}
                                      disabled={m.emailState !== 'idle'}
                                      onChange={(e) => editBatchEmails(m.id, { attach_cv: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span>Adjuntar a todos</span>
                                  </label>
                                }
                              />
                            ) : (
                              <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <input
                                  type="checkbox"
                                  checked={Boolean(m.emails[0]?.attach_cv)}
                                  disabled={m.emailState !== 'idle'}
                                  onChange={(e) => editBatchEmails(m.id, { attach_cv: e.target.checked })}
                                />
                                <AttachFileIcon className="w-3.5 h-3.5" /> Adjuntar mi CV en PDF a los correos
                              </label>
                            )}

                            {/* Botón único de confirmación simultánea */}
                            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => sendBatchEmails(m)}
                                  disabled={m.emailState !== 'idle' || m.emails.filter((e) => e.selected !== false).length === 0}
                                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-60 transition-all cursor-pointer shadow-xs"
                                >
                                  {m.emailState === 'sending' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : m.emailState === 'done' ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : (
                                    <MailIcon className="w-3.5 h-3.5" />
                                  )}
                                  {m.emailState === 'done'
                                    ? 'Correos enviados simultáneamente'
                                    : `Confirmar y enviar a las ${m.emails.filter((e) => e.selected !== false).length} empresas simultáneamente`}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const candidateName = profile?.nombre || undefined
                                      const tIdx = previewCompany[m.id] ?? 0
                                      const tMail = m.emails?.[tIdx] || m.emails?.[0]
                                      const rawS = tMail?.subject || ''
                                      const rawB = tMail?.body || ''
                                      const pSub = personalizeEmailText(rawS, { empresa: tMail?.empresa, puesto: tMail?.puesto, candidateName })
                                      const pBody = personalizeEmailText(rawB, { empresa: tMail?.empresa, puesto: tMail?.puesto, candidateName })
                                      navigator.clipboard?.writeText(`Para: ${tMail?.to}\nAsunto: ${pSub}\n\n${pBody}`)
                                      setNotice(`¡Correo adaptado para ${tMail?.empresa || 'empresa'} copiado!`)
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                                  >
                                    <Copy className="w-3.5 h-3.5" /> Copiar correo ({m.emails?.[previewCompany[m.id] ?? 0]?.empresa || 'empresa'})
                                  </button>
                                  <a
                                    href={(() => {
                                      const tIdx = previewCompany[m.id] ?? 0
                                      const tMail = m.emails?.[tIdx] || m.emails?.[0]
                                      const candidateName = profile?.nombre || undefined
                                      const toParam = tMail?.to || ''
                                      const rawS = tMail?.subject || ''
                                      const rawB = tMail?.body || ''
                                      const pSub = personalizeEmailText(rawS, { empresa: tMail?.empresa, puesto: tMail?.puesto, candidateName })
                                      const pBody = personalizeEmailText(rawB, { empresa: tMail?.empresa, puesto: tMail?.puesto, candidateName })
                                      return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(toParam)}&su=${encodeURIComponent(pSub)}&body=${encodeURIComponent(pBody)}`
                                    })()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> Abrir en Gmail
                                  </a>
                                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    Envío simultáneo en 1 clic: Próximamente
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : m.email ? (
                          <div className="mt-4 rounded-3xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 space-y-3 whitespace-normal shadow-sm">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              <MailIcon className="w-3.5 h-3.5 text-emerald-500" />
                              Correo listo para revisar y confirmar (podés editarlo)
                            </p>
                            <div className="space-y-2">
                              <input
                                value={m.email.to}
                                onChange={(e) => editEmail(m.id, { to: e.target.value })}
                                disabled={m.emailState !== 'idle'}
                                placeholder="Destinatario"
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                                aria-label="Destinatario"
                              />
                              <input
                                value={cleanNewlines(m.email.subject)}
                                onChange={(e) => editEmail(m.id, { subject: e.target.value })}
                                disabled={m.emailState !== 'idle'}
                                placeholder="Asunto"
                                className="w-full text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500"
                                aria-label="Asunto"
                              />
                              <AutoResizeTextarea
                                value={cleanNewlines(m.email.body)}
                                onChange={(e) => editEmail(m.id, { body: e.target.value })}
                                disabled={m.emailState !== 'idle'}
                                className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-indigo-500 leading-relaxed"
                                aria-label="Mensaje"
                              />
                            </div>

                            {/* Preview del PDF adjunto en rectángulo con bordes redondeados */}
                            {m.email.attach_cv ? (
                              <RoundedPdfPreview
                                pdfUrl={profile?.cv_url}
                                nombre={profile?.nombre}
                                email={profile?.email}
                                ubicacion={profile?.ubicacion ?? undefined}
                                bio={profile?.bio ?? undefined}
                                title={
                                  profile?.cv_url
                                    ? `CV_${(profile?.nombre || 'Candidato').replace(/\s+/g, '_')}.pdf`
                                    : 'CV del perfil (PDF)'
                                }
                                subtitle={
                                  profile?.cv_url
                                    ? 'Documento PDF adjunto al correo para revisar antes de enviar'
                                    : 'Vista previa de tu CV (subí un archivo PDF en Mi Perfil si querés reemplazarlo)'
                                }
                                defaultExpanded={true}
                                rightSlot={
                                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60">
                                    <input
                                      type="checkbox"
                                      checked={m.email.attach_cv}
                                      disabled={m.emailState !== 'idle'}
                                      onChange={(e) => editEmail(m.id, { attach_cv: e.target.checked })}
                                      className="rounded"
                                    />
                                    <span>Adjuntar</span>
                                  </label>
                                }
                              />
                            ) : (
                              <label className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer px-3 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                                <input
                                  type="checkbox"
                                  checked={m.email.attach_cv}
                                  disabled={m.emailState !== 'idle'}
                                  onChange={(e) => editEmail(m.id, { attach_cv: e.target.checked })}
                                />
                                <AttachFileIcon className="w-3.5 h-3.5" /> Adjuntar mi CV en PDF al correo
                              </label>
                            )}

                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              {isAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => sendEmail(m)}
                                  disabled={m.emailState !== 'idle'}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-60 transition-colors cursor-pointer"
                                >
                                  {m.emailState === 'sending' ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : m.emailState === 'done' ? (
                                    <Check className="w-3.5 h-3.5" />
                                  ) : null}
                                  {m.emailState === 'done' ? 'Correo enviado' : 'Confirmar y enviar correo'}
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const text = `Para: ${m.email?.to}\nAsunto: ${cleanNewlines(m.email?.subject)}\n\n${cleanNewlines(m.email?.body)}`
                                      navigator.clipboard?.writeText(text)
                                      setNotice('¡Texto del correo copiado al portapapeles!')
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                                  >
                                    <Copy className="w-3.5 h-3.5" /> Copiar correo
                                  </button>
                                  <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                    Envío en 1 clic: Próximamente
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        ) : null}

                        {m.needsGmail && (
                          isAdmin && gmail?.configured && !gmail.connected ? (
                            <button
                              type="button"
                              onClick={connectGmail}
                              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              <MailIcon className="w-3.5 h-3.5" /> Conectar Gmail
                            </button>
                          ) : !isAdmin ? (
                            <div className="mt-3 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                              <MailIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>La postulación directa con Gmail estará disponible muy pronto (verificación en curso con Google).</span>
                            </div>
                          ) : null
                        )}

                        {/* Tarjetas interactivas de contacto directo por WhatsApp */}
                        {m.whatsappContacts && m.whatsappContacts.length > 0 && (
                          <div className="mt-4 rounded-3xl border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3.5 whitespace-normal shadow-sm">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                                  <WhatsAppIcon className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                    Contacto directo por WhatsApp
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {m.whatsappContacts.length === 1
                                      ? '1 oportunidad para contactar al instante'
                                      : `${m.whatsappContacts.length} oportunidades para contactar al instante`}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {m.whatsappContacts.map((c, idx) => {
                                const contactKey = `${m.id}_wa_${idx}_${c.whatsapp}`
                                const candidateName = profile?.nombre || 'un candidato'
                                const defaultMsg =
                                  c.mensaje ||
                                  `¡Hola! Mi nombre es ${candidateName}. Vi la búsqueda de ${c.puesto || 'personal'} para ${c.nombre} en PostulaUY y me pongo en contacto para postularme. Cuento con disponibilidad inmediata y quedo a disposición para enviar mi CV y coordinar una entrevista. ¡Muchas gracias!`
                                const currentMsg = customWaMessages[contactKey] !== undefined ? customWaMessages[contactKey] : defaultMsg
                                const isEditing = editingWaContactId === contactKey

                                return (
                                  <div
                                    key={contactKey}
                                    className="rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-colors"
                                  >
                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                      <div>
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                          <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                          {c.nombre}
                                        </h4>
                                        {c.puesto && (
                                          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mt-0.5">
                                            {c.puesto}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        {c.zona && (
                                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            📍 {c.zona}
                                          </span>
                                        )}
                                        {c.salario && (
                                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                                            💰 {c.salario}
                                          </span>
                                        )}
                                        {c.rubro && (
                                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300">
                                            🏷️ {c.rubro}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {c.descripcion && (
                                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                        {c.descripcion}
                                      </p>
                                    )}

                                    {/* Mensaje de presentación prearmado con nombre del candidato */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                          💬 Mensaje de presentación prearmado:
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => setEditingWaContactId(isEditing ? null : contactKey)}
                                          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                          <Pencil className="w-3 h-3" />
                                          {isEditing ? 'Listo' : 'Editar texto'}
                                        </button>
                                      </div>

                                      {isEditing ? (
                                        <AutoResizeTextarea
                                          value={currentMsg}
                                          onChange={(e) =>
                                            setCustomWaMessages((prev) => ({
                                              ...prev,
                                              [contactKey]: e.target.value,
                                            }))
                                          }
                                          placeholder="Escribí tu mensaje de presentación..."
                                          className="w-full text-xs border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 outline-none focus:border-emerald-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 leading-relaxed"
                                          aria-label="Mensaje para WhatsApp"
                                        />
                                      ) : (
                                        <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60 leading-relaxed whitespace-pre-wrap">
                                          {currentMsg}
                                        </div>
                                      )}
                                    </div>

                                    {/* Botones de acción */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                                      <a
                                        href={formatWhatsAppUrl(c.whatsapp, currentMsg)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                                      >
                                        <WhatsAppIcon className="w-3.5 h-3.5" />
                                        Contactar por WhatsApp
                                      </a>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard?.writeText(currentMsg)
                                          setNotice(`¡Mensaje para ${c.nombre} copiado al portapapeles!`)
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                      >
                                        <Copy className="w-3.5 h-3.5" /> Copiar mensaje
                                      </button>
                                      <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono ml-auto">
                                        {c.whatsapp}
                                      </span>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  )
                })}
                {loading && (
                  <div className="flex gap-1 py-2">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                        style={{ animationDelay: `${i * 120}ms` }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="px-4 pb-4 pt-2 shrink-0">{composer}</div>
          </>
        )}
      </div>
    </div>
  )
}
