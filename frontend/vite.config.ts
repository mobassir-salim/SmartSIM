import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss()
  ],
  server: {
    watch: {
      usePolling: true
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        crm: resolve(__dirname, 'crm.html'),
        inventory: resolve(__dirname, 'inventory.html'),
        oms: resolve(__dirname, 'oms.html')
      }
    }
  }
})
