import { Mic, Palette, Music2 } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { useSettingsStore, useSettingsHydrated } from '../stores/settingsStore'

// Tres tiempos del flujo, en lenguaje de marca. Las clases del chip van
// literales (Tailwind no genera nombres construidos por interpolación).
const BEATS = [
  { Icon: Mic, chip: 'bg-terracota/[0.12] text-terracota', title: 'Graba', text: 'Toca el micro y canta o toca tu melodía.' },
  { Icon: Palette, chip: 'bg-magenta/[0.12] text-magenta', title: 'PentaLab le pone color', text: 'Detecta los acordes, el tono y el tempo por ti.' },
  { Icon: Music2, chip: 'bg-oliva/15 text-oliva', title: 'Practica', text: 'Toca encima con la letra y los acordes sincronizados.' },
]

/** Bienvenida de primer uso. Se muestra una sola vez (flag persistido). */
export default function Onboarding() {
  const hydrated = useSettingsHydrated()
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded)
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding)

  return (
    <BottomSheet open={hydrated && !hasOnboarded} onClose={completeOnboarding} title="Te damos la bienvenida">
      <div className="space-y-5">
        <p className="t-body text-ink-soft">Tu cuaderno para pintar canciones con sonido.</p>

        <ul className="space-y-4">
          {BEATS.map(({ Icon, chip, title, text }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className={`grid place-items-center w-10 h-10 rounded-full shrink-0 ${chip}`}>
                <Icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="t-label text-ink">{title}</p>
                <p className="t-meta text-ink-faint mt-0.5">{text}</p>
              </div>
            </li>
          ))}
        </ul>

        <p className="t-meta text-ink-faint">Todo vive en tu teléfono. Nada se sube a internet.</p>

        <button onClick={completeOnboarding} className="btn btn-primary w-full">Empezar</button>
      </div>
    </BottomSheet>
  )
}
