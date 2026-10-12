import type { Config } from 'tailwindcss';

// Design tokens taken from the "Kinetic Engine" design system used by the UI mockups.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0b1326',
        surface: {
          DEFAULT: '#0b1326',
          lowest: '#060e20',
          low: '#131b2e',
          container: '#171f33',
          high: '#222a3d',
          highest: '#2d3449',
          bright: '#31394d',
        },
        'on-surface': { DEFAULT: '#dae2fd', variant: '#c7c4d7' },
        outline: { DEFAULT: '#908fa0', variant: '#464554' },
        primary: { DEFAULT: '#c0c1ff', container: '#8083ff', on: '#1000a9', fixed: '#e1e0ff' },
        secondary: { DEFAULT: '#4edea3', container: '#00a572' },
        tertiary: { DEFAULT: '#ffb95f', container: '#ca8100' },
        error: { DEFAULT: '#ffb4ab', container: '#93000a' },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'label-xs': ['10px', { lineHeight: '12px', letterSpacing: '0.04em', fontWeight: '600' }],
        'mono-sm': ['11px', { lineHeight: '14px', fontWeight: '500' }],
        'body-sm': ['12px', { lineHeight: '16px' }],
        'body-md': ['13px', { lineHeight: '18px' }],
        'headline-sm': ['15px', { lineHeight: '20px', fontWeight: '600' }],
        'headline-md': [
          '18px',
          { lineHeight: '24px', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'headline-xl': [
          '32px',
          { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '600' },
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
