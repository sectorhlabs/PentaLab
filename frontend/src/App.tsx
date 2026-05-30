import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './screens/Home'
import Library from './screens/Library'
import Create from './screens/Create'
import Practice from './screens/Practice'
import Settings from './screens/Settings'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="library" element={<Library />} />
        <Route path="create" element={<Create />} />
        <Route path="practice" element={<Practice />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App