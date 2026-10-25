import type { Config } from 'tailwindcss'
import tailwindcssAnimate from 'tailwindcss-animate'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Google Sans"', '"Google Sans Text"', 'var(--font-geist-sans)', 'system-ui', '-apple-system', 'sans-serif'],
        signika: ['Signika', '"Google Sans"', 'var(--font-geist-sans)', 'sans-serif'],
        'dm-sans': ['"DM Sans"', '"Google Sans"', 'var(--font-geist-sans)', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
        'float-slow': 'float-slow 9s ease-in-out infinite',
        'float-reverse': 'float-reverse 11s ease-in-out infinite',
        'glass-shimmer': 'glass-shimmer 4s ease-in-out infinite',
      },
      keyframes: {
        'border-beam': {
          '100%': {
            'offset-distance': '100%',
          },
        },
        'float-slow': {
          '0%, 100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '50%': {
            transform: 'translate(24px, -18px) scale(1.08)',
          },
        },
        'float-reverse': {
          '0%, 100%': {
            transform: 'translate(0px, 0px) scale(1)',
          },
          '50%': {
            transform: 'translate(-22px, 16px) scale(1.06)',
          },
        },
        'glass-shimmer': {
          '0%, 100%': {
            opacity: '0.4',
            transform: 'translateX(-100%) skewX(-15deg)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'translateX(200%) skewX(-15deg)',
          },
        },
      },
    },
  },
  plugins: [tailwindcssAnimate],
}
export default config
