import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CalendarHeart, Calculator, PackagePlus, Plus, SlidersHorizontal, Trash2, Users } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { defaultQuoteRequest, fetchPricing, remapQuoteRequest, setPricingCache, useQuote } from '../../lib/pricing'
import { fieldClass, hintClass, labelClass, SaveBar, Section } from '../../components/panel/form'
import { QuoteFields, QuoteSummary } from '../../components/panel/Quote'
import { PageHeader, PanelTabs } from '../../components/panel/ui'
import type { Pricing, PricingSettings, QuoteRequest } from '../../types'
import { CouponsPanel } from './CouponsPanel'

type Tab = 'precos' | 'cupons'

const TABS: { value: Tab; label: string }[] = [
  { value: 'precos', label: 'Preços' },
  { value: 'cupons', label: 'Cupons' },
]

type TierRow = { key: number; max_guests: string; amount: string }

type PricingForm = {
  prices: Record<string, string>
  tiers: TierRow[]
  settings: Record<keyof PricingSettings, string>
}

let nextRowKey = 0

function toForm(pricing: Pricing): PricingForm {
  return {
    prices: Object.fromEntries(pricing.prices.map((item) => [item.key, String(item.amount)])),
    tiers: pricing.tiers.map((tier) => ({
      key: ++nextRowKey,
      max_guests: String(tier.max_guests),
      amount: String(tier.amount),
    })),
    settings: {
      guest_tolerance_percent: String(pricing.settings.guest_tolerance_percent),
      included_admins: String(pricing.settings.included_admins),
      grace_days_standard: String(pricing.settings.grace_days_standard),
      grace_days_premium: String(pricing.settings.grace_days_premium),
    },
  }
}

function toPayload(form: PricingForm) {
  return {
    prices: form.prices,
    tiers: form.tiers.map((tier) => ({ max_guests: tier.max_guests, amount: tier.amount })),
    settings: form.settings,
  }
}

