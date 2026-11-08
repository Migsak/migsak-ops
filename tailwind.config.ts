import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F0FE',
          100: '#D2E3FC',
          200: '#AECBFA',
          500: '#1A73E8',
          600: '#1967D2',
          700: '#185ABC'
        },
        ink: {
          DEFAULT: '#1F2328',
          muted: '#59636E',
          subtle: '#818B98'
        },
        line: '#E1E4E8',
        canvas: '#F6F8FA'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,35,40,0.04), 0 1px 3px rgba(31,35,40,0.06)'
      }
    }
  },
  plugins: []
};

export default config;
