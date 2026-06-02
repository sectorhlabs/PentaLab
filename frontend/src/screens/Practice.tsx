import { useState, useRef, useEffect, useCallback, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Pause, SkipBack, SkipForward, Volume2, Repeat, Pencil, Check, Plus, Timer, Download } from 'lucide-react'
import { useRecordingStore } from '../stores/recordingStore'
import { getAudioBlob } from '../services/storage'
import { PaintBlob } from '../components/decor'
import { PlayAlong } from '../components/PlayAlong'
import { LyricsEditor } from '../components/LyricsEditor'
import { LyricsSync } from '../components/LyricsSync'
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
      <span className="t-data text-caption text-ink-faint w-9">{fmtTime(chord.start)}</span>
      <span className={`t-title w-12 ${active ? 'text-magenta' : 'text-ink'}`}>
        {chordLabel(chord.root, chord.quality)}
      </span>
      <span className="ml-auto t-data text-caption text-ink-faint">{Math.round(chord.confidence * 100)}%</span>
    </button>
  )
})

export default function Practice() {
  const navigate = useNavigate()
  const currentRecording = useRecordingStore((s) => s.currentRecording)
  const renameRecording = useRecordingStore((s) => s.renameRecording)
  const setLyrics = useRecordingStore((s) => s.setLyrics)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [view, setView] = useState<'chords' | 'lyrics'>('chords')
  const [showEditor, setShowEditor] = useState(false)
  const [showSync, setShowSync] = useState(false)

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
  const lyrics = currentRecording?.lyrics ?? []
  const lyricsSynced = lyrics.some((l) => l.time != null)

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

  const downloadAudio = async () => {
    if (!currentRecording) return
    const blob = await getAudioBlob(currentRecording.id)
    if (!blob) return
    const ext = blob.type.includes('mp4') ? 'm4a'
      : blob.type.includes('webm') ? 'webm'
      : blob.type.includes('ogg') ? 'ogg'
      : blob.type.includes('wav') ? 'wav' : 'audio'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(currentRecording.title || 'pentalab').replace(/[^\w\-]+/g, '_')}.${ext}`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
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
        <img src="/icon-guitarra.webp" alt="" aria-hidden="true" className="w-40 h-auto mb-5 select-none pointer-events-none" />
        <h1 className="t-h1 text-ink mb-2">Nada que tocar todavía</h1>
        <p className="t-body text-ink-soft mb-6 max-w-[280px]">
          Elige una lámina de tu cuaderno o graba una nueva.
        </p>
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="btn btn-secondary">Cuaderno</button>
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
              className="field flex-1 min-w-0 px-2.5 py-1 t-h1"
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
            <h1 className="t-h1 text-ink truncate">{currentRecording.title}</h1>
            <button
              onClick={() => { setTitleDraft(currentRecording.title); setEditingTitle(true) }}
              className="grid place-items-center w-8 h-8 rounded-full text-ink-faint hover:text-terracota hover:bg-terracota/10 shrink-0"
              aria-label="Renombrar"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={downloadAudio}
              className="grid place-items-center w-8 h-8 rounded-full text-ink-faint hover:text-cobalto hover:bg-cobalto/10 shrink-0"
              aria-label="Descargar audio"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        )}
        {(currentRecording.key || currentRecording.tempo) && (
          <div className="flex gap-2 mt-2">
            {currentRecording.key && (
              <span className="pigment text-caption px-2.5 py-1 bg-magenta/[0.12] text-magenta">Tono {currentRecording.key}</span>
            )}
            {currentRecording.tempo && (
              <span className="pigment text-caption tabular-nums px-2.5 py-1 bg-cobalto/[0.12] text-cobalto">{currentRecording.tempo} BPM</span>
            )}
          </div>
        )}
      </header>

      {/* Pestañas: acordes sueltos o tocar con letra. */}
      <div className="flex gap-1 p-1 bg-paper-deep rounded-full mb-4 border border-paper-line">
        {(['chords', 'lyrics'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`flex-1 py-1.5 rounded-full transition-colors t-label
              ${view === t ? 'bg-terracota text-paper' : 'text-ink-soft'}`}
          >
            {t === 'chords' ? 'Acordes' : 'Letra'}
          </button>
        ))}
      </div>

      {view === 'chords' ? (
        <>
          {/* Acorde actual: pigmento sobre el lienzo. */}
          <div className="relative grid place-items-center py-6 mb-4">
            <PaintBlob
              variant={0}
              className={`absolute w-48 h-48 transition-colors duration-300 ${currentChord ? 'text-magenta/20' : 'text-paper-line/60'}`}
            />
            <div className="relative text-center">
              <span className="t-display text-ink">
                {currentChord ? chordLabel(currentChord.root, currentChord.quality) : '·'}
              </span>
              <span className="block t-meta text-ink-faint mt-1">
                {currentChord ? currentChord.quality : 'esperando'}
              </span>
            </div>
          </div>

          {/* Línea de acordes. */}
          <div className="-mx-1 px-1 mb-4">
            {chords.length === 0 ? (
              <p className="text-center t-meta text-ink-faint py-6">Esta lámina no tiene acordes.</p>
            ) : (
              <div className="space-y-1">
                {chords.map((c, i) => (
                  <ChordRow key={i} chord={c} active={i === currentChordIndex} onSeek={seekTo} />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mb-4">
          {lyrics.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10">
              <p className="t-body text-ink-soft mb-4 max-w-[280px]">
                Añade la letra para tocar siguiéndola, con los acordes encima en su sitio.
              </p>
              <button onClick={() => setShowEditor(true)} className="btn btn-primary gap-2">
                <Plus className="w-4 h-4" /> Añadir letra
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="t-caption text-ink-faint">{lyricsSynced ? 'Sincronizada' : 'Sin sincronizar'}</span>
                <div className="flex gap-1">
                  <button onClick={() => setShowEditor(true)} className="inline-flex items-center gap-1 t-label text-ink-soft px-2 py-1 rounded-full hover:bg-ink/5">
                    <Pencil className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button onClick={() => { audioRef.current?.pause(); setShowSync(true) }} className="inline-flex items-center gap-1 t-label text-terracota px-2 py-1 rounded-full hover:bg-terracota/10">
                    <Timer className="w-3.5 h-3.5" /> Sincronizar
                  </button>
                </div>
              </div>
              {!lyricsSynced && chords.length > 0 && (
                <p className="t-meta text-ink-faint bg-mostaza/[0.12] edge-painted-sm px-3 py-2 mb-2">
                  Sincroniza la letra para que los acordes aparezcan encima en su sitio.
                </p>
              )}
              <PlayAlong lyrics={lyrics} chords={chords} currentTime={currentTime} duration={duration} onSeek={seekTo} />
            </>
          )}
        </div>
      )}

      {/* Barra de progreso. */}
      <div ref={progressRef} onClick={onProgressClick} className="h-2.5 bg-paper-line rounded-full cursor-pointer mb-2 touch-target">
        <div className="h-full bg-terracota rounded-full" style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }} />
      </div>
      <div className="flex justify-between t-data text-caption text-ink-faint mb-5">
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
          <span className="t-data text-caption text-ink-soft">{playbackRate}x</span>
        </button>
      </div>

      {/* Volumen. */}
      <div className="flex items-center gap-3 mt-6 px-1">
        <Volume2 className="w-5 h-5 text-ink-faint" />
        <input
          type="range" min="0" max="100" value={Math.round(volume * 100)}
          onChange={(e) => setVolume(Number(e.target.value) / 100)}
          aria-label="Volumen"
          className="flex-1 accent-terracota"
        />
      </div>

      <LyricsEditor
        open={showEditor}
        onClose={() => setShowEditor(false)}
        lyrics={lyrics}
        onSave={(l) => setLyrics(currentRecording.id, l)}
      />
      <LyricsSync
        open={showSync}
        onClose={() => setShowSync(false)}
        recordingId={currentRecording.id}
        lyrics={lyrics}
        onSave={(l) => setLyrics(currentRecording.id, l)}
      />
    </div>
  )
}
