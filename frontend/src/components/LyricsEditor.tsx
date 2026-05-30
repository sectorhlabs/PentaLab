import { useEffect, useState } from 'react'
import { BottomSheet } from './BottomSheet'
import type { LyricLine } from '../stores/recordingStore'

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

  useEffect(() => {
    if (open) setText(lyrics.map((l) => l.text).join('\n'))
  }, [open, lyrics])

  const save = () => {
    const merged = mergeLines(text, lyrics)
    onSave(merged)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Letra">
      <p className="text-sm text-ink-soft mb-3">
        Pega o escribe la letra, una línea por renglón. Luego podrás sincronizarla con el audio.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={'Primera línea de la canción\nSegunda línea\n…'}
        rows={10}
        className="field leading-relaxed resize-none"
      />
      <div className="flex gap-3 mt-4">
        <button onClick={onClose} className="btn btn-secondary flex-1">Cancelar</button>
        <button onClick={save} className="btn btn-primary flex-1">Guardar</button>
      </div>
    </BottomSheet>
  )
}
