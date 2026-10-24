'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  ArrowUp,
  Briefcase,
  FileText,
  Mail,
  Paperclip,
  Plus,
  Search,
  Sparkles,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

/**
 * PUNTO DE CONEXIÓN CON EL AGENTE.
 * Hoy devuelve una respuesta simulada. Más adelante se reemplaza por un fetch
 * a una ruta (p. ej. /api/ai-chat) que use el modelo elegido y tenga acceso
 * a empleos, postulaciones, contactos y CV del backend.
 */
async function sendToAgent(history: Message[]): Promise<string> {
  await new Promise((r) => setTimeout(r, 900))
  const last = history[history.length - 1]?.content ?? ''
  return `(Modo demo) Recibí: "${last}". Pronto voy a poder buscar empleos, ajustar tu CV y postularte por vos.`
}

const SUGGESTIONS = [
  { icon: Search, label: '¿Qué empleos hay hoy para mi perfil?' },
  { icon: FileText, label: 'Ajustá mi CV para una vacante' },
  { icon: Briefcase, label: 'Postulate a 5 empleos por mí' },
  { icon: Mail, label: 'Redactá un correo a una empresa' },
]

const ATTACH_OPTIONS = [
  { icon: Paperclip, label: 'Agregar fotos y archivos' },
  { icon: FileText, label: 'Usar mi CV del perfil' },
  { icon: Search, label: 'Búsqueda profunda de empleos' },
  { icon: Wand2, label: 'Ajustar CV con IA' },
  { icon: Mail, label: 'Postular por email (Gmail)' },
]

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

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
    const next: Message[] = [
      ...messages,
      { id: crypto.randomUUID(), role: 'user', content },
    ]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const reply = await sendToAgent(next)
      setMessages([...next, { id: crypto.randomUUID(), role: 'assistant', content: reply }])
    } catch {
      setMessages([
        ...next,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Ocurrió un error. Intentá de nuevo.' },
      ])
    } finally {
      setLoading(false)
    }
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
        <div className="flex items-center justify-between px-3 pb-3">
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
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
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
                <div
                  key={m.id}
                  className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  <div
                    className={cn(
                      'text-sm leading-relaxed whitespace-pre-wrap max-w-[85%]',
                      m.role === 'user'
                        ? 'bg-slate-900 text-white rounded-3xl rounded-br-lg px-4 py-2.5'
                        : 'text-slate-800'
                    )}
                  >
                    {m.content}
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
