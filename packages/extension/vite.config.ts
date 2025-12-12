import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const manifestFile = process.env.MANIFEST || 'chrome'
const manifestPath = resolve(__dirname, `./manifest.${manifestFile}.json`)
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

export default defineConfig({
  plugins: [
    react(), 
    crx({ 
      manifest,
      contentScripts: {
        injectCss: false,
      }
    })
  ],
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
