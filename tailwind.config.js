/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        veryka: {
          dark: '#1A2B56',
          cyan: '#00D1E0',
          light: '#F8FAFC',
        },
        brand: {
          50: '#e8f7f8',
          100: '#d1eff1',
          200: '#a3dfe3',
          300: '#4dc4cc',
          400: '#00D1E0',
          500: '#00b8c7',
          600: '#009aa8',
          700: '#1A2B56',
          800: '#141f3d',
          900: '#0e1629',
        },
        accent: {
          50: '#e6fbfc',
          100: '#ccf7f9',
          200: '#99eff3',
          300: '#66e7ed',
          400: '#33dfe7',
          500: '#00D1E0',
          600: '#00a7b3',
          700: '#007d86',
          800: '#00535a',
          900: '#002a2d',
        }
      },
      borderRadius: {
        'veryka': '14px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}
