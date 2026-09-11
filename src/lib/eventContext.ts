import { createContext, useContext } from 'react'
import type { PublicEvent } from '../types'

export const EventContext = createContext<PublicEvent | null>(null)

export function useEvent(): PublicEvent {
  const ctx = useContext(EventContext)
  if (!ctx) {
    throw new Error('useEvent deve ser usado dentro de <EventLayout>.')
  }
  return ctx
}
