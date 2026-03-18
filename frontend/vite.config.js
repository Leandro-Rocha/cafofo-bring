import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    __BUILD_SHA__: JSON.stringify(process.env.VITE_BUILD_SHA || 'dev'),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
