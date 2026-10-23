import { useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { AuthContext, type Session } from './adminAuthContext'

const STORAGE_KEY = 'wedding_admin_session'
// Sessão do super-admin enquanto ele está no painel de um evento ("entrar como admin").
const SUPER_STORAGE_KEY = 'wedding_admin_super_session'

function loadSession(key: string): Session | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Session
  } catch {
    return null
  }
}

function storeSession(key: string, session: Session | null) {
  if (session) {
    localStorage.setItem(key, JSON.stringify(session))
  } else {
    localStorage.removeItem(key)
  }
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => loadSession(STORAGE_KEY))
  const [superSession, setSuperSession] = useState<Session | null>(() => loadSession(SUPER_STORAGE_KEY))

  useEffect(() => storeSession(STORAGE_KEY, session), [session])
  useEffect(() => storeSession(SUPER_STORAGE_KEY, superSession), [superSession])

  const login = async (email: string, password: string) => {
    const data = await api.post<Session>('/admin/login', { email, password })
    setSuperSession(null)
    setSession(data)
    return data
  }

  const startImpersonation = (eventSession: Session) => {
    setSuperSession(session)
    setSession(eventSession)
  }

  const stopImpersonation = () => {
    if (!superSession) return null
    const eventId = session?.admin.event_id ?? null
    if (session) {
      api.post('/admin/logout', undefined, session.token).catch(() => {})
    }
    setSession(superSession)
    setSuperSession(null)
    return eventId
  }

  const logout = () => {
    if (superSession) {
      stopImpersonation()
      return
    }
    if (session) {
      api.post('/admin/logout', undefined, session.token).catch(() => {})
    }
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, login, logout, superSession, startImpersonation, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  )
}
