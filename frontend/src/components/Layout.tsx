import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="flex flex-col min-h-[100dvh] max-w-[100vw] overflow-x-hidden">
      <main
        className="flex-1 overflow-y-auto px-5 pt-6"
        style={{ paddingBottom: 'calc(86px + env(safe-area-inset-bottom))', overscrollBehavior: 'contain' }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
