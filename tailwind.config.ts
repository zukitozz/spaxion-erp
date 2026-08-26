import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        serif: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', '"Trebuchet MS"', 'sans-serif'],
      },
      colors: {
        spaxion: {
          50: '#f5f4f1',
          100: '#ece9e2',
          200: '#dad3c4',
          300: '#c7bca6',
          400: '#b29d83',
          500: '#9a7e62',
          600: '#715d45',
          700: '#4d3f2f',
          800: '#2f261e',
          900: '#18110b',
        },
        emerald: {
          50: '#ecf8f2',
          100: '#d4f1e0',
          200: '#a5e2c1',
          300: '#6fcca0',
          400: '#40b682',
          500: '#228c64',
          600: '#1d6f50',
          700: '#195842',
          800: '#154437',
          900: '#11372d',
        },
      },
      boxShadow: {
        soft: '0 20px 50px rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
}

export default config
