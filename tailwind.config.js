/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#165DFF',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        geo: {
          soil: '#8B5A2B',
          clay: '#CD853F',
          sand: '#DEB887',
          rock: '#696969',
          limestone: '#F5F5DC',
          granite: '#808080',
          water: '#0EA5E9',
          vegetation: '#059669',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'sm': '3px',
        'md': '3px',
        'lg': '3px',
      }
    },
  },
  plugins: [],
};
