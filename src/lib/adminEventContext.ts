import { createContext, useContext } from 'react'
import type { AdminEvent } from '../types'

export const AdminEventContext = createContext<AdminEvent | null>(null)

/**
 * Atualiza o evento compartilhado pelo AdminLayout (ex: depois de salvar as
 * configurações), pra outras telas do admin não ficarem com dados antigos.
 */
export const AdminEventSetterContext = createContext<((event: AdminEvent) => void) | null>(null)

export function useAdminEvent(): AdminEvent {
  const ctx = useContext(AdminEventContext)
  if (!ctx) {
    throw new Error('useAdminEvent deve ser usado dentro de <AdminLayout>.')
  }
  return ctx
}

export function useSetAdminEvent(): (event: AdminEvent) => void {
  const ctx = useContext(AdminEventSetterContext)
  if (!ctx) {
    throw new Error('useSetAdminEvent deve ser usado dentro de <AdminLayout>.')
  }
  return ctx
}
