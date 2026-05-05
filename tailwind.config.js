/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        coal: {
          900: '#0a0a0a',
          800: '#111111',
          700: '#1a1a1a',
          600: '#222222',
        },
        silver: {
          100: '#e9ecef',
          500: '#9ca3af',
          400: '#adb5bd',
          500: '#9ca3af',
          600: '#868e96',
          700: '#6c757d',
        },
        ice: {
          400: '#74c0fc',
          500: '#74c0fc',
          600: '#4dabf7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-ice': '0 0 20px rgba(116, 192, 252, 0.15)',
      },
    },
  },
  plugins: [],
}

