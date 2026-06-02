import { useEffect, useRef, useState, type ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

const CLOSE_THRESHOLD = 110 // px arrastrados hacia abajo para cerrar

/** Panel deslizante desde abajo, estética papel. Arrastrable para cerrar. */
export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const startYRef = useRef<number | null>(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  // Bloquea el scroll del contenido de fondo mientras el panel está abierto,
  // así el gesto no se "escapa" por detrás.
  useEffect(() => {
    if (!open) return
    const main = document.querySelector('main')
    const prev = main?.style.overflow
    if (main) main.style.overflow = 'hidden'
    return () => {
      if (main) main.style.overflow = prev ?? ''
    }
  }, [open])

  if (!open) return null

  const onPointerDown = (e: React.PointerEvent) => {
    startYRef.current = e.clientY
    setDragging(true)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (startYRef.current === null) return
    const d = e.clientY - startYRef.current
    if (d > 0) setDragY(d)
  }
  const onPointerEnd = () => {
    setDragging(false)
    startYRef.current = null
    if (dragY > CLOSE_THRESHOLD) onClose()
    setDragY(0)
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={title || 'Diálogo'}>
      <div
        className="absolute inset-0 bg-ink/40 animate-fade-in"
        style={{ opacity: dragY > 0 ? Math.max(0.15, 1 - dragY / 400) : undefined }}
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 bottom-0 bg-paper rounded-t-[26px] shadow-paper-lift max-h-[88dvh] overflow-y-auto"
        style={{
          transform: dragY ? `translateY(${dragY}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)',
          animation: dragY ? 'none' : undefined,
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="animate-sheet-up">
          {/* Zona de arrastre: asa + cabecera. */}
          <div
            className="px-6 pt-3 pb-4 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <div className="mx-auto w-10 h-1.5 rounded-full bg-paper-line" />
            {title && <h3 className="t-h2 text-ink mt-4">{title}</h3>}
          </div>
          <div className="px-6" style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
