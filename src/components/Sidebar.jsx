import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare,
  LayoutDashboard,
  ScanSearch,
  History,
  ShieldCheck,
  LogOut,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/', label: 'Chat', icon: MessageSquare, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/scanner', label: 'Scanner', icon: ScanSearch },
  { to: '/history', label: 'History', icon: History },
]

/**
 * Navigation chrome. Renders a fixed sidebar on desktop (md+) and a fixed
 * bottom tab bar on mobile.
 */
export default function Sidebar() {
  const { user, isAuthEnabled, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const displayName = user?.displayName || user?.email || 'Account'
  const initial = displayName.charAt(0).toUpperCase()
  const showAccount = isAuthEnabled && user

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-ink-900 px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2.5 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-risk-low/15">
            <ShieldCheck className="h-5 w-5 text-risk-low" />
          </div>
          <div className="leading-tight">
            <div className="font-semibold text-slate-900">Guardrail</div>
            <div className="text-xs text-slate-600">AI Safety System</div>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-risk-low/10 text-slate-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-slate-200 bg-ink-850 p-3 text-xs text-slate-600">
            Monitoring prompts &amp; responses for unsafe content in real time.
          </div>

          {showAccount && (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 p-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-risk-low/15 text-sm font-semibold text-risk-low">
                {initial}
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <div className="truncate text-sm font-medium text-slate-900">
                  {displayName}
                </div>
                {user?.displayName && (
                  <div className="truncate text-xs text-slate-500">
                    {user.email}
                  </div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-ink-900/95 backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? 'text-risk-low' : 'text-slate-600'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
        {showAccount && (
          <button
            onClick={handleLogout}
            className="flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        )}
      </nav>
    </>
  )
}
