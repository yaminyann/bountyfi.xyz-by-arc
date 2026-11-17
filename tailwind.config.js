/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    borderRadius: {
      none: '0',
      sm: '4px',
      DEFAULT: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
      full: '9999px',
    },
    extend: {
      colors: {
        // Cool, soft ground: a pale blue-grey paper with a navy-black ink. Contrast: ink on paper 15.5, mute on paper 5.3.
        ink: '#0E1621',
        paper: '#E8EEF3',
        surface: '#F7FAFC',
        line: '#CFDAE3',
        mute: '#54626F',
        sky: { DEFAULT: '#D4E2EE', deep: '#B4C8DA' },
        signal: { DEFAULT: '#FDE047', deep: '#EAB308', soft: '#FEF9C3' },
        ok: { DEFAULT: '#15803D', soft: '#DCFCE7' },
        warn: { DEFAULT: '#B45309', soft: '#FEF3C7' },
        danger: { DEFAULT: '#B91C1C', soft: '#FEE2E2' },
        info: { DEFAULT: '#1D4ED8', soft: '#DBEAFE' },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"DM Sans"', 'system-ui', 'sans-serif'],
        pixel: ['Silkscreen', '"JetBrains Mono"', 'ui-monospace', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.1rem' }],
        sm: ['0.875rem', { lineHeight: '1.35rem' }],
        base: ['1rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.625rem', { lineHeight: '2rem' }],
        '3xl': ['2rem', { lineHeight: '2.4rem' }],
        '4xl': ['2.75rem', { lineHeight: '3rem' }],
      },
      boxShadow: {
        // The old hard offset shadows now render as quiet elevation, so every existing surface follows the new direction.
        hard: '0 1px 2px rgba(14, 22, 33, 0.07), 0 1px 1px rgba(14, 22, 33, 0.04)',
        'hard-sm': '0 1px 1px rgba(14, 22, 33, 0.05)',
        card: '0 1px 2px rgba(14, 22, 33, 0.05)',
        pop: '0 16px 40px -12px rgba(14, 22, 33, 0.24), 0 2px 8px rgba(14, 22, 33, 0.06)',
        // The one retro gesture: a hard offset, used on the featured artwork and the single primary panel of a screen.
        retro: '4px 4px 0 0 #0E1621',
        'retro-sm': '2px 2px 0 0 #0E1621',
      },
      keyframes: {
        'dialog-in': { from: { opacity: '0', transform: 'translateY(6px) scale(0.99)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-in': { from: { transform: 'translateX(-100%)' }, to: { transform: 'none' } },
        'sheet-in': { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } },
        // Artwork plays once when it enters the screen, then rests.
        'grow-y': { from: { transform: 'scaleY(0)' }, to: { transform: 'scaleY(1)' } },
        'grow-x': { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        drop: { '0%': { transform: 'translateY(-36px)', opacity: '0' }, '60%': { opacity: '1' }, '100%': { transform: 'none', opacity: '1' } },
        pop: { '0%': { transform: 'scale(0.4)', opacity: '0' }, '70%': { transform: 'scale(1.08)', opacity: '1' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        draw: { from: { strokeDashoffset: 'var(--len, 120)' }, to: { strokeDashoffset: '0' } },
      },
      animation: {
        'dialog-in': 'dialog-in 160ms ease-out',
        'fade-in': 'fade-in 120ms ease-out',
        'slide-in': 'slide-in 180ms ease-out',
        'sheet-in': 'sheet-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
}
