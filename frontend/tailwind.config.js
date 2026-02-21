/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0e17',
          800: '#111827',
          700: '#1a2332',
          600: '#243044',
          500: '#2d3b50',
        },
        accent: {
          green: '#00d4aa',
          red: '#ff4757',
          blue: '#3b82f6',
          yellow: '#fbbf24',
          purple: '#a855f7',
        },
      },
    },
  },
  plugins: [],
}
