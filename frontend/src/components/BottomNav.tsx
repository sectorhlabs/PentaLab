import { NavLink } from 'react-router-dom'
import { BookOpen, Mic, Guitar, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: BookOpen, label: 'Cuaderno', end: true },
  { to: '/create', icon: Mic, label: 'Crear', accent: true },
  { to: '/practice', icon: Guitar, label: 'Tocar' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
]

export default function BottomNav() {
  return (
    <nav
      className="flex items-stretch justify-around bg-paper-deep border-t border-paper-line
                 pb-[env(safe-area-inset-bottom)]"
      style={{ height: 'calc(64px + env(safe-area-inset-bottom))' }}
    >
      {navItems.map(({ to, icon: Icon, label, end, accent }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 flex-1 transition-colors duration-200
             ${isActive ? (accent ? 'text-terracota' : 'text-terracota') : 'text-ink-faint'}`
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={`grid place-items-center transition-all duration-200
                  ${accent
                    ? 'w-10 h-10 rounded-full bg-terracota text-paper shadow-[0_3px_10px_oklch(0.62_0.15_45_/_0.35)]'
                    : 'w-7 h-7'}`}
              >
                <Icon
                  className={accent ? 'w-5 h-5' : 'w-[22px] h-[22px]'}
                  strokeWidth={accent ? 2.2 : isActive ? 2.4 : 1.8}
                />
              </span>
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
