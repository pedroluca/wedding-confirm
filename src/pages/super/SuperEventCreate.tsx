import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Crown, Heart, Receipt, Shirt, UserPlus } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { paymentMethodLabel } from '../../lib/checkout'
import { NAME_FONT_OPTIONS } from '../../lib/eventFormat'
import { EVENT_TYPE_OPTIONS, EVENT_TYPES, eventTypeOptionLabel } from '../../lib/eventTypes'
import { planGraceDays } from '../../lib/plans'
import { currencyFormatter, defaultQuoteRequest, fetchPricing, suggestedPriceHint, usePricingSettings } from '../../lib/pricing'
import {
  boxClass,
  boxTitleClass,
  checkboxLabelClass,
  fileInputClass,
  hintClass,
  inputClass,
  labelClass,
  Section,
} from '../../components/panel/form'
import { PlanPicker } from '../../components/panel/PlanPicker'
import { QuoteCalculator } from '../../components/panel/QuoteCalculator'
import { PageHeader } from '../../components/panel/ui'
import type { EventPlan, EventType, NameFont, Pricing, Quote, QuoteRequest, SuperEvent, SuperOrderDetail } from '../../types'

type CreateForm = {
  event_type: EventType
  host_name: string
  host_name_secondary: string
  subtitle: string
  event_date: string
  venue_name: string
  venue_name_secondary: string
  address: string
  maps_url: string
  maps_url_secondary: string
  dress_code: string
  pix_key: string
  color_primary: string
  name_font: NameFont
  logo: File | null
  plan: EventPlan
  gifts_enabled: boolean
  guest_limit: string
  admin_limit: string
  price_charged: string
  /** Escolha do orçamento aplicado (a API recalcula e guarda no evento). */
  quote: QuoteRequest | null
  admin_name: string
  admin_email: string
}

const EMPTY_FORM: CreateForm = {
  event_type: 'wedding',
  host_name: '',
  host_name_secondary: '',
  subtitle: '',
  event_date: '',
  venue_name: '',
  venue_name_secondary: '',
  address: '',
  maps_url: '',
  maps_url_secondary: '',
  dress_code: '',
  pix_key: '',
  color_primary: '#d2afff',
  name_font: 'sans',
  logo: null,
  plan: 'standard',
  gifts_enabled: true,
  guest_limit: '',
  admin_limit: '',
  price_charged: '',
  quote: null,
  admin_name: '',
  admin_email: '',
}

/**
 * O formulário preenchido a partir de um pedido pago pelo site: nomes, data,
 * o que foi contratado (plano, lista, faixa, admins) e o cliente como
 * primeiro admin. O valor cobrado, o orçamento e o cupom a API pega do
 * próprio pedido (order_id), então aqui eles só aparecem.
 */
function formFromOrder(order: SuperOrderDetail, pricing: Pricing): Partial<CreateForm> {
  const choice = order.choice
  const tier = choice ? pricing.tiers.find((candidate) => candidate.max_guests === choice.max_guests) : undefined
  return {
    event_type: order.event_type,
    host_name: order.host_name,
    host_name_secondary: order.host_name_secondary ?? '',
    subtitle: order.subtitle ?? '',
    // O pedido só tem o dia: o horário fica pra ajustar (a tela avisa).
    event_date: order.event_date ? `${order.event_date}T00:00` : '',
    ...(choice && {
      plan: choice.premium ? 'premium' : 'standard',
      gifts_enabled: choice.gifts,
      guest_limit: tier?.open_ended ? '' : String(choice.max_guests),
      admin_limit: String(pricing.settings.included_admins + choice.extra_admins),
    }),
    price_charged: order.paid_amount !== null ? String(order.paid_amount) : '',
    quote: null,
    admin_name: order.customer_name,
    admin_email: order.customer_email,
  }
}

