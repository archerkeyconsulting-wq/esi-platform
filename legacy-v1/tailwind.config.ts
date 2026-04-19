import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          '"Helvetica Neue"',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          yellow: '#FFDE59',
          dark: '#1a1a1a',
          light: '#f5f5f5',
        },
        status: {
          strong: '#10b981',
          medium: '#f59e0b',
          weak: '#ef4444',
        },
      },
      spacing: {
        '128': '32rem',
      },
    },
  },
  plugins: [],
}
export default config
