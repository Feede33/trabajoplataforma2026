'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUp,
  Briefcase,
  Check,
  ChevronDown,
  FileText,
  History,
  SquarePen,
  Trash2,
  Loader2,
  Mail,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Wand2,
  X,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/context/AuthContext'
import { createClient } from '@/lib/supabase/client'

// Modelos disponibles. Solo el gratuito está activo; el resto se habilitará con los planes.
const MODELS = [
  { id: 'gemini-flash-lite', name: 'Gemini Flash Lite', badge: 'Gratis', description: 'Rápido y liviano. Incluido en tu plan.', available: true },
  { id: 'gemini-pro', name: 'Gemini Pro', badge: 'Pronto', description: 'Más razonamiento para casos complejos.', available: false },
  { id: 'claude', name: 'Claude', badge: 'Pronto', description: 'Excelente redacción de CV y correos.', available: false },
  { id: 'gpt', name: 'GPT', badge: 'Pronto', description: 'Modelo de OpenAI.', available: false },
]

type ConversationRow = { id: string; title: string; updated_at: string }

type Pending = { job_id: string; titulo: string; empresa: string | null; mensaje: string }

type PendingEmail = { to: string; subject: string; body: string; attach_cv: boolean }
type PendingProfile = { nombre?: string; bio?: string; ubicacion?: string }
type AttachedFile = { name: string; mime: string; data: string }

const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']
const MAX_FILES = 3
const MAX_TOTAL_BYTES = 3 * 1024 * 1024

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(new Error('No se pudo leer el archivo'))
    r.readAsDataURL(file)
  })
}

type GmailStatus = { configured: boolean; connected: boolean; email?: string | null }

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Postulaciones propuestas por la IA que esperan confirmación del usuario */
  pending?: Pending[]
  pendingState?: 'idle' | 'sending' | 'done'
  /** Correo propuesto por la IA (editable) que espera confirmación */
  email?: PendingEmail
  emailState?: 'idle' | 'sending' | 'done'
  needsGmail?: boolean
  /** Nombres de archivos adjuntos por el usuario en este mensaje */
  files?: string[]
  /** Cambios de perfil/CV propuestos por la IA (editables) */
  profile?: PendingProfile
  profileState?: 'idle' | 'sending' | 'done'
}

type SendOptions = { autoApply: boolean; attachments: AttachedFile[]; includeCv: boolean; deepSearch: boolean }

