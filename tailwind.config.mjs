/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,ts}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg:        '#080C0A',
          surface:   '#0C140E',
          border:    '#1A2A1E',
          body:      '#6A9A7A',
          heading:   '#C8F0D8',
          primary:   '#3DFF9A',
          secondary: '#00C8D4',
          muted:     '#2A4A32',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'sans-serif'],
      },
      animation: {
        'fade-up':    'fadeUp 0.6s ease forwards',
        'blink':      'blink 1s step-end infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px #3DFF9A22' },
          '50%':      { boxShadow: '0 0 40px #3DFF9A55' },
        },
      },
    },
  },
  plugins: [],
}