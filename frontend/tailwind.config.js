/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vivas: {
          blue: '#0057B8',
          'blue-dark': '#004494',
          'blue-light': '#E8F0FE',
          green: '#00A859',
          'green-dark': '#008A49',
          'green-light': '#E6F7EF',
        },
        manchester: {
          red: '#DC2626',
          orange: '#EA580C',
          yellow: '#EAB308',
          green: '#16A34A',
          blue: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.08), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}
