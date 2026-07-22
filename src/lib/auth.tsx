import { useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { AuthContext, type Session } from './adminAuthContext'

const STORAGE_KEY = 'wedding_admin_session'

function loadSession(): Session | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession())

  useEffect(() => {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [session])

  const login = async (email: string, password: string) => {
    const data = await api.post<Session>('/admin/login', { email, password })
    setSession(data)
  }

  const logout = () => {
    if (session) {
      api.post('/admin/logout', undefined, session.token).catch(() => {})
    }
    setSession(null)
  }

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>
}
