import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsStore {
  artistName: string
  setArtistName: (name: string) => void
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      artistName: 'Mekala',
      setArtistName: (artistName) => set({ artistName }),
    }),
    { name: 'pentalab-settings' }
  )
)
