import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Chat from './components/Chat'
import Dashboard from './components/Dashboard'
import PromptScanner from './components/PromptScanner'
import ThreatHistory from './components/ThreatHistory'
import Login from './components/Login'
import { useAuth } from './context/AuthContext'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedLayout />}>
        <Route path="/" element={<Chat />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/scanner" element={<PromptScanner />} />
        <Route path="/history" element={<ThreatHistory />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

/**
 * Gates the authenticated app shell. While Firebase resolves the session we
 * show a spinner; unauthenticated users are sent to /login (remembering where
 * they were headed). When Firebase isn't configured, auth is bypassed so the
 * app still runs in local development.
 */
function ProtectedLayout() {
  const { user, loading, isAuthEnabled } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <Loader2 className="h-6 w-6 animate-spin text-risk-low" />
      </div>
    )
  }

  if (isAuthEnabled && !user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return (
    <div className="min-h-screen bg-ink-950">
      <Sidebar />
      {/* Offset for desktop sidebar (md+) and mobile bottom nav padding */}
      <main className="px-4 pb-24 pt-6 md:ml-64 md:px-8 md:pb-8">
        <Outlet />
      </main>
    </div>
  )
}
