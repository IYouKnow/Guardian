import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'

const manifestFile = process.env.MANIFEST || 'chrome'
const manifest = await import(`./manifest.${manifestFile}.json`)

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: { outDir: 'dist' }
})
