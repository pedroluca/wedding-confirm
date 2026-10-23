import type { EventType, GuestRole } from '../types'

export type GuestRoleOption = { value: GuestRole; label: string }

// Tipos sem papéis de destaque ficam de fora: todo mundo é "convidado".
const ROLE_OPTIONS: Partial<Record<EventType, GuestRoleOption[]>> = {
  wedding: [
    { value: 'convidado', label: 'Convidado' },
    { value: 'padrinho', label: 'Padrinho' },
    { value: 'madrinha', label: 'Madrinha' },
    { value: 'pais', label: 'Pais dos noivos' },
    { value: 'especial', label: 'Convidado especial' },
  ],
  graduation: [
    { value: 'convidado', label: 'Convidado' },
    { value: 'padrinho', label: 'Padrinho' },
    { value: 'madrinha', label: 'Madrinha' },
    { value: 'pais', label: 'Pais do(a) formando(a)' },
    { value: 'especial', label: 'Convidado especial' },
  ],
}

/** Papéis disponíveis no tipo de evento, ou null se ele não usa papéis. */
export function guestRoleOptions(eventType: EventType): GuestRoleOption[] | null {
  return ROLE_OPTIONS[eventType] ?? null
}

export const GUEST_ROLE_STYLES: Record<GuestRole, string> = {
  convidado: 'border-brand-primary-soft bg-white text-[#8b7a9c]',
  padrinho: 'border-violet-200 bg-violet-50 text-violet-700',
  madrinha: 'border-violet-200 bg-violet-50 text-violet-700',
  pais: 'border-rose-200 bg-rose-50 text-rose-700',
  especial: 'border-amber-200 bg-amber-50 text-amber-700',
}
