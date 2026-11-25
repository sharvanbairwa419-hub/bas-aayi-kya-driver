/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#FAF6EF',
        cream: '#F3EDE2',
        surface: '#FFFFFF',
        ink: { DEFAULT: '#14120F', 2: '#3A3733' },
        muted: '#7A736A',
        line: '#E7DFD2',
        marigold: { DEFAULT: '#EF6A1E', dark: '#D2550F', soft: '#FDEEE3' },
        teal: { DEFAULT: '#0B5D57', soft: '#E4EFEC' },
        leaf: { DEFAULT: '#1F8A5B', soft: '#E3F3EA' },
        chili: { DEFAULT: '#D8382F', soft: '#FBE7E5' },
        haldi: { DEFAULT: '#E3A008', soft: '#FCF1DA' },
        night: { DEFAULT: '#0C0B0A', 2: '#161412', 3: '#221F1C' },
        nightink: '#F5EFE6',
        nightmuted: '#9A9088',
        nightline: '#2C2723',
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        heading: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
      },
      borderRadius: { card: '20px', sheet: '28px' },
      boxShadow: {
        soft: '0 2px 10px rgba(0,0,0,0.35)',
        lift: '0 18px 40px -18px rgba(0,0,0,0.7)',
        glow: '0 12px 30px -12px rgba(239,106,30,0.55)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: '0', transform: 'translateY(14px)' }, '100%': { opacity: '1', transform: 'none' } },
        slideIn: { '0%': { opacity: '0', transform: 'translateY(16px)' }, '100%': { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(.9)' }, '60%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
      animation: {
        'fade-up': 'fadeUp .45s cubic-bezier(.16,1,.3,1) both',
        'slide-in': 'slideIn .28s cubic-bezier(.16,1,.3,1) both',
        pop: 'pop .22s cubic-bezier(.16,1,.3,1)',
        shimmer: 'shimmer 1.5s linear infinite',
      },
    },
  },
  plugins: [],
}
