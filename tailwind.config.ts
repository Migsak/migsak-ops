import type { Config } from 'tailwindcss';

/**
 * Migsak brand tokens (see the Migsak Brand design system). Colours are
 * Google's tonal palettes as used on migsak.com; status colours are the
 * contrast-checked values from the brand book.
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F0FE',
          100: '#D2E3FC',
          200: '#AECBFA',
          300: '#8AB4F8',
          400: '#669DF6',
          500: '#1A73E8', // accent: primary actions, links, focus
          600: '#1967D2', // accent hover
          700: '#1967D2', // accent-strong: accent text on white (5.4:1)
          800: '#185ABC'
        },
        ink: {
          DEFAULT: '#202124',
          muted: '#5F6368', // slate
          subtle: '#80868B' // muted: placeholders and icons only
        },
        line: '#DADCE0',
        canvas: '#F8F9FA',
        gray: { 50: '#F8F9FA', 100: '#F1F3F4', 200: '#E8EAED', 300: '#DADCE0', 400: '#BDC1C6', 500: '#9AA0A6', 600: '#80868B', 700: '#5F6368', 800: '#3C4043', 900: '#202124' },
        emerald: { 50: '#E6F4EA', 100: '#CEEAD6', 200: '#A8DAB5', 300: '#81C995', 400: '#5BB974', 500: '#34A853', 600: '#1E8E3E', 700: '#137333', 800: '#0D652D', 900: '#0D652D' },
        red: { 50: '#FCE8E6', 100: '#FAD2CF', 200: '#F6AEA9', 300: '#F28B82', 400: '#EE675C', 500: '#EA4335', 600: '#C5221F', 700: '#C5221F', 800: '#B31412', 900: '#A50E0E' },
        amber: { 50: '#FEF7E0', 100: '#FEEFC3', 200: '#FDE293', 300: '#FDD663', 400: '#FCC934', 500: '#F9AB00', 600: '#E37400', 700: '#995200', 800: '#995200', 900: '#7A4100' }
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace']
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        'card-hover': '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
        elevated: '0 4px 4px 0 rgba(60,64,67,0.3), 0 8px 12px 6px rgba(60,64,67,0.15)'
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)'
      },
      letterSpacing: {
        heading: '-0.025em'
      }
    }
  },
  plugins: []
};

export default config;