/** Campo com unidade fixa dentro dele: "R$" à esquerda ou "%"/"dias" à direita. */
function UnitInput({
  value,
  onChange,
  prefix,
  suffix,
  step = '1',
  min = '0',
  ariaLabel,
}: {
  value: string
  onChange: (value: string) => void
  prefix?: string
  suffix?: string
  step?: string
  min?: string
  ariaLabel?: string
}) {
  return (
    <span className="relative mt-1 block">
      {/* Unidade só visual: fora do nome do campo lido pelo leitor de tela. */}
      {prefix && (
        <span aria-hidden className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-sm text-[#8b7a9c]">
          {prefix}
        </span>
      )}
      <input
        required
        type="number"
        min={min}
        step={step}
        inputMode={step === '1' ? 'numeric' : 'decimal'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={ariaLabel}
        className={`${fieldClass} ${prefix ? 'pl-11' : ''} ${suffix ? 'pr-16' : ''}`}
      />
      {suffix && (
        <span aria-hidden className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-sm text-[#8b7a9c]">
          {suffix}
        </span>
      )}
    </span>
  )
}

function MoneyField({
  label,
  hint,
  value,
  onChange,
}: {
  label: ReactNode
  hint?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className={labelClass}>
      {label}
      <UnitInput value={value} onChange={onChange} prefix="R$" step="0.01" />
      {hint && <span className={hintClass}>{hint}</span>}
    </label>
  )
}

export default function SuperPricing() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((item) => item.value === searchParams.get('aba'))?.value ?? 'precos'

  const [pricing, setPricing] = useState<Pricing | null>(null)
  const [form, setForm] = useState<PricingForm | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [choice, setChoice] = useState<QuoteRequest | null>(null)
  const [quoteVersion, setQuoteVersion] = useState(0)
  const { quote, error: quoteError, pending: quotePending } = useQuote(choice, quoteVersion)

  useEffect(() => {
    fetchPricing()
      .then((res) => {
        setPricing(res)
        setForm(toForm(res))
        setChoice(defaultQuoteRequest(res))
      })
      .catch(() => setLoadError(true))
  }, [])

  const selectTab = (value: Tab) => {
    setSearchParams(value === 'precos' ? {} : { aba: value }, { replace: true })
    // Voltando dos cupons: um cupom criado ou mudado lá já vale na prévia.
    if (value === 'precos') setQuoteVersion((version) => version + 1)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form || !pricing) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await api.put<Pricing>('/admin/super/pricing', toPayload(form), token)
      setPricingCache(res)
      setChoice((prev) => (prev ? remapQuoteRequest(prev, pricing, res) : defaultQuoteRequest(res)))
      setQuoteVersion((version) => version + 1)
      setPricing(res)
      setForm(toForm(res))
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível salvar os preços.')
    } finally {
      setSaving(false)
    }
  }

  const updatePrice = (key: string, value: string) =>
    setForm((prev) => prev && { ...prev, prices: { ...prev.prices, [key]: value } })
  const updateSetting = (key: keyof PricingSettings, value: string) =>
    setForm((prev) => prev && { ...prev, settings: { ...prev.settings, [key]: value } })
  const updateTier = (key: number, field: 'max_guests' | 'amount', value: string) =>
    setForm(
      (prev) =>
        prev && { ...prev, tiers: prev.tiers.map((tier) => (tier.key === key ? { ...tier, [field]: value } : tier)) }
    )
  const addTier = () =>
    setForm((prev) => prev && { ...prev, tiers: [...prev.tiers, { key: ++nextRowKey, max_guests: '', amount: '0' }] })
  const removeTier = (key: number) =>
    setForm((prev) => prev && { ...prev, tiers: prev.tiers.filter((tier) => tier.key !== key) })

  // A maior faixa é aberta: cobre qualquer quantidade acima, sem limite no evento.
  const tierSizes = form?.tiers.map((tier) => Number(tier.max_guests)).filter((size) => size > 0) ?? []
  const openEndedSize = tierSizes.length ? Math.max(...tierSizes) : null
  const priceLabel = (key: string) => pricing?.prices.find((item) => item.key === key)?.label ?? key

  return (
    <div>
      <PageHeader
        title="Preços e planos"
        description="Valores do orçamento (no super e no simulador da home), regras dos planos e cupons. Eventos já vendidos não mudam: guardam o valor cobrado e o que foi contratado."
      />

      <PanelTabs tabs={TABS} value={tab} onChange={selectTab} className="mt-8" />

      <div className="mt-6">
        {tab === 'cupons' && <CouponsPanel />}

        {tab === 'precos' &&
          (loadError ? (
            <p className="text-sm text-rose-600">Não foi possível carregar a tabela de preços.</p>
          ) : !form || !pricing ? (
            <p className="text-[#8b7a9c]">Carregando...</p>
          ) : (
            <div className="space-y-5">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Section
                  icon={<CalendarHeart size={18} />}
                  title="Valor base por tipo de evento"
                  description="O ponto de partida do orçamento."
                >
                  {pricing.prices
                    .filter((item) => item.key.startsWith('base_'))
                    .map((item) => (
                      <MoneyField
                        key={item.key}
                        label={item.label}
                        value={form.prices[item.key] ?? ''}
                        onChange={(value) => updatePrice(item.key, value)}
                      />
                    ))}
                </Section>

                <Section
                  icon={<Users size={18} />}
                  title="Faixas de convidados"
                  description="Somadas à base. A maior faixa é aberta: cobre qualquer quantidade acima e o evento fica sem limite de convidados."
                >
                  <div className="sm:col-span-2">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] gap-3 text-sm font-medium text-[#3f3450]">
                      <span>Até quantas pessoas</span>
                      <span>Valor da faixa</span>
                    </div>
                    <ul className="mt-1 space-y-3">
                      {form.tiers.map((tier) => {
                        const size = Number(tier.max_guests)
                        const openEnded = size > 0 && size === openEndedSize
                        return (
                          <li key={tier.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-start gap-3">
                            <div>
                              <UnitInput
                                value={tier.max_guests}
                                min="1"
                                suffix="pessoas"
                                ariaLabel="Até quantas pessoas"
                                onChange={(value) => updateTier(tier.key, 'max_guests', value)}
                              />
                              {openEnded && (
                                <span className={hintClass}>Vendida como {size}+, sem limite de convidados.</span>
                              )}
                            </div>
                            <UnitInput
                              value={tier.amount}
                              prefix="R$"
                              step="0.01"
                              ariaLabel={`Valor da faixa de ${tier.max_guests || 'novas'} pessoas`}
                              onChange={(value) => updateTier(tier.key, 'amount', value)}
                            />
                            <button
                              type="button"
                              onClick={() => removeTier(tier.key)}
                              disabled={form.tiers.length === 1}
                              aria-label={`Remover a faixa de ${tier.max_guests || 'novas'} pessoas`}
                              title="Remover faixa"
                              className="cursor-pointer mt-1 flex h-10 w-9 items-center justify-center rounded-full text-[#8b7a9c] transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                              <Trash2 size={16} />
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                    <button
                      type="button"
                      onClick={addTier}
                      className="cursor-pointer mt-3 -ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-brand-primary transition hover:bg-brand-primary-soft"
                    >
                      <Plus size={16} />
                      Adicionar faixa
                    </button>
                  </div>
                </Section>

                <Section icon={<PackagePlus size={18} />} title="Adicionais" description="Somados quando o cliente escolhe.">
                  <MoneyField
                    label={priceLabel('gifts')}
                    value={form.prices.gifts ?? ''}
                    onChange={(value) => updatePrice('gifts', value)}
                  />
                  <MoneyField
                    label={priceLabel('premium')}
                    value={form.prices.premium ?? ''}
                    onChange={(value) => updatePrice('premium', value)}
                  />
                  <MoneyField
                    label={priceLabel('extra_admin')}
                    hint="Por admin, além dos incluídos."
                    value={form.prices.extra_admin ?? ''}
                    onChange={(value) => updatePrice('extra_admin', value)}
                  />
                </Section>

                <Section
                  icon={<SlidersHorizontal size={18} />}
                  title="Regras dos planos"
                  description="Valem para os próximos orçamentos e eventos. A margem vale na hora para todas as faixas."
                >
                  <label className={labelClass}>
                    Admins incluídos
                    <UnitInput
                      value={form.settings.included_admins}
                      min="1"
                      suffix="admins"
                      onChange={(value) => updateSetting('included_admins', value)}
                    />
                    <span className={hintClass}>Em todo evento. Os demais são admins extras.</span>
                  </label>
                  <label className={labelClass}>
                    Margem da faixa de convidados
                    <UnitInput
                      value={form.settings.guest_tolerance_percent}
                      suffix="%"
                      onChange={(value) => updateSetting('guest_tolerance_percent', value)}
                    />
                    <span className={hintClass}>
                      Quanto dá pra passar da faixa antes de travar o cadastro. Com 20%: 50 → 60.
                    </span>
                  </label>
                  <label className={labelClass}>
                    Acesso ao painel no Padrão
                    <UnitInput
                      value={form.settings.grace_days_standard}
                      suffix="dias"
                      onChange={(value) => updateSetting('grace_days_standard', value)}
                    />
                    <span className={hintClass}>Depois da data do evento.</span>
                  </label>
                  <label className={labelClass}>
                    Acesso ao painel no Premium
                    <UnitInput
                      value={form.settings.grace_days_premium}
                      suffix="dias"
                      onChange={(value) => updateSetting('grace_days_premium', value)}
                    />
                    <span className={hintClass}>Depois da data do evento.</span>
                  </label>
                </Section>

                <SaveBar saving={saving} error={saveError} saved={saved} />
              </form>

              {choice && (
                <Section
                  icon={<Calculator size={18} />}
                  title="Simular orçamento"
                  description="Com os valores já salvos."
                >
                  <div className="sm:col-span-2 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                    <QuoteFields pricing={pricing} value={choice} onChange={setChoice} />
                    <div className="rounded-xl bg-[#faf8fb] p-4">
                      <QuoteSummary quote={quote} error={quoteError} stale={quotePending} />
                    </div>
                  </div>
                </Section>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
