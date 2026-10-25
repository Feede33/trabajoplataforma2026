"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/context/AuthContext";
import { useSavedJobs, SavedJobsContext } from "@/lib/context/SavedJobsContext";
import { JobWithEmpresa } from "@/lib/supabase/database.types";
import { cn } from "@/lib/utils";

const animations = {
  icon: {
    initial: { scale: 1, rotate: 0 },
    tapActive: { scale: 0.85, rotate: -10 },
    tapCompleted: { scale: 1, rotate: 0 },
  },
  burst: {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: [0, 1.4, 1], opacity: [0, 0.4, 0] },
    transition: { duration: 0.7, ease: "easeOut" as const },
  },
  particles: (index: number) => {
    const angle = (index / 5) * (2 * Math.PI);
    const radius = 18 + Math.random() * 8;
    const scale = 0.8 + Math.random() * 0.4;
    const duration = 0.6 + Math.random() * 0.1;

    return {
      initial: { scale: 0, opacity: 0.3, x: 0, y: 0 },
      animate: {
        scale: [0, scale, 0],
        opacity: [0.3, 0.8, 0],
        x: [0, Math.cos(angle) * radius],
        y: [0, Math.sin(angle) * radius * 0.75],
      },
      transition: { duration, delay: index * 0.04, ease: "easeOut" as const },
    };
  },
};

export interface BookmarkIconButtonProps {
  jobId?: string;
  job?: JobWithEmpresa;
  isSaved?: boolean;
  onToggle?: (newState: boolean) => void;
  className?: string;
  size?: "sm" | "default" | "lg";
  iconSize?: number;
}

export function BookmarkIconButton({
  jobId: propJobId,
  job,
  isSaved: controlledIsSaved,
  onToggle,
  className,
  size = "default",
  iconSize,
}: BookmarkIconButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile } = useAuth();
  const contextSavedJobs = React.useContext(SavedJobsContext);

  const effectiveJobId = propJobId || job?.id;

  const [internalSaved, setInternalSaved] = React.useState(false);

  const isSaved =
    controlledIsSaved !== undefined
      ? controlledIsSaved
      : effectiveJobId && contextSavedJobs
      ? contextSavedJobs.isSaved(effectiveJobId)
      : internalSaved;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Si el usuario no tiene una sesión activa, redirigir directamente al login
    if (!profile) {
      const redirectTarget = pathname || '/empleos';
      router.push(`/auth/login?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (profile.role === 'empresa') {
      alert('La opción de guardar empleos está disponible para candidatos.');
      return;
    }

    if (controlledIsSaved !== undefined && onToggle) {
      onToggle(!controlledIsSaved);
      return;
    }

    if (effectiveJobId && contextSavedJobs) {
      const nextState = await contextSavedJobs.toggleSave(job || effectiveJobId);
      if (onToggle) onToggle(nextState);
    } else {
      setInternalSaved((prev) => {
        const next = !prev;
        if (onToggle) onToggle(next);
        return next;
      });
    }
  };

  const actualIconSize = iconSize || (size === "sm" ? 14 : size === "lg" ? 20 : 16);
  const buttonSizeClass =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
      ? "h-10 w-10"
      : "h-9 w-9";

  return (
    <div
      className={cn("relative flex items-center justify-center shrink-0", className)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleClick}
        aria-pressed={isSaved}
        aria-label={isSaved ? "Quitar de guardados" : "Guardar empleo"}
        title={isSaved ? "Quitar de empleos guardados" : "Guardar empleo"}
        className={cn(
          buttonSizeClass,
          "rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus-visible:ring-1 focus-visible:ring-blue-500",
          isSaved && "text-blue-600 dark:text-blue-400"
        )}
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isSaved ? 1.1 : 1 }}
          whileTap={
            isSaved ? animations.icon.tapCompleted : animations.icon.tapActive
          }
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
          className="relative flex items-center justify-center"
        >
          <Bookmark
            className="opacity-60 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            size={actualIconSize}
            aria-hidden="true"
          />

          <Bookmark
            className="absolute inset-0 text-blue-500 fill-blue-500 transition-all duration-300"
            size={actualIconSize}
            aria-hidden="true"
            style={{ opacity: isSaved ? 1 : 0 }}
          />

          <AnimatePresence>
            {isSaved && (
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(59,130,246,0) 80%)",
                }}
                {...animations.burst}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </Button>

      <AnimatePresence>
        {isSaved && (
          <motion.div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full bg-blue-500"
                style={{
                  width: `${4 + Math.random() * 2}px`,
                  height: `${4 + Math.random() * 2}px`,
                  filter: "blur(1px)",
                  transform: "translate(-50%, -50%)",
                }}
                initial={animations.particles(i).initial}
                animate={animations.particles(i).animate}
                transition={animations.particles(i).transition}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BookmarkIconButton;
