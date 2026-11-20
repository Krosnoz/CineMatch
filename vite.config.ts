import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// TD 10 : le navigateur ne connaît que Vite (port 5173). Vite transmet ce qui commence par /api au serveur (port 3000).
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:3000' },
  },
})
