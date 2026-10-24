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
}

async function sendToAgent(
  history: Message[],
  token: string,
  autoApply: boolean
): Promise<{ reply: string; pending: Pending[]; email: PendingEmail | null; needsGmail: boolean }> {
  const res = await fetch('/api/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      autoApply,
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
  }
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

// Opciones futuras del menú "+" (aún sin funcionalidad)
const ATTACH_OPTIONS = [
  { icon: Paperclip, label: 'Agregar fotos y archivos' },
  { icon: FileText, label: 'Usar mi CV del perfil' },
  { icon: Search, label: 'Búsqueda profunda de empleos' },
  { icon: Wand2, label: 'Ajustar CV con IA' },
  { icon: Mail, label: 'Postular por email (Gmail)' },
]

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
    const content = text.trim()
    if (!content || loading) return
    const next: Message[] = [...messages, { id: crypto.randomUUID(), role: 'user', content }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const token = await getAccessToken()
      if (!token) throw new Error('Tu sesión expiró. Volvé a iniciar sesión.')
      const { reply, pending, email, needsGmail } = await sendToAgent(next, token, autoApply)
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
                {ATTACH_OPTIONS.map(({ icon: Icon, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      setMenuOpen(false)
                      if (label.includes('Gmail') && gmail?.configured && !gmail.connected) connectGmail()
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] text-slate-400">
                      {label.includes('Gmail') ? (gmail?.connected ? 'Conectado' : gmail?.configured ? 'Conectar' : 'Pronto') : 'Pronto'}
                    </span>
                  </button>
                ))}
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
            disabled={!input.trim() || loading}
            aria-label="Enviar"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-slate-900 text-white disabled:bg-slate-200 disabled:text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
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
