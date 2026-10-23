'use client'

import React, { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  borderWidth?: number
  anchor?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
}

/**
 * Componente BorderBeam (estilo Magic UI / shadcn)
 * Dibuja un haz de luz animado que recorre el perímetro del borde redondeado.
 */
export function BorderBeam({
  className,
  size = 220,
  duration = 10,
  anchor = 90,
  borderWidth = 2,
  colorFrom = '#6366f1',
  colorTo = '#a855f7',
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          '--size': size,
          '--duration': duration,
          '--anchor': anchor,
          '--border-width': borderWidth,
          '--color-from': colorFrom,
          '--color-to': colorTo,
          '--delay': `-${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]',
        // Mask setup so only the border ring is visible
        '![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]',
        // Animated beam element
        'after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]',
        className
      )}
    />
  )
}

interface FeaturedGlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * Tarjeta destacada con efecto Spotlight interactivo al pasar el mouse,
 * destello superior tipo Aurora y haz de luz perimetral BorderBeam.
 */
export function FeaturedGlowCard({
  children,
  className,
  ...props
}: FeaturedGlowCardProps) {
  const divRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return
    const rect = divRef.current.getBoundingClientRect()
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        'group relative rounded-3xl bg-white dark:bg-slate-900/90 border border-indigo-500/30 dark:border-indigo-500/40 shadow-lg dark:shadow-2xl dark:shadow-indigo-950/40 transition-all duration-300',
        className
      )}
      {...props}
    >
      {/* Top subtle aurora highlight line */}
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent" />
      <div className="pointer-events-none absolute inset-x-12 -top-px h-8 bg-gradient-to-b from-indigo-500/15 via-violet-500/5 to-transparent blur-md rounded-full" />

      {/* Interactive radial spotlight following the cursor */}
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300 overflow-hidden"
        style={{
          opacity,
          background: `radial-gradient(420px circle at ${position.x}px ${position.y}px, rgba(99, 102, 241, 0.13), transparent 70%)`,
        }}
      />

      {/* Animated Border Beam (Magic UI) */}
      <BorderBeam
        size={240}
        duration={9}
        borderWidth={2}
        colorFrom="#6366f1"
        colorTo="#38bdf8"
      />

      {children}
    </div>
  )
}
