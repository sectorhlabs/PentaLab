import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw, Undo2, Check, X } from 'lucide-react'
import { getAudioBlob } from '../services/storage'
import type { LyricLine } from '../stores/recordingStore'
import { formatTime } from '../lib/format'

export function LyricsSync({
  open,
  onClose,
  recordingId,
  lyrics,
  onSave,
}: {
  open: boolean
  onClose: () => void
  recordingId: string
  lyrics: LyricLine[]
  onSave: (lines: LyricLine[]) => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLParagraphElement>(null)

  const [times, setTimes] = useState<(number | null)[]>([])
  const [cursor, setCursor] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [ready, setReady] = useState(false)

  // Índices marcables (no vacíos): los renglones en blanco son separadores.
  const markable = (i: number) => i < lyrics.length && lyrics[i].text.trim() !== ''
  const nextMarkable = (from: number) => {
    let i = from
    while (i < lyrics.length && !markable(i)) i++
    return i
  }

  useEffect(() => {
    if (!open) return
    setTimes(lyrics.map((l) => l.time))
    setCursor(nextMarkable(0))
    setCurrentTime(0)
    setReady(false)
    let url: string | null = null
    let cancelled = false
    getAudioBlob(recordingId)
      .then((blob) => {
        if (!blob || cancelled || !audioRef.current) return
        url = URL.createObjectURL(blob)
        audioRef.current.src = url
        audioRef.current.currentTime = 0
        setReady(true)
      })
      .catch((err) => console.error('No se pudo cargar el audio:', err))
    return () => {
      cancelled = true
      audioRef.current?.pause()
      if (url) URL.revokeObjectURL(url)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recordingId])

  // Mantener la línea actual centrada.
  useEffect(() => {
    const el = activeRef.current
    const cont = containerRef.current
    if (el && cont) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      cont.scrollTo({ top: el.offsetTop - cont.clientHeight / 2 + el.clientHeight / 2, behavior: calm ? 'auto' : 'smooth' })
    }
  }, [cursor])

  if (!open) return null

  const toggle = () => {
    const a = audioRef.current
    if (!a || !ready) return
    if (playing) a.pause()
    else a.play().catch(() => {})
  }

  const mark = () => {
    if (cursor >= lyrics.length) return
    const t = audioRef.current?.currentTime ?? currentTime
    setTimes((prev) => {
      const next = [...prev]
      next[cursor] = t
      return next
    })
    setCursor((c) => nextMarkable(c + 1))
  }

  const undo = () => {
    // Retrocede al último marcable antes del cursor y borra su marca.
    let i = Math.min(cursor, lyrics.length) - 1
    while (i >= 0 && !markable(i)) i--
    if (i < 0) return
    setTimes((prev) => {
      const next = [...prev]
      next[i] = null
      return next
    })
    setCursor(i)
  }

  const restart = () => {
    const a = audioRef.current
    if (a) { a.currentTime = 0 }
    setTimes(lyrics.map(() => null))
    setCursor(nextMarkable(0))
  }

  const save = () => {
    audioRef.current?.pause()
    onSave(lyrics.map((l, i) => ({ text: l.text, time: times[i] ?? null })))
    onClose()
  }

  const done = cursor >= lyrics.length
  const markedCount = times.filter((t) => t != null).length
  const totalMarkable = lyrics.filter((l) => l.text.trim() !== '').length

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-paper flex flex-col overflow-hidden" style={{ height: '100dvh', paddingTop: 'env(safe-area-inset-top)' }}>
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        hidden
      />

      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <button onClick={onClose} className="grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:bg-ink/5" aria-label="Cancelar">
          <X className="w-5 h-5" />
        </button>
        <span className="t-title text-ink">Sincronizar letra</span>
        <button onClick={save} className="t-label text-terracota px-2" aria-label="Guardar">Guardar</button>
      </header>

      <p className="text-center t-meta text-ink-faint px-6 mb-2">
        Dale al play y toca <strong className="text-ink-soft">Marcar</strong> justo cuando empiece cada línea · {markedCount}/{totalMarkable}
      </p>

      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
        {lyrics.map((l, i) => {
          if (l.text.trim() === '') return <div key={i} className="h-3" />
          const isCurrent = i === cursor
          const isMarked = times[i] != null
          return (
            <p
              key={i}
              ref={isCurrent ? activeRef : undefined}
              className={`flex items-center gap-2 text-lg leading-snug transition-colors
                ${isCurrent ? 'text-ink font-display font-semibold text-xl' : isMarked ? 'text-ink-soft' : 'text-ink-faint'}`}
            >
              {isMarked && <span className="t-data text-caption text-oliva shrink-0 w-9">{formatTime(times[i] as number)}</span>}
              <span className="flex-1">{l.text}</span>
            </p>
          )
        })}
        <div className="h-[30dvh]" />
      </div>

      <div className="px-5 pb-[calc(20px+env(safe-area-inset-bottom))] pt-3 border-t border-paper-line bg-paper-deep">
        <div className="flex items-center justify-between t-data text-caption text-ink-faint mb-3">
          <span>{formatTime(currentTime)}</span>
          <button onClick={restart} className="inline-flex items-center gap-1.5 text-ink-soft" aria-label="Reiniciar">
            <RotateCcw className="w-3.5 h-3.5" /> Reiniciar
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={toggle} disabled={!ready} className="grid place-items-center w-14 h-14 rounded-full bg-paper border border-paper-line text-ink shrink-0 disabled:opacity-45" aria-label={playing ? 'Pausar' : 'Reproducir'}>
            {playing ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-0.5" fill="currentColor" />}
          </button>
          <button onClick={undo} disabled={markedCount === 0} className="grid place-items-center w-14 h-14 rounded-full bg-paper border border-paper-line text-ink-soft shrink-0 disabled:opacity-40" aria-label="Deshacer">
            <Undo2 className="w-6 h-6" />
          </button>
          {done ? (
            <button onClick={save} className="btn btn-primary flex-1 h-14 gap-2">
              <Check className="w-5 h-5" /> Guardar
            </button>
          ) : (
            <button onClick={mark} disabled={!ready} className="btn btn-primary flex-1 h-14 disabled:opacity-45">
              Marcar línea
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
