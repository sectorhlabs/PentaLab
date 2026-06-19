import { useState } from 'react'
import { User, HelpCircle, LogOut, Download, Share, Check } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { Wordmark, Signature } from '../components/decor'
import { BottomSheet } from '../components/BottomSheet'

export default function SettingsPage() {
  const artistName = useSettingsStore((s) => s.artistName)
  const setArtistName = useSettingsStore((s) => s.setArtistName)

  const [showAbout, setShowAbout] = useState(false)
  const [showInstall, setShowInstall] = useState(false)

  const { installed, canInstall, isIOS, promptInstall } = usePwaInstall()
  // Mostramos la opción siempre que no esté ya instalada. Si el navegador no
  // ofrece el prompt nativo, abrimos instrucciones según la plataforma.
  const showInstallSection = !installed

  const logout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }) } finally { location.reload() }
  }

  const displayName = artistName.trim() || 'artista'

  return (
    <div>
      <header className="mb-6">
        <h1 className="t-h1 text-ink">Ajustes</h1>
      </header>

      {/* Artista */}
      <section className="mb-6">
        <h2 className="t-eyebrow text-ink-faint mb-2 px-1">Artista</h2>
        <div className="sheet space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-terracota/[0.12] text-terracota shrink-0">
              <User className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="t-label text-ink">Tu nombre</p>
              <p className="t-meta text-ink-faint">Así te saluda PentaLab en tu cuaderno.</p>
            </div>
          </div>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Tu nombre"
            aria-label="Tu nombre de artista"
            maxLength={40}
            className="field px-3 py-2.5 t-title"
          />
        </div>
      </section>

      {/* Instalar en el dispositivo */}
      {showInstallSection && (
        <section className="mb-6">
          <h2 className="t-eyebrow text-ink-faint mb-2 px-1">Pantalla de inicio</h2>
          <div className="sheet !p-0 overflow-hidden">
            <button
              onClick={() => (canInstall ? promptInstall() : setShowInstall(true))}
              className="w-full flex items-center gap-4 p-4 touch-target text-left"
            >
              <span className="grid place-items-center w-9 h-9 rounded-full bg-terracota/[0.12] text-terracota shrink-0">
                <Download className="w-4 h-4" />
              </span>
              <span className="flex-1">
                <span className="block t-label text-ink">Instalar PentaLab</span>
                <span className="block t-meta text-ink-faint mt-0.5">
                  {canInstall ? 'Añádela como app a tu pantalla de inicio' : 'Cómo añadirla a tu pantalla de inicio'}
                </span>
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Ayuda */}
      <section>
        <h2 className="t-eyebrow text-ink-faint mb-2 px-1">Ayuda</h2>
        <div className="sheet !p-0 overflow-hidden">
          <button
            onClick={() => setShowAbout(true)}
            className="w-full flex items-center gap-4 p-4 touch-target text-left"
          >
            <span className="grid place-items-center w-9 h-9 rounded-full bg-ink/[0.06] text-ink-soft">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="flex-1 t-label text-ink">Sobre PentaLab</span>
          </button>
          {import.meta.env.PROD && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 p-4 touch-target text-left border-t border-paper-line"
            >
              <span className="grid place-items-center w-9 h-9 rounded-full bg-magenta/[0.12] text-magenta">
                <LogOut className="w-4 h-4" />
              </span>
              <span className="flex-1 t-label text-ink">Cerrar sesión</span>
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 pt-10">
        <Wordmark className="text-ink-soft text-sm" />
        <Signature name={displayName} className="mt-1" />
      </div>

      <BottomSheet open={showAbout} onClose={() => setShowAbout(false)} title="">
        <div className="flex flex-col items-center text-center -mt-2">
          <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-20 w-auto mb-4" />
          <h3 className="t-h2 text-ink">PentaLab</h3>
          <p className="t-body text-ink-soft mt-1">Tu canción, tu ritmo, tus acordes.</p>

          <div className="space-y-2 t-body text-ink-soft mt-5 max-w-[300px]">
            <p>Graba una melodía y PentaLab le pone color: acordes, tono y compás.</p>
            <p>Funciona sin conexión. Todo se queda en tu dispositivo.</p>
          </div>

          <div className="flex items-end justify-center gap-5 mt-7 opacity-90" aria-hidden="true">
            {['guitarra', 'micro', 'metronomo', 'diapason'].map((name) => (
              <img key={name} src={`/icon-${name}.webp`} alt="" className="h-12 w-auto select-none pointer-events-none" />
            ))}
          </div>

          <button onClick={() => setShowAbout(false)} className="btn btn-secondary w-full mt-8">
            Cerrar
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={showInstall} onClose={() => setShowInstall(false)} title="Añadir a la pantalla de inicio">
        <div className="space-y-4 t-body text-ink-soft">
          {isIOS ? (
            <>
              <p>En iPhone/iPad la instalación se hace desde <strong className="text-ink font-semibold">Safari</strong> en tres pasos:</p>
              <ol className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota t-data text-caption shrink-0">1</span>
                  <span className="flex-1">Pulsa el botón <strong className="text-ink font-semibold">Compartir</strong>.</span>
                  <Share className="w-5 h-5 text-cobalto shrink-0" />
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota t-data text-caption shrink-0">2</span>
                  <span className="flex-1">Elige <strong className="text-ink font-semibold">«Añadir a pantalla de inicio»</strong>.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota t-data text-caption shrink-0">3</span>
                  <span className="flex-1">Confirma con <strong className="text-ink font-semibold">«Añadir»</strong>.</span>
                  <Check className="w-5 h-5 text-oliva shrink-0" />
                </li>
              </ol>
            </>
          ) : (
            <>
              <p>Desde <strong className="text-ink font-semibold">Chrome</strong> (Android u ordenador):</p>
              <ol className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota t-data text-caption shrink-0">1</span>
                  <span className="flex-1">Abre el menú <strong className="text-ink font-semibold">⋮</strong> (o el icono <strong className="text-ink font-semibold">⊕</strong> en la barra de direcciones).</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota t-data text-caption shrink-0">2</span>
                  <span className="flex-1">Pulsa <strong className="text-ink font-semibold">«Instalar app»</strong> o <strong className="text-ink font-semibold">«Añadir a pantalla de inicio»</strong>.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota t-data text-caption shrink-0">3</span>
                  <span className="flex-1">Confirma.</span>
                  <Check className="w-5 h-5 text-oliva shrink-0" />
                </li>
              </ol>
              <p className="t-meta text-ink-faint">
                Si no aparece la opción, prueba a usar la app un momento y recargar: el navegador la ofrece tras un poco de uso. En Firefox/Safari de escritorio no hay instalación.
              </p>
            </>
          )}
        </div>
        <button onClick={() => setShowInstall(false)} className="btn btn-primary w-full mt-6">
          Entendido
        </button>
      </BottomSheet>
    </div>
  )
}
