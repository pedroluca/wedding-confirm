import { createContext, useContext } from 'react'
import type { AdminInfo } from '../types'

export type Session = { token: string; admin: AdminInfo }

export type AuthContextValue = {
  session: Session | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth deve ser usado dentro de <AdminAuthProvider>.')
  }
  return ctx
}
