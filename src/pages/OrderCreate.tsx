import { useState, type FormEvent } from 'react'
import { ArrowLeft, CalendarHeart, Lock, MessageCircle, Sparkles, UserRound } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { checkoutEnabled, formatPhone, quoteRequestFromSearch } from '../lib/checkout'
import { WHATSAPP_URL, whatsappLink } from '../lib/contact'
import { EVENT_TYPES } from '../lib/eventTypes'
import { usePricing, useQuote } from '../lib/pricing'
import { Copyright } from '../components/DevCredit'
import { PageShell } from '../components/PageShell'
import { QuoteFields, QuoteSummary } from '../components/panel/Quote'
import { checkboxLabelClass, hintClass, inputClass, labelClass, Section } from '../components/panel/form'
import type { PublicOrder, QuoteRequest } from '../types'

type ContactForm = {
  name: string
  email: string
  phone: string
  host_name: string
  host_name_secondary: string
  subtitle: string
  event_date: string
  no_date: boolean
  notes: string
  /** Campo isca: invisível pra gente, robô preenche (a API ignora o pedido). */
  website: string
}

const EMPTY_FORM: ContactForm = {
  name: '',
  email: '',
  phone: '',
  host_name: '',
  host_name_secondary: '',
  subtitle: '',
  event_date: '',
  no_date: false,
  notes: '',
  website: '',
}

