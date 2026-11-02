/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-teal': {
          DEFAULT: '#087F75',
          light: '#0a9a8e',
          dark: '#06635c',
        },
        'dark-slate': {
          DEFAULT: '#364650',
          light: '#435663',
          dark: '#2b3840',
        },
        teal: {
          DEFAULT: '#087F75',
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#087F75',
          600: '#066e66',
          700: '#055c55',
          800: '#044a45',
          900: '#033834',
        },
        'main-text': '#263746',
        'secondary-text': '#718096',
        'border-grey': '#D9DEE3',
        'success-green': '#198754',
        'warning-orange': '#D97736',
        'danger-red': '#DC3545',
        'soft-grey': '#F5F7F7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        hover: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
}
