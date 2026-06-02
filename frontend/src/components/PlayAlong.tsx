import { useEffect, useMemo, useRef, memo } from 'react'
import type { LyricLine } from '../stores/recordingStore'
import type { Chord } from '../services/api'

const chordLabel = (root: string, quality: string) =>
  `${root}${quality === 'minor' || quality === 'minor7' ? 'm' : ''}`

/**
 * Vista "tocar con letra" (estilo GuitarTuna): la letra avanza con el audio y,
 * sobre cada línea, los acordes que suenan en ese tramo. Resalta línea y acorde
 * activos. Requiere la letra sincronizada para colocar los acordes; si no, solo
 * muestra la letra con auto-scroll proporcional.
 */
export const PlayAlong = memo(function PlayAlong({
  lyrics,
  chords,
  currentTime,
  duration,
  onSeek,
}: {
  lyrics: LyricLine[]
  chords: Chord[]
  currentTime: number
  duration: number
  onSeek: (t: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLDivElement>(null)

  const timed = useMemo(() => lyrics.some((l) => l.time != null), [lyrics])

  // Acordes que caen dentro del intervalo de cada línea sincronizada.
  const lineChords = useMemo<Chord[][]>(() => {
    const out: Chord[][] = lyrics.map(() => [])
    if (!timed || chords.length === 0) return out
    for (let i = 0; i < lyrics.length; i++) {
      const t = lyrics[i].time
      if (t == null) continue
      let next = duration || Infinity
      for (let j = i + 1; j < lyrics.length; j++) {
        if (lyrics[j].time != null) { next = lyrics[j].time as number; break }
      }
      out[i] = chords.filter((c) => c.start >= t - 0.05 && c.start < next - 0.05)
    }
    return out
  }, [lyrics, chords, timed, duration])

  const activeIndex = useMemo(() => {
    if (lyrics.length === 0) return -1
    if (timed) {
      let idx = -1
      for (let i = 0; i < lyrics.length; i++) {
        const t = lyrics[i].time
        if (t != null && t <= currentTime + 0.12) idx = i
      }
      return idx
    }
    if (duration > 0) return Math.min(lyrics.length - 1, Math.floor((currentTime / duration) * lyrics.length))
    return -1
  }, [lyrics, timed, currentTime, duration])

  const activeChordStart = useMemo(() => {
    const c = chords.find((c) => currentTime >= c.start && currentTime < c.end)
    return c ? c.start : null
  }, [chords, currentTime])

  useEffect(() => {
    const el = activeRef.current
    const cont = containerRef.current
    if (el && cont) {
      const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      cont.scrollTo({ top: el.offsetTop - cont.clientHeight / 2 + el.clientHeight / 2, behavior: calm ? 'auto' : 'smooth' })
    }
  }, [activeIndex])

  const seekToLine = (i: number) => {
    const t = lyrics[i].time
    if (t != null) onSeek(t)
    else if (duration > 0) onSeek((i / lyrics.length) * duration)
  }

  return (
    <div ref={containerRef} className="h-[46dvh] overflow-y-auto px-1 py-2" style={{ overscrollBehavior: 'contain' }}>
      {lyrics.map((l, i) => {
        if (l.text.trim() === '') return <div key={i} className="h-4" />
        const active = i === activeIndex
        const cs = lineChords[i]
        return (
          <div key={i} ref={active ? activeRef : undefined} className="py-1.5">
            {cs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-1">
                {cs.map((c, k) => {
                  const on = c.start === activeChordStart
                  return (
                    <button
                      key={k}
                      onClick={(e) => { e.stopPropagation(); onSeek(c.start) }}
                      className={`pigment text-caption px-2 py-0.5 font-semibold transition-colors
                        ${on ? 'bg-magenta text-paper' : 'bg-magenta/[0.12] text-magenta'}`}
                    >
                      {chordLabel(c.root, c.quality)}
                    </button>
                  )
                })}
              </div>
            )}
            <p
              onClick={() => seekToLine(i)}
              className={`cursor-pointer transition-all duration-200 leading-snug
                ${active
                  ? 'text-ink font-display font-semibold text-xl'
                  : i < activeIndex ? 'text-ink-faint text-lg' : 'text-ink-soft text-lg'}`}
            >
              {l.text}
            </p>
          </div>
        )
      })}
      <div className="h-[18dvh]" />
    </div>
  )
})
