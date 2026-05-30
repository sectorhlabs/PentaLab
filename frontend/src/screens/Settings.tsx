import { useState } from 'react'
import { User, Mic, Moon, HelpCircle, Info, ChevronRight, Server } from 'lucide-react'
import { getBackendUrl, setBackendUrl, isBackendAvailable } from '../services/api'

const settingsGroups: { title: string; items: { icon: typeof User; label: string; value?: string }[] }[] = [
  { title: 'Cuenta', items: [{ icon: User, label: 'Perfil', value: 'mate0s' }] },
  { title: 'Grabación', items: [{ icon: Mic, label: 'Calidad de audio', value: 'Alta' }] },
  { title: 'Apariencia', items: [{ icon: Moon, label: 'Tema', value: 'Oscuro' }] },
  {
    title: 'Ayuda',
    items: [
      { icon: HelpCircle, label: 'Centro de ayuda' },
      { icon: Info, label: 'Acerca de MyMusic' },
    ],
  },
]

type ConnState = 'idle' | 'checking' | 'ok' | 'fail'

export default function SettingsPage() {
  const [url, setUrl] = useState(getBackendUrl())
  const [conn, setConn] = useState<ConnState>('idle')

  const save = (value: string) => {
    setUrl(value)
    setBackendUrl(value)
    setConn('idle')
  }

  const test = async () => {
    setConn('checking')
    setConn((await isBackendAvailable()) ? 'ok' : 'fail')
  }

  const connLabel: Record<ConnState, string> = {
    idle: '',
    checking: 'Comprobando…',
    ok: '✓ Conectado',
    fail: '✗ No disponible',
  }
  const connColor: Record<ConnState, string> = {
    idle: '',
    checking: 'text-text-muted',
    ok: 'text-accent-success',
    fail: 'text-red-400',
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Ajustes</h1>
      </header>

      {/* Backend de análisis (precisión / túnel) */}
      <div>
        <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 px-1">
          Análisis avanzado
        </h2>
        <div className="bg-bg-elevated rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-surface-glass flex items-center justify-center">
              <Server className="w-4 h-4 text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-text-primary text-sm">Servidor de acordes</p>
              <p className="text-xs text-text-muted">
                Opcional: mayor precisión. Si está vacío o no responde, se usa el análisis del dispositivo.
              </p>
            </div>
          </div>
          <input
            type="url"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="https://tu-tunel.trycloudflare.com"
            value={url}
            onChange={(e) => save(e.target.value)}
            className="w-full bg-bg-secondary rounded-lg px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary/50"
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${connColor[conn]}`}>{connLabel[conn]}</span>
            <button onClick={test} className="btn btn-secondary text-sm px-4 py-2">
              Probar conexión
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {settingsGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-2 px-1">
              {group.title}
            </h2>
            <div className="bg-bg-elevated rounded-xl divide-y divide-white/5">
              {group.items.map((item) => (
                <button
                  key={item.label}
                  className="w-full flex items-center gap-4 p-4 touch-target text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-glass flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-text-secondary" />
                  </div>
                  <span className="flex-1 text-text-primary">{item.label}</span>
                  {item.value && <span className="text-sm text-text-muted">{item.value}</span>}
                  <ChevronRight className="w-4 h-4 text-text-muted" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="text-center pt-8">
        <p className="text-xs text-text-muted">MyMusic v1.0.0</p>
        <p className="text-xs text-text-muted mt-1">Hecho con ❤️ para músicos</p>
      </div>
    </div>
  )
}
