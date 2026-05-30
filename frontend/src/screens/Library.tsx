import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, LayoutGrid, Rows3, Trash2 } from 'lucide-react'
import { useRecordingStore } from '../stores/recordingStore'
import { PaintBlob } from '../components/decor'

type ViewMode = 'grid' | 'list'

export default function Library() {
  const navigate = useNavigate()
  const recordings = useRecordingStore((s) => s.recordings)
  const setCurrentRecording = useRecordingStore((s) => s.setCurrentRecording)
  const deleteRecording = useRecordingStore((s) => s.deleteRecording)

  const [query, setQuery] = useState('')
  const [view, setView] = useState<ViewMode>('list')

  const filtered = recordings.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()))

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })

  const open = (id: string) => {
    const r = recordings.find((x) => x.id === id)
    if (!r) return
    setCurrentRecording(r)
    navigate('/practice')
  }

  const remove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (confirm('¿Borrar esta lámina? No se puede deshacer.')) deleteRecording(id)
  }

  const tileColors = ['text-terracota/25', 'text-teal/25', 'text-cobalto/25', 'text-mostaza/30', 'text-magenta/25']

  return (
    <div>
      <header className="flex items-end justify-between mb-6">
        <div>
          <h1 className="font-display text-[2rem] leading-none font-semibold text-ink">Láminas</h1>
          <p className="text-ink-soft mt-2 text-sm">Tu cuaderno de canciones</p>
        </div>
        <button
          onClick={() => setView((v) => (v === 'grid' ? 'list' : 'grid'))}
          className="grid place-items-center w-10 h-10 rounded-full bg-paper-deep border border-paper-line text-ink-soft touch-target"
          aria-label="Cambiar vista"
        >
          {view === 'grid' ? <Rows3 className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
        </button>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
        <input
          type="text"
          placeholder="Buscar en tu cuaderno…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-paper-deep border border-paper-line edge-painted-sm pl-10 pr-4 py-3 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-terracota/50"
        />
      </div>

      {recordings.length === 0 ? (
        <div className="flex flex-col items-center text-center py-12">
          <PaintBlob variant={1} className="w-24 h-24 text-teal/25 mb-4" />
          <p className="text-ink-soft mb-5">Tu cuaderno está vacío</p>
          <button onClick={() => navigate('/create')} className="btn btn-primary">
            Grabar la primera
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-ink-soft py-12">Nada con ese nombre.</p>
      ) : view === 'list' ? (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div
              key={r.id}
              onClick={() => open(r.id)}
              className="sheet flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <span className="grid place-items-center w-11 h-11 rounded-full bg-terracota/12 text-terracota shrink-0">
                ▶
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-ink truncate">{r.title}</h3>
                <p className="font-mono text-xs text-ink-faint mt-0.5">
                  {formatDuration(r.duration)} · {formatDate(r.createdAt)}
                  {r.key ? ` · ${r.key}` : ''}
                </p>
              </div>
              <button
                onClick={(e) => remove(e, r.id)}
                className="grid place-items-center w-9 h-9 rounded-full text-ink-faint hover:text-magenta hover:bg-magenta/10 touch-target"
                aria-label="Borrar"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map((r, i) => (
            <div
              key={r.id}
              onClick={() => open(r.id)}
              className="sheet cursor-pointer active:scale-[0.98] transition-transform"
            >
              <div className="relative aspect-square grid place-items-center mb-3 overflow-hidden rounded-[14px]">
                <PaintBlob variant={(i % 3) as 0 | 1 | 2} className={`absolute w-[120%] h-[120%] ${tileColors[i % tileColors.length]}`} />
                <span className="relative font-display text-3xl font-semibold text-ink/70">
                  {r.key ?? '♪'}
                </span>
              </div>
              <h3 className="font-display font-semibold text-ink text-sm truncate">{r.title}</h3>
              <p className="font-mono text-xs text-ink-faint mt-0.5">{formatDuration(r.duration)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
