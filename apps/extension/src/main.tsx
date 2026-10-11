import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { installChromeDevShim } from './dev/chromeDevShim.ts'

// Allows the popup to run in a plain browser tab (localhost:5173) during
// development. No-op inside the real extension, where chrome.* already exists.
if (import.meta.env.DEV) {
  installChromeDevShim()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
