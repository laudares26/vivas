/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        iubi: {
          50: '#E6F4FF',
          100: '#B3DFFF',
          200: '#80CAFF',
          300: '#4DB5FF',
          400: '#1AA0FF',
          500: '#0088E6',
          600: '#006BB4',
          700: '#004E82',
          800: '#003150',
          900: '#00141E',
          dark: '#003A6B',
          primary: '#0066CC',
          accent: '#00AAFF',
          light: '#4DC8FF',
        },
        geo: {
          green: '#2ECC71',
          orange: '#F39C12',
          red: '#E74C3C',
          purple: '#9B59B6',
          teal: '#1ABC9C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      backgroundImage: {
        'iubi-gradient': 'linear-gradient(135deg, #003A6B 0%, #0066CC 50%, #00AAFF 100%)',
        'iubi-gradient-dark': 'linear-gradient(135deg, #001F3F 0%, #003A6B 50%, #004E82 100%)',
        'iubi-gradient-light': 'linear-gradient(135deg, #0088E6 0%, #00AAFF 50%, #4DC8FF 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