/** Hoje no fuso de quem está no site (o mínimo do campo de data). */
function todayIso(): string {
  const now = new Date()
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function PageHeader() {
  return (
    <header className="flex items-center justify-between gap-4">
      <Link to="/" aria-label="Página inicial do Presenzo">
        <img src="/presenzo-logo.svg" alt="Presenzo" className="h-8 w-auto" />
      </Link>
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[#6b5d80] transition hover:text-brand-primary"
      >
        <ArrowLeft size={16} />
        Voltar
      </Link>
    </header>
  )
}

/**
 * /contratar: a pessoa escolhe o convite, informa os dados e paga na página
 * do Mercado Pago. O preço é sempre o que a API calcula (aqui e de novo no
 * POST /orders). A escolha pode chegar pela URL (simulador da home ou um
 * link com cupom, ver contractPath). Sem a compra pelo site ligada, mostra
 * o caminho do WhatsApp.
 */
export default function OrderCreate() {
  const pricing = usePricing()
  const [searchParams] = useSearchParams()
  const [choice, setChoice] = useState<QuoteRequest | null>(null)
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canContract = checkoutEnabled(pricing)
  const request = pricing && canContract ? (choice ?? quoteRequestFromSearch(searchParams, pricing)) : null
  const { quote, error: quoteError, pending } = useQuote(request)

  const update = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  if (!pricing) {
    return (
      <PageShell>
        <p className="text-[#6b5d80]">Carregando...</p>
      </PageShell>
    )
  }

  if (!canContract || !request) {
    return (
      <PageShell footer={<Copyright />}>
        <div className="w-full max-w-md text-center">
          <img src="/presenzo-logo.svg" alt="Presenzo" className="mx-auto h-9 w-auto" />
          <div className="mt-6 rounded-3xl border border-brand-primary-soft bg-white p-8 shadow-lg shadow-brand-primary-soft">
            <h1 className="text-xl font-semibold text-[#3f3450]">Vamos montar o seu convite?</h1>
            <p className="mt-3 text-sm text-[#6b5d80]">
              Por enquanto, a contratação é pelo WhatsApp: conta pra gente como é o seu evento e a gente configura tudo
              pra você.
            </p>
            <a
              href={WHATSAPP_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              <MessageCircle size={18} />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </PageShell>
    )
  }

  const profile = EVENT_TYPES[request.event_type]
  const isWedding = request.event_type === 'wedding'
  // O cupom que zera o pedido não passa pelo Mercado Pago (ver POST /orders).
  const freeOrder = quote !== null && !pending && quote.total < 1
  const blocked = !quote || pending || Boolean(quote.coupon_error) || freeOrder
  const maxInstallments = pricing.checkout?.max_installments ?? 1

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (blocked || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await api.post<{ order: PublicOrder; checkout_url: string | null }>('/orders', {
        choice: request,
        customer: { name: form.name, email: form.email, phone: form.phone },
        event: {
          host_name: form.host_name,
          host_name_secondary: form.host_name_secondary,
          subtitle: request.event_type === 'other' ? form.subtitle : '',
          event_date: form.no_date ? '' : form.event_date,
        },
        notes: form.notes,
        website: form.website,
      })
      if (!res.checkout_url) throw new Error('sem checkout_url')
      window.location.assign(res.checkout_url)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível abrir o pagamento. Tente de novo em instantes.')
      setSubmitting(false)
    }
  }

  return (
    <PageShell footer={<Copyright />}>
      <div className="w-full max-w-5xl self-start">
        <PageHeader />
        <h1 className="mt-8 font-display text-3xl font-semibold text-[#3f3450] sm:text-4xl">Contratar</h1>
        <p className="mt-2 max-w-xl text-[#6b5d80]">
          Escolha o que o seu convite precisa, pague com Pix ou cartão e a gente prepara tudo pra você.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
          <div className="space-y-5">
            <Section icon={<Sparkles size={18} />} title="Seu convite" description="O valor é atualizado na hora.">
              <div className="sm:col-span-2">
                <QuoteFields pricing={pricing} value={request} onChange={setChoice} />
              </div>
            </Section>

            <Section
              icon={<UserRound size={18} />}
              title="Seus dados"
              description="Pra gente te mandar o acesso ao painel e falar com você se precisar."
            >
              <label className={`${labelClass} sm:col-span-2`}>
                Seu nome
                <input
                  required
                  maxLength={150}
                  autoComplete="name"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Email
                <input
                  required
                  type="email"
                  maxLength={190}
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update('email', e.target.value)}
                  className={inputClass}
                />
                <span className={hintClass}>Já tem conta no Presenzo? Use o mesmo email.</span>
              </label>
              <label className={labelClass}>
                WhatsApp
                <input
                  required
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="(00) 00000-0000"
                  pattern="\(\d{2}\) \d{4,5}-\d{4}"
                  title="Informe o WhatsApp com DDD."
                  value={form.phone}
                  onChange={(e) => update('phone', formatPhone(e.target.value))}
                  className={inputClass}
                />
              </label>
            </Section>

            <Section
              icon={<CalendarHeart size={18} />}
              title="Sobre o evento"
              description="Do jeito que vai aparecer no convite. Dá pra mudar depois, no painel."
            >
              <label className={labelClass}>
                {profile.hostLabels[0]}
                <input
                  required
                  maxLength={150}
                  value={form.host_name}
                  onChange={(e) => update('host_name', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                {profile.hostLabels[1]}
                <input
                  required={isWedding}
                  maxLength={150}
                  value={form.host_name_secondary}
                  onChange={(e) => update('host_name_secondary', e.target.value)}
                  className={inputClass}
                />
              </label>
              {request.event_type === 'other' && (
                <label className={`${labelClass} sm:col-span-2`}>
                  Qual é a celebração? <span className="font-normal text-[#8b7a9c]">(opcional)</span>
                  <input
                    maxLength={150}
                    placeholder={profile.subtitlePlaceholder}
                    value={form.subtitle}
                    onChange={(e) => update('subtitle', e.target.value)}
                    className={inputClass}
                  />
                </label>
              )}
              <div className={labelClass}>
                <label htmlFor="event-date">Data do evento</label>
                <input
                  id="event-date"
                  type="date"
                  required={!form.no_date}
                  disabled={form.no_date}
                  min={todayIso()}
                  value={form.no_date ? '' : form.event_date}
                  onChange={(e) => update('event_date', e.target.value)}
                  className={`${inputClass} disabled:opacity-50`}
                />
                <label className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={form.no_date}
                    onChange={(e) => update('no_date', e.target.checked)}
                    className="accent-brand-primary"
                  />
                  Ainda não sei
                </label>
              </div>
              <label className={`${labelClass} sm:col-span-2`}>
                Alguma coisa que a gente deva saber? <span className="font-normal text-[#8b7a9c]">(opcional)</span>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.notes}
                  onChange={(e) => update('notes', e.target.value)}
                  className={inputClass}
                />
              </label>
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={form.website}
                onChange={(e) => update('website', e.target.value)}
                className="hidden"
              />
            </Section>
          </div>

          <aside className="rounded-3xl border border-brand-primary-soft bg-white p-5 sm:p-6 lg:sticky lg:top-6">
            <h2 className="font-semibold text-[#3f3450]">Resumo</h2>
            <div className="mt-3">
              <QuoteSummary quote={quote} error={quoteError} stale={pending} />
            </div>

            {freeOrder ? (
              <p className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-800">
                Esse cupom precisa ser usado com a gente.{' '}
                <a href={whatsappLink(`Oi! Quero usar o cupom ${request.coupon ?? ''} no meu convite.`)} target="_blank" rel="noreferrer" className="font-semibold underline">
                  Fale pelo WhatsApp
                </a>
                .
              </p>
            ) : (
              <button
                type="submit"
                disabled={blocked || submitting}
                className="cursor-pointer mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3.5 font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-default disabled:opacity-60"
              >
                <Lock size={16} />
                {submitting ? 'Abrindo o pagamento...' : 'Ir para o pagamento'}
              </button>
            )}
            {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

            <p className="mt-3 text-center text-xs text-[#8b7a9c]">
              Pix ou cartão em até {maxInstallments}x, na página segura do Mercado Pago.
            </p>
            <div className="mt-5 space-y-2 border-t border-[#ece6f0] pt-4 text-xs text-[#6b5d80]">
              <p>
                Depois do pagamento, a gente prepara o seu convite e te manda um email pra entrar no painel, onde você
                personaliza tudo e cadastra os convidados.
              </p>
              <p>
                Dúvidas?{' '}
                <a href={WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-semibold text-brand-primary hover:underline">
                  Fale com a gente no WhatsApp
                </a>
                .
              </p>
            </div>
          </aside>
        </form>
      </div>
    </PageShell>
  )
}
