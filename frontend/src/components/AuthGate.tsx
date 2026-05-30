import { useEffect, useState, type ReactNode } from 'react'
import Login from '../screens/Login'

type Status = 'checking' | 'authed' | 'locked'

/**
 * Candado de acceso. En desarrollo se omite (la máquina local ya es privada).
 * En producción consulta /api/me, que valida la cookie firmada server-side;
 * hasta confirmar, no se monta la app.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>(import.meta.env.DEV ? 'authed' : 'checking')

  useEffect(() => {
    if (import.meta.env.DEV) return
    let alive = true
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d?.authed ? 'authed' : 'locked'))
      .catch(() => alive && setStatus('locked'))
    return () => {
      alive = false
    }
  }, [])

  if (status === 'checking') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-paper-line border-t-terracota animate-spin" />
      </div>
    )
  }

  if (status === 'locked') return <Login onUnlock={() => setStatus('authed')} />

  return <>{children}</>
}
