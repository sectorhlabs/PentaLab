import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
    { name: 'pentalab-settings' }
  )
)
