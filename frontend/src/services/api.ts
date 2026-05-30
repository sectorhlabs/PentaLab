export interface Chord {
  start: number
  end: number
  root: string
  quality: string
  confidence: number
}

export interface ChordAnalysis {
  chords: Chord[]
  tempo: number | null
  key: string | null
}

const BACKEND_URL_KEY = 'pentalab-backend-url'

/** URL base del backend. Vacío → rutas relativas (proxy de Vite en dev). */
export function getBackendUrl(): string {
  if (typeof localStorage === 'undefined') return ''
  return (localStorage.getItem(BACKEND_URL_KEY) ?? '').replace(/\/$/, '')
}

export function setBackendUrl(url: string): void {
  if (typeof localStorage === 'undefined') return
  const clean = url.trim().replace(/\/$/, '')
  if (clean) localStorage.setItem(BACKEND_URL_KEY, clean)
  else localStorage.removeItem(BACKEND_URL_KEY)
}

function apiBase(): string {
  return `${getBackendUrl()}/api/v1`
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Comprueba si el backend responde (timeout corto para no bloquear el flujo). */
export async function isBackendAvailable(): Promise<boolean> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 1500)
  try {
    const res = await fetch(`${getBackendUrl()}/health`, { signal: controller.signal })
    return res.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

const api = {
  async uploadRecording(blob: Blob, filename = 'recording.webm'): Promise<{ id: string }> {
    const formData = new FormData()
    formData.append('file', blob, filename)
    const res = await fetch(`${apiBase()}/recordings`, { method: 'POST', body: formData })
    if (!res.ok) throw new Error('Failed to upload')
    return res.json()
  },

  async startAnalysis(recordingId: string): Promise<void> {
    const res = await fetch(`${apiBase()}/recordings/${recordingId}/analyze`, { method: 'POST' })
    if (!res.ok) throw new Error('Failed to start analysis')
  },

  async getStatus(recordingId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress: number
    result: ChordAnalysis | null
  }> {
    const res = await fetch(`${apiBase()}/recordings/${recordingId}/status`)
    if (!res.ok) throw new Error('Failed to get status')
    return res.json()
  },
}

/**
 * Analiza un audio en el backend: sube → lanza análisis → hace polling hasta
 * completar. Devuelve acordes, tonalidad y tempo. Lanza si falla o expira.
 */
export async function analyzeViaBackend(
  blob: Blob,
  onProgress?: (fraction: number) => void
): Promise<ChordAnalysis> {
  const { id } = await api.uploadRecording(blob)
  await api.startAnalysis(id)

  // Polling cada 800 ms, hasta ~2 minutos.
  for (let i = 0; i < 150; i++) {
    await sleep(800)
    const st = await api.getStatus(id)
    onProgress?.(st.progress)
    if (st.status === 'completed' && st.result) return st.result
    if (st.status === 'failed') throw new Error('Backend analysis failed')
  }
  throw new Error('Backend analysis timeout')
}
