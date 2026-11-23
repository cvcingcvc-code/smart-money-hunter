import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        terminal: {
          darkest: '#090d16',
          darker: '#0d1322',
          dark: '#131b2e',
          card: '#182238',
          border: '#22304e',
          hover: '#1e2b47',
          muted: '#62769f',
          text: '#e2e8f0',
        },
        trade: {
          buy: '#10b981', // emerald-500
          buyBg: 'rgba(16, 185, 129, 0.12)',
          sell: '#f43f5e', // rose-500
          sellBg: 'rgba(244, 63, 94, 0.12)',
          sol: '#9945FF',
          accent: '#06b6d4', // cyan-500
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
