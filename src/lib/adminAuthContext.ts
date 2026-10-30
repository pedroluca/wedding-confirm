import { createContext, useContext } from 'react'
import type { AccountEvent, AdminInfo } from '../types'

/** Resposta do login, de "entrar como admin", de /admin/me e da troca de evento. */
export type SessionPayload = { admin: AdminInfo; events?: AccountEvent[] }

/** events fica ausente em sessões salvas antes de a conta poder ter vários eventos. */
export type Session = SessionPayload & { token: string }

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
  /** Troca o evento ativo da sessão, entre os eventos da conta. */
  switchEvent: (eventId: number) => Promise<void>
  /**
   * Busca de novo a conta e a lista de eventos da sessão com este token (um
   * evento novo ligado à conta aparece sem entrar de novo).
   */
  refreshSession: (token: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAdminAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth deve ser usado dentro de <AdminAuthProvider>.')
  }
  return ctx
}

/** Sessão de super-admin? As salvas antes de existir is_super usam o sinal antigo. */
export function isSuperSession(session: Session): boolean {
  return session.admin.is_super ?? session.admin.event_id === null
}

/** Para onde vai quem acabou de entrar: super, escolher evento ou o painel. */
export function sessionHomePath(session: Session): string {
  if (isSuperSession(session)) return '/super'
  return (session.events?.length ?? 0) > 1 ? '/admin/eventos' : '/admin'
}
