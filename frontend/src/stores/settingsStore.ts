import { useEffect, useState } from 'react'
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { indexedDBStorage } from '../services/storage'

interface SettingsStore {
  artistName: string
  setArtistName: (name: string) => void
  // Onboarding de primer uso: la bienvenida y el priming del micro se ven una vez.
  hasOnboarded: boolean
  completeOnboarding: () => void
  hasPrimedMic: boolean
  markMicPrimed: () => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      artistName: 'Mekala',
      setArtistName: (artistName) => set({ artistName }),
      hasOnboarded: false,
      completeOnboarding: () => set({ hasOnboarded: true }),
      hasPrimedMic: false,
      markMicPrimed: () => set({ hasPrimedMic: true }),
    }),
    {
      name: 'pentalab-settings',
      // Mismo IndexedDB que las grabaciones: en móvil localStorage puede no
      // persistir (modo privado, navegador que lo bloquea) y el flag se perdía.
      storage: createJSONStorage(() => indexedDBStorage),
    }
  )
)

/**
 * `true` cuando los ajustes ya se han leído de IndexedDB. Hasta entonces los
 * valores son los iniciales: hay que esperar para no enseñar el onboarding
 * a quien ya lo vio (la hidratación es asíncrona).
 */
export function useSettingsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated())
  useEffect(() => {
    const unsub = useSettingsStore.persist.onFinishHydration(() => setHydrated(true))
    if (useSettingsStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])
  return hydrated
}
