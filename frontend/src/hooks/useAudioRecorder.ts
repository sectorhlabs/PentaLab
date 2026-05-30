import { useState, useRef, useCallback, useEffect } from 'react'
import { downmixToMono, type Chord } from '../lib/audioProcessor'
import type { ChordWorkerResponse } from '../workers/chordWorker'
import { isBackendAvailable, analyzeViaBackend } from '../services/api'

export type RecordingStatus = 'idle' | 'recording' | 'paused' | 'processing' | 'analyzing' | 'complete'

// Orden de preferencia. iOS/Safari solo soporta mp4/aac; Chrome/Firefox, webm.
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/mp4',
  'audio/aac',
]

const MIC_PREF_KEY = 'pentalab-mic-id'

function pickSupportedMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) {
    return undefined
  }
  return MIME_CANDIDATES.find(t => MediaRecorder.isTypeSupported(t))
}

function vibrate(pattern: number | number[]): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate(pattern)
  }
}

function describeRecordingError(err: unknown): string {
  // Contexto no seguro: getUserMedia solo existe en https o localhost.
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'La grabación requiere HTTPS o abrir la app en localhost. Si entras por una IP de red local, usa https.'
  }
  if (err instanceof DOMException) {
    switch (err.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Permiso de micrófono denegado. Actívalo en los ajustes del navegador y reintenta.'
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No se encontró ningún micrófono.'
      case 'NotReadableError':
        return 'El micrófono está siendo usado por otra aplicación.'
    }
  }
  return 'No se pudo iniciar la grabación. Revisa los permisos del micrófono.'
}

interface UseAudioRecorderReturn {
  status: RecordingStatus
  duration: number
  progress: number
  audioBlob: Blob | null
  chords: Chord[]
  musicKey: string | null
  tempo: number | null
  error: string | null
  devices: MediaDeviceInfo[]
  selectedDeviceId: string | null
  setSelectedDeviceId: (id: string | null) => void
  audioContext: AudioContext | null
  startRecording: () => Promise<void>
  stopRecording: () => void
  processRecording: () => Promise<void>
  reset: () => void
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [status, setStatus] = useState<RecordingStatus>('idle')
  const [duration, setDuration] = useState(0)
  const [progress, setProgress] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [chords, setChords] = useState<Chord[]>([])
  const [musicKey, setMusicKey] = useState<string | null>(null)
  const [tempo, setTempo] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDeviceId, setSelectedDeviceIdState] = useState<string | null>(
    () => (typeof localStorage !== 'undefined' ? localStorage.getItem(MIC_PREF_KEY) : null)
  )
  const [audioContext] = useState(() => new AudioContext())

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<Worker | null>(null)

  const setSelectedDeviceId = useCallback((id: string | null) => {
    setSelectedDeviceIdState(id)
    if (typeof localStorage !== 'undefined') {
      if (id) localStorage.setItem(MIC_PREF_KEY, id)
      else localStorage.removeItem(MIC_PREF_KEY)
    }
  }, [])

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return
    try {
      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list.filter(d => d.kind === 'audioinput'))
    } catch {
      /* enumeración no disponible */
    }
  }, [])

  const reset = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setStatus('idle')
    setDuration(0)
    setProgress(0)
    setAudioBlob(null)
    setChords([])
    setMusicKey(null)
    setTempo(null)
    setError(null)
    chunksRef.current = []
  }, [])

  const startRecording = useCallback(async () => {
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia no disponible')
      }
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
      }
      // `ideal` (no `exact`) para no fallar si el micro elegido desaparece.
      if (selectedDeviceId) audioConstraints.deviceId = { ideal: selectedDeviceId }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints })

      streamRef.current = stream
      // Con el permiso ya concedido, los labels de los dispositivos están
      // disponibles: refrescamos la lista para el selector.
      refreshDevices()

      // iOS/Safari no soporta webm/opus; negociamos el primer formato disponible.
      const mimeType = pickSupportedMimeType()
      const mediaRecorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      )

      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        // Usamos el mime real del recorder (puede diferir del solicitado).
        const type = mediaRecorder.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type })
        setAudioBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorderRef.current = mediaRecorder
      mediaRecorder.start(100)
      vibrate(40)

      startTimeRef.current = Date.now()
      setStatus('recording')

      timerRef.current = window.setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 100)
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError(describeRecordingError(err))
      setStatus('idle')
    }
  }, [selectedDeviceId, refreshDevices])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
      vibrate([30, 30, 30])
    }

    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    setStatus('processing')
  }, [])

  // Análisis on-device en el worker (FFT + chromagram + Viterbi).
  const analyzeWithWorker = useCallback(
    (samples: Float32Array, sampleRate: number) =>
      new Promise<void>((resolve, reject) => {
        const worker = new Worker(
          new URL('../workers/chordWorker.ts', import.meta.url),
          { type: 'module' }
        )
        workerRef.current = worker

        worker.onmessage = (e: MessageEvent<ChordWorkerResponse>) => {
          const msg = e.data
          if (msg.type === 'progress') {
            setProgress(msg.value)
          } else if (msg.type === 'result') {
            setChords(msg.result.chords)
            setMusicKey(msg.result.key)
            setTempo(msg.result.tempo)
            setStatus('complete')
            setProgress(1)
            worker.terminate()
            workerRef.current = null
            resolve()
          } else {
            worker.terminate()
            workerRef.current = null
            reject(new Error(msg.message))
          }
        }

        worker.onerror = (err) => {
          worker.terminate()
          workerRef.current = null
          reject(err.error ?? new Error('Chord worker failed'))
        }

        worker.postMessage({ samples, sampleRate }, [samples.buffer])
      }),
    []
  )

  const processRecording = useCallback(async () => {
    if (!audioBlob) return

    setStatus('analyzing')
    setProgress(0)

    // 1) Backend si está disponible (mayor precisión). 2) Fallback al worker.
    try {
      if (await isBackendAvailable()) {
        const result = await analyzeViaBackend(audioBlob, setProgress)
        setChords(result.chords)
        setMusicKey(result.key)
        setTempo(result.tempo)
        setStatus('complete')
        setProgress(1)
        return
      }
    } catch (err) {
      console.warn('Backend no disponible o falló; usando análisis on-device:', err)
    }

    try {
      const arrayBuffer = await audioBlob.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      const samples = downmixToMono(audioBuffer)
      await analyzeWithWorker(samples, audioBuffer.sampleRate)
    } catch (err) {
      console.error('Processing failed:', err)
      setStatus('idle')
      setProgress(0)
      throw err
    }
  }, [audioBlob, audioContext, analyzeWithWorker])

  // Enumera micrófonos al montar y cuando cambia el hardware conectado.
  useEffect(() => {
    refreshDevices()
    const md = navigator.mediaDevices
    if (!md?.addEventListener) return
    md.addEventListener('devicechange', refreshDevices)
    return () => md.removeEventListener('devicechange', refreshDevices)
  }, [refreshDevices])

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
      audioContext.close()
    }
  }, [audioContext])

  return {
    status,
    duration,
    progress,
    audioBlob,
    chords,
    musicKey,
    tempo,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId,
    audioContext,
    startRecording,
    stopRecording,
    processRecording,
    reset
  }
}
