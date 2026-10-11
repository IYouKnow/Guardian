import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { crx } from '@crxjs/vite-plugin'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const manifestFile = process.env.MANIFEST || 'chrome'
const manifestPath = resolve(__dirname, `./manifest.${manifestFile}.json`)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    crx({
      manifest,
      contentScripts: {
        injectCss: false,
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@guardian/core': resolve(__dirname, '../../packages/core'),
    },
  },
  server: {
    fs: {
      allow: [resolve(__dirname, '../..')],
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        // Ensure WASM files are handled correctly
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.wasm')) {
            return 'assets/[name][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@crxjs/vite-plugin']
  }
})
