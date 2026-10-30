import { useEffect, useState } from 'react'
import { api, ApiError } from './api'
import type { Coupon, Pricing, PricingSettings, Quote, QuoteRequest, SuperEvent } from '../types'

/** Valores da migração 016, usados enquanto GET /pricing não responde. */
export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  guest_tolerance_percent: 20,
  included_admins: 2,
  grace_days_standard: 15,
  grace_days_premium: 30,
}

let pricingRequest: Promise<Pricing> | null = null

/** Tabela de preços (GET /pricing), buscada uma vez e compartilhada entre as telas. */
export function fetchPricing(): Promise<Pricing> {
  pricingRequest ??= api.get<Pricing>('/pricing').catch((err: unknown) => {
    pricingRequest = null
    throw err
  })
  return pricingRequest
}

/** Depois de salvar "Preços e planos", as outras telas já leem a tabela nova. */
export function setPricingCache(pricing: Pricing) {
  pricingRequest = Promise.resolve(pricing)
}

export function usePricing(): Pricing | null {
  const [pricing, setPricing] = useState<Pricing | null>(null)

  useEffect(() => {
    let active = true
    fetchPricing()
      .then((res) => {
        if (active) setPricing(res)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  return pricing
}

/** Prazos de acesso, margem da faixa e admins incluídos em vigor. */
export function usePricingSettings(): PricingSettings {
  return usePricing()?.settings ?? DEFAULT_PRICING_SETTINGS
}

/**
 * Orçamento da escolha atual, sempre calculado pela API (o front nunca soma
 * preço). Espera o usuário parar de digitar antes de pedir. version força
 * recalcular com a mesma escolha (ex: depois de salvar a tabela de preços).
 */
export function useQuote(
  request: QuoteRequest | null,
  version = 0
): { quote: Quote | null; error: string | null; pending: boolean } {
  const [state, setState] = useState<{ quote: Quote | null; error: string | null; key: string | null }>({
    quote: null,
    error: null,
    key: null,
  })
  const key = request ? JSON.stringify(request) : null

  useEffect(() => {
    if (!key) return
    let active = true
    const timer = window.setTimeout(() => {
      api
        .post<{ quote: Quote }>('/pricing/quote', JSON.parse(key))
        .then((res) => {
          if (active) setState({ quote: res.quote, error: null, key })
        })
        .catch((err: unknown) => {
          if (active) {
            setState((prev) => ({
              quote: prev.quote,
              error: err instanceof ApiError ? err.message : 'Não foi possível calcular o orçamento.',
              key: prev.key,
            }))
          }
        })
    }, 300)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [key, version])

  // pending: o orçamento na tela ainda é de uma escolha anterior.
  return { quote: state.quote, error: state.error, pending: state.key !== key }
}

/**
 * Escolha do orçamento que reproduz um evento já vendido: o orçamento
 * aplicado na venda, se houver, ou o que está contratado hoje (sem faixa =
 * a maior faixa, que é aberta).
 */
export function quoteRequestFromEvent(event: SuperEvent, pricing: Pricing): QuoteRequest | null {
  const fallback = defaultQuoteRequest(pricing)
  if (!fallback) return null

  const choice = event.price_breakdown?.choice
  const maxGuests = choice?.max_guests ?? event.contract.guest_limit
  const tier =
    maxGuests != null
      ? pricing.tiers.find((candidate) => candidate.max_guests === maxGuests)
      : pricing.tiers[pricing.tiers.length - 1]
  const included = pricing.settings.included_admins

  return {
    event_type: event.event_type,
    guest_tier_id: tier?.id ?? fallback.guest_tier_id,
    gifts: choice?.gifts ?? event.contract.gifts_enabled,
    premium: choice?.premium ?? event.plan === 'premium',
    extra_admins: choice?.extra_admins ?? Math.max(0, (event.contract.admin_limit ?? included) - included),
    coupon: choice?.coupon ?? '',
    event_id: event.id,
  }
}

/** A escolha em texto, pra mensagem do WhatsApp: "Casamento, até 100 convidados", "Com lista de presentes e Pix"... */
export function describeQuoteRequest(request: QuoteRequest, pricing: Pricing): string[] {
  const type = pricing.prices.find((item) => item.key === `base_${request.event_type}`)?.label ?? 'Evento'
  const tier = pricing.tiers.find((candidate) => candidate.id === request.guest_tier_id)?.label.toLowerCase() ?? ''
  const lines = [`${type}, ${tier}`]
  lines.push(request.gifts ? 'Com lista de presentes e Pix' : 'Sem lista de presentes')
  if (request.premium) lines.push('Premium')
  if (request.extra_admins > 0) {
    lines.push(request.extra_admins === 1 ? '1 admin extra' : `${request.extra_admins} admins extras`)
  }
  if (request.coupon?.trim()) lines.push(`Cupom ${request.coupon.trim().toUpperCase()}`)
  return lines
}

/** Escolha inicial do orçamento: casamento, menor faixa, com lista de presentes. */
export function defaultQuoteRequest(pricing: Pricing): QuoteRequest | null {
  const tier = pricing.tiers[0]
  if (!tier) return null
  return { event_type: 'wedding', guest_tier_id: tier.id, gifts: true, premium: false, extra_admins: 0, coupon: '' }
}

/**
 * Salvar a tabela recria as faixas, com ids novos: mantém a escolha pela
 * quantidade de convidados (ou volta pra menor faixa).
 */
export function remapQuoteRequest(request: QuoteRequest, before: Pricing, after: Pricing): QuoteRequest {
  const maxGuests = before.tiers.find((tier) => tier.id === request.guest_tier_id)?.max_guests
  const tier = after.tiers.find((candidate) => candidate.max_guests === maxGuests) ?? after.tiers[0]
  return tier ? { ...request, guest_tier_id: tier.id } : request
}

export const currencyFormatter =new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })

/**
 * Frase do preço sugerido pra ficar junto do valor cobrado (que é livre):
 * "Sugerido pelo orçamento: R$ 1.170,00 (cupom PROMO20). Cobrado R$ 170,00 abaixo."
 */
export function suggestedPriceHint(charged: string, suggested: number, coupon?: string | null): string {
  const parts = [`Sugerido pelo orçamento: ${currencyFormatter.format(suggested)}${coupon ? ` (cupom ${coupon})` : ''}.`]
  const value = Number(charged)
  if (charged.trim() !== '' && Number.isFinite(value) && Math.abs(value - suggested) >= 0.01) {
    const diff = currencyFormatter.format(Math.abs(value - suggested))
    parts.push(value < suggested ? `Cobrado ${diff} abaixo.` : `Cobrado ${diff} acima.`)
  }
  return parts.join(' ')
}

/** "20%" ou "R$ 50,00" */
export function formatCouponDiscount(coupon: Pick<Coupon, 'discount_type' | 'discount_value'>): string {
  return coupon.discount_type === 'percent'
    ? `${percentFormatter.format(coupon.discount_value)}%`
    : currencyFormatter.format(coupon.discount_value)
}
