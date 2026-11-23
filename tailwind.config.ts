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
        // Winter Anime / Frost & Dusty Rose Theme
        roseScarf: {
          50: '#fdf4f5',
          100: '#fbe8ea',
          200: '#f7d5d9',
          300: '#f0b5be',
          400: '#e58e9c',
          500: '#c27d88', // 核心围巾烟粉色
          600: '#b0616e',
          700: '#944c58',
          800: '#7c414b',
          900: '#693a42',
        },
        frostIce: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc', // 冰雪浅蓝
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
        },
        terminal: {
          darkest: '#0a0e17', // 寒夜深空底色
          darker: '#0f1522',
          dark: '#141c2c',
          card: '#162033', // 磨砂半透明卡片
          border: 'rgba(255, 255, 255, 0.08)',
          hover: 'rgba(255, 255, 255, 0.05)',
          muted: '#8495b2',
          text: '#f1f5f9',
        },
        trade: {
          buy: '#34d399', // 翡翠薄荷绿
          buyBg: 'rgba(52, 211, 153, 0.12)',
          sell: '#fb7185', // 烟绯粉红
          sellBg: 'rgba(251, 113, 133, 0.12)',
          sol: '#a855f7',
          accent: '#c27d88', // 主强调色改为温暖治愈的烟粉色
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        sans: [
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'rose-glow': '0 0 25px -5px rgba(194, 125, 136, 0.35)',
        'ice-glow': '0 0 25px -5px rgba(125, 211, 252, 0.35)',
      },
    },
  },
  plugins: [],
};

export default config;
