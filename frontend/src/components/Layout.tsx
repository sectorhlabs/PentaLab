import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

function ScreenFallback() {
  return (
    <div className="grid place-items-center py-24">
      <div className="w-8 h-8 rounded-full border-2 border-paper-line border-t-terracota animate-spin" />
    </div>
  )
}

export default function Layout() {
  return (
    // Altura fija al viewport + overflow oculto: el scroll lo hace el <main>.
    <div className="flex flex-col h-[100dvh] overflow-hidden">
      <main
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 1.25rem)',
          paddingBottom: 'calc(86px + env(safe-area-inset-bottom))',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <Suspense fallback={<ScreenFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}
