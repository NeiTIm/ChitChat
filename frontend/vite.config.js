
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 5174,
    strictPort: true,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5089',
        changeOrigin: true,
      },

      '/hubs': {
        target: 'http://127.0.0.1:5089',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
