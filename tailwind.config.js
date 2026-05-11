/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        sans:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      colors: {
        'll': {
          void:        '#050508', deep:   '#08080e', base:   '#0c0c14',
          surface:     '#11111c', elevated:'#161624', overlay:'#1d1d2e',
          gold:        '#f5a623', 'gold-bright':'#ffc156', 'gold-dim':'#b87b1a',
          red:         '#e63946', 'red-bright':'#ff4757', 'red-dim':'#a32830',
          purple:      '#8b5cf6', blue:'#3b82f6', green:'#10b981', pink:'#ec4899', cyan:'#06b6d4',
        },
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card:        { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary:     { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted:       { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent:      { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))', input: 'hsl(var(--input))', ring: 'hsl(var(--ring))',
      },
      borderRadius: {
        sm: 'var(--ll-radius-sm)', md: 'var(--ll-radius-md)',
        lg: 'var(--ll-radius-lg)', xl: 'var(--ll-radius-xl)', full: 'var(--ll-radius-full)',
      },
      boxShadow: {
        'gold-sm': '0 0 12px rgba(245,166,35,0.2)',
        'gold':    '0 0 24px rgba(245,166,35,0.25), 0 0 60px rgba(245,166,35,0.08)',
        'gold-lg': '0 0 40px rgba(245,166,35,0.35), 0 0 80px rgba(245,166,35,0.12)',
        'red':     '0 0 24px rgba(230,57,70,0.25), 0 0 60px rgba(230,57,70,0.08)',
        'depth':   '0 8px 32px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.4)',
      },
      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'sharp':  'cubic-bezier(0.12, 0, 0.39, 0)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: { 'accordion-down': 'accordion-down 0.2s ease-out', 'accordion-up': 'accordion-up 0.2s ease-out' },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
