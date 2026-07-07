/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: {
          lightest: '#f4f7fe',
          lighter: '#e2e8f0',
          light: '#cbd5e1',
          DEFAULT: '#94a3b8',
          dark: '#0f172a'
        },
        primary: {
          light: '#38bdf8',
          DEFAULT: '#0ea5e9',
          dark: '#0284c7'
        },
        accent: {
          pink: '#ec4899',
          purple: '#8b5cf6',
          green: '#10b981'
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
