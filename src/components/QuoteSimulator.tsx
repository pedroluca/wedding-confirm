import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { whatsappLink } from '../lib/contact'
import { currencyFormatter, defaultQuoteRequest, describeQuoteRequest, usePricing, useQuote } from '../lib/pricing'
import { QuoteFields, QuoteSummary } from './panel/Quote'
import type { QuoteRequest } from '../types'

/**
 * "Simule seu convite" na home: a pessoa monta o evento, vê o valor "a partir
 * de" (calculado pela API, com cupom) e pede pelo WhatsApp com a escolha já
 * escrita na mensagem. Some enquanto a tabela de preços não estiver
 * preenchida no super-admin, pra nunca mostrar R$ 0,00.
 */
export function QuoteSimulator() {
  const pricing = usePricing()
  const [choice, setChoice] = useState<QuoteRequest | null>(null)
  const configured = pricing?.prices.some((item) => item.key.startsWith('base_') && item.amount > 0) ?? false
  const request = pricing && configured ? (choice ?? defaultQuoteRequest(pricing)) : null
  const { quote, error, pending } = useQuote(request)

  if (!pricing || !request) return null

  // Valor e cupom só entram na mensagem com o orçamento já da escolha atual
  // (e o cupom, só se valeu).
  const current = pending ? null : quote
  const lines = describeQuoteRequest({ ...request, coupon: current?.coupon?.code ?? '' }, pricing)
  const message = [
    'Olá! Simulei um convite no Presenzo:',
    ...lines.map((line) => `• ${line}`),
    current ? `Ficou a partir de ${currencyFormatter.format(current.total)}. Podemos conversar?` : 'Podemos conversar?',
  ].join('\n')

  return (
    <section className="mt-16 sm:mt-20">
      <p className="text-center font-display text-sm font-semibold tracking-widest text-brand-primary uppercase">
        Simule seu convite
      </p>
      <div className="mt-8 rounded-3xl border border-brand-primary-soft bg-white p-5 sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <QuoteFields pricing={pricing} value={request} onChange={setChoice} />
          <div className="rounded-2xl bg-brand-primary-soft/30 p-5">
            <QuoteSummary quote={quote} error={error} totalLabel="A partir de" stale={pending} />
            <a
              href={whatsappLink(message)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3.5 font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              <MessageCircle size={18} />
              Pedir pelo WhatsApp
            </a>
            <p className="mt-2 text-center text-xs text-[#8b7a9c]">O valor final a gente fecha com você por lá.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
