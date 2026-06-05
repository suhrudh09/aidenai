/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // App surface palette (light / slate).
        // Ordered light -> darker so existing depth cues still read:
        // 950 = page background, 900 = cards/chrome (white), then ascending grays.
        ink: {
          950: '#f8fafc',
          900: '#ffffff',
          850: '#f1f5f9',
          800: '#e2e8f0',
          700: '#cbd5e1',
          600: '#94a3b8',
        },
        risk: {
          low: '#22c55e',
          med: '#eab308',
          high: '#ef4444',
        },
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
}
