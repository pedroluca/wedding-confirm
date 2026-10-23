import { useState } from 'react'
import { usePricing, useQuote } from '../../lib/pricing'
import type { EventType, Pricing, Quote, QuoteRequest } from '../../types'
import { QuoteFields, QuoteSummary } from './Quote'
import { secondaryButtonClass } from './ui'

/**
 * Calculadora de venda do super-admin ("Novo evento" e aba Plano): o tipo
 * vem do formulário do evento; faixa, adicionais e cupom são escolhidos
 * aqui. O orçamento é sempre da API, e "Aplicar ao evento" passa o
 * resultado (plano, contratado e valor) pro formulário.
 */
export function QuoteCalculator({
  eventType,
  initial,
  onApply,
}: {
  eventType: EventType
  /** Escolha de partida, quando a tabela de preços carrega. */
  initial: (pricing: Pricing) => QuoteRequest | null
  onApply: (quote: Quote, request: QuoteRequest) => void
}) {
  const pricing = usePricing()
  const [choice, setChoice] = useState<QuoteRequest | null>(null)
  const start = choice ?? (pricing ? initial(pricing) : null)
  const request = start && { ...start, event_type: eventType }
  const { quote, error, pending } = useQuote(request)

  if (!pricing) return <p className="text-sm text-[#8b7a9c]">Carregando a tabela de preços...</p>
  if (!request) {
    return <p className="text-sm text-[#8b7a9c]">Cadastre as faixas de convidados em Preços e planos.</p>
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <QuoteFields pricing={pricing} value={request} onChange={setChoice} lockEventType />
      <div className="rounded-xl bg-[#faf8fb] p-4">
        <QuoteSummary quote={quote} error={error} totalLabel="Sugerido" stale={pending} />
        <button
          type="button"
          disabled={!quote || pending}
          onClick={() => quote && onApply(quote, request)}
          className={`${secondaryButtonClass} mt-4 w-full`}
        >
          Aplicar ao evento
        </button>
      </div>
    </div>
  )
}
