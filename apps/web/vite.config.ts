import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the API is reached through this proxy, so the browser only ever talks
// to one origin and the API does not need CORS configuration.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
