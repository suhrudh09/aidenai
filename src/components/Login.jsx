import { useState } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/** Translate a Firebase auth error code into a human-readable message. */
function friendlyError(err) {
  const code = err?.code || ''
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    default:
      return err?.message || 'Something went wrong. Please try again.'
  }
}

export default function Login() {
  const { user, login, signup, usingDemoAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/'

  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Already signed in → bounce to the app.
  if (user) return <Navigate to={from} replace />

  const isSignup = mode === 'signup'

  function switchMode(next) {
    setMode(next)
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      if (isSignup) {
        await signup({ name: name.trim(), email: email.trim(), password })
      } else {
        await login({ email: email.trim(), password })
      }
      navigate(from, { replace: true })
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-risk-low/15">
            <ShieldCheck className="h-6 w-6 text-risk-low" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">Guardrail</h1>
          <p className="mt-1 text-sm text-slate-600">
            {isSignup
              ? 'Create an account to start scanning.'
              : 'Sign in to your AI Safety dashboard.'}
          </p>
        </div>

        <div className="card p-6">
          {/* Mode toggle */}
          <div className="mb-5 inline-flex w-full rounded-xl bg-ink-800 p-1">
            {[
              { value: 'login', label: 'Sign In' },
              { value: 'signup', label: 'Sign Up' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => switchMode(opt.value)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === opt.value
                    ? 'bg-ink-900 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <Field label="Name" icon={User}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  autoComplete="name"
                  className="w-full rounded-xl border border-slate-300 bg-ink-950 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-risk-low/40 focus:outline-none focus:ring-1 focus:ring-risk-low/40"
                />
              </Field>
            )}

            <Field label="Email" icon={Mail}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-300 bg-ink-950 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-risk-low/40 focus:outline-none focus:ring-1 focus:ring-risk-low/40"
              />
            </Field>

            <Field label="Password" icon={Lock}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isSignup ? 'At least 6 characters' : '••••••••'}
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                className="w-full rounded-xl border border-slate-300 bg-ink-950 py-2.5 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-risk-low/40 focus:outline-none focus:ring-1 focus:ring-risk-low/40"
              />
            </Field>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-risk-high/30 bg-risk-high/10 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-risk-low px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          {usingDemoAuth && (
            <p className="mt-4 flex items-start gap-1.5 text-xs text-slate-500">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Demo mode: accounts are stored locally in this browser since
              Firebase isn&apos;t configured. Add your Firebase env vars for real
              authentication.
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          {isSignup ? 'Already have an account?' : 'Need an account?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(isSignup ? 'login' : 'signup')}
            className="font-medium text-risk-low hover:underline"
          >
            {isSignup ? 'Sign in' : 'Sign up'}
          </button>
        </p>
      </div>
    </div>
  )
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </label>
  )
}
