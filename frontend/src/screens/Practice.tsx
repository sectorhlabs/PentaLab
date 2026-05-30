import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat } from 'lucide-react'
import { useRecordingStore } from '../stores/recordingStore'
import { getAudioBlob } from '../services/storage'

const PLAYBACK_RATES = [1, 0.75, 0.5] as const

const chordLabel = (root: string, quality: string) =>
  `${root}${quality === 'minor' || quality === 'minor7' ? 'm' : ''}`

export default function Practice() {
  const navigate = useNavigate()
  const currentRecording = useRecordingStore((s) => s.currentRecording)

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

  // Carga el audio desde IndexedDB y lo asigna al elemento <audio>.
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

  // Aplica velocidad y volumen al elemento de audio.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate, audioReady])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume, audioReady])

  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = isLooping
  }, [isLooping, audioReady])

  const currentChord = chords.find(c => currentTime >= c.start && currentTime < c.end)
  const currentChordIndex = chords.findIndex(c => currentTime >= c.start && currentTime < c.end)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio || !audioReady) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play().catch((err) => console.error('No se pudo reproducir:', err))
    }
  }

  const seekTo = (time: number) => {
    const audio = audioRef.current
    if (!audio) return
    const clamped = Math.max(0, Math.min(time, duration || time))
    audio.currentTime = clamped
    setCurrentTime(clamped)
  }

  const skipToAdjacentChord = (direction: 1 | -1) => {
    if (chords.length === 0) {
      seekTo(currentTime + direction * 5)
      return
    }
    if (direction === 1) {
      const next = chords.find(c => c.start > currentTime + 0.05)
      seekTo(next ? next.start : duration)
    } else {
      const prev = [...chords].reverse().find(c => c.start < currentTime - 0.05)
      seekTo(prev ? prev.start : 0)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration) return
    const rect = progressRef.current.getBoundingClientRect()
    const percentage = (e.clientX - rect.left) / rect.width
    seekTo(percentage * duration)
  }

  if (!currentRecording) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100dvh-160px)] text-center">
        <h1 className="text-xl font-bold text-text-primary mb-2">Nada que practicar</h1>
        <p className="text-sm text-text-secondary mb-6 max-w-[260px]">
          Selecciona una grabación de tu biblioteca o crea una nueva.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/library')} className="btn btn-secondary">
            Ir a biblioteca
          </button>
          <button onClick={() => navigate('/create')} className="btn btn-primary">
            Grabar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-80px)]">
      <audio
        ref={audioRef}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration
          if (Number.isFinite(d) && d > 0) setDuration(d)
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        hidden
      />

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Practicar</h1>
        <p className="text-sm text-text-secondary mt-1 truncate">{currentRecording.title}</p>
        {(currentRecording.key || currentRecording.tempo) && (
          <div className="flex gap-2 mt-2 font-mono text-xs">
            {currentRecording.key && (
              <span className="px-2 py-1 rounded bg-bg-elevated text-text-secondary">
                Tono: {currentRecording.key}
              </span>
            )}
            {currentRecording.tempo && (
              <span className="px-2 py-1 rounded bg-bg-elevated text-text-secondary">
                {currentRecording.tempo} BPM
              </span>
            )}
          </div>
        )}
      </header>

      {/* Chord Display */}
      <div className="flex justify-center mb-8">
        <div className="bg-accent-primary/10 border-2 border-accent-primary rounded-2xl px-12 py-6 text-center min-w-[160px]">
          <span className="font-mono text-5xl font-bold text-accent-primary">
            {currentChord ? chordLabel(currentChord.root, currentChord.quality) : '—'}
          </span>
          <span className="block text-sm text-text-secondary mt-2">
            {currentChord?.quality ?? 'esperando'}
          </span>
        </div>
      </div>

      {/* Chord timeline */}
      <div className="flex-1 overflow-hidden mb-6">
        <div className="h-full overflow-y-auto py-2">
          {chords.length === 0 ? (
            <p className="text-center text-sm text-text-muted py-8">
              No se detectaron acordes en esta grabación.
            </p>
          ) : (
            chords.map((chord, i) => (
              <button
                key={i}
                onClick={() => seekTo(chord.start)}
                className={`w-full flex items-center gap-3 py-3 px-4 rounded-lg transition-all duration-300 text-left ${
                  i === currentChordIndex
                    ? 'bg-accent-primary/20 font-medium'
                    : 'text-text-secondary'
                }`}
              >
                <span className="font-mono text-xs text-text-muted w-10">
                  {formatTime(chord.start)}
                </span>
                <span className="font-mono font-bold text-text-primary w-12">
                  {chordLabel(chord.root, chord.quality)}
                </span>
                <span className="text-xs text-text-muted ml-auto">
                  {Math.round(chord.confidence * 100)}%
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        ref={progressRef}
        onClick={handleProgressClick}
        className="h-2 bg-bg-elevated rounded-full cursor-pointer mb-4 touch-target"
      >
        <div
          className="h-full bg-gradient-to-r from-accent-primary to-accent-secondary rounded-full"
          style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
        />
      </div>

      {/* Time Display */}
      <div className="flex justify-between text-xs text-text-muted font-mono mb-4">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => setIsLooping(!isLooping)}
          className={`w-10 h-10 rounded-full flex items-center justify-center touch-target ${
            isLooping ? 'bg-accent-primary text-white' : 'bg-bg-elevated text-text-secondary'
          }`}
          aria-label="Repetir"
        >
          <Repeat className="w-5 h-5" />
        </button>

        <button
          onClick={() => skipToAdjacentChord(-1)}
          className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center touch-target"
          aria-label="Acorde anterior"
        >
          <SkipBack className="w-5 h-5 text-text-secondary" />
        </button>

        <button
          onClick={togglePlay}
          disabled={!audioReady}
          className="w-16 h-16 rounded-full bg-accent-primary flex items-center justify-center touch-target shadow-lg shadow-accent-primary/30 disabled:opacity-50"
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-1" />
          )}
        </button>

        <button
          onClick={() => skipToAdjacentChord(1)}
          className="w-12 h-12 rounded-full bg-bg-elevated flex items-center justify-center touch-target"
          aria-label="Acorde siguiente"
        >
          <SkipForward className="w-5 h-5 text-text-secondary" />
        </button>

        <button
          onClick={() => setPlaybackRate(r => {
            const idx = PLAYBACK_RATES.indexOf(r as typeof PLAYBACK_RATES[number])
            return PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]
          })}
          className="w-10 h-10 rounded-full bg-bg-elevated flex items-center justify-center touch-target"
          aria-label="Velocidad de reproducción"
        >
          <span className="text-xs font-mono text-text-secondary">{playbackRate}x</span>
        </button>
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 mt-6 px-2">
        <Volume2 className="w-5 h-5 text-text-muted" />
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          className="w-32 accent-accent-primary"
        />
      </div>
    </div>
  )
}