function toFormData(form: CreateForm, orderId: number | null): FormData {
  const data = new FormData()
  if (orderId !== null) {
    data.set('order_id', String(orderId))
  }
  data.set('event_type', form.event_type)
  data.set('host_name', form.host_name.trim())
  data.set('host_name_secondary', form.host_name_secondary.trim())
  data.set('subtitle', form.subtitle.trim())
  data.set('event_date', form.event_date)
  data.set('venue_name', form.venue_name.trim())
  data.set('venue_name_secondary', form.venue_name_secondary.trim())
  data.set('address', form.address.trim())
  data.set('maps_url', form.maps_url.trim())
  data.set('maps_url_secondary', form.maps_url_secondary.trim())
  data.set('dress_code', form.dress_code.trim())
  data.set('pix_key', form.pix_key.trim())
  data.set('color_primary', form.color_primary)
  data.set('name_font', form.name_font)
  data.set('plan', form.plan)
  data.set('gifts_enabled', form.gifts_enabled ? '1' : '0')
  // Em branco = sem limite / sem valor.
  data.set('guest_limit', form.guest_limit)
  data.set('admin_limit', form.admin_limit)
  data.set('price_charged', form.price_charged)
  if (form.quote) {
    data.set('quote', JSON.stringify({ ...form.quote, event_type: form.event_type }))
  }
  data.set('admin_name', form.admin_name.trim())
  data.set('admin_email', form.admin_email.trim())
  if (form.logo) {
    data.set('logo', form.logo)
  }
  return data
}

