'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUp,
  Briefcase,
  Check,
  FileText,
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

type Pending = { job_id: string; titulo: string; empresa: string | null; mensaje: string }

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Postulaciones propuestas por la IA que esperan confirmación del usuario */
  pending?: Pending[]
  pendingState?: 'idle' | 'sending' | 'done'
}

async function sendToAgent(
  history: Message[],
  token: string,
  autoApply: boolean
): Promise<{ reply: string; pending: Pending[] }> {
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
  return { reply: data.reply || '', pending: data.pending || [] }
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
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setAutoApply(localStorage.getItem('ia-chat-auto') === '1')
  }, [])

  function toggleAuto() {
    setAutoApply((v) => {
      localStorage.setItem('ia-chat-auto', v ? '0' : '1')
      return !v
    })
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

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
      const { reply, pending } = await sendToAgent(next, token, autoApply)
      setMessages([
        ...next,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply || 'Listo.',
          pending: pending.length ? pending : undefined,
          pendingState: 'idle',
        },
      ])
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
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="flex-1">{label}</span>
                    <span className="text-[10px] text-slate-400">Pronto</span>
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
      <p className="text-[11px] text-slate-400 text-center mt-2">
        La IA puede cometer errores. Revisá las postulaciones antes de enviarlas.
      </p>
    </div>
  )

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
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
          <div className="flex-1 overflow-y-auto px-4 py-8">
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
              <div ref={bottomRef} />
            </div>
          </div>
          <div className="px-4 pb-4 pt-2">{composer}</div>
        </>
      )}
    </div>
  )
}
