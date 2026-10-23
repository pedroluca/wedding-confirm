import type { AdminEvent, EventPlan, PublicEvent } from '../types'

/**
 * Lista de presentes e Pix no ar (a API já considera o plano). Ligada a
 * menos que venha desligada: undefined = API anterior ao campo.
 */
export function giftsEnabled(event: Pick<PublicEvent, 'gifts_enabled'>): boolean {
  return event.gifts_enabled !== false
}

/**
 * Dias de acesso ao painel depois da data do evento, por plano. Mesmos
 * valores do backend (config access.grace_days e grace_days_premium).
 * null = sem prazo.
 */
export const PLAN_GRACE_DAYS: Record<EventPlan, number | null> = {
  standard: 15,
  premium: 30,
  unlimited: null,
}

export const PLAN_OPTIONS: { value: EventPlan; label: string; description: string }[] = [
  { value: 'standard', label: 'Padrão', description: '15 dias de acesso ao painel depois do evento.' },
  { value: 'premium', label: 'Premium', description: '30 dias de acesso ao painel depois do evento, o dobro do Padrão.' },
  {
    value: 'unlimited',
    label: 'Ilimitado',
    description: 'Interno: todas as funções, sem limites e sem prazo. Para qualquer evento que você quiser liberar.',
  },
]

export const PLAN_LABELS: Record<EventPlan, string> = {
  standard: 'Padrão',
  premium: 'Premium',
  unlimited: 'Ilimitado',
}

/**
 * Margem acima da faixa de convidados antes de travar o cadastro. Mesmo
 * valor e cálculo do backend (config limits.guest_tolerance_percent e
 * guest_cap em src/Plans.php). O teto de um evento salvo já vem da API
 * (guest_cap); isto serve pra prévia enquanto o super-admin edita a faixa.
 */
export const GUEST_TOLERANCE_PERCENT = 20

export function guestCap(limit: number): number {
  return limit + Math.ceil((limit * GUEST_TOLERANCE_PERCENT) / 100)
}

/** Dentro da faixa, na margem de tolerância (só aviso) ou no teto (cadastro travado). */
export type GuestBandState = 'ok' | 'tolerance' | 'full'

export type GuestBand = {
  state: GuestBandState
  people: number
  limit: number
  cap: number
  /** Quantas pessoas ainda cabem antes de travar. */
  remaining: number
}

/** Situação da faixa de convidados do evento. null = sem limite. */
export function guestBand(people: number, event: Pick<AdminEvent, 'guest_limit' | 'guest_cap'>): GuestBand | null {
  const { guest_limit: limit, guest_cap: cap } = event
  if (limit == null || cap == null) return null

  const state: GuestBandState = people >= cap ? 'full' : people > limit ? 'tolerance' : 'ok'
  return { state, people, limit, cap, remaining: Math.max(0, cap - people) }
}

const pad = (value: number) => String(value).padStart(2, '0')

/**
 * Data de acesso que o plano sugere: data do evento + prazo do plano, no
 * formato do <input type="datetime-local">. null quando o plano não tem
 * prazo ou o evento ainda não tem data.
 */
export function suggestedAccessExpiry(eventDate: string, plan: EventPlan): string | null {
  const days = PLAN_GRACE_DAYS[plan]
  const date = eventDate ? new Date(eventDate) : null
  if (days === null || !date || Number.isNaN(date.getTime())) return null

  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