export default function SuperEventCreate() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const orderParam = searchParams.get('pedido')
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appliedQuote, setAppliedQuote] = useState<Quote | null>(null)
  // Pedido pago pelo site que vai virar este evento (?pedido=ID, vindo de Pedidos).
  const [order, setOrder] = useState<SuperOrderDetail | null>(null)
  const [orderError, setOrderError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderParam) return
    let active = true
    Promise.all([api.get<{ order: SuperOrderDetail }>(`/admin/super/orders/${orderParam}`, token), fetchPricing()])
      .then(([res, pricing]) => {
        if (!active) return
        if (res.order.status !== 'paid') {
          setOrderError('Este pedido não está pago ou já virou evento.')
          return
        }
        setOrder(res.order)
        setForm((prev) => ({ ...prev, ...formFromOrder(res.order, pricing) }))
      })
      .catch((err) => {
        if (active) setOrderError(err instanceof ApiError ? err.message : 'Não foi possível carregar o pedido.')
      })
    return () => {
      active = false
    }
  }, [orderParam, token])

  const typeProfile = EVENT_TYPES[form.event_type]
  const [hostLabel, hostSecondaryLabel] = typeProfile.hostLabels
  const [venueLabel, secondVenueLabel] = typeProfile.venueLabels
  const [venuePlaceholder, secondVenuePlaceholder] = typeProfile.venuePlaceholders
  const unlimited = form.plan === 'unlimited'
  const pricingSettings = usePricingSettings()
  const graceDays = planGraceDays(form.plan, pricingSettings)

  const update = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // O orçamento preenche plano, contratado e valor cobrado; tudo continua editável.
  const applyQuote = (quote: Quote, request: QuoteRequest) => {
    setForm((prev) => ({
      ...prev,
      plan: quote.contract.plan,
      gifts_enabled: quote.contract.gifts_enabled,
      guest_limit: quote.contract.guest_limit !== null ? String(quote.contract.guest_limit) : '',
      admin_limit: String(quote.contract.admin_limit),
      price_charged: String(quote.total),
      quote: request,
    }))
    setAppliedQuote(quote)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await api.post<{ event: SuperEvent }>('/admin/super/events', toFormData(form, order?.id ?? null), token)
      navigate(`/super/eventos/${res.event.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o evento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <Link to="/super/eventos" className="inline-flex items-center gap-1.5 text-sm text-[#8b7a9c] hover:text-brand-primary">
        <ArrowLeft size={15} /> Eventos
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Novo evento"
          description="Cria o evento e o primeiro admin dele, que recebe um email pra definir a senha. Foto, música, abertura do convite e o resto da personalização dá pra ajustar depois."
        />
      </div>

      {orderError && <p className="mt-6 text-sm text-rose-600">{orderError}</p>}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {order && (
          <Section
            icon={<Receipt size={18} />}
            title={`A partir do pedido #${order.id}`}
            description="O formulário já veio preenchido com o pedido. O valor cobrado, o orçamento e o cupom ficam os do pedido; o resto dá pra ajustar."
          >
            <div className="sm:col-span-2">
              <dl className="divide-y divide-[#f3eef5] text-sm">
                {order.items.map((item) => (
                  <div key={item.label} className="flex justify-between gap-4 py-1.5">
                    <dt className="text-[#6b5d80]">{item.label}</dt>
                    <dd className="text-[#3f3450] tabular-nums">{currencyFormatter.format(item.amount)}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-2 border-t border-[#ece6f0] pt-2 text-sm text-[#3f3450]">
                Pago: <strong>{currencyFormatter.format(order.paid_amount ?? order.total)}</strong>
                {' · '}
                {paymentMethodLabel(order.payment_method, order.installments) ?? 'Mercado Pago'}
              </p>
              {order.customer_notes && (
                <p className="mt-2 rounded-xl bg-[#faf8fb] p-3 text-sm whitespace-pre-line text-[#6b5d80]">
                  Do cliente: {order.customer_notes}
                </p>
              )}
            </div>
          </Section>
        )}

        <Section icon={<Heart size={18} />} title="Evento" description="Tipo, nomes e identidade visual.">
          <label className={`${labelClass} sm:col-span-2`}>
            Tipo de evento
            <select
              value={form.event_type}
              onChange={(e) => update('event_type', e.target.value as EventType)}
              className={inputClass}
            >
              {EVENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {eventTypeOptionLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            {hostLabel}
            <input required value={form.host_name} onChange={(e) => update('host_name', e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            {hostSecondaryLabel}
            <input
              value={form.host_name_secondary}
              onChange={(e) => update('host_name_secondary', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Subtítulo <span className="font-normal text-[#8b7a9c]">(opcional)</span>
            <input
              value={form.subtitle}
              maxLength={150}
              onChange={(e) => update('subtitle', e.target.value)}
              placeholder={typeProfile.subtitlePlaceholder}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fonte do nome
            <select
              value={form.name_font}
              onChange={(e) => update('name_font', e.target.value as NameFont)}
              className={inputClass}
            >
              {NAME_FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} style={{ fontFamily: option.fontFamily }}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Cor de destaque
            <span className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={form.color_primary}
                onChange={(e) => update('color_primary', e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-xl border border-brand-primary-soft bg-white px-1 outline-none"
              />
              <span className="font-mono text-sm font-normal text-[#6b5d80] uppercase">{form.color_primary}</span>
            </span>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Brasão / logo <span className="font-normal text-[#8b7a9c]">(opcional)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => update('logo', e.target.files?.[0] ?? null)}
              className={fileInputClass}
            />
          </label>
        </Section>

        <Section
          icon={<Crown size={18} />}
          title="Plano e orçamento"
          description={
            order
              ? 'O plano e o que foi contratado vieram do pedido. Dá pra ajustar, menos o valor cobrado.'
              : 'Calcule o orçamento e aplique: ele preenche o plano, o que foi contratado e o valor cobrado.'
          }
        >
          <PlanPicker value={form.plan} onChange={(plan) => update('plan', plan)} />
          {!unlimited && !order && (
            <div className={`${boxClass} sm:col-span-2`}>
              <p className={boxTitleClass}>Orçamento</p>
              <QuoteCalculator eventType={form.event_type} initial={defaultQuoteRequest} onApply={applyQuote} />
              {appliedQuote && (
                <p className="text-sm text-[#6b5d80]">
                  Aplicado: {form.guest_limit ? `até ${form.guest_limit} convidados` : 'convidados sem limite'} ·{' '}
                  {form.admin_limit} admins. Faixa e admins dá pra ajustar depois na página do evento.
                  {form.quote && form.quote.event_type !== form.event_type && (
                    <span className="block text-amber-700">
                      O tipo do evento mudou depois de aplicar: aplique o orçamento de novo.
                    </span>
                  )}
                </p>
              )}
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={checkboxLabelClass}>
              <input
                type="checkbox"
                checked={unlimited || form.gifts_enabled}
                disabled={unlimited}
                onChange={(e) => update('gifts_enabled', e.target.checked)}
                className="accent-brand-primary"
              />
              Lista de presentes e chave Pix
            </label>
            <span className={hintClass}>
              {unlimited
                ? 'Incluída no Ilimitado.'
                : 'Desligada, some do convite, da confirmação e do painel do evento.'}
            </span>
          </div>
          <label className={labelClass}>
            Valor cobrado (R$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price_charged}
              onChange={(e) => update('price_charged', e.target.value)}
              disabled={order !== null}
              className={`${inputClass} disabled:opacity-60`}
            />
            {order && <span className={hintClass}>O valor pago no pedido.</span>}
            {appliedQuote && (
              <span className={hintClass}>
                {suggestedPriceHint(form.price_charged, appliedQuote.total, appliedQuote.coupon?.code)}
              </span>
            )}
          </label>
        </Section>

        <Section icon={<CalendarDays size={18} />} title="Quando e onde">
          <label className={`${labelClass} sm:col-span-2 sm:max-w-xs`}>
            Data e hora
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => update('event_date', e.target.value)}
              className={inputClass}
            />
            <span className={hintClass}>
              {graceDays === null
                ? 'No plano Ilimitado o acesso ao painel não tem prazo.'
                : `O acesso ao painel vale até ${graceDays} dias depois dessa data.`}
            </span>
            {order?.event_date && form.event_date.endsWith('T00:00') && (
              <span className="mt-1 block text-xs font-normal text-amber-700">
                O pedido só tem o dia: ajuste o horário (ou o cliente ajusta depois, no painel).
              </span>
            )}
          </label>
          <div className={boxClass}>
            <p className={boxTitleClass}>{venueLabel}</p>
            <label className={labelClass}>
              Local
              <input
                value={form.venue_name}
                onChange={(e) => update('venue_name', e.target.value)}
                placeholder={venuePlaceholder}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Endereço
              <input value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Link do mapa
              <input
                value={form.maps_url}
                onChange={(e) => update('maps_url', e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className={inputClass}
              />
            </label>
          </div>
          <div className={boxClass}>
            <p className={boxTitleClass}>
              {secondVenueLabel} <span className="font-normal tracking-normal normal-case">(opcional)</span>
            </p>
            <label className={labelClass}>
              Local
              <input
                value={form.venue_name_secondary}
                onChange={(e) => update('venue_name_secondary', e.target.value)}
                placeholder={secondVenuePlaceholder}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Link do mapa
              <input
                value={form.maps_url_secondary}
                onChange={(e) => update('maps_url_secondary', e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className={inputClass}
              />
            </label>
          </div>
        </Section>

        <Section icon={<Shirt size={18} />} title="Detalhes">
          <label className={labelClass}>
            Traje
            <input value={form.dress_code} onChange={(e) => update('dress_code', e.target.value)} className={inputClass} />
          </label>
          {(unlimited || form.gifts_enabled) && (
            <label className={labelClass}>
              Chave Pix
              <input value={form.pix_key} onChange={(e) => update('pix_key', e.target.value)} className={inputClass} />
            </label>
          )}
        </Section>

        <Section
          icon={<UserPlus size={18} />}
          title="Primeiro admin do evento"
          description="Recebe um email com o link pra definir a própria senha. Se o email já tiver conta, o evento entra na lista dela."
        >
          <label className={labelClass}>
            Nome
            <input required value={form.admin_name} onChange={(e) => update('admin_name', e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Email
            <input
              required
              type="email"
              value={form.admin_email}
              onChange={(e) => update('admin_email', e.target.value)}
              className={inputClass}
            />
          </label>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-[#ece6f0] bg-white/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          {error && <p className="mr-auto text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-full bg-brand-primary px-8 py-2.5 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
          >
            {saving ? 'Criando...' : 'Criar evento'}
          </button>
        </div>
      </form>
    </div>
  )
}
