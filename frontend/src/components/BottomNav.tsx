import { NavLink } from 'react-router-dom'
import { BookOpen, Mic, Guitar, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: BookOpen, label: 'Cuaderno', end: true },
  { to: '/create', icon: Mic, label: 'Crear', accent: true },
  { to: '/practice', icon: Guitar, label: 'Tocar' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
]

/**
 * Barra flotante tipo "paleta apoyada en el lienzo": tarjeta de papel con borde
 * pintado irregular, despegada de los bordes. La pestaña activa se expande en
 * una pastilla de pigmento (icono + etiqueta en Fraunces); el resto, solo icono.
 * "Crear" lleva un tinte terracota permanente para señalar la acción principal.
 */
export default function BottomNav() {
  return (
    <nav className="px-3 pt-1 pb-[calc(10px+env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-around gap-0.5 bg-paper-deep border border-paper-line shadow-paper-lift edge-painted px-2 py-2">
        {navItems.map(({ to, icon: Icon, label, end, accent }) => (
          <NavLink key={to} to={to} end={end} aria-label={label} className="shrink-0">
            {({ isActive }) => (
              <span
                className={`flex items-center gap-2 min-h-[44px] px-3 transition-[background-color,color] duration-300 ease-out
                  ${isActive ? 'text-terracota' : accent ? 'text-terracota/70' : 'text-ink-faint'}`}
                style={{
                  borderRadius: '16px 13px 15px 14px',
                  backgroundColor: isActive ? 'oklch(0.54 0.15 45 / 0.14)' : 'transparent',
                }}
              >
                <Icon className="w-[22px] h-[22px] shrink-0" strokeWidth={isActive ? 2.3 : 1.9} />
                <span
                  className={`font-display font-semibold text-sm tracking-tight whitespace-nowrap overflow-hidden
                    transition-all duration-300 ease-out
                    ${isActive ? 'max-w-[84px] opacity-100' : 'max-w-0 opacity-0'}`}
                >
                  {label}
                </span>
              </span>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
