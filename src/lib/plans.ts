import type { AdminEvent, EventPlan, PricingSettings, PublicEvent } from '../types'

/**
 * Lista de presentes e Pix no ar (a API já considera o plano). Ligada a
 * menos que venha desligada: undefined = API anterior ao campo.
 */
export function giftsEnabled(event: Pick<PublicEvent, 'gifts_enabled'>): boolean {
  return event.gifts_enabled !== false
}

/**
 * Dias de acesso ao painel depois da data do evento, por plano (definidos em
 * "Preços e planos" no super-admin, os mesmos do backend). null = sem prazo.
 */
export function planGraceDays(plan: EventPlan, settings: PricingSettings): number | null {
  if (plan === 'unlimited') return null
  return plan === 'premium' ? settings.grace_days_premium : settings.grace_days_standard
}

export const PLAN_OPTIONS: { value: EventPlan; label: string }[] = [
  { value: 'standard', label: 'Padrão' },
  { value: 'premium', label: 'Premium' },
  { value: 'unlimited', label: 'Ilimitado' },
]

/** Texto do cartão de cada plano no seletor. */
export function planDescription(plan: EventPlan, settings: PricingSettings): string {
  const days = planGraceDays(plan, settings)
  if (days === null) {
    return 'Interno: todas as funções, sem limites e sem prazo. Para qualquer evento que você quiser liberar.'
  }
  return plan === 'premium'
    ? `${days} dias de acesso ao painel depois do evento e convite sem o "Feito com Presenzo".`
    : `${days} dias de acesso ao painel depois do evento.`
}

export const PLAN_LABELS: Record<EventPlan, string> = {
  standard: 'Padrão',
  premium: 'Premium',
  unlimited: 'Ilimitado',
}

/**
 * Teto da faixa: limite + margem de tolerância, arredondada pra cima. Mesmo
 * cálculo do backend (guest_cap em src/Plans.php). O teto de um evento salvo
 * já vem da API (guest_cap); isto serve pra prévia enquanto o super-admin
 * edita a faixa.
 */
export function guestCap(limit: number, tolerancePercent: number): number {
  return limit + Math.ceil((limit * tolerancePercent) / 100)
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
 * Data de acesso que o plano sugere: data do evento + prazo do plano
 * (planGraceDays), no formato do <input type="datetime-local">. null quando
 * o plano não tem prazo ou o evento ainda não tem data.
 */
export function suggestedAccessExpiry(eventDate: string, days: number | null): string | null {
  const date = eventDate ? new Date(eventDate) : null
  if (days === null || !date || Number.isNaN(date.getTime())) return null

  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
