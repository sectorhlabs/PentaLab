import { useState, useRef, type FormEvent } from 'react'
import { PaintBlob } from '../components/decor'

export default function Login({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!value || loading) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ passcode: value }),
      })
      if (res.ok) {
        onUnlock()
        return
      }
      setError(true)
      setValue('')
      inputRef.current?.focus()
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center px-7 overflow-hidden">
      <PaintBlob
        variant={1}
        className="absolute -top-16 -right-10 w-64 h-64 text-terracota/[0.12] pointer-events-none"
      />
      <PaintBlob
        variant={2}
        className="absolute -bottom-20 -left-12 w-72 h-72 text-cobalto/[0.10] pointer-events-none"
      />

      <div className="relative w-full max-w-[340px] flex flex-col items-center text-center">
        <img src="/logo-mark.png" alt="" aria-hidden="true" className="h-24 w-auto mb-5" />
        <h1 className="font-display text-3xl font-semibold text-ink">PentaLab</h1>
        <p className="text-ink-soft mt-1.5">Tu cuaderno privado</p>

        <form onSubmit={submit} className="w-full mt-9 flex flex-col gap-3">
          <input
            ref={inputRef}
            type="password"
            inputMode="text"
            autoFocus
            autoComplete="current-password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              if (error) setError(false)
            }}
            placeholder="Tu clave"
            aria-label="Clave de acceso"
            aria-invalid={error}
            className={`edge-painted bg-paper-deep text-ink text-center font-mono tracking-wider
              px-5 py-3.5 outline-none transition-colors border
              ${error ? 'border-magenta' : 'border-paper-line focus:border-terracota'}`}
          />

          {error && (
            <p className="text-sm text-magenta animate-fade-in">Clave incorrecta. Inténtalo otra vez.</p>
          )}

          <button
            type="submit"
            disabled={!value || loading}
            className="btn btn-primary w-full mt-1"
          >
            {loading ? 'Comprobando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
