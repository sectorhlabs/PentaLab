import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Pencil, Check } from 'lucide-react'
import { useRecordingStore } from '../stores/recordingStore'
import { getAudioBlob } from '../services/storage'
import { PaintBlob } from '../components/decor'
import type { Chord } from '../services/api'

const PLAYBACK_RATES = [1, 0.75, 0.5] as const

const chordLabel = (root: string, quality: string) =>
  `${root}${quality === 'minor' || quality === 'minor7' ? 'm' : ''}`

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

// Fila memoizada: solo se re-renderiza si cambia su estado activo.
const ChordRow = memo(function ChordRow({
  chord, active, onSeek,
}: { chord: Chord; active: boolean; onSeek: (t: number) => void }) {
  return (
    <button
      onClick={() => onSeek(chord.start)}
      className={`w-full flex items-center gap-3 py-2.5 px-3 edge-painted-sm text-left transition-colors
        ${active ? 'bg-magenta/[0.12]' : 'hover:bg-ink/5'}`}
    >
      <span className="font-mono text-xs text-ink-faint w-9">{fmtTime(chord.start)}</span>
      <span className={`font-display font-semibold w-12 ${active ? 'text-magenta' : 'text-ink'}`}>
        {chordLabel(chord.root, chord.quality)}
      </span>
      <span className="ml-auto font-mono text-[11px] text-ink-faint">{Math.round(chord.confidence * 100)}%</span>
    </button>
  )
})

