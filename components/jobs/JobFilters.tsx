'use client'

import React, { useId } from 'react'
import { Search, MapPin, Filter, RotateCcw, X } from 'lucide-react'
import { RUBROS, MODALIDADES, TIPOS_CONTRATO, DEPARTAMENTOS_UY } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

export interface FilterState {
  q: string
  rubro: string
  modalidad: string
  tipo_contrato: string
  zona: string
}

interface JobFiltersProps {
  filters: FilterState
  onChange: (filters: FilterState) => void
  onReset: () => void
  totalCount: number
  onClose?: () => void
}

export function JobFilters({ filters, onChange, onReset, totalCount, onClose }: JobFiltersProps) {
  const baseId = useId()

  const hasActiveFilters =
    filters.q !== '' ||
    filters.rubro !== '' ||
    filters.modalidad !== '' ||
    filters.tipo_contrato !== '' ||
    filters.zona !== ''

  const handleChange = (key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-slate-900 text-sm">Filtros de búsqueda</h3>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Limpiar
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors lg:hidden"
              aria-label="Cerrar filtros"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Palabra clave o puesto
        </label>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Ej: Chofer, React, Ventas..."
            value={filters.q}
            onChange={(e) => handleChange('q', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Departamento / Región (Uruguay) */}
      <div className="space-y-2.5">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Departamento / Región (Uruguay)
        </label>
        <select
          value={DEPARTAMENTOS_UY.includes(filters.zona) ? filters.zona : ''}
          onChange={(e) => handleChange('zona', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
        >
          <option value="">Todo el país (Uruguay)</option>
          {DEPARTAMENTOS_UY.map((dep) => (
            <option key={dep} value={dep}>
              {dep}
            </option>
          ))}
        </select>

        <div className="relative">
          <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="O buscá barrio/ciudad (Pocitos, Punta del Este...)"
            value={filters.zona}
            onChange={(e) => handleChange('zona', e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Rubro */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
          Rubro / Sector
        </label>
        <select
          value={filters.rubro}
          onChange={(e) => handleChange('rubro', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 bg-white"
        >
          <option value="">Todos los rubros</option>
          {RUBROS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Modalidad */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
          Modalidad de trabajo
        </label>
        <RadioGroup
          value={filters.modalidad || 'all'}
          onValueChange={(val) => handleChange('modalidad', val === 'all' ? '' : val)}
          className="gap-2.5"
        >
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="all" id={`${baseId}-modalidad-all`} />
            <Label
              htmlFor={`${baseId}-modalidad-all`}
              className="text-sm font-normal text-slate-700 cursor-pointer select-none"
            >
              Todas
            </Label>
          </div>
          {MODALIDADES.map((m) => (
            <div key={m.value} className="flex items-center gap-2.5">
              <RadioGroupItem value={m.value} id={`${baseId}-modalidad-${m.value}`} />
              <Label
                htmlFor={`${baseId}-modalidad-${m.value}`}
                className="text-sm font-normal text-slate-700 cursor-pointer select-none"
              >
                {m.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Tipo de Contrato */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
          Tipo de Contrato
        </label>
        <RadioGroup
          value={filters.tipo_contrato || 'all'}
          onValueChange={(val) => handleChange('tipo_contrato', val === 'all' ? '' : val)}
          className="gap-2.5"
        >
          <div className="flex items-center gap-2.5">
            <RadioGroupItem value="all" id={`${baseId}-tipo-all`} />
            <Label
              htmlFor={`${baseId}-tipo-all`}
              className="text-sm font-normal text-slate-700 cursor-pointer select-none"
            >
              Todos
            </Label>
          </div>
          {TIPOS_CONTRATO.map((t) => (
            <div key={t.value} className="flex items-center gap-2.5">
              <RadioGroupItem value={t.value} id={`${baseId}-tipo-${t.value}`} />
              <Label
                htmlFor={`${baseId}-tipo-${t.value}`}
                className="text-sm font-normal text-slate-700 cursor-pointer select-none"
              >
                {t.label}
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>

      {/* Counter */}
      <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 text-center">
        Mostrando <span className="font-bold text-slate-800">{totalCount}</span> vacantes encontradas
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="w-full lg:hidden py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-200 transition-colors flex items-center justify-center gap-2"
        >
          <span>Ver {totalCount} {totalCount === 1 ? 'empleo' : 'empleos'}</span>
        </button>
      )}
    </div>
  )
}
