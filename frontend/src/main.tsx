import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Capturamos el evento de instalación lo antes posible (puede dispararse antes
// de montar React) y lo guardamos para ofrecer "Instalar" desde Ajustes.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  ;(window as unknown as { __pwaPrompt?: Event }).__pwaPrompt = e
  window.dispatchEvent(new Event('pwa-installable'))
})
window.addEventListener('appinstalled', () => {
  ;(window as unknown as { __pwaPrompt?: Event | null }).__pwaPrompt = null
  window.dispatchEvent(new Event('pwa-installed'))
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)

// El service worker solo se registra en producción para no interferir con el HMR.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.error('Registro del service worker falló:', err)
    })
  })
}
