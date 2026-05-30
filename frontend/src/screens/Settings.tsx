import { useState } from 'react'
import { User, HelpCircle, Server, Info, LogOut, Download, Share, Check } from 'lucide-react'
import { getBackendUrl, setBackendUrl, isBackendAvailable } from '../services/api'
import { useSettingsStore } from '../stores/settingsStore'
import { usePwaInstall } from '../hooks/usePwaInstall'
import { Wordmark, Signature } from '../components/decor'
import { BottomSheet } from '../components/BottomSheet'

type ConnState = 'idle' | 'checking' | 'ok' | 'fail'

export default function SettingsPage() {
  const artistName = useSettingsStore((s) => s.artistName)
  const setArtistName = useSettingsStore((s) => s.setArtistName)

  const [url, setUrl] = useState(getBackendUrl())
  const [conn, setConn] = useState<ConnState>('idle')
  const [showInfo, setShowInfo] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showInstall, setShowInstall] = useState(false)

  const { installed, canInstall, isIOS, promptInstall } = usePwaInstall()
  // Mostramos la opción siempre que no esté ya instalada. Si el navegador no
  // ofrece el prompt nativo, abrimos instrucciones según la plataforma.
  const showInstallSection = !installed

  const logout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }) } finally { location.reload() }
  }

  const save = (v: string) => { setUrl(v); setBackendUrl(v); setConn('idle') }
  const test = async () => { setConn('checking'); setConn((await isBackendAvailable()) ? 'ok' : 'fail') }

  const label: Record<ConnState, string> = { idle: '', checking: 'Comprobando…', ok: '✓ Conectado', fail: '✗ Sin respuesta' }
  const color: Record<ConnState, string> = { idle: '', checking: 'text-ink-faint', ok: 'text-oliva', fail: 'text-magenta' }

  const displayName = artistName.trim() || 'artista'

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-[2rem] leading-none font-semibold text-ink">Ajustes</h1>
      </header>

      {/* Artista */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-ink-faint uppercase tracking-[0.12em] mb-2 px-1">Artista</h2>
        <div className="sheet space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-terracota/[0.12] text-terracota shrink-0">
              <User className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <p className="text-ink text-sm font-medium">Tu nombre</p>
              <p className="text-xs text-ink-faint">Así te saluda PentaLab en tu cuaderno.</p>
            </div>
          </div>
          <input
            type="text"
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
            placeholder="Tu nombre"
            maxLength={40}
            className="w-full bg-paper border border-paper-line edge-painted-sm px-3 py-2.5 font-display text-lg text-ink placeholder:text-ink-faint focus:outline-none focus:border-terracota/50"
          />
        </div>
      </section>

      {/* Backend de análisis */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-ink-faint uppercase tracking-[0.12em] mb-2 px-1">Análisis avanzado</h2>
        <div className="sheet space-y-3">
          <div className="flex items-center gap-3">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-cobalto/[0.12] text-cobalto shrink-0">
              <Server className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-ink text-sm font-medium">Servidor de acordes</p>
              <p className="text-xs text-ink-faint">Opcional. Si no responde, se analiza en el dispositivo.</p>
            </div>
            <button
              onClick={() => setShowInfo(true)}
              className="grid place-items-center w-9 h-9 rounded-full text-ink-faint hover:text-cobalto hover:bg-cobalto/10 shrink-0 touch-target"
              aria-label="Qué es esto"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
          <input
            type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false}
            placeholder="https://tu-tunel.trycloudflare.com"
            value={url}
            onChange={(e) => save(e.target.value)}
            className="w-full bg-paper border border-paper-line edge-painted-sm px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-terracota/50"
          />
          <p className="text-xs text-ink-faint leading-relaxed">
            Pega aquí la dirección de tu servidor de acordes (por ejemplo, el túnel que te
            da Cloudflare). Si lo dejas vacío, PentaLab analiza en el dispositivo.
          </p>
          <div className="flex items-center justify-between">
            <span className={`text-xs ${color[conn]}`}>{label[conn]}</span>
            <button onClick={test} className="btn btn-secondary text-sm px-4 py-2">Probar conexión</button>
          </div>
        </div>
      </section>

      {/* Instalar en el dispositivo */}
      {showInstallSection && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-ink-faint uppercase tracking-[0.12em] mb-2 px-1">Pantalla de inicio</h2>
          <div className="sheet !p-0 overflow-hidden">
            <button
              onClick={() => (canInstall ? promptInstall() : setShowInstall(true))}
              className="w-full flex items-center gap-4 p-4 touch-target text-left"
            >
              <span className="grid place-items-center w-9 h-9 rounded-full bg-terracota/[0.12] text-terracota shrink-0">
                <Download className="w-4 h-4" />
              </span>
              <span className="flex-1">
                <span className="block text-ink">Instalar PentaLab</span>
                <span className="block text-xs text-ink-faint mt-0.5">
                  {canInstall ? 'Añádela como app a tu pantalla de inicio' : 'Cómo añadirla a tu pantalla de inicio'}
                </span>
              </span>
            </button>
          </div>
        </section>
      )}

      {/* Ayuda */}
      <section>
        <h2 className="text-xs font-semibold text-ink-faint uppercase tracking-[0.12em] mb-2 px-1">Ayuda</h2>
        <div className="sheet !p-0 overflow-hidden">
          <button
            onClick={() => setShowAbout(true)}
            className="w-full flex items-center gap-4 p-4 touch-target text-left"
          >
            <span className="grid place-items-center w-9 h-9 rounded-full bg-ink/[0.06] text-ink-soft">
              <HelpCircle className="w-4 h-4" />
            </span>
            <span className="flex-1 text-ink">Sobre PentaLab</span>
          </button>
          {import.meta.env.PROD && (
            <button
              onClick={logout}
              className="w-full flex items-center gap-4 p-4 touch-target text-left border-t border-paper-line"
            >
              <span className="grid place-items-center w-9 h-9 rounded-full bg-magenta/[0.12] text-magenta">
                <LogOut className="w-4 h-4" />
              </span>
              <span className="flex-1 text-ink">Cerrar sesión</span>
            </button>
          )}
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 pt-10">
        <Wordmark className="text-ink-soft text-sm" />
        <Signature name={displayName} className="mt-1" />
      </div>

      <BottomSheet open={showInfo} onClose={() => setShowInfo(false)} title="Análisis avanzado">
        <div className="space-y-4 text-sm text-ink-soft leading-relaxed">
          <p>
            PentaLab detecta los acordes <strong className="text-ink font-semibold">en tu propio
            teléfono</strong>, sin internet. Funciona siempre, sin configurar nada.
          </p>
          <p>
            Si quieres <strong className="text-ink font-semibold">aún más precisión</strong>, puedes
            conectar un “servidor de acordes”: un pequeño programa que corre en tu ordenador y
            analiza con más potencia.
          </p>

          <div className="sheet bg-paper-deep space-y-2">
            <p className="text-ink font-medium">¿Qué pongo en el campo?</p>
            <p>
              La <strong className="text-ink font-semibold">dirección (URL)</strong> de ese servidor.
              Lo normal es exponerlo con un túnel gratuito y pegar aquí la dirección que te da, algo como:
            </p>
            <p className="font-mono text-xs text-cobalto break-all bg-paper edge-painted-sm px-2.5 py-1.5">
              https://xxxx.trycloudflare.com
            </p>
          </div>

          <p>
            Si lo dejas <strong className="text-ink font-semibold">vacío</strong> o el servidor no
            responde, PentaLab usa el análisis del teléfono automáticamente. No se rompe nada.
          </p>
          <p className="text-xs text-ink-faint">
            Las instrucciones para montar el servidor están en el archivo
            <span className="font-mono"> backend/README.md</span> del proyecto.
          </p>
        </div>
        <button onClick={() => setShowInfo(false)} className="btn btn-primary w-full mt-6">
          Entendido
        </button>
      </BottomSheet>

      <BottomSheet open={showAbout} onClose={() => setShowAbout(false)} title="">
        <div className="flex flex-col items-center text-center -mt-2">
          <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-20 w-auto mb-4" />
          <h3 className="font-display text-2xl font-semibold text-ink">PentaLab</h3>
          <p className="text-ink-soft mt-1">Tu canción, tu ritmo, tus acordes.</p>

          <div className="space-y-2 text-sm text-ink-soft leading-relaxed mt-5 max-w-[300px]">
            <p>Graba una melodía y PentaLab le pone color: acordes, tono y compás.</p>
            <p>Funciona sin conexión. Todo se queda en tu dispositivo.</p>
          </div>

          <button onClick={() => setShowAbout(false)} className="btn btn-secondary w-full mt-8">
            Cerrar
          </button>
        </div>
      </BottomSheet>

      <BottomSheet open={showInstall} onClose={() => setShowInstall(false)} title="Añadir a la pantalla de inicio">
        <div className="space-y-4 text-sm text-ink-soft leading-relaxed">
          {isIOS ? (
            <>
              <p>En iPhone/iPad la instalación se hace desde <strong className="text-ink font-semibold">Safari</strong> en tres pasos:</p>
              <ol className="space-y-3">
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota font-mono text-xs shrink-0">1</span>
                  <span className="flex-1">Pulsa el botón <strong className="text-ink font-semibold">Compartir</strong>.</span>
                  <Share className="w-5 h-5 text-cobalto shrink-0" />
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota font-mono text-xs shrink-0">2</span>
                  <span className="flex-1">Elige <strong className="text-ink font-semibold">«Añadir a pantalla de inicio»</strong>.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota font-mono text-xs shrink-0">3</span>
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
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota font-mono text-xs shrink-0">1</span>
                  <span className="flex-1">Abre el menú <strong className="text-ink font-semibold">⋮</strong> (o el icono <strong className="text-ink font-semibold">⊕</strong> en la barra de direcciones).</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota font-mono text-xs shrink-0">2</span>
                  <span className="flex-1">Pulsa <strong className="text-ink font-semibold">«Instalar app»</strong> o <strong className="text-ink font-semibold">«Añadir a pantalla de inicio»</strong>.</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="grid place-items-center w-7 h-7 rounded-full bg-terracota/[0.12] text-terracota font-mono text-xs shrink-0">3</span>
                  <span className="flex-1">Confirma.</span>
                  <Check className="w-5 h-5 text-oliva shrink-0" />
                </li>
              </ol>
              <p className="text-xs text-ink-faint">
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
