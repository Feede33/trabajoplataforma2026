'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  href?: string;
  className?: string;
  children?: React.ReactNode;
}

export function FlowButton({
  text = 'Explore',
  href,
  className,
  children,
  ...props
}: FlowButtonProps) {
  const content = (
    <>
      <span className="font-medium tracking-wide">{children || text}</span>
      <ArrowRight
        aria-hidden="true"
        className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1"
      />
    </>
  );

  const baseStyles = cn(
    'group inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full',
    'border border-neutral-300 dark:border-neutral-700',
    'bg-white/80 dark:bg-neutral-900/80 backdrop-blur-sm',
    'text-sm font-semibold text-neutral-800 dark:text-neutral-200',
    'shadow-sm hover:shadow-md',
    'hover:border-neutral-400 dark:hover:border-neutral-600',
    'hover:bg-neutral-50 dark:hover:bg-neutral-800/90',
    'active:scale-[0.98] transition-all duration-200',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseStyles}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={baseStyles} {...props}>
      {content}
    </button>
  );
}
