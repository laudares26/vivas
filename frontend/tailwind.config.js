/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wine: { DEFAULT: '#7B1E3C', deep: '#5E1730', soft: '#F6E9ED', line: '#EFD9E0' },
        ink: '#2A1A20',
        muted: '#8B7A80',
        surface: '#FFFFFF',
        bg: '#FBF7F5',
        success: { DEFAULT: '#2F8F6B', soft: '#E7F2EC' },
        warning: { DEFAULT: '#B5751A', soft: '#FBF0DE' },
        // Keep old aliases for backward compatibility during migration
        vivas: {
          blue: '#7B1E3C',
          'blue-dark': '#5E1730',
          'blue-light': '#F6E9ED',
          green: '#2F8F6B',
          'green-dark': '#266E55',
          'green-light': '#E7F2EC',
        },
        manchester: {
          red: '#DC2626',
          orange: '#EA580C',
          yellow: '#EAB308',
          green: '#16A34A',
          blue: '#2563EB',
        },
        line: '#F0E7EA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '18px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(42,26,32,.04), 0 8px 24px rgba(94,23,48,.06)',
        'card-hover': '0 4px 12px rgba(42,26,32,.08), 0 12px 32px rgba(94,23,48,.1)',
      },
    },
  },
  plugins: [],
}
