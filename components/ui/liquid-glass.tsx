'use client'

import React, { useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface LiquidGlassSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

/**
 * Contenedor escénico con esferas de luz flotantes (Aurora Blobs) y malla óptica
 * detrás de un cristal esmerilado para que el efecto de transparencia (backdrop-blur)
 * se aprecie con profundidad real tanto en modo claro como oscuro.
 */
export function LiquidGlassShowcase({
  children,
  className,
  ...props
}: LiquidGlassSectionProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[2rem] p-6 sm:p-10 transition-colors duration-500',
        // Superficie base translúcida con borde de cristal
        'bg-white/35 dark:bg-slate-900/35 backdrop-blur-xl',
        'border border-white/60 dark:border-white/10',
        'shadow-[0_8px_40px_-12px_rgba(15,23,42,0.08),inset_0_1px_1px_rgba(255,255,255,0.7)] dark:shadow-[0_12px_50px_-12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.12)]',
        className
      )}
      {...props}
    >
      {/* Malla óptica sutil de fondo para acentuar la refracción del vidrio */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-[0.18]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.45) 1px, transparent 0)',
          backgroundSize: '22px 22px',
        }}
      />

      {/* Orbes cromáticos flotantes detrás de las tarjetas de cristal */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 -left-16 h-72 w-72 rounded-full bg-gradient-to-br from-amber-400/40 via-orange-300/30 to-yellow-200/20 dark:from-amber-500/25 dark:via-orange-500/15 dark:to-transparent blur-3xl animate-float-slow"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-indigo-400/30 via-sky-300/25 to-violet-300/20 dark:from-indigo-500/25 dark:via-cyan-500/15 dark:to-transparent blur-3xl animate-float-reverse"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-4 h-80 w-80 rounded-full bg-gradient-to-tl from-fuchsia-400/25 via-amber-300/30 to-rose-300/20 dark:from-violet-500/20 dark:via-amber-500/20 dark:to-transparent blur-3xl animate-float-slow"
      />

      {/* Línea de refracción superior tipo prisma */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/30 to-transparent"
      />

      <div className="relative z-10 flex flex-col gap-8 sm:gap-9">{children}</div>
    </div>
  )
}

interface LiquidGlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  /** Variante de acento luminoso al refractar la luz */
  accent?: 'amber' | 'violet' | 'cyan'
  /** Activa inclinación 3D suave al mover el cursor */
  enableTilt?: boolean
}

/**
 * Tarjeta "Liquid Glass" (inspirada en VisionOS / Crystal UI)
 * Combina transparencia real (backdrop-blur-2xl), biselado especular interno,
 * reflejo de cristal interactivo que sigue el cursor y micro-inclinación 3D.
 */
export function LiquidGlassCard({
  children,
  className,
  accent = 'amber',
  enableTilt = true,
  ...props
}: LiquidGlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [glare, setGlare] = useState({ x: 50, y: 50, px: 0, py: 0 })
  const [hovered, setHovered] = useState(false)
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0 })

  const accentGlowMap = {
    amber: {
      spotlight: 'rgba(251, 191, 36, 0.22)',
      borderGlow: 'rgba(245, 158, 11, 0.45)',
      prismTop: 'from-transparent via-amber-400/70 to-transparent',
    },
    violet: {
      spotlight: 'rgba(139, 92, 246, 0.22)',
      borderGlow: 'rgba(168, 85, 247, 0.45)',
      prismTop: 'from-transparent via-violet-400/80 to-transparent',
    },
    cyan: {
      spotlight: 'rgba(56, 189, 248, 0.22)',
      borderGlow: 'rgba(56, 189, 248, 0.45)',
      prismTop: 'from-transparent via-sky-400/80 to-transparent',
    },
  }[accent]

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const xPercent = (px / rect.width) * 100
    const yPercent = (py / rect.height) * 100

    setGlare({ x: xPercent, y: yPercent, px, py })

    if (enableTilt) {
      const rotateY = ((xPercent - 50) / 50) * 3.5
      const rotateX = ((50 - yPercent) / 50) * 3.5
      setTilt({ rotateX, rotateY })
    }
  }

  const handleMouseLeave = () => {
    setHovered(false)
    setTilt({ rotateX: 0, rotateY: 0 })
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: hovered
          ? `perspective(1000px) rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateY(-3px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: hovered
          ? 'transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 300ms ease'
          : 'transform 450ms cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 300ms ease',
      }}
      className={cn(
        'group relative overflow-hidden rounded-3xl',
        // Transparencia real multicapa + desenfoque profundo de cristal
        'bg-white/45 dark:bg-white/[0.06] backdrop-blur-2xl backdrop-saturate-150',
        // Borde especular translúcido
        'border border-white/75 dark:border-white/15',
        // Sombras de elevación + bisel interno brillante arriba y abajo
        'shadow-[0_10px_35px_-10px_rgba(15,23,42,0.1),inset_0_1px_1px_rgba(255,255,255,0.9),inset_0_-1px_1px_rgba(255,255,255,0.4)]',
        'dark:shadow-[0_15px_40px_-10px_rgba(0,0,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.22),inset_0_-1px_1px_rgba(255,255,255,0.06)]',
        className
      )}
      {...props}
    >
      {/* Reflejo diagonal fijo tipo lente de cristal */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/55 via-white/10 to-transparent dark:from-white/[0.12] dark:via-transparent dark:to-white/[0.03] opacity-80"
      />

      {/* Línea superior de dispersión cromática (prisma) */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-8 top-0 h-[1.5px] bg-gradient-to-r opacity-75 transition-opacity duration-300 group-hover:opacity-100',
          accentGlowMap.prismTop
        )}
      />

      {/* Destello especular interactivo que sigue el mouse (efecto cristal líquido) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          background: `
            radial-gradient(320px circle at ${glare.px}px ${glare.py}px, rgba(255, 255, 255, 0.45), transparent 60%),
            radial-gradient(460px circle at ${glare.px}px ${glare.py}px, ${accentGlowMap.spotlight}, transparent 75%)
          `,
        }}
      />

      {/* Anillo de borde iluminado dinámicamente donde se acerca el cursor */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          opacity: hovered ? 1 : 0,
          padding: '1.5px',
          background: `radial-gradient(240px circle at ${glare.px}px ${glare.py}px, ${accentGlowMap.borderGlow}, rgba(255,255,255,0.5) 45%, transparent 75%)`,
          WebkitMask:
            'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />

      {/* Contenido de la tarjeta */}
      <div className="relative z-10 h-full flex flex-col justify-between gap-6">
        {children}
      </div>
    </div>
  )
}
