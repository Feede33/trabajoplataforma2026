'use client'

import React, { useState, useEffect } from 'react'
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
  Tag
} from 'lucide-react'
import {
  CompanyContact,
  fetchCompanyContacts,
  createCompanyContact,
  deleteCompanyContact,
  formatContactWhatsAppUrl,
  formatPhoneNumberDisplay,
} from '@/lib/data'

interface CompanyContactsSidebarProps {
  isAdmin?: boolean
}

const CATEGORIAS_SUGERIDAS = [
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

export function CompanyContactsSidebar({ isAdmin = false }: CompanyContactsSidebarProps) {
  const [contacts, setContacts] = useState<CompanyContact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCat, setSelectedCat] = useState('Todos')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [categoria, setCategoria] = useState('Limpieza')
  const [categoriaPersonalizada, setCategoriaPersonalizada] = useState('')
  const [zona, setZona] = useState('')
  const [nota, setNota] = useState('')
  const [formError, setFormError] = useState('')

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!isAdmin) {
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

  // Filtered contacts
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.whatsapp.includes(searchTerm) ||
      (c.zona && c.zona.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesCat = selectedCat === 'Todos' || c.categoria.toLowerCase() === selectedCat.toLowerCase()

    return matchesSearch && matchesCat
  })

  // List of unique categories for quick pills
  const categoriesList = ['Todos', ...Array.from(new Set(contacts.map((c) => c.categoria)))]

  return (
    <aside className="w-full lg:w-96 xl:w-[420px] shrink-0">
      <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-800/90 rounded-3xl p-5 sm:p-6 shadow-xl shadow-black/25 flex flex-col gap-5 sticky top-20">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/90 pb-5 mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-500/15">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                Contactos Directos
                <span className="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-black bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 shrink-0">
                  {contacts.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-medium">WhatsApp directo de empresas</p>
            </div>
          </div>

          {isAdmin && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all hover:scale-105 active:scale-95"
              title="Publicar nuevo contacto (Solo Admin)"
            >
              <Plus className="w-4 h-4" />
              <span>Agregar</span>
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar empresa, rubro, ciudad..."
            className="w-full pl-9 pr-3.5 py-2.5 rounded-xl text-sm bg-slate-800/80 text-slate-100 placeholder:text-slate-500 border border-slate-700/70 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all shadow-inner"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills (horizontal scroll if many) */}
        {categoriesList.length > 2 && (
          <div className="flex items-center gap-2 overflow-x-auto py-1 text-xs [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden mb-1">
            {categoriesList.slice(0, 6).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 ${
                  selectedCat === cat
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-slate-800/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Contacts List */}
        <div className="flex flex-col gap-4 max-h-[640px] overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent pt-1">
          {loading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-slate-800/40 rounded-2xl p-4 border border-slate-800 animate-pulse space-y-2.5">
                  <div className="h-4 w-2/3 bg-slate-700/60 rounded" />
                  <div className="h-3 w-1/3 bg-slate-700/40 rounded" />
                </div>
              ))}
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs sm:text-sm">
              <Building2 className="w-9 h-9 mx-auto text-slate-600 mb-2.5 opacity-60" />
              <p>No se encontraron contactos con ese criterio.</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const waUrl = formatContactWhatsAppUrl(contact.whatsapp, contact.nombre, contact.categoria)
              const isCopied = copiedId === contact.id

              return (
                <div
                  key={contact.id}
                  className="group relative bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/60 hover:border-emerald-500/50 rounded-2xl p-4 transition-all flex flex-col gap-2.5 shadow-sm"
                >
                  {/* Top: Name & Category */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm sm:text-[15px] text-white truncate">
                          {contact.nombre}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-1.5">
                        <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/35">
                          {contact.categoria}
                        </span>
                        {contact.zona && (
                          <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {contact.zona}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Admin delete */}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(contact.id, contact.nombre)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        title="Eliminar contacto"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Note if any */}
                  {contact.nota && (
                    <p className="text-xs text-slate-300/90 leading-relaxed line-clamp-2">
                      {contact.nota}
                    </p>
                  )}

                  {/* Bottom: Number & WhatsApp Direct Button */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/50 mt-1">
                    <button
                      onClick={() => handleCopy(contact.id, contact.whatsapp)}
                      className="flex items-center gap-1.5 text-xs sm:text-sm font-mono font-semibold text-slate-200 hover:text-white transition-colors group/copy"
                      title="Copiar número"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400 font-sans text-xs font-bold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/copy:text-slate-200" />
                          <span>{formatPhoneNumberDisplay(contact.whatsapp)}</span>
                        </>
                      )}
                    </button>

                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                    >
                      <MessageCircle className="w-3.5 h-3.5 fill-slate-950" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer info tip */}
        <div className="text-xs text-slate-400 text-center border-t border-slate-800/90 pt-3 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Comunicate directamente para consultar vacantes</span>
        </div>
      </div>

      {/* Modal / Form para Publicar Nuevo Contacto (Solo Admin) */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Publicar Contacto de Empresa</h3>
                  <p className="text-xs text-slate-400">Aparecerá en el directorio de WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Empresa *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Empresa 1, Limpieza Pro UY"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Número de WhatsApp *
                </label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Ej: 096123123 o +598 96 123 123"
                  required
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-sm focus:border-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Categoría / Rubro *
                  </label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  >
                    {CATEGORIAS_SUGERIDAS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Zona / Ubicación (Opcional)
                  </label>
                  <input
                    type="text"
                    value={zona}
                    onChange={(e) => setZona(e.target.value)}
                    placeholder="Ej: Montevideo"
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {categoria === 'Otro' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Especifique Categoría
                  </label>
                  <input
                    type="text"
                    value={categoriaPersonalizada}
                    onChange={(e) => setCategoriaPersonalizada(e.target.value)}
                    placeholder="Ej: Metalúrgica, Pintura..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nota o Descripción (Opcional)
                </label>
                <input
                  type="text"
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  placeholder="Ej: Buscan personal para turno mañana"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 text-xs focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
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
        </div>
      )}
    </aside>
  )
}
