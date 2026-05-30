import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function getStashed(): BeforeInstallPromptEvent | null {
  return (window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent | null }).__pwaPrompt ?? null
}

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

function detectIOS(): boolean {
  const ua = navigator.userAgent
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS se presenta como Mac con pantalla táctil.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

/**
 * Estado de instalación de la PWA:
 * - `installed`: ya corre como app instalada (standalone).
 * - `canInstall`: el navegador ofrece instalación nativa (Android/Chrome/Edge).
 * - `isIOS`: requiere el flujo manual de "Compartir → Añadir a inicio".
 */
export function usePwaInstall() {
  const [canInstall, setCanInstall] = useState<boolean>(() => !!getStashed())
  const [installed, setInstalled] = useState<boolean>(() => isStandalone())

  useEffect(() => {
    const onAvail = () => setCanInstall(!!getStashed())
    const onInstalled = () => {
      setInstalled(true)
      setCanInstall(false)
    }
    window.addEventListener('pwa-installable', onAvail)
    window.addEventListener('pwa-installed', onInstalled)
    return () => {
      window.removeEventListener('pwa-installable', onAvail)
      window.removeEventListener('pwa-installed', onInstalled)
    }
  }, [])

  async function promptInstall(): Promise<boolean> {
    const e = getStashed()
    if (!e) return false
    await e.prompt()
    const choice = await e.userChoice
    ;(window as unknown as { __pwaPrompt?: BeforeInstallPromptEvent | null }).__pwaPrompt = null
    setCanInstall(false)
    return choice.outcome === 'accepted'
  }

  return { installed, canInstall, isIOS: detectIOS(), promptInstall }
}
