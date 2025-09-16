import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  // keep defaults so the app doesn't "move"; dev runs on 5173 unless busy
  server: {
    strictPort: false,
  },
})
