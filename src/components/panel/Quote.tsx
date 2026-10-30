import { currencyFormatter } from '../../lib/pricing'
import type { EventType, Pricing, Quote, QuoteRequest } from '../../types'
import { checkboxLabelClass, hintClass, inputClass, labelClass } from './form'

/**
 * O que entra no orçamento: tipo, faixa, adicionais e cupom. Com
 * lockEventType o tipo vem de fora (o formulário do evento) e o campo some.
 */
export function QuoteFields({
  pricing,
  value,
  onChange,
  lockEventType = false,
}: {
  pricing: Pricing
  value: QuoteRequest
  onChange: (value: QuoteRequest) => void
  lockEventType?: boolean
}) {
  const update = <K extends keyof QuoteRequest>(key: K, field: QuoteRequest[K]) => onChange({ ...value, [key]: field })
  const eventTypes = pricing.prices.filter((item) => item.key.startsWith('base_'))
  const { grace_days_standard: standardDays, grace_days_premium: premiumDays } = pricing.settings

  return (
    // content-start: ao lado de um resumo mais alto, a grade não estica as linhas.
    <div className="grid content-start gap-4 sm:grid-cols-2">
      {!lockEventType && (
        <label className={labelClass}>
          Tipo de evento
          <select
            value={value.event_type}
            onChange={(e) => update('event_type', e.target.value as EventType)}
            className={inputClass}
          >
            {eventTypes.map((item) => (
              <option key={item.key} value={item.key.slice('base_'.length)}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className={`${labelClass} ${lockEventType ? 'sm:col-span-2' : ''}`}>
        Convidados
        <select
          value={value.guest_tier_id}
          onChange={(e) => update('guest_tier_id', Number(e.target.value))}
          className={inputClass}
        >
          {pricing.tiers.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-x-8 sm:col-span-2 sm:grid-cols-2">
        <div>
          <label className={checkboxLabelClass}>
            <input
              type="checkbox"
              checked={value.gifts}
              onChange={(e) => update('gifts', e.target.checked)}
              className="accent-brand-primary"
            />
            Lista de presentes e Pix
          </label>
          <span className={`${hintClass} pl-6`}>Os convidados escolhem o presente ou mandam um Pix.</span>
        </div>
        <div>
          <label className={checkboxLabelClass}>
            <input
              type="checkbox"
              checked={value.premium}
              onChange={(e) => update('premium', e.target.checked)}
              className="accent-brand-primary"
            />
            Premium
          </label>
          <span className={`${hintClass} pl-6`}>
            Painel liberado por {premiumDays} dias depois do evento, em vez de {standardDays}, e convite sem o
            "Feito com Presenzo".
          </span>
        </div>
      </div>
      <label className={labelClass}>
        Admins extras
        <input
          type="number"
          min="0"
          max="50"
          step="1"
          value={value.extra_admins}
          onChange={(e) => update('extra_admins', Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
          className={inputClass}
        />
        <span className={hintClass}>
          {pricing.settings.included_admins} já {pricing.settings.included_admins === 1 ? 'incluído' : 'incluídos'}.
        </span>
      </label>
      <label className={labelClass}>
        Cupom <span className="font-normal text-[#8b7a9c]">(opcional)</span>
        <input
          value={value.coupon ?? ''}
          onChange={(e) => update('coupon', e.target.value.toUpperCase())}
          placeholder="Ex: PROMO20"
          autoComplete="off"
          className={`${inputClass} uppercase placeholder:normal-case`}
        />
      </label>
    </div>
  )
}

/** Itens do orçamento e o total, como a API calculou. */
export function QuoteSummary({
  quote,
  error,
  totalLabel = 'Total',
  stale = false,
}: {
  quote: Quote | null
  error: string | null
  totalLabel?: string
  /** O orçamento na tela é de uma escolha anterior e está sendo recalculado. */
  stale?: boolean
}) {
  if (!quote) {
    return <p className="text-sm text-[#8b7a9c]">{error ?? 'Calculando...'}</p>
  }

  return (
    <div className={`transition-opacity ${stale ? 'opacity-50' : ''}`} aria-busy={stale}>
      <dl className="divide-y divide-[#f3eef5] text-sm">
        {quote.items.map((item) => (
          <div key={item.label} className="flex justify-between gap-4 py-2">
            <dt className="text-[#6b5d80]">{item.label}</dt>
            <dd className={`tabular-nums ${item.amount < 0 ? 'text-emerald-700' : 'text-[#3f3450]'}`}>
              {item.amount < 0 ? `− ${currencyFormatter.format(-item.amount)}` : currencyFormatter.format(item.amount)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-[#ece6f0] pt-3">
        <span className="font-medium text-[#3f3450]">{totalLabel}</span>
        <span className="font-display text-2xl font-semibold text-[#3f3450] tabular-nums">
          {currencyFormatter.format(quote.total)}
        </span>
      </div>
      {quote.coupon?.remaining !== undefined && (
        <p className="mt-2 text-sm font-medium text-emerald-700">
          {quote.coupon.remaining === 1 ? 'Resta 1 uso' : `Restam ${quote.coupon.remaining} usos`} com este cupom
        </p>
      )}
      {quote.coupon_error && <p className="mt-2 text-sm text-amber-700">{quote.coupon_error}</p>}
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