export default function Practice() {
  const navigate = useNavigate()
  const currentRecording = useRecordingStore((s) => s.currentRecording)
  const renameRecording = useRecordingStore((s) => s.renameRecording)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(currentRecording?.duration ?? 0)
  const [playbackRate, setPlaybackRate] = useState<number>(1)
  const [volume, setVolume] = useState(0.8)
  const [isLooping, setIsLooping] = useState(false)
  const [audioReady, setAudioReady] = useState(false)

  const chords = currentRecording?.chords ?? []

  useEffect(() => {
    if (!currentRecording) return
    let url: string | null = null
    let cancelled = false
    getAudioBlob(currentRecording.id)
      .then((blob) => {
        if (!blob || cancelled || !audioRef.current) return
        url = URL.createObjectURL(blob)
        audioRef.current.src = url
        setAudioReady(true)
      })
      .catch((err) => console.error('No se pudo cargar el audio:', err))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [currentRecording])

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = playbackRate }, [playbackRate, audioReady])
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume }, [volume, audioReady])
  useEffect(() => { if (audioRef.current) audioRef.current.loop = isLooping }, [isLooping, audioReady])

  const currentChord = chords.find((c) => currentTime >= c.start && currentTime < c.end)
  const currentChordIndex = chords.findIndex((c) => currentTime >= c.start && currentTime < c.end)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !audioReady) return
    if (isPlaying) audio.pause()
    else audio.play().catch((err) => console.error('No se pudo reproducir:', err))
  }

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(time, duration || time))
    audio.currentTime = clamped
    setCurrentTime(clamped)
  }, [duration])

  const skip = (dir: 1 | -1) => {
    if (chords.length === 0) return seekTo(currentTime + dir * 5)
    if (dir === 1) {
      const next = chords.find((c) => c.start > currentTime + 0.05)
      seekTo(next ? next.start : duration)
    } else {
      const prev = [...chords].reverse().find((c) => c.start < currentTime - 0.05)
      seekTo(prev ? prev.start : 0)
    }
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`

  const onProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    seekTo(((e.clientX - rect.left) / rect.width) * duration)
  }

  if (!currentRecording) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[70dvh]">
        <PaintBlob variant={1} className="w-28 h-28 text-terracota/25 mb-5" />
        <h1 className="font-display text-2xl font-semibold text-ink mb-2">Nada que tocar todavía</h1>
        <p className="text-sm text-ink-soft mb-6 max-w-[260px]">
          Elige una lámina de tu cuaderno o graba una nueva.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/library')} className="btn btn-secondary">Cuaderno</button>
          <button onClick={() => navigate('/create')} className="btn btn-primary">Grabar</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => { const d = e.currentTarget.duration; if (Number.isFinite(d) && d > 0) setDuration(d) }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        hidden
      />

      <header className="mb-5">
        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { if (titleDraft.trim()) renameRecording(currentRecording.id, titleDraft.trim()); setEditingTitle(false) }
                if (e.key === 'Escape') setEditingTitle(false)
              }}
              onBlur={() => { if (titleDraft.trim()) renameRecording(currentRecording.id, titleDraft.trim()); setEditingTitle(false) }}
              className="flex-1 min-w-0 bg-paper border border-terracota/50 edge-painted-sm px-2.5 py-1 font-display text-2xl font-semibold text-ink focus:outline-none"
            />
            <button
              onClick={() => { if (titleDraft.trim()) renameRecording(currentRecording.id, titleDraft.trim()); setEditingTitle(false) }}
              className="grid place-items-center w-9 h-9 rounded-full text-oliva hover:bg-oliva/10 shrink-0"
              aria-label="Guardar nombre"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-ink truncate">{currentRecording.title}</h1>
            <button
              onClick={() => { setTitleDraft(currentRecording.title); setEditingTitle(true) }}
              className="grid place-items-center w-8 h-8 rounded-full text-ink-faint hover:text-terracota hover:bg-terracota/10 shrink-0"
              aria-label="Renombrar"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>
        )}
        {(currentRecording.key || currentRecording.tempo) && (
          <div className="flex gap-2 mt-2">
            {currentRecording.key && (
              <span className="pigment text-xs px-2.5 py-1 bg-magenta/[0.12] text-magenta">Tono {currentRecording.key}</span>
            )}
            {currentRecording.tempo && (
              <span className="pigment text-xs px-2.5 py-1 bg-cobalto/[0.12] text-cobalto">{currentRecording.tempo} BPM</span>
            )}
          </div>
        )}
      </header>

      {/* Acorde actual: pigmento sobre el lienzo. */}
      <div className="relative grid place-items-center py-6 mb-4">
        <PaintBlob
          variant={0}
          className={`absolute w-48 h-48 transition-colors duration-300 ${currentChord ? 'text-magenta/20' : 'text-paper-line/60'}`}
        />
        <div className="relative text-center">
          <span className="font-display text-[5rem] leading-none font-semibold text-ink">
            {currentChord ? chordLabel(currentChord.root, currentChord.quality) : '·'}
          </span>
          <span className="block text-sm text-ink-faint mt-1">
            {currentChord ? currentChord.quality : 'esperando'}
          </span>
        </div>
      </div>

      {/* Línea de acordes. */}
      <div className="-mx-1 px-1 mb-4">
        {chords.length === 0 ? (
          <p className="text-center text-sm text-ink-faint py-6">Esta lámina no tiene acordes.</p>
        ) : (
          <div className="space-y-1">
            {chords.map((c, i) => (
              <ChordRow key={i} chord={c} active={i === currentChordIndex} onSeek={seekTo} />
            ))}
          </div>
        )}
      </div>

      {/* Barra de progreso. */}
      <div ref={progressRef} onClick={onProgressClick} className="h-2.5 bg-paper-line rounded-full cursor-pointer mb-2 touch-target">
        <div className="h-full bg-terracota rounded-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
      </div>
      <div className="flex justify-between font-mono text-xs text-ink-faint mb-5">
        <span>{fmt(currentTime)}</span>
        <span>{fmt(duration)}</span>
      </div>

      {/* Controles. */}
      <div className="flex items-center justify-center gap-5">
        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`grid place-items-center w-10 h-10 rounded-full touch-target transition-colors
            ${isLooping ? 'bg-teal text-paper' : 'bg-paper-deep border border-paper-line text-ink-soft'}`}
          aria-label="Repetir"
        >
          <Repeat className="w-5 h-5" />
        </button>
        <button onClick={() => skip(-1)} className="grid place-items-center w-12 h-12 rounded-full bg-paper-deep border border-paper-line text-ink-soft touch-target" aria-label="Anterior">
          <SkipBack className="w-5 h-5" />
        </button>
        <button
          onClick={togglePlay}
          disabled={!audioReady}
          className="grid place-items-center w-16 h-16 rounded-full bg-terracota text-paper shadow-[0_6px_20px_oklch(0.62_0.15_45_/_0.4)] active:scale-95 transition-transform disabled:opacity-45"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 ml-0.5" fill="currentColor" />}
        </button>
        <button onClick={() => skip(1)} className="grid place-items-center w-12 h-12 rounded-full bg-paper-deep border border-paper-line text-ink-soft touch-target" aria-label="Siguiente">
          <SkipForward className="w-5 h-5" />
        </button>
        <button
          onClick={() => setPlaybackRate((r) => {
            const idx = PLAYBACK_RATES.indexOf(r as typeof PLAYBACK_RATES[number])
            return PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]
          })}
          className="grid place-items-center w-10 h-10 rounded-full bg-paper-deep border border-paper-line touch-target"
          aria-label="Velocidad"
        >
          <span className="font-mono text-xs text-ink-soft">{playbackRate}x</span>
        </button>
      </div>

      {/* Volumen. */}
      <div className="flex items-center gap-3 mt-6 px-1">
        <Volume2 className="w-5 h-5 text-ink-faint" />
        <input
          type="range" min="0" max="100" value={Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="flex-1 accent-terracota"
        />
      </div>
    </div>
  )
}
