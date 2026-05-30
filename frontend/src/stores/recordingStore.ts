import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Chord } from '../services/api'
import { deleteAudioBlob, indexedDBStorage } from '../services/storage'

/** Una línea de letra. `time` en segundos si está sincronizada; null si no. */
export interface LyricLine {
  time: number | null
  text: string
}

export interface RecordingData {
  id: string
  title: string
  duration: number
  chords: Chord[]
  key?: string
  tempo?: number
  lyrics?: LyricLine[]
  createdAt: string
}

interface RecordingStore {
  recordings: RecordingData[]
  currentRecording: RecordingData | null

  addRecording: (recording: RecordingData) => void
  setCurrentRecording: (recording: RecordingData | null) => void
  updateCurrentChords: (chords: Chord[]) => void
  renameRecording: (id: string, title: string) => void
  setLyrics: (id: string, lyrics: LyricLine[]) => void
  deleteRecording: (id: string) => void
  getRecording: (id: string) => RecordingData | undefined
}

export const useRecordingStore = create<RecordingStore>()(
  persist(
    (set, get) => ({
      recordings: [],
      currentRecording: null,

      addRecording: (recording) => {
        set((state) => ({
          recordings: [recording, ...state.recordings]
        }))
      },

      setCurrentRecording: (recording) => {
        set({ currentRecording: recording })
      },

      updateCurrentChords: (chords) => {
        set((state) => {
          if (!state.currentRecording) return state
          return {
            currentRecording: {
              ...state.currentRecording,
              chords
            }
          }
        })
      },

      renameRecording: (id, title) => {
        set((state) => ({
          recordings: state.recordings.map(r => r.id === id ? { ...r, title } : r),
          currentRecording: state.currentRecording?.id === id
            ? { ...state.currentRecording, title }
            : state.currentRecording
        }))
      },

      setLyrics: (id, lyrics) => {
        set((state) => ({
          recordings: state.recordings.map(r => r.id === id ? { ...r, lyrics } : r),
          currentRecording: state.currentRecording?.id === id
            ? { ...state.currentRecording, lyrics }
            : state.currentRecording
        }))
      },

      deleteRecording: (id) => {
        // El audio vive en IndexedDB; lo eliminamos junto con la metadata.
        void deleteAudioBlob(id).catch(() => {})
        set((state) => ({
          recordings: state.recordings.filter(r => r.id !== id),
          currentRecording: state.currentRecording?.id === id ? null : state.currentRecording
        }))
      },

      getRecording: (id) => {
        return get().recordings.find(r => r.id === id)
      }
    }),
    {
      name: 'pentalab-recordings',
      storage: createJSONStorage(() => indexedDBStorage),
      // Solo persistimos la lista de grabaciones; currentRecording es efímero.
      partialize: (state) => ({ recordings: state.recordings })
    }
  )
)
