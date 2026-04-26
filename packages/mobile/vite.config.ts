import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Harden output for older Android WebViews (and keep dev output conservative too).
  esbuild: {
    target: 'es2015',
  },
  optimizeDeps: {
    esbuildOptions: {
      target: 'es2015',
    },
  },
  build: {
    target: 'es2015',
  },
  server: {
    // This app imports code/assets from `../shared`; allow Vite to serve it in dev.
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
  },
  resolve: {
    alias: {
      '@guardian/shared': path.resolve(__dirname, '../shared'),
    },
  },
})
