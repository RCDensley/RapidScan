import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:7071',
    },
    watch: {
      ignored: ['**/api/**', '**/node_modules/**', '**/__azurite_*', '**/__blobstorage__/**', '**/__queuestorage__/**'],
    },
  },
})
