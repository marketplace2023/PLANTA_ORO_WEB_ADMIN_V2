import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5176,
    // En desarrollo el navegador habla con este mismo origen y Vite reenvía /api a la API: sin CORS que configurar.
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
  },
  test: {
    environment: 'jsdom',
    // Los tests corren en Node: necesitan una URL absoluta (en el navegador se usa el proxy /api).
    env: { VITE_API_URL: 'http://localhost:3000/api/v1' },
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    testTimeout: 20_000,
  },
})