async function sendToAgent(
  history: Message[],
  token: string,
  opts: SendOptions
): Promise<{
  reply: string
  pending: Pending[]
  email: PendingEmail | null
  needsGmail: boolean
  profile: PendingProfile | null
}> {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      autoApply: opts.autoApply,
      attachments: opts.attachments,
      includeCv: opts.includeCv,
      deepSearch: opts.deepSearch,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Error al contactar a la IA')
  return {
    reply: data.reply || '',
    pending: data.pending || [],
    email: data.pendingEmail || null,
    needsGmail: !!data.needsGmail,
    profile: data.pendingProfile || null,
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

const SUGGESTIONS = [
  { icon: Search, label: '¿Qué empleos hay hoy para mi perfil?' },
  { icon: FileText, label: 'Ajustá mi CV para una vacante' },
  { icon: Briefcase, label: 'Postulate a 5 empleos por mí' },
  { icon: Mail, label: 'Redactá un correo a una empresa' },
]

const ATTACH_OPTIONS = [
  { id: 'files', icon: Paperclip, label: 'Agregar fotos y archivos' },
  { id: 'cv', icon: FileText, label: 'Usar mi CV del perfil' },
  { id: 'deep', icon: Search, label: 'Búsqueda profunda de empleos' },
  { id: 'cvfix', icon: Wand2, label: 'Ajustar CV con IA' },
  { id: 'email', icon: Mail, label: 'Postular por email (Gmail)' },
] as const

export function AIChat() {
  const { profile, isLoading, getAccessToken } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [autoApply, setAutoApply] = useState(false)
  const [gmail, setGmail] = useState<GmailStatus | null>(null)
  const [convId, setConvId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationRow[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const [attachments, setAttachments] = useState<AttachedFile[]>([])
  const [includeCv, setIncludeCv] = useState(false)
  const [deepSearch, setDeepSearch] = useState(false)
  const [notice, setNotice] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [modelOpen, setModelOpen] = useState(false)
  const [modelId] = useState(MODELS[0].id)
  const scrollRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAutoApply(localStorage.getItem('ia-chat-auto') === '1')
  }, [])

  useEffect(() => {
    if (!profile) return
    ;(async () => {
      const token = await getAccessToken()
      if (!token) return
      setGmail(await gmailApi(token, 'POST'))
      const flag = new URLSearchParams(window.location.search).get('gmail')
      if (flag) {
        window.history.replaceState({}, '', '/ia-chat')
        const note =
          flag === 'connected'
            ? 'Gmail conectado. Ya puedo prepararte correos de postulación; vos los revisás y confirmás antes de enviar.'
            : flag === 'denied'
            ? 'No diste permiso para enviar correos con Gmail.'
            : 'No se pudo conectar Gmail. Intentá de nuevo.'
        setMessages((ms) => [...ms, { id: crypto.randomUUID(), role: 'assistant', content: note }])
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  async function connectGmail() {
    const token = await getAccessToken()
    if (!token) return
    const st = await gmailApi(token, 'POST', { reconnect: true })
    if (st.url) window.location.href = st.url
  }

  async function disconnectGmail() {
    const token = await getAccessToken()
    if (!token) return
    await gmailApi(token, 'DELETE')
    setGmail({ configured: true, connected: false })
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
    const slim = msgs.map((m) => ({ id: m.id, role: m.role, content: m.content }))
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
    setHistoryOpen(false)
  }

  async function openConversation(id: string) {
    const { data } = await createClient().from('ai_conversations').select('messages').eq('id', id).single()
    const msgs = ((data as { messages: Message[] } | null)?.messages || []) as Message[]
    setMessages(msgs)
    setConvId(id)
    setHistoryOpen(false)
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
    const next = [...attachments]
    let total = next.reduce((n, f) => n + Math.floor((f.data.length * 3) / 4), 0)
    for (const f of picked) {
      if (next.length >= MAX_FILES) {
        setNotice(`Máximo ${MAX_FILES} archivos por mensaje.`)
        break
      }
      if (!ALLOWED_FILE_TYPES.includes(f.type)) {
        setNotice('Solo imágenes (PNG, JPG, WebP) o PDF.')
        continue
      }
      if (total + f.size > MAX_TOTAL_BYTES) {
        setNotice('Los archivos no pueden superar 3 MB en total.')
        continue
      }
      try {
        next.push({ name: f.name, mime: f.type, data: await fileToBase64(f) })
        total += f.size
      } catch {
        setNotice('No se pudo leer un archivo.')
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

  // Scroll solo dentro del panel de mensajes (scrollIntoView movía toda la página)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  // El chat ocupa toda la pantalla: se bloquea el scroll de la página (y del footer) mientras está abierto
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [input])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setModelOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  async function send(text: string) {
    const typed = text.trim()
    if ((!typed && attachments.length === 0) || loading) return
    const content = typed || 'Analizá el archivo adjunto.'
    const sendOpts: SendOptions = { autoApply, attachments, includeCv, deepSearch }
    const next: Message[] = [
      ...messages,
      {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        files: attachments.length ? attachments.map((a) => a.name) : undefined,
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
      const { reply, pending, email, needsGmail, profile: proposed } = await sendToAgent(next, token, sendOpts)
      const withReply: Message[] = [
        ...next,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply || 'Listo.',
          pending: pending.length ? pending : undefined,
          pendingState: 'idle',
          email: email || undefined,
          emailState: 'idle',
          needsGmail,
          profile: proposed || undefined,
          profileState: 'idle',
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

  if (!isLoading && !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-5 px-4 text-center">
        <h1 className="text-2xl font-extrabold text-slate-900">Iniciá sesión para usar el chat de IA</h1>
        <p className="text-sm text-slate-500 max-w-sm">
          La IA necesita tu perfil y CV para recomendarte empleos y postularte por vos.
        </p>
        <Link
          href="/auth/login"
          className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold"
        >
          Iniciar sesión
        </Link>
      </div>
    )
  }

  const empty = messages.length === 0

  const composer = (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative rounded-3xl border border-slate-200 bg-white shadow-sm focus-within:shadow-md focus-within:border-slate-300 transition-all">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={onFilesPicked}
        />
        {(attachments.length > 0 || includeCv || deepSearch) && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-3">
            {attachments.map((f, i) => (
              <span key={f.name + i} className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 text-xs text-slate-700 max-w-[200px]">
                <Paperclip className="w-3 h-3 shrink-0" />
                <span className="truncate">{f.name}</span>
                <button
                  onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                  aria-label="Quitar archivo"
                  className="p-0.5 rounded-full hover:bg-slate-200"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {includeCv && (
              <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-sky-50 text-xs text-sky-700">
                <FileText className="w-3 h-3" /> Mi CV
                <button onClick={() => setIncludeCv(false)} aria-label="Quitar CV" className="p-0.5 rounded-full hover:bg-sky-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {deepSearch && (
              <span className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-indigo-50 text-xs text-indigo-700">
                <Search className="w-3 h-3" /> Búsqueda profunda
                <button onClick={() => setDeepSearch(false)} aria-label="Quitar búsqueda profunda" className="p-0.5 rounded-full hover:bg-indigo-100">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
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
          placeholder="Preguntale a la IA sobre empleos, tu CV o postulaciones…"
          className="w-full resize-none bg-transparent px-5 pt-4 pb-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
        />
        <div className="flex items-center px-3 pb-3">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Más opciones"
              className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <Plus className={cn('w-5 h-5 transition-transform', menuOpen && 'rotate-45')} />
            </button>
            {menuOpen && (
              <div className="absolute bottom-11 left-0 w-64 rounded-2xl border border-slate-200 bg-white shadow-xl py-1.5 z-20 animate-in fade-in slide-in-from-bottom-2">
                {ATTACH_OPTIONS.map(({ id, icon: Icon, label }) => {
                  const status =
                    id === 'cv'
                      ? includeCv
                      : id === 'deep'
                      ? deepSearch
                      : false
                  const tag =
                    id === 'email'
                      ? gmail?.connected
                        ? 'Conectado'
                        : gmail?.configured
                        ? 'Conectar'
                        : 'No disponible'
                      : ''
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onMenuAction(id)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span className="flex-1">{label}</span>
                      {status && <Check className="w-4 h-4 text-emerald-500" />}
                      {tag && <span className="text-[10px] text-slate-400">{tag}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleAuto}
            title="Si está activo, la IA se postula sin pedirte confirmación"
            className={cn(
              'ml-auto mr-2 flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors',
              autoApply
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50'
            )}
          >
            <Zap className={cn('w-3.5 h-3.5', autoApply && 'fill-amber-500 text-amber-500')} />
            {autoApply ? 'Postulación automática' : 'Pedir confirmación'}
          </button>
          <button
            type="button"
            onClick={() => send(input)}
            disabled={(!input.trim() && attachments.length === 0) || loading}
            aria-label="Enviar"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
      {notice && <p className="text-[11px] text-rose-500 text-center mt-2">{notice}</p>}
      {gmail?.configured && (
        <div className="flex justify-center mt-2">
          {gmail.connected ? (
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-emerald-500" />
              Gmail conectado{gmail.email ? `: ${gmail.email}` : ''}
              <button onClick={disconnectGmail} className="underline text-slate-400 hover:text-slate-600">
                Desconectar
              </button>
            </span>
          ) : (
            <button
              onClick={connectGmail}
              className="text-[11px] flex items-center gap-1.5 text-sky-600 hover:text-sky-700 font-medium"
            >
              <Mail className="w-3 h-3" />
              Conectar Gmail para enviar postulaciones por correo
            </button>
          )}
        </div>
      )}
      <p className="text-[11px] text-slate-400 text-center mt-2">
        La IA puede cometer errores. Revisá las postulaciones antes de enviarlas.
      </p>
    </div>
  )

  return (
    <div className="fixed inset-x-0 top-16 bottom-0 z-10 flex flex-col bg-background">
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1">
        <button
          onClick={() => setHistoryOpen((o) => !o)}
          aria-label="Historial"
          title="Historial"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
        >
          <History className="w-4 h-4" />
        </button>
        <button
          onClick={newChat}
          aria-label="Nuevo chat"
          title="Nuevo chat"
          className="w-9 h-9 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100"
        >
          <SquarePen className="w-4 h-4" />
        </button>
      </div>
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30" ref={modelMenuRef}>
        <button
          onClick={() => setModelOpen((o) => !o)}
          className="flex items-center gap-2 px-3.5 h-9 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-sky-500" />
          {MODELS.find((m) => m.id === modelId)?.name}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">Gratis</span>
          <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform', modelOpen && 'rotate-180')} />
        </button>
        {modelOpen && (
          <div className="absolute top-11 left-1/2 -translate-x-1/2 w-72 rounded-2xl border border-slate-200 bg-white shadow-xl py-1.5 animate-in fade-in slide-in-from-top-2">
            {MODELS.map((m) => (
              <button
                key={m.id}
                disabled={!m.available}
                onClick={() => setModelOpen(false)}
                className={cn(
                  'w-full flex items-start gap-3 px-4 py-2.5 text-left',
                  m.available ? 'hover:bg-slate-50' : 'opacity-60 cursor-not-allowed'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-400">{m.description}</p>
                </div>
                {m.id === modelId ? (
                  <Check className="w-4 h-4 text-slate-700 mt-0.5" />
                ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold mt-0.5">
                    {m.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      {historyOpen && (
        <div className="absolute top-14 left-3 z-30 w-72 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl py-1.5">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs text-slate-400">Todavía no tenés conversaciones guardadas.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'group flex items-center gap-1 px-2 mx-1 rounded-xl hover:bg-slate-50',
                  c.id === convId && 'bg-slate-100'
                )}
              >
                <button
                  onClick={() => openConversation(c.id)}
                  className="flex-1 text-left px-2 py-2 text-sm text-slate-700 truncate"
                >
                  {c.title}
                </button>
                <button
                  onClick={() => deleteConversation(c.id)}
                  aria-label="Borrar conversación"
                  className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
      {empty ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-8">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              ¿Qué empleo buscamos hoy?
            </h1>
            <p className="text-sm text-slate-500">
              Dejá que la IA encuentre vacantes y se postule por vos.
            </p>
          </div>
          {composer}
          <div className="flex flex-wrap justify-center gap-2 max-w-3xl">
            {SUGGESTIONS.map(({ icon: Icon, label }) => (
              <button
                key={label}
                onClick={() => send(label)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-8">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'text-sm leading-relaxed whitespace-pre-wrap max-w-[85%]',
                      m.role === 'user'
                        ? 'bg-slate-900 text-white rounded-3xl rounded-br-lg px-4 py-2.5'
                        : 'text-slate-800'
                    )}
                  >
                    {m.content}
                    {m.files && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {m.files.map((n, i) => (
                          <span key={n + i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 text-[11px]">
                            <Paperclip className="w-3 h-3" /> {n}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.profile && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 space-y-2 whitespace-normal">
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <Wand2 className="w-3.5 h-3.5" /> Propuesta para tu perfil (podés editarla)
                        </p>
                        {m.profile.nombre !== undefined && (
                          <input
                            value={m.profile.nombre}
                            onChange={(e) => editProfile(m.id, { nombre: e.target.value })}
                            disabled={m.profileState !== 'idle'}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400"
                            aria-label="Nombre"
                          />
                        )}
                        {m.profile.ubicacion !== undefined && (
                          <input
                            value={m.profile.ubicacion}
                            onChange={(e) => editProfile(m.id, { ubicacion: e.target.value })}
                            disabled={m.profileState !== 'idle'}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400"
                            aria-label="Ubicación"
                          />
                        )}
                        {m.profile.bio !== undefined && (
                          <textarea
                            value={m.profile.bio}
                            onChange={(e) => editProfile(m.id, { bio: e.target.value })}
                            disabled={m.profileState !== 'idle'}
                            rows={8}
                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-400 resize-y"
                            aria-label="Resumen profesional"
                          />
                        )}
                        <button
                          onClick={() => confirmProfileSave(m)}
                          disabled={m.profileState !== 'idle'}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-60"
                        >
                          {m.profileState === 'sending' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : m.profileState === 'done' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : null}
                          {m.profileState === 'done' ? 'Guardado' : 'Guardar en mi perfil'}
                        </button>
                      </div>
                    )}
                    {m.pending && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 space-y-2 whitespace-normal">
                        <p className="text-xs font-semibold text-slate-500">Postulaciones listas para enviar</p>
                        {m.pending.map((p) => (
                          <div key={p.job_id} className="flex items-center gap-2 text-sm">
                            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium">{p.titulo}</span>
                            {p.empresa && <span className="text-slate-400">· {p.empresa}</span>}
                          </div>
                        ))}
                        <button
                          onClick={() => confirm(m)}
                          disabled={m.pendingState !== 'idle'}
                          className="mt-1 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-60"
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
                    {m.email && (
                      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 space-y-2 whitespace-normal">
                        <p className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5" /> Correo listo para enviar (podés editarlo)
                        </p>
                        <input
                          value={m.email.to}
                          onChange={(e) => editEmail(m.id, { to: e.target.value })}
                          disabled={m.emailState !== 'idle'}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400"
                          aria-label="Destinatario"
                        />
                        <input
                          value={m.email.subject}
                          onChange={(e) => editEmail(m.id, { subject: e.target.value })}
                          disabled={m.emailState !== 'idle'}
                          className="w-full text-sm font-medium border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400"
                          aria-label="Asunto"
                        />
                        <textarea
                          value={m.email.body}
                          onChange={(e) => editEmail(m.id, { body: e.target.value })}
                          disabled={m.emailState !== 'idle'}
                          rows={6}
                          className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-slate-400 resize-y"
                          aria-label="Mensaje"
                        />
                        <label className="flex items-center gap-2 text-xs text-slate-500">
                          <input
                            type="checkbox"
                            checked={m.email.attach_cv}
                            disabled={m.emailState !== 'idle'}
                            onChange={(e) => editEmail(m.id, { attach_cv: e.target.checked })}
                          />
                          <Paperclip className="w-3 h-3" /> Adjuntar mi CV
                        </label>
                        <button
                          onClick={() => sendEmail(m)}
                          disabled={m.emailState !== 'idle'}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-700 disabled:opacity-60"
                        >
                          {m.emailState === 'sending' ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : m.emailState === 'done' ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : null}
                          {m.emailState === 'done' ? 'Enviado' : 'Enviar correo'}
                        </button>
                      </div>
                    )}
                    {m.needsGmail && gmail?.configured && !gmail.connected && (
                      <button
                        onClick={connectGmail}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Mail className="w-3.5 h-3.5" /> Conectar Gmail
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
          <div className="px-4 pb-4 pt-2">{composer}</div>
        </>
      )}
    </div>
  )
}
