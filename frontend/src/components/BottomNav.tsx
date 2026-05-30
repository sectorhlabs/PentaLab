import { NavLink } from 'react-router-dom'
import { Mic, Library, Plus, Guitar, Settings } from 'lucide-react'

const navItems = [
  { to: '/', icon: Mic, label: 'Grabar' },
  { to: '/library', icon: Library, label: 'Láminas' },
  { to: '/create', icon: Plus, label: 'Crear', center: true },
  { to: '/practice', icon: Guitar, label: 'Tocar' },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
]

export default function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 flex items-center justify-around
                 bg-paper-deep/95 backdrop-blur-sm border-t border-paper-line
                 pb-[env(safe-area-inset-bottom)]"
      style={{ height: 'calc(66px + env(safe-area-inset-bottom))' }}
    >
      {navItems.map(({ to, icon: Icon, label, center }) =>
        center ? (
          <NavLink
            key={to}
            to={to}
            aria-label={label}
            className="grid place-items-center w-14 h-14 -mt-6 rounded-full bg-terracota text-paper
                       shadow-[0_4px_14px_oklch(0.62_0.15_45_/_0.4)] active:scale-95 transition-transform"
          >
            <Icon className="w-6 h-6" strokeWidth={2.2} />
          </NavLink>
        ) : (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 min-w-[60px] transition-colors duration-200
               ${isActive ? 'text-terracota' : 'text-ink-faint'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="w-[22px] h-[22px]" strokeWidth={isActive ? 2.4 : 1.8} />
                <span className="text-[10px] font-medium">{label}</span>
                <span
                  className={`w-1 h-1 rounded-full bg-terracota transition-opacity duration-200
                             ${isActive ? 'opacity-100' : 'opacity-0'}`}
                />
              </>
            )}
          </NavLink>
        )
      )}
    </nav>
  )
}
