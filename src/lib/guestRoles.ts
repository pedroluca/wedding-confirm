import type { GuestRole } from '../types'

export const GUEST_ROLE_OPTIONS: { value: GuestRole; label: string }[] = [
  { value: 'convidado', label: 'Convidado' },
  { value: 'padrinho', label: 'Padrinho' },
  { value: 'madrinha', label: 'Madrinha' },
  { value: 'pais', label: 'Pais dos noivos' },
  { value: 'especial', label: 'Convidado especial' },
]

export const GUEST_ROLE_STYLES: Record<GuestRole, string> = {
  convidado: 'border-brand-primary-soft bg-white text-[#8b7a9c]',
  padrinho: 'border-violet-200 bg-violet-50 text-violet-700',
  madrinha: 'border-violet-200 bg-violet-50 text-violet-700',
  pais: 'border-rose-200 bg-rose-50 text-rose-700',
  especial: 'border-amber-200 bg-amber-50 text-amber-700',
}
