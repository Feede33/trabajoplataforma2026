"use client"

import React from "react"
import { cn } from "@/lib/utils"

export interface ShinyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  size?: "sm" | "md" | "lg" | "icon"
}

export function ShinyButton({
  children,
  onClick,
  className = "",
  size = "md",
  type = "button",
  disabled,
  ...props
}: ShinyButtonProps) {
  const sizeClass =
    size === "sm"
      ? "shiny-cta-sm"
      : size === "lg"
      ? "shiny-cta-lg"
      : size === "icon"
      ? "shiny-cta-icon"
      : "shiny-cta-md"

  return (
    <button
      type={type}
      className={cn("shiny-cta", sizeClass, className)}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      <span>{children}</span>
    </button>
  )
}

export default ShinyButton
