import { useNavigate } from 'react-router-dom'
import { useRecordingStore } from '../stores/recordingStore'
import { PaintBlob, Wordmark } from '../components/decor'

const USER_NAME = 'Mekala'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Madrugada, ' + USER_NAME
  if (h < 13) return 'Buenos días, ' + USER_NAME
  if (h < 21) return 'Buenas tardes, ' + USER_NAME
  return 'Buenas noches, ' + USER_NAME
}

export default function Home() {
  const navigate = useNavigate()
  const recordings = useRecordingStore((s) => s.recordings)
  const setCurrentRecording = useRecordingStore((s) => s.setCurrentRecording)

  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60)
    return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`
  }
  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })

  const open = (id: string) => {
    const r = recordings.find((x) => x.id === id)
    if (!r) return
    setCurrentRecording(r)
    navigate('/practice')
  }

  return (
    <div className="relative">
      <PaintBlob
        variant={1}
        className="absolute -top-10 -right-16 w-56 h-56 text-magenta/15 pointer-events-none -z-10"
      />

      <header className="mb-8">
        <Wordmark className="text-sm text-ink-soft mb-5" />
        <h1 className="font-display text-[2rem] leading-[1.1] font-semibold text-ink">
          {greeting()}
        </h1>
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
        <div className="space-y-4">
          {recordings.map((r) => (
            <button
              key={r.id}
              onClick={() => open(r.id)}
              className="sheet w-full text-left active:scale-[0.99] transition-transform hover:shadow-paper-lift"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-semibold text-ink truncate">
                    {r.title}
                  </h3>
                  <p className="font-mono text-xs text-ink-faint mt-0.5">
                    {formatDate(r.createdAt)} · {formatDuration(r.duration)}
                  </p>
                </div>
                <span className="grid place-items-center w-9 h-9 rounded-full bg-terracota/12 text-terracota text-base shrink-0">
                  ▶
                </span>
              </div>

              {/* Trazo de pigmento: silueta de los acordes detectados. */}
              <div className="flex items-end gap-[3px] h-10">
                {r.chords.slice(0, 32).map((c, i) => {
                  const palette = ['bg-terracota', 'bg-teal', 'bg-cobalto', 'bg-mostaza', 'bg-oliva']
                  const color = c.quality === 'minor' ? 'bg-cobalto' : palette[i % palette.length]
                  return (
                    <span
                      key={i}
                      className={`${color} rounded-full w-[5px]`}
                      style={{ height: `${20 + (Math.round(c.confidence * 100) % 60)}%`, opacity: 0.7 }}
                    />
                  )
                })}
                {r.chords.length === 0 && (
                  <span className="text-xs text-ink-faint font-mono">sin acordes</span>
                )}
              </div>

              {(r.key || r.tempo) && (
                <div className="flex gap-2 mt-3">
                  {r.key && (
                    <span className="pigment text-xs px-2.5 py-1 bg-magenta/12 text-magenta">
                      {r.key}
                    </span>
                  )}
                  {r.tempo && (
                    <span className="pigment text-xs px-2.5 py-1 bg-cobalto/12 text-cobalto">
                      {r.tempo} BPM
                    </span>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
