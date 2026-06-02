import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mic, Square, Check, AlertTriangle } from 'lucide-react'
import { useAudioRecorder } from '../hooks/useAudioRecorder'
import { useRecordingStore } from '../stores/recordingStore'
import { saveAudioBlob } from '../services/storage'
import { PaintBlob } from '../components/decor'

export default function Create() {
  const navigate = useNavigate()
  const hasProcessedRef = useRef(false)
  const savedRef = useRef(false)

  const addRecording = useRecordingStore((s) => s.addRecording)
  const setCurrentRecording = useRecordingStore((s) => s.setCurrentRecording)
  const renameRecording = useRecordingStore((s) => s.renameRecording)
  const savedIdRef = useRef<string | null>(null)
  const pendingRef = useRef<Parameters<typeof addRecording>[0] | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [isFirst, setIsFirst] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const {
    status, duration, progress, chords, musicKey, tempo, error,
    devices, selectedDeviceId, setSelectedDeviceId, audioBlob,
    startRecording, stopRecording, processRecording, reset,
  } = useAudioRecorder()

  useEffect(() => {
    if (status === 'processing' && audioBlob && !hasProcessedRef.current) {
      hasProcessedRef.current = true
      processRecording()
    }
    if (status === 'idle') {
      hasProcessedRef.current = false
      savedRef.current = false
      savedIdRef.current = null
      pendingRef.current = null
      setSaveError(false)
      setIsFirst(false)
      setTitleDraft('')
    }
    if (status === 'complete') hasProcessedRef.current = false
  }, [status, audioBlob, processRecording])

  // Persiste el audio + metadatos. Si IndexedDB rechaza (sin espacio en el
  // dispositivo, p. ej.), marcamos el error en vez de fingir que se guardó.
  const persist = useCallback(async (rec: Parameters<typeof addRecording>[0], blob: Blob) => {
    try {
      await saveAudioBlob(rec.id, blob)
      addRecording(rec)
      setCurrentRecording(rec)
      savedIdRef.current = rec.id
      setTitleDraft(rec.title)
      setSaveError(false)
    } catch (err) {
      console.error('No se pudo guardar la grabación:', err)
      setSaveError(true)
    }
  }, [addRecording, setCurrentRecording])

  useEffect(() => {
    if (status !== 'complete' || !audioBlob || savedRef.current) return
    savedRef.current = true

    const recording = {
      id: crypto.randomUUID(),
      title: `Lámina ${new Date().toLocaleString('es-ES', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      })}`,
      duration, chords, key: musicKey ?? undefined, tempo: tempo ?? undefined,
      createdAt: new Date().toISOString(),
    }
    // ¿Es la primerísima? Lo miramos antes de añadirla, para celebrarlo bien.
    setIsFirst(useRecordingStore.getState().recordings.length === 0)
    pendingRef.current = recording
    persist(recording, audioBlob)
  }, [status, audioBlob, duration, chords, musicKey, tempo, persist])

  const retrySave = () => {
    if (pendingRef.current && audioBlob) persist(pendingRef.current, audioBlob)
  }

  const handleRecordClick = () => {
    if (status === 'idle') startRecording()
    else if (status === 'recording') stopRecording()
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
  const circ = 2 * Math.PI * 45

  const content = () => {
    switch (status) {
      case 'idle':
        return (
          <div className="flex flex-col items-center">
            <button onClick={handleRecordClick} className="relative grid place-items-center w-44 h-44" aria-label="Grabar">
              <span className="absolute inset-3 rounded-full bg-terracota/40 animate-ink-pulse" />
              <span className="relative grid place-items-center w-32 h-32 rounded-full bg-terracota text-paper shadow-[0_8px_30px_oklch(0.62_0.15_45_/_0.4)] active:scale-95 transition-transform">
                <Mic className="w-12 h-12" strokeWidth={1.6} />
              </span>
            </button>
            <p className="t-body text-ink-soft mt-7">Toca para empezar a pintar sonido</p>

            {devices.length > 1 && (
              <select
                value={selectedDeviceId ?? ''}
                onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                aria-label="Seleccionar micrófono"
                className="field mt-6 max-w-[280px] px-3 py-2.5 t-body"
              >
                <option value="">Micrófono predeterminado</option>
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Micrófono ${i + 1}`}</option>
                ))}
              </select>
            )}
            {error && <p className="t-meta text-magenta text-center max-w-[280px] mt-4">{error}</p>}
          </div>
        )

      case 'recording':
        return (
          <div className="flex flex-col items-center w-full">
            <div className="flex items-center justify-center gap-[3px] h-24 w-full max-w-[300px] mb-8">
              {Array.from({ length: 44 }).map((_, i) => (
                <span
                  key={i}
                  className="flex-1 h-full bg-terracota/75 rounded-full animate-wave"
                  style={{ animationDelay: `${(i % 12) * 70}ms` }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2.5 mb-9">
              <span className="w-3 h-3 rounded-full bg-magenta animate-ink-pulse" />
              <span className="t-data text-3xl text-ink">{fmt(duration)}</span>
            </div>
            <button
              onClick={handleRecordClick}
              className="grid place-items-center w-20 h-20 rounded-full bg-magenta text-paper shadow-[0_6px_22px_oklch(0.58_0.18_5_/_0.4)] active:scale-95 transition-transform"
              aria-label="Detener"
            >
              <Square className="w-8 h-8" fill="currentColor" />
            </button>
          </div>
        )

      case 'processing':
        return (
          <div className="flex flex-col items-center">
            <PaintBlob variant={0} className="w-24 h-24 text-mostaza/40 animate-pulse" />
            <p className="t-h2 text-ink mt-5">Mezclando la paleta…</p>
            <p className="t-meta text-ink-faint mt-1">Preparando el audio</p>
          </div>
        )

      case 'analyzing':
        return (
          <div className="flex flex-col items-center">
            <div className="relative w-40 h-40 grid place-items-center">
              <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="oklch(0.86 0.022 74)" strokeWidth="6" />
                <circle
                  cx="50" cy="50" r="45" fill="none" stroke="oklch(0.54 0.15 45)" strokeWidth="6"
                  strokeLinecap="round" strokeDasharray={`${(progress * circ).toFixed(1)} ${circ.toFixed(1)}`}
                  style={{ transition: 'stroke-dasharray 0.3s ease-out' }}
                />
              </svg>
              <span className="t-data text-2xl text-ink">{Math.round(progress * 100)}%</span>
            </div>
            <p className="t-h2 text-ink mt-6">Buscando los acordes…</p>
            <p className="t-meta text-ink-faint mt-1">Cada nota a su sitio</p>
          </div>
        )

      case 'complete':
        if (saveError) return (
          <div className="flex flex-col items-center w-full text-center animate-bloom">
            <span className="grid place-items-center w-20 h-20 rounded-full bg-magenta/[0.12] text-magenta mb-5">
              <AlertTriangle className="w-9 h-9" strokeWidth={2} />
            </span>
            <h2 className="t-h2 text-ink">No se pudo guardar</h2>
            <p className="t-body text-ink-soft mt-1 mb-5 max-w-[300px]">
              Puede que te quede poco espacio en el dispositivo. Libera algo y reinténtalo; tu grabación sigue aquí.
            </p>
            <div className="flex gap-3 w-full max-w-[300px]">
              <button className="btn btn-secondary flex-1" onClick={reset}>Descartar</button>
              <button className="btn btn-primary flex-1" onClick={retrySave}>Reintentar</button>
            </div>
          </div>
        )
        return (
          <div className="flex flex-col items-center w-full animate-bloom">
            <span className="grid place-items-center w-20 h-20 rounded-full bg-oliva/15 text-oliva mb-5">
              <Check className="w-10 h-10" strokeWidth={2.4} />
            </span>
            <h2 className="t-h2 text-ink">{isFirst ? 'Tu primera lámina' : '¡Lámina lista!'}</h2>
            <p className="t-body tabular-nums text-ink-soft mt-1 mb-4">
              {chords.length} {chords.length === 1 ? 'acorde' : 'acordes'}
              {musicKey ? ` · ${musicKey}` : ''}{tempo ? ` · ${tempo} BPM` : ''}
            </p>

            <label className="w-full max-w-[300px] text-left">
              <span className="block t-caption text-ink-faint mb-1.5 px-1">Ponle nombre</span>
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => {
                  setTitleDraft(e.target.value)
                  if (savedIdRef.current && e.target.value.trim()) {
                    renameRecording(savedIdRef.current, e.target.value.trim())
                  }
                }}
                placeholder="Mi canción"
                maxLength={80}
                className="field px-3 py-2.5 t-title"
              />
            </label>

            <div className="flex flex-wrap justify-center gap-2 my-5 max-w-[300px]">
              {chords.slice(0, 6).map((c, i) => (
                <span key={i} className="pigment px-3 py-1.5 text-meta bg-magenta/[0.12] text-magenta">
                  {c.root}{c.quality === 'minor' ? 'm' : ''}
                </span>
              ))}
              {chords.length > 6 && (
                <span className="pigment px-3 py-1.5 text-meta bg-ink/[0.08] text-ink-soft">+{chords.length - 6}</span>
              )}
            </div>

            <div className="flex gap-3 w-full max-w-[300px]">
              <button className="btn btn-secondary flex-1" onClick={() => { reset(); navigate('/') }}>
                Al cuaderno
              </button>
              <button className="btn btn-primary flex-1" onClick={() => navigate('/practice')}>
                Tocar ahora
              </button>
            </div>
          </div>
        )
    }
  }

  return (
    <div className="relative flex flex-col min-h-[72dvh]">
      <img src="/splat-teal.webp" alt="" aria-hidden="true" className="absolute -top-8 -left-10 w-40 h-auto opacity-[0.16] pointer-events-none select-none -z-10" />
      <header className="mb-2">
        <h1 className="t-h1 text-ink">Crear</h1>
        <p className="t-meta text-ink-soft mt-2">Una canción nueva para tu cuaderno</p>
      </header>

      <div className="flex-1 grid place-items-center py-6">{content()}</div>

      {(status === 'processing' || status === 'analyzing') && (
        <button className="btn btn-ghost self-center" onClick={reset}>Cancelar</button>
      )}
      {status === 'complete' && !saveError && (
        <button className="btn btn-ghost self-center" onClick={reset}>Grabar otra</button>
      )}
    </div>
  )
}
