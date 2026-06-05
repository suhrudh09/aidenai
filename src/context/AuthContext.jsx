import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { auth, isFirebaseConfigured } from '../services/firebase'

const AuthContext = createContext(null)

// When Firebase isn't configured we fall back to a local, browser-only auth
// store so the login/signup flow still works in development. This is NOT
// secure (passwords live in localStorage in plain text) — it exists purely so
// the UI is usable without a Firebase project. Real Firebase auth takes over
// automatically once env vars are present.
const USING_DEMO_AUTH = !isFirebaseConfigured
const DEMO_USERS_KEY = 'guardrail_demo_users'
const DEMO_SESSION_KEY = 'guardrail_demo_session'

function readJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

/** Build an Error carrying a Firebase-style `code` so the UI maps it to a message. */
function authError(code) {
  const err = new Error(code)
  err.code = code
  return err
}

const demoAuth = {
  signup({ name, email, password }) {
    const users = readJSON(DEMO_USERS_KEY, {})
    const key = email.toLowerCase()
    if (users[key]) throw authError('auth/email-already-in-use')
    if (!password || password.length < 6) throw authError('auth/weak-password')
    users[key] = { email, displayName: name || '', password }
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users))
    const user = { email, displayName: name || '' }
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user))
    return user
  },
  login({ email, password }) {
    const users = readJSON(DEMO_USERS_KEY, {})
    const record = users[email.toLowerCase()]
    if (!record || record.password !== password) {
      throw authError('auth/invalid-credential')
    }
    const user = { email: record.email, displayName: record.displayName }
    localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user))
    return user
  },
  logout() {
    localStorage.removeItem(DEMO_SESSION_KEY)
  },
  currentUser() {
    return readJSON(DEMO_SESSION_KEY, null)
  },
}

/**
 * Provides the current user plus auth actions to the app. Uses Firebase Auth
 * when configured, and a local browser-only fallback otherwise so the login
 * flow remains usable in development.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() =>
    USING_DEMO_AUTH ? demoAuth.currentUser() : null,
  )
  // Only Firebase needs an async resolution step.
  const [loading, setLoading] = useState(isFirebaseConfigured)

  useEffect(() => {
    if (!isFirebaseConfigured) return
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthEnabled: true,
      usingDemoAuth: USING_DEMO_AUTH,

      async signup({ name, email, password }) {
        if (USING_DEMO_AUTH) {
          const u = demoAuth.signup({ name, email, password })
          setUser(u)
          return u
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        if (name) await updateProfile(cred.user, { displayName: name })
        return cred.user
      },

      async login({ email, password }) {
        if (USING_DEMO_AUTH) {
          const u = demoAuth.login({ email, password })
          setUser(u)
          return u
        }
        const cred = await signInWithEmailAndPassword(auth, email, password)
        return cred.user
      },

      async logout() {
        if (USING_DEMO_AUTH) {
          demoAuth.logout()
          setUser(null)
          return
        }
        await signOut(auth)
      },
    }),
    [user, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
