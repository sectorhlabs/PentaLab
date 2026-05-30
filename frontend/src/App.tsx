import { lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'

// Cada pantalla en su propio chunk: el arranque solo carga el Cuaderno.
const Home = lazy(() => import('./screens/Home'))
const Create = lazy(() => import('./screens/Create'))
const Practice = lazy(() => import('./screens/Practice'))
const Settings = lazy(() => import('./screens/Settings'))

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="create" element={<Create />} />
        <Route path="practice" element={<Practice />} />
        <Route path="settings" element={<Settings />} />
        {/* La antigua biblioteca se fusionó con el cuaderno (inicio). */}
        <Route path="library" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
