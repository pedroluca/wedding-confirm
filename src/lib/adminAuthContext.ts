import { createContext, useContext } from 'react'
import type { AdminInfo } from '../types'

export type Session = { token: string; admin: AdminInfo }

export type AuthContextValue = {
  session: Session | null
  login: (email: string, password: string) => Promise<Session>
  /** Sai do painel. Durante "entrar como admin", volta pro super em vez de deslogar. */
  logout: () => void
  /** Sessão do super-admin guardada enquanto ele está no painel de um evento. */
  superSession: Session | null
  /** Troca pra sessão do painel do evento, guardando a do super-admin. */
  startImpersonation: (eventSession: Session) => void
  /** Encerra a sessão do evento e volta pra do super-admin. Devolve o id do evento. */
  stopImpersonation: () => number | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth deve ser usado dentro de <AdminAuthProvider>.')
  }
  return ctx
}
