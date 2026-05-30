/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Lienzo cálido — derivado de la obra de Mekala (OKLCH, neutros tintados).
        paper: 'oklch(0.95 0.018 80 / <alpha-value>)',
        'paper-deep': 'oklch(0.925 0.024 76 / <alpha-value>)',
        'paper-line': 'oklch(0.86 0.022 74 / <alpha-value>)',
        ink: 'oklch(0.27 0.015 60 / <alpha-value>)',
        'ink-soft': 'oklch(0.45 0.018 60 / <alpha-value>)',
        'ink-faint': 'oklch(0.62 0.015 65 / <alpha-value>)',
        // Pigmentos.
        terracota: 'oklch(0.62 0.15 45 / <alpha-value>)',
        magenta: 'oklch(0.58 0.18 5 / <alpha-value>)',
        teal: 'oklch(0.58 0.09 195 / <alpha-value>)',
        cobalto: 'oklch(0.45 0.15 264 / <alpha-value>)',
        mostaza: 'oklch(0.78 0.13 80 / <alpha-value>)',
        oliva: 'oklch(0.62 0.10 125 / <alpha-value>)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Space Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        paper: '0 2px 8px oklch(0.27 0.04 60 / 0.08), 0 8px 24px oklch(0.27 0.04 60 / 0.06)',
        'paper-lift': '0 4px 14px oklch(0.27 0.04 60 / 0.12), 0 14px 40px oklch(0.27 0.04 60 / 0.10)',
      },
      animation: {
        'ink-pulse': 'ink-pulse 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite',
        'bloom': 'bloom 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
        'sheet-up': 'sheet-up 0.32s cubic-bezier(0.22, 1, 0.36, 1)',
        'wave': 'wave 1s ease-in-out infinite',
      },
      keyframes: {
        'ink-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.55' },
          '50%': { transform: 'scale(1.45)', opacity: '0' },
        },
        'bloom': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'wave': {
          '0%, 100%': { transform: 'scaleY(0.25)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
    },
  },
  plugins: [],
}
