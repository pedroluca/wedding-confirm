import type { EventPlan, PublicEvent } from '../types'

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
