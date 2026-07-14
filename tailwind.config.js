/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // support toggling dark class on html
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0a0b10',
          panel: 'rgba(17, 18, 28, 0.75)',
          border: 'rgba(255, 255, 255, 0.08)',
          input: 'rgba(255, 255, 255, 0.05)',
        },
        primary: {
          DEFAULT: '#6366f1', // Indigo
          hover: '#4f46e5',
        },
        secondary: {
          DEFAULT: '#a855f7', // Purple
          hover: '#9333ea',
        },
        accent: {
          DEFAULT: '#10b981', // Emerald
          hover: '#059669',
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass-sm': '0 4px 12px 0 rgba(0, 0, 0, 0.1)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
        'glass-glow': '0 8px 32px 0 rgba(99, 102, 241, 0.15)',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
