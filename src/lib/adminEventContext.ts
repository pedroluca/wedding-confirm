import { createContext, useContext } from 'react'
import type { AdminEvent } from '../types'

export const AdminEventContext = createContext<AdminEvent | null>(null)

export function useAdminEvent(): AdminEvent {
  const ctx = useContext(AdminEventContext)
  if (!ctx) {
    throw new Error('useAdminEvent deve ser usado dentro de <AdminLayout>.')
  }
  return ctx
}
