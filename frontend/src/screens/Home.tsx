import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Pencil, Trash2, Check } from 'lucide-react'
import { useRecordingStore } from '../stores/recordingStore'
import { useSettingsStore } from '../stores/settingsStore'
import { PaintBlob, Wordmark } from '../components/decor'

function greeting(name: string): string {
  const who = name.trim() || 'artista'
  const h = new Date().getHours()
  if (h < 6) return 'Madrugada, ' + who
  if (h < 13) return 'Buenos días, ' + who
  if (h < 21) return 'Buenas tardes, ' + who
  return 'Buenas noches, ' + who
}

export default function Home() {
  const navigate = useNavigate()
  const recordings = useRecordingStore((s) => s.recordings)
  const setCurrentRecording = useRecordingStore((s) => s.setCurrentRecording)
  const artistName = useSettingsStore((s) => s.artistName)
  const renameRecording = useRecordingStore((s) => s.renameRecording)
  const deleteRecording = useRecordingStore((s) => s.deleteRecording)

  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')

  const filtered = recordings.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()))

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

  const open = (id: string) => {
    if (editingId) return
    const r = recordings.find((x) => x.id === id)
    if (!r) return
    setCurrentRecording(r)
    navigate('/practice')
  }

  const startEdit = (id: string, title: string) => {
    setEditingId(id)
    setDraft(title)
  }
  const commitEdit = () => {
    if (editingId && draft.trim()) renameRecording(editingId, draft.trim())
    setEditingId(null)
  }
  const remove = (id: string) => {
    if (confirm('¿Borrar esta lámina? No se puede deshacer.')) deleteRecording(id)
  }

  const palette = ['bg-terracota', 'bg-teal', 'bg-cobalto', 'bg-mostaza', 'bg-oliva']

  return (
    <div className="relative">
      <PaintBlob
        variant={1}
        className="absolute -top-10 -right-16 w-56 h-56 text-magenta/15 pointer-events-none -z-10"
      />

      <header className="mb-6">
        <Wordmark className="text-sm text-ink-soft mb-5" />
        <h1 className="font-display text-[2rem] leading-[1.1] font-semibold text-ink">{greeting(artistName)}</h1>
        <p className="text-ink-soft mt-2">
          {recordings.length === 0
            ? 'Tu cuaderno está en blanco, listo para sonar.'
            : `${recordings.length} ${recordings.length === 1 ? 'lámina' : 'láminas'} en tu cuaderno.`}
        </p>
      </header>

      {recordings.length === 0 ? (
        <div className="relative flex flex-col items-center text-center py-14">
          <div className="relative w-28 h-28 mb-6">
            <PaintBlob variant={0} className="absolute inset-0 w-full h-full text-teal/30" />
            <PaintBlob variant={2} className="absolute inset-2 w-[88%] h-[88%] text-terracota/30" />
          </div>
          <h2 className="font-display text-xl font-semibold text-ink mb-2">
            Aún no has pintado ninguna canción
          </h2>
          <p className="text-sm text-ink-soft mb-6 max-w-[270px]">
            Graba una melodía y PentaLab le pondrá color: acordes, tono y compás.
          </p>
          <button onClick={() => navigate('/create')} className="btn btn-primary">
            Empezar a grabar
          </button>
        </div>
      ) : (
        <>
          {recordings.length > 3 && (
            <div className="relative mb-5">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-faint" />
              <input
                type="text"
                placeholder="Buscar en tu cuaderno…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="field pl-10 pr-4 text-sm"
              />
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-center text-ink-soft py-8">Nada con ese nombre.</p>
          ) : (
            <div className="space-y-4">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  onClick={() => open(r.id)}
                  className="sheet cursor-pointer active:scale-[0.99] transition-transform hover:shadow-paper-lift"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      {editingId === r.id ? (
                        <input
                          autoFocus
                          value={draft}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit()
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          onBlur={commitEdit}
                          className="field bg-paper px-2.5 py-1.5 font-display text-lg"
                        />
                      ) : (
                        <h3 className="font-display text-lg font-semibold text-ink truncate">{r.title}</h3>
                      )}
                      <p className="font-mono text-xs text-ink-faint mt-0.5">
                        {formatDate(r.createdAt)} · {formatDuration(r.duration)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {editingId === r.id ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); commitEdit() }}
                          className="grid place-items-center w-9 h-9 rounded-full text-oliva hover:bg-oliva/10 touch-target"
                          aria-label="Guardar nombre"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(r.id, r.title) }}
                          className="grid place-items-center w-9 h-9 rounded-full text-ink-faint hover:text-terracota hover:bg-terracota/10 touch-target"
                          aria-label="Renombrar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(r.id) }}
                        className="grid place-items-center w-9 h-9 rounded-full text-ink-faint hover:text-magenta hover:bg-magenta/10 touch-target"
                        aria-label="Borrar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-end gap-[3px] h-10">
                    {r.chords.slice(0, 32).map((c, i) => (
                      <span
                        key={i}
                        className={`${c.quality === 'minor' ? 'bg-cobalto' : palette[i % palette.length]} rounded-full w-[5px]`}
                        style={{ height: `${20 + (Math.round(c.confidence * 100) % 60)}%`, opacity: 0.7 }}
                      />
                    ))}
                    {r.chords.length === 0 && <span className="text-xs text-ink-faint font-mono">sin acordes</span>}
                  </div>

                  {(r.key || r.tempo) && (
                    <div className="flex gap-2 mt-3">
                      {r.key && <span className="pigment text-xs px-2.5 py-1 bg-magenta/[0.12] text-magenta">{r.key}</span>}
                      {r.tempo && <span className="pigment text-xs px-2.5 py-1 bg-cobalto/[0.12] text-cobalto">{r.tempo} BPM</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
