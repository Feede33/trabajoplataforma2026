'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { FlowButton } from '@/components/ui/flow-button';

const easeCustom = [0.43, 0.13, 0.23, 0.96] as const;

const containerVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 30
  },
  visible: { 
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: easeCustom,
      delayChildren: 0.1,
      staggerChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 20
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.6,
      ease: easeCustom
    }
  }
};

const numberVariants: Variants = {
  hidden: (direction: number) => ({
    opacity: 0,
    x: direction * 40,
    y: 15,
    rotate: direction * 5
  }),
  visible: {
    opacity: 0.7,
    x: 0,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.8,
      ease: easeCustom
    }
  }
};

const ghostVariants: Variants = {
  hidden: { 
    scale: 0.8,
    opacity: 0,
    y: 15,
    rotate: -5
  },
  visible: { 
    scale: 1,
    opacity: 1,
    y: 0,
    rotate: 0,
    transition: {
      duration: 0.6,
      ease: easeCustom
    }
  },
  hover: {
    scale: 1.1,
    y: -10,
    rotate: [0, -5, 5, -5, 0],
    transition: {
      duration: 0.8,
      ease: 'easeInOut',
      rotate: {
        duration: 2,
        ease: 'linear',
        repeat: Infinity,
        repeatType: 'reverse'
      }
    }
  },
  floating: {
    y: [-5, 5],
    transition: {
      y: {
        duration: 2,
        ease: 'easeInOut',
        repeat: Infinity,
        repeatType: 'reverse'
      }
    }
  }
};

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-160px)] flex flex-col items-center justify-center bg-background px-4 py-16 transition-colors">
      <AnimatePresence mode="wait">
        <motion.div 
          className="text-center max-w-lg mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Numbers & Ghost */}
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-8 md:mb-12">
            <motion.span 
              className="text-[80px] md:text-[120px] font-bold text-neutral-800 dark:text-neutral-100 opacity-70 select-none leading-none tracking-tighter"
              variants={numberVariants}
              custom={-1}
            >
              4
            </motion.span>
            
            <motion.div
              variants={ghostVariants}
              whileHover="hover"
              animate={['visible', 'floating']}
              className="cursor-pointer"
            >
              <Image
                src="/ghost.png"
                alt="Fantasma 404"
                width={120}
                height={120}
                className="w-[80px] h-[80px] md:w-[120px] md:h-[120px] object-contain select-none drop-shadow-md"
                draggable={false}
                priority
              />
            </motion.div>

            <motion.span 
              className="text-[80px] md:text-[120px] font-bold text-neutral-800 dark:text-neutral-100 opacity-70 select-none leading-none tracking-tighter"
              variants={numberVariants}
              custom={1}
            >
              4
            </motion.span>
          </div>
          
          {/* Title */}
          <motion.h1 
            className="text-3xl md:text-5xl font-bold text-neutral-900 dark:text-neutral-100 mb-4 md:mb-6 opacity-85 select-none"
            variants={itemVariants}
          >
            ¡Buuu! Página no encontrada
          </motion.h1>
          
          {/* Description */}
          <motion.p 
            className="text-base md:text-lg text-neutral-600 dark:text-neutral-400 mb-8 md:mb-10 max-w-md mx-auto select-none"
            variants={itemVariants}
          >
            ¡Ups! Parece que esta página es un fantasma... ¡o la vacante ya no se encuentra disponible!
          </motion.p>

          {/* Action button */}
          <motion.div 
            variants={itemVariants}
            whileHover={{ 
              scale: 1.05,
              transition: {
                duration: 0.3,
                ease: easeCustom
              }
            }}
            className="flex justify-center"
          >
            <Link href="/">
              <FlowButton text="Volver al inicio" />
            </Link>
          </motion.div>

          {/* Explanatory footer link */}
          <motion.div 
            className="mt-10"
            variants={itemVariants}
          >
            <Link
              href="/empleos"
              className="text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors underline underline-offset-4 select-none"
            >
              Explorar empleos disponibles
            </Link>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
