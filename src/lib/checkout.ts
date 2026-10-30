import { defaultQuoteRequest, pricesConfigured } from './pricing'
import type { EventType, Pricing, QuoteRequest } from '../types'

/**
 * Dá pra contratar pelo site? O pagamento online precisa estar ligado na API
 * (access_token do Mercado Pago) e os preços preenchidos no super-admin.
 * Fora disso, os botões de "Quero o meu" voltam a abrir o WhatsApp.
 */
export function checkoutEnabled(pricing: Pricing | null): boolean {
  return Boolean(pricing?.checkout?.enabled) && pricesConfigured(pricing)
}

// O tipo vai na URL em português, pra ficar legível num link compartilhado.
const TYPE_PARAMS: Record<EventType, string> = {
  wedding: 'casamento',
  birthday: 'aniversario',
  graduation: 'formatura',
  other: 'celebracao',
}

/**
 * Endereço do /contratar com a escolha do orçamento, pra simulação da home
 * chegar já preenchida e pra dar pra mandar um link pronto (ex: o cupom de
 * um amigo: /contratar?cupom=JOAO15). A faixa vai pela quantidade de
 * convidados, não pelo id: o id muda quando a tabela de preços é salva.
 */
export function contractPath(request?: QuoteRequest | null, pricing?: Pricing | null): string {
  if (!request) return '/contratar'

  const params = new URLSearchParams({ tipo: TYPE_PARAMS[request.event_type] })
  const tier = pricing?.tiers.find((candidate) => candidate.id === request.guest_tier_id)
  if (tier) params.set('convidados', String(tier.max_guests))
  if (!request.gifts) params.set('lista', '0')
  if (request.premium) params.set('premium', '1')
  if (request.extra_admins > 0) params.set('admins', String(request.extra_admins))
  if (request.coupon?.trim()) params.set('cupom', request.coupon.trim().toUpperCase())

  return `/contratar?${params}`
}

/** /contratar já com o tipo de evento escolhido (ex: vindo de um convite de exemplo). */
export function contractPathForType(eventType: EventType): string {
  return `/contratar?tipo=${TYPE_PARAMS[eventType]}`
}

/** A escolha do orçamento a partir da URL do /contratar (o que faltar fica no padrão). */
export function quoteRequestFromSearch(search: URLSearchParams, pricing: Pricing): QuoteRequest | null {
  const fallback = defaultQuoteRequest(pricing)
  if (!fallback) return null

  const type = (Object.keys(TYPE_PARAMS) as EventType[]).find((key) => TYPE_PARAMS[key] === search.get('tipo'))
  const guests = Number(search.get('convidados'))
  const tier = pricing.tiers.find((candidate) => candidate.max_guests === guests)
  const admins = Number(search.get('admins'))

  return {
    event_type: type ?? fallback.event_type,
    guest_tier_id: tier?.id ?? fallback.guest_tier_id,
    gifts: search.get('lista') !== '0',
    premium: search.get('premium') === '1',
    extra_admins: Number.isInteger(admins) && admins > 0 ? Math.min(admins, 50) : 0,
    coupon: (search.get('cupom') ?? '').trim().toUpperCase(),
  }
}

/** "Pix", "Cartão de crédito em 3x", "Cartão de débito"… */
export function paymentMethodLabel(method: string | null, installments: number | null): string | null {
  if (!method) return null
  if (method === 'pix') return 'Pix'
  if (method === 'credit_card') {
    return installments && installments > 1 ? `Cartão de crédito em ${installments}x` : 'Cartão de crédito à vista'
  }
  const labels: Record<string, string> = { debit_card: 'Cartão de débito', account_money: 'Saldo do Mercado Pago' }
  return labels[method] ?? null
}

/** "(77) 99999-0000" enquanto a pessoa digita. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  const split = digits.length === 11 ? 7 : 6
  return `(${digits.slice(0, 2)}) ${digits.slice(2, split)}-${digits.slice(split)}`
}
