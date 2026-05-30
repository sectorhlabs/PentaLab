// Elementos decorativos propios: manchas de acuarela, marca y firma.
// Hechos a mano (SVG), no librerías genéricas.

interface BlobProps {
  className?: string
  /** Variante de forma (0-2) para no repetir la misma mancha. */
  variant?: 0 | 1 | 2
}

const BLOB_PATHS = [
  'M40,-52C52,-43,61,-30,66,-15C71,1,72,18,64,30C56,43,40,50,24,57C7,64,-11,71,-28,66C-46,61,-62,44,-69,25C-76,5,-73,-17,-63,-33C-53,-49,-36,-58,-19,-63C-2,-68,16,-69,40,-52Z',
  'M46,-56C58,-46,64,-29,67,-12C70,5,69,23,60,36C51,49,34,57,16,62C-2,67,-22,69,-37,61C-53,52,-64,33,-69,13C-74,-8,-72,-30,-60,-44C-48,-58,-26,-64,-6,-65C14,-66,34,-66,46,-56Z',
  'M42,-54C53,-45,58,-28,63,-11C68,6,73,24,66,37C58,51,38,59,19,63C0,67,-19,66,-36,58C-53,50,-67,34,-71,16C-76,-3,-71,-24,-59,-39C-47,-54,-28,-62,-9,-64C9,-66,31,-63,42,-54Z',
]

/** Mancha de acuarela difusa. Colorea con `text-<color>`. */
export function PaintBlob({ className = '', variant = 0 }: BlobProps) {
  return (
    <svg
      viewBox="-100 -100 200 200"
      className={className}
      aria-hidden="true"
      style={{ filter: 'blur(8px)' }}
    >
      <path d={BLOB_PATHS[variant]} fill="currentColor" />
    </svg>
  )
}

/** Marca de la app. Fraunces + punto de pigmento. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display inline-flex items-baseline gap-1 ${className}`}>
      <span className="font-semibold tracking-tight">PentaLab</span>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-terracota translate-y-[-2px]" />
    </span>
  )
}

/** Firma de la artista, como en sus cuadros (abajo a la derecha). */
export function Signature({ className = '' }: { className?: string }) {
  return (
    <span
      className={`font-display italic text-ink-faint tracking-[0.3em] text-xs ${className}`}
    >
      mekala
    </span>
  )
}
