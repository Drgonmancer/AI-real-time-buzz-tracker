import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
        // 开发环境前端已直连 3000；保留代理供未配置 VITE_SOCKET_URL 时使用
        configure: (proxy) => {
          proxy.on('error', (err) => {
            if ((err as NodeJS.ErrnoException).code === 'ECONNABORTED') return;
            console.warn('[vite] ws proxy:', err.message);
          });
        },
      },
    },
  },
});
