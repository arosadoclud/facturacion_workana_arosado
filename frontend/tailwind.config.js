/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Cabinet Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Satoshi', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        app: '#F9F9F8',
        surface: '#FFFFFF',
        subtle: '#F4F4F2',
        ink: {
          DEFAULT: '#0A0A0A',
          soft: '#525252',
          muted: '#A3A3A3',
        },
        line: {
          DEFAULT: '#E5E5E0',
          strong: '#0A0A0A',
        },
        brand: {
          DEFAULT: '#0A0A0A',
          hover: '#262626',
          accent: '#4F46E5',
        },
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(0,0,0,0.05), 0 1px 4px -1px rgba(0,0,0,0.02)',
        pop: '0 10px 40px -10px rgba(0,0,0,0.12)',
        lift: '0 8px 24px -8px rgba(0,0,0,0.1)',
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
