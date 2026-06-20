import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { LyricLine } from '../stores/recordingStore'
import { useViewportHeight } from '../hooks/useViewportHeight'

/** Funde el texto editado con la letra previa, conservando los tiempos de las
 *  líneas cuyo texto no ha cambiado (por posición). */
function mergeLines(text: string, prev: LyricLine[]): LyricLine[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop()
  return lines.map((raw, i) => {
    const old = prev[i]
    const time = old && old.text.trim() === raw.trim() ? old.time : null
    return { time, text: raw }
  })
}

/**
 * Editor de letra a pantalla completa. Con "Guardar" en la cabecera para que el
 * teclado del móvil nunca lo tape (el problema clásico de un form en bottom-sheet).
 */
export function LyricsEditor({
  open,
  onClose,
  lyrics,
  onSave,
}: {
  open: boolean
  onClose: () => void
  lyrics: LyricLine[]
  onSave: (lines: LyricLine[]) => void
}) {
  const [text, setText] = useState('')
  const vh = useViewportHeight()

  useEffect(() => {
    if (open) setText(lyrics.map((l) => l.text).join('\n'))
  }, [open, lyrics])

  if (!open) return null

  const save = () => {
    onSave(mergeLines(text, lyrics))
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-x-0 top-0 z-[70] bg-paper flex flex-col overflow-hidden"
      style={{
        height: vh ? `${vh}px` : '100dvh',
        paddingTop: 'env(safe-area-inset-top)',
        backgroundImage: 'url("/paper-texture.webp")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <header className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
        <button onClick={onClose} className="grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:bg-ink/5" aria-label="Cancelar">
          <X className="w-5 h-5" />
        </button>
        <span className="t-title text-ink">Letra</span>
        <button onClick={save} className="t-label text-terracota px-2" aria-label="Guardar">Guardar</button>
      </header>

      <p className="t-meta text-ink-faint px-6 mb-2 shrink-0">
        Una línea por renglón. Luego podrás sincronizarla con el audio.
      </p>

      <div className="flex-1 min-h-0 px-5 pb-[calc(16px+env(safe-area-inset-bottom))]">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'Primera línea de la canción\nSegunda línea\n…'}
          className="field h-full resize-none leading-relaxed !bg-paper-deep/70"
        />
      </div>
    </div>,
    document.body
  )
}
