/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dark mode (cinematic gold/black)
        gold: '#C9A84C',
        'gold-dark': '#A8893A',
        'gold-light': '#E6C76A',
        'olive-gold': '#7A6428',
        'hero-bg': '#A39B8E',
        'hero-bg-dark': '#8F8779',
        dark: '#0A0A0A',
        'dark-light': '#141414',
        'dark-card': '#1A1A1A',
        // Light mode (warm ivory / parchment / charcoal)
        'light-bg': '#F7F3EB',
        'light-surface': '#FFFFFF',
        'light-card': '#FBF8F2',
        'light-border': '#E5DFD1',
        'light-muted': '#6B6558',
        'light-text': '#1A1713',
        'light-subtle': '#8A8272',
        'light-accent': '#8A7530',
      },
      fontFamily: {
        display: ['Oswald', 'Impact', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        script: ['"Pinyon Script"', '"Great Vibes"', '"Parisienne"', 'cursive'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(201,168,76,0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(201,168,76,0.6)' },
        },
        'fade-in': { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        'slide-up': { '0%': { opacity: 0, transform: 'translateY(20px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
      },
      boxShadow: {
        'card-light': '0 1px 3px rgba(60,50,20,0.06), 0 8px 24px rgba(60,50,20,0.06)',
        'card-dark': '0 4px 24px rgba(0,0,0,0.4)',
        'gold-glow': '0 0 24px rgba(201,168,76,0.4)',
      },
    },
  },
  plugins: [],
}
