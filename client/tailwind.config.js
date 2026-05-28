/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#050505',
          surface: '#0a0a0f',
          card: '#0f0f18',
          border: '#1a1a2e',
          'border-glow': '#2d2d4a',
          cyan: '#00e5ff',
          'cyan-dim': '#006680',
          'cyan-glow': 'rgba(0, 229, 255, 0.3)',
          purple: '#a855f7',
          'purple-dim': '#5b21b6',
          pink: '#ff2d95',
          'pink-dim': '#991b5c',
          amber: '#f59e0b',
          green: '#00ff7f',
          red: '#ef4444',
          text: '#e0e0ec',
          'text-dim': '#6b6b8a',
          'text-muted': '#404060',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
        sans: ['"Inter"', '"SF Pro Display"', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-glow-cyan': 'pulse-glow-cyan 2s ease-in-out infinite',
        'scan-line': 'scan-line 8s linear infinite',
        'flicker': 'flicker 5s linear infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'grid-move': 'grid-move 20s linear infinite',
        'glow-border-cyan': 'glow-border-cyan 3s ease-in-out infinite',
        'breathe': 'breathe 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'neon-flicker': 'neon-flicker 4s ease-in-out infinite',
        'data-flow': 'data-flow 2s linear infinite',
        'spin-slow': 'spin 4s linear infinite',
        'spin-border': 'spin 3s linear infinite',
        'fade-in-up': 'fade-in-up 0.35s ease-out both',
        'live-ping': 'live-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
        'meteor': 'meteor 1s linear infinite',
        'spotlight': 'spotlight 2s ease 0.75s 1 forwards',
      },
      keyframes: {
        'pulse-glow-cyan': {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(0,229,255,0.3), 0 0 20px rgba(0,229,255,0.1)',
            textShadow: '0 0 5px rgba(0,229,255,0.5)'
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.2)',
            textShadow: '0 0 20px rgba(0,229,255,0.8), 0 0 40px rgba(0,229,255,0.3)'
          },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'flicker': {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '93%': { opacity: '0.8' },
          '94%': { opacity: '1' },
          '96%': { opacity: '0.9' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'grid-move': {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '50px 50px' },
        },
        'glow-border-cyan': {
          '0%, 100%': { 
            borderColor: 'rgba(0,229,255,0.3)',
            boxShadow: '0 0 5px rgba(0,229,255,0.1)'
          },
          '50%': { 
            borderColor: 'rgba(0,229,255,0.6)',
            boxShadow: '0 0 20px rgba(0,229,255,0.2), inset 0 0 10px rgba(0,229,255,0.05)'
          },
        },
        'breathe': {
          '0%, 100%': { 
            opacity: '1',
            transform: 'scale(1)'
          },
          '50%': { 
            opacity: '0.85',
            transform: 'scale(1.02)'
          },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'neon-flicker': {
          '0%, 100%': { 
            opacity: '1',
            filter: 'brightness(1) drop-shadow(0 0 8px rgba(0,229,255,0.6))'
          },
          '50%': { 
            opacity: '0.95',
            filter: 'brightness(1.1) drop-shadow(0 0 15px rgba(0,229,255,0.8))'
          },
        },
        'data-flow': {
          '0%': { backgroundPosition: '0% 0%' },
          '100%': { backgroundPosition: '200% 0%' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'live-ping': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
        'meteor': {
          '0%': { transform: 'rotate(215deg) translateX(0)', opacity: '1' },
          '70%': { opacity: '1' },
          '100%': { transform: 'rotate(215deg) translateX(-800px)', opacity: '0' },
        },
        'spotlight': {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
