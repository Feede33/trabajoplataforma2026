'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  MessageCircle,
  Plus,
  Search,
  Copy,
  Check,
  Trash2,
  Building2,
  MapPin,
  Sparkles,
  ExternalLink,
  X,
  PhoneCall,
  Tag,
  UploadCloud,
  FileText,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Layers,
  ArrowRight,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CompanyContact,
  fetchCompanyContacts,
  createCompanyContact,
  createCompanyContactsBulk,
  deleteCompanyContact,
  formatContactWhatsAppUrl,
  formatPhoneNumberDisplay,
  normalizePhoneNumberForComparison,
} from '@/lib/data'
import { useAuth } from '@/lib/context/AuthContext'

interface CompanyContactsSidebarProps {
  isAdmin?: boolean
}

export const CATEGORIAS_SUGERIDAS = [
  'Limpieza',
  'Gastronomía',
  'Logística / Fletes',
  'Construcción',
  'Administración',
  'Comercio / Ventas',
  'Seguridad',
  'Mantenimiento',
  'Otro',
]

interface ExtractedItemWithMeta {
  id: string
  nombre: string
  whatsapp: string
  categoria: string
  zona: string
  nota: string
  selected: boolean
  isDuplicate: boolean
  duplicateReason?: string
}

export function CompanyContactsSidebar({ isAdmin = false }: CompanyContactsSidebarProps) {
  const { isAdmin: authIsAdmin, getAccessToken } = useAuth()
  const effectiveAdmin = isAdmin || authIsAdmin

  const [mounted, setMounted] = useState(false)
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCat, setSelectedCat] = useState('Todos')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState(false)

  // Manual Create Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [categoria, setCategoria] = useState('Limpieza')
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('')
  const [zona, setZona] = useState('')
  const [nota, setNota] = useState('')
  const [formError, setFormError] = useState('')

  // AI Bulk Import Modal states
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [aiStep, setAiStep] = useState<'upload' | 'review'>('upload')
  const [inputMode, setInputMode] = useState<'image' | 'text'>('image')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageMime, setImageMime] = useState('image/jpeg')
  const [imageName, setImageName] = useState('')
  const [rawText, setRawText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [aiError, setAiError] = useState('')
  const [extractedItems, setExtractedItems] = useState<ExtractedItemWithMeta[]>([])
  const [isBulkSaving, setIsBulkSaving] = useState(false)
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await fetchCompanyContacts()
        setContacts(data)
      } catch (err) {
        console.error('Error cargando contactos:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleCopy = (id: string, phone: string) => {
    navigator.clipboard.writeText(phone)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = async (id: string, nombre: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el contacto "${nombre}"?`)) return
    try {
      await deleteCompanyContact(id)
      setContacts((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      alert('Error al eliminar contacto')
    }
  }

  // Creación manual individual
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!effectiveAdmin) {
      setFormError('Solo los administradores pueden publicar contactos.')
      return
    }

    const catFinal = categoria === 'Otro' ? categoriaPersonalizada.trim() : categoria
    if (!nombre.trim()) {
      setFormError('Ingresa el nombre de la empresa')
      return
    }
    if (!whatsapp.trim()) {
      setFormError('Ingresa el número de WhatsApp')
      return
    }
    if (!catFinal) {
      setFormError('Ingresa la categoría')
      return
    }

    setIsSubmitting(true)
    try {
      const newContact = await createCompanyContact({
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        categoria: catFinal,
        zona: zona.trim() || null,
        nota: nota.trim() || null,
        activo: true,
      })

      setContacts((prev) => [newContact, ...prev])
      setIsModalOpen(false)
      setNombre('')
      setWhatsapp('')
      setCategoria('Limpieza')
      setCategoriaPersonalizada('')
      setZona('')
      setNota('')
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el contacto')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Manejo de archivo e imagen para IA
  const handleFileChosen = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setAiError('El archivo debe ser una imagen (JPG, PNG, WEBP, etc.)')
      return
    }
    setAiError('')
    setImageName(file.name)

    const reader = new FileReader()
    reader.onload = (e) => {
      const originalDataUrl = e.target?.result as string
      const img = new window.Image()
      img.onload = () => {
        const MAX_SIDE = 1280
        let { width, height } = img
        if (width > MAX_SIDE || height > MAX_SIDE) {
          if (width >= height) {
            height = Math.round((height * MAX_SIDE) / width)
            width = MAX_SIDE
          } else {
            width = Math.round((width * MAX_SIDE) / height)
            height = MAX_SIDE
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, width, height)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        setImageMime('image/jpeg')
        setImagePreview(compressedDataUrl)
      }
      img.src = originalDataUrl
    }
    reader.readAsDataURL(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChosen(e.dataTransfer.files[0])
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0]
      if (file.type.startsWith('image/')) {
        e.preventDefault()
        handleFileChosen(file)
      }
    }
  }

  // Procesamiento con Gemini IA y Detección de Duplicados
  const handleProcessWithAi = async () => {
    setAiError('')
    setIsAnalyzing(true)

    try {
      let payload: any = {}
      if (inputMode === 'image') {
        if (!imagePreview) {
          throw new Error('Primero debés seleccionar o arrastrar una imagen.')
        }
        payload = { image: imagePreview, mimeType: imageMime }
      } else {
        if (!rawText.trim()) {
          throw new Error('Por favor pega el texto o listado de empresas a analizar.')
        }
        payload = { text: rawText.trim() }
      }

      const token = await getAccessToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/admin/company-contacts-ai', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar contactos con IA.')
      }

      const rawContacts: any[] = data.contacts || []
      if (rawContacts.length === 0) {
        throw new Error('No se detectaron empresas en el contenido provisto.')
      }

      // Verificación y Detección de Duplicados
      const evaluated: ExtractedItemWithMeta[] = rawContacts.map((item, idx) => {
        const itemPhone = (item.whatsapp || '').toString()
        const normPhone = normalizePhoneNumberForComparison(itemPhone)
        const normName = (item.nombre || '').trim().toLowerCase()

        // 1. Comparar contra base de datos existente
        const existingByPhone = contacts.find((c) => {
          const cNorm = normalizePhoneNumberForComparison(c.whatsapp)
          return normPhone.length >= 7 && cNorm.length >= 7 && normPhone === cNorm
        })

        const existingByName = !existingByPhone && normName.length >= 3 ? contacts.find((c) => {
          return c.nombre.trim().toLowerCase() === normName
        }) : null

        // 2. Comparar dentro del mismo lote extraído
        const priorInBatch = rawContacts.slice(0, idx).find((p) => {
          const pPhone = (p.whatsapp || '').toString()
          const pNorm = normalizePhoneNumberForComparison(pPhone)
          const pName = (p.nombre || '').trim().toLowerCase()
          return (normPhone.length >= 7 && pNorm === normPhone) || (normName.length >= 3 && pName === normName)
        })

        let isDuplicate = false
        let duplicateReason = ''

        if (existingByPhone) {
          isDuplicate = true
          duplicateReason = `Ya registrada: "${existingByPhone.nombre}" (${formatPhoneNumberDisplay(existingByPhone.whatsapp)})`
        } else if (existingByName) {
          isDuplicate = true
          duplicateReason = `Mismo nombre que empresa existente: "${existingByName.nombre}"`
        } else if (priorInBatch) {
          isDuplicate = true
          duplicateReason = `Repetida dentro de este mismo lote con "${priorInBatch.nombre}"`
        }

        return {
          id: 'ext-' + Math.random().toString(36).substring(2, 9),
          nombre: item.nombre || 'Empresa sin nombre',
          whatsapp: itemPhone || '',
          categoria: CATEGORIAS_SUGERIDAS.includes(item.categoria) ? item.categoria : 'Otro',
          zona: item.zona || '',
          nota: item.nota || '',
          selected: !isDuplicate, // Si está duplicada se desmarca por defecto
          isDuplicate,
          duplicateReason,
        }
      })

      setExtractedItems(evaluated)
      setAiStep('review')
    } catch (err: any) {
      setAiError(err.message || 'Error durante el análisis con IA')
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Guardar en bloque los contactos seleccionados
  const handleSaveBulk = async () => {
    const selected = extractedItems.filter((i) => i.selected)
    if (selected.length === 0) {
      alert('Debes seleccionar al menos una empresa para guardar.')
      return
    }

    setIsBulkSaving(true)
    try {
      const payloadData = selected.map((item) => ({
        nombre: item.nombre.trim(),
        whatsapp: item.whatsapp.trim(),
        categoria: item.categoria || 'Limpieza',
        zona: item.zona.trim() || null,
        nota: item.nota.trim() || null,
        activo: true,
      }))

      const created = await createCompanyContactsBulk(payloadData)

      setContacts((prev) => [...created, ...prev])
      setSaveSuccessNotice(`¡Se agregaron ${created.length} contactos de empresas con éxito!`)
      setTimeout(() => {
        setSaveSuccessNotice(null)
        setIsAiModalOpen(false)
        setAiStep('upload')
        setImagePreview(null)
        setRawText('')
        setExtractedItems([])
      }, 1800)
    } catch (err: any) {
      alert('Error guardando empresas: ' + (err.message || 'Error desconocido'))
    } finally {
      setIsBulkSaving(false)
    }
  }

  // Filtered contacts para la lista
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      (c.zona && c.zona.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCat = selectedCat === 'Todos' || c.categoria.toLowerCase() === selectedCat.toLowerCase()
    return matchesSearch && matchesCat
  })

  const categoriesList = ['Todos', ...Array.from(new Set(contacts.map((c) => c.categoria)))]

  // Conteo para el resumen de IA
  const totalExtracted = extractedItems.length
  const duplicatesCount = extractedItems.filter((i) => i.isDuplicate).length
  const newCount = totalExtracted - duplicatesCount
  const selectedCount = extractedItems.filter((i) => i.selected).length

  return (
    <aside className="w-full lg:w-96 xl:w-[420px] shrink-0">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 rounded-3xl p-4 sm:p-6 shadow-xl shadow-slate-900/5 dark:shadow-black/25 flex flex-col gap-4 lg:sticky lg:top-20">

        {/* Header con diseño amplio y sin colisiones */}
        <div className={cn("space-y-3", mobileExpanded ? "border-b border-slate-200/90 dark:border-slate-800/90 pb-4" : "lg:border-b lg:border-slate-200/90 dark:lg:border-slate-800/90 lg:pb-4")}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10 dark:shadow-emerald-500/15 shrink-0">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                    Contactos Directos
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full inline-flex items-center justify-center text-xs font-black bg-emerald-100 dark:bg-emerald-500/25 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40 shrink-0">
                    {contacts.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">WhatsApp directo de empresas</p>
              </div>
            </div>

            {/* Botón toggle móvil para expandir/plegar en celular */}
            <button
              type="button"
              onClick={() => setMobileExpanded((prev) => !prev)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shrink-0"
              aria-expanded={mobileExpanded}
            >
              <span>{mobileExpanded ? 'Ocultar' : 'Ver'}</span>
              <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", mobileExpanded && "rotate-180")} />
            </button>
          </div>

          {/* Botones de acción del Administrador distribuidos limpiamente */}
          {effectiveAdmin && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  setIsAiModalOpen(true)
                  setAiStep('upload')
                  setAiError('')
                  setExtractedItems([])
                  setImagePreview(null)
                  setRawText('')
                }}
                className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-95"
                title="Importar masivamente con Inteligencia Artificial"
              >
                <Sparkles className="w-3.5 h-3.5 fill-slate-950 shrink-0" />
                <span>Importar con IA</span>
              </button>

              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 hover:text-slate-900 dark:text-slate-200 dark:hover:text-white border border-slate-200 dark:border-slate-700/80 text-xs font-bold transition-all hover:scale-[1.02] active:scale-95"
                title="Agregar contacto manualmente"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Manual</span>
              </button>
            </div>
          )}
        </div>

        {/* Contenido desplegable (oculto en móvil salvo que se expanda, siempre visible en desktop) */}
        <div className={cn("flex flex-col gap-4", !mobileExpanded && "hidden lg:flex")}>
          {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar empresa, rubro, ciudad..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-200 dark:border-slate-700/70 focus:border-emerald-500 dark:focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-sm dark:shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills */}
        {categoriesList.length > 1 && (
          <div
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY
              }
            }}
            className="flex items-center gap-2 overflow-x-auto pt-1 pb-2.5 text-xs scroll-smooth [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-slate-100 dark:[&::-webkit-scrollbar-track]:bg-slate-800/60 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-600 hover:[&::-webkit-scrollbar-thumb]:bg-emerald-500 [&::-webkit-scrollbar-thumb]:rounded-full"
          >
            {categoriesList.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${selectedCat === cat
                  ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-slate-200/80 dark:border-transparent dark:bg-slate-800/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Contacts List */}
        <div className="flex flex-col gap-4 max-h-[640px] overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent pt-1">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-slate-100/80 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 animate-pulse space-y-2.5">
                  <div className="h-4 w-2/3 bg-slate-200 dark:bg-slate-700/60 rounded" />
                  <div className="h-3 w-1/3 bg-slate-200/70 dark:bg-slate-700/40 rounded" />
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              <Building2 className="w-9 h-9 mx-auto text-slate-400 dark:text-slate-600 mb-2.5 opacity-60" />
              <p>No se encontraron contactos con ese criterio.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const waUrl = formatContactWhatsAppUrl(contact.whatsapp, contact.nombre, contact.categoria)
              const isCopied = copiedId === contact.id

              return (
                <div
                  key={contact.id}
                  className="group relative bg-slate-50/70 hover:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800/90 border border-slate-200/90 hover:border-emerald-400/80 dark:border-slate-700/60 dark:hover:border-emerald-500/50 rounded-2xl p-4 transition-all flex flex-col gap-2.5 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm sm:text-[15px] text-slate-900 dark:text-white truncate">
                          {contact.nombre}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-500/35">
                          {contact.categoria}
                        </span>
                        {contact.zona && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {contact.zona}
                          </span>
                        )}
                      </div>
                    </div>

                    {effectiveAdmin && (
                      <button
                        onClick={() => handleDelete(contact.id, contact.nombre)}
                        className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 transition-colors p-1"
                        title="Eliminar contacto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {contact.nota && (
                    <p className="text-xs text-slate-600 dark:text-slate-300/90 leading-relaxed line-clamp-2">
                      {contact.nota}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/50 mt-1">
                    <button
                      onClick={() => handleCopy(contact.id, contact.whatsapp)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white transition-colors group/copy"
                      title="Copiar número"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-sans text-xs font-bold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/copy:text-slate-600 dark:group-hover/copy:text-slate-200" />
                          <span>{formatPhoneNumberDisplay(contact.whatsapp)}</span>
                        </>
                      )}
                    </button>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-600/20 dark:shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-white dark:fill-slate-950" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info tip */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center border-t border-slate-200/90 dark:border-slate-800/90 pt-3 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Comunicate directamente para consultar vacantes</span>
        </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: Carga Masiva Inteligente con IA (Renderizado con Portal al Body) */}
      {/* ========================================================================= */}
      {mounted && effectiveAdmin && isAiModalOpen && createPortal(
        <div
          onPaste={handlePaste}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
        >
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-7 w-full max-w-2xl my-auto shadow-2xl flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20 shrink-0">
                  <Sparkles className="w-5 h-5 fill-slate-950" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 dark:text-white text-base sm:text-lg flex items-center gap-2">
                    Importar Contactos de Empresas con IA
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sube una foto/captura o pega una lista. La IA detecta datos y filtra duplicados.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAiModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alerta de Error */}
            {aiError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            )}

            {/* Aviso de Éxito al guardar */}
            {saveSuccessNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2 font-bold animate-pulse">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{saveSuccessNotice}</span>
              </div>
            )}

            {/* PASO 1: SUBIR IMAGEN O PEGAR TEXTO */}
            {aiStep === 'upload' && (
              <div className="space-y-4">
                {/* Selector de modo: Imagen vs Texto */}
                <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 max-w-xs mx-auto">
                  <button
                    type="button"
                    onClick={() => setInputMode('image')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputMode === 'image'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Foto / Captura</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${inputMode === 'text'
                      ? 'bg-emerald-500 text-slate-950 shadow-md'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                      }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Pegar Lista</span>
                  </button>
                </div>

                {inputMode === 'image' ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragging(true)
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${isDragging
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                      : imagePreview
                        ? 'border-emerald-500/50 bg-slate-50 dark:bg-slate-800/50'
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-100/70 dark:border-slate-700 dark:hover:border-slate-500 dark:bg-slate-800/30 dark:hover:bg-slate-800/50'
                      }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileChosen(e.target.files[0])}
                      className="hidden"
                    />

                    {imagePreview ? (
                      <div className="space-y-3 w-full flex flex-col items-center">
                        <img
                          src={imagePreview}
                          alt="Previsualización"
                          className="max-h-52 rounded-2xl object-contain border border-slate-200 dark:border-slate-700 shadow-md"
                        />
                        <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span className="font-medium">{imageName || 'Imagen cargada'}</span>
                          <span className="text-slate-400 dark:text-slate-500">• Clic para cambiar foto</span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-800 dark:text-white">
                            Arrastra una imagen o haz clic para seleccionarla
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Puedes hacer <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-emerald-600 dark:text-emerald-400">Ctrl + V</kbd> para pegar capturas de pantalla de historias o WhatsApp
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pega aquí la lista de empresas, teléfonos o notas:
                    </label>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      rows={8}
                      placeholder={`Ejemplo:\nEmpresa Pro Limpieza - 099123456 - Montevideo - Buscan operarios\nLogística Express - 098765432 - Canelones - Choferes furgón\nGastronomía del Sol - 091223344`}
                      className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs sm:text-sm font-mono focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Botón de Procesar con IA */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAiModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isAnalyzing || (inputMode === 'image' && !imagePreview) || (inputMode === 'text' && !rawText.trim())}
                    onClick={handleProcessWithAi}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                        <span>Analizando con Gemini IA...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 fill-slate-950 shrink-0" />
                        <span>Extraer Empresas con IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* PASO 2: REVISIÓN, DEDUPLICACIÓN Y CONFIRMACIÓN */}
            {aiStep === 'review' && (
              <div className="flex-1 space-y-4 overflow-hidden">
                {/* Métricas y resumen de deduplicación */}
                <div className="grid grid-cols-3 gap-2.5 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Detectadas</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">{totalExtracted}</span>
                  </div>
                  <div>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Nuevas</span>
                    <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{newCount}</span>
                  </div>
                  <div>
                    <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">Repetidas</span>
                    <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">{duplicatesCount}</span>
                  </div>
                </div>

                {/* Filtros rápidos de selección */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 gap-2">
                  <span>Seleccionadas para guardar: <strong className="text-slate-900 dark:text-white">{selectedCount}</strong></span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setExtractedItems((prev) => prev.map((i) => ({ ...i, selected: !i.isDuplicate })))}
                      className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-bold"
                    >
                      Solo Nuevas
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setExtractedItems((prev) => prev.map((i) => ({ ...i, selected: true })))}
                      className="text-xs text-slate-700 dark:text-slate-300 hover:underline"
                    >
                      Todas
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setExtractedItems((prev) => prev.map((i) => ({ ...i, selected: false })))}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                    >
                      Ninguna
                    </button>
                  </div>
                </div>

                {/* Lista de empresas extraídas editables */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1 overflow-x-hidden">
                  {extractedItems.map((item, index) => (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border transition-all space-y-2.5 overflow-hidden ${item.isDuplicate
                        ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40'
                        : item.selected
                          ? 'bg-slate-50/90 dark:bg-slate-800/80 border-emerald-500/40'
                          : 'bg-slate-50/40 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-60'
                        }`}
                    >
                      {/* Fila superior: Checkbox + Nombre + Badges + Eliminar */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-[200px]">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => {
                              const checked = e.target.checked
                              setExtractedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, selected: checked } : it))
                              )
                            }}
                            className="w-4 h-4 rounded text-emerald-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 focus:ring-emerald-500 shrink-0"
                          />
                          <input
                            type="text"
                            value={item.nombre}
                            onChange={(e) => {
                              const val = e.target.value
                              setExtractedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, nombre: val } : it))
                              )
                            }}
                            className="bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-600 focus:border-emerald-500 text-sm font-bold text-slate-900 dark:text-white focus:outline-none px-1 py-0.5 flex-1 min-w-0"
                            placeholder="Nombre de empresa"
                          />
                        </label>

                        <div className="flex items-center gap-2 shrink-0 ml-auto">
                          {item.isDuplicate ? (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/35 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" />
                              Repetida
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/35 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Nueva
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => setExtractedItems((prev) => prev.filter((it) => it.id !== item.id))}
                            className="text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 p-1 rounded-lg"
                            title="Quitar de la lista"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Aviso de duplicado si corresponde */}
                      {item.isDuplicate && item.duplicateReason && (
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/90 pl-6 flex items-center gap-1 break-words">
                          ⚠️ {item.duplicateReason}
                        </p>
                      )}

                      {/* Campos editables rápidos: WhatsApp, Categoría, Zona */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-0 sm:pl-6">
                        <div className="min-w-0">
                          <input
                            type="text"
                            value={item.whatsapp}
                            onChange={(e) => {
                              const val = e.target.value
                              setExtractedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, whatsapp: val } : it))
                              )
                            }}
                            placeholder="WhatsApp / Teléfono"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>

                        <div className="min-w-0">
                          <select
                            value={item.categoria}
                            onChange={(e) => {
                              const val = e.target.value
                              setExtractedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, categoria: val } : it))
                              )
                            }}
                            className="w-full px-2 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                          >
                            {CATEGORIAS_SUGERIDAS.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="min-w-0">
                          <input
                            type="text"
                            value={item.zona}
                            onChange={(e) => {
                              const val = e.target.value
                              setExtractedItems((prev) =>
                                prev.map((it) => (it.id === item.id ? { ...it, zona: val } : it))
                              )
                            }}
                            placeholder="Zona (opcional)"
                            className="w-full px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Nota editable */}
                      <div className="pl-0 sm:pl-6 min-w-0">
                        <input
                          type="text"
                          value={item.nota}
                          onChange={(e) => {
                            const val = e.target.value
                            setExtractedItems((prev) =>
                              prev.map((it) => (it.id === item.id ? { ...it, nota: val } : it))
                            )
                          }}
                          placeholder="Nota o descripción (opcional)"
                          className="w-full px-2.5 py-1.5 rounded-xl bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 text-xs text-slate-700 dark:text-slate-300 focus:border-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer de Acciones del paso 2 */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setAiStep('upload')
                      setAiError('')
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Volver a escanear</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAiModalOpen(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isBulkSaving || selectedCount === 0}
                      onClick={handleSaveBulk}
                      className="flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 hover:shadow-lg hover:shadow-emerald-600/30 transition-all active:scale-95 disabled:opacity-50"
                    >
                      {isBulkSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Guardando {selectedCount} empresas...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Guardar {selectedCount} empresas</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: Formulario Manual para 1 Contacto (Renderizado con Portal al Body)*/}
      {/* ========================================================================= */}
      {mounted && effectiveAdmin && isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 w-full max-w-md my-auto shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Publicar Contacto de Empresa</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Aparecerá en el directorio de WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/15 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Empresa 1, Limpieza Pro UY"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Número de WhatsApp *
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej: 096123123 o +598 96 123 123"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Categoría / Rubro *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {CATEGORIAS_SUGERIDAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Zona / Ubicación (Opcional)
                  </label>
                  <input
                    type="text"
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    placeholder="Ej: Montevideo"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {categoria === 'Otro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Especifique Categoría
                  </label>
                  <input
                    type="text"
                    value={categoriaPersonalizada}
                    onChange={(e) => setCategoriaPersonalizada(e.target.value)}
                    placeholder="Ej: Metalúrgica, Pintura..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nota o Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Buscan personal para turno mañana"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Publicar Contacto'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </aside>
  )
}
