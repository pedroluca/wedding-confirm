import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { whatsappLink } from '../lib/contact'
import { EVENT_TYPES } from '../lib/eventTypes'
import type { EventType } from '../types'

function demoWhatsappLink(eventType: EventType): string {
  return whatsappLink(
    `Oi! Vi o convite de exemplo de ${EVENT_TYPES[eventType].label.toLowerCase()} no site do Presenzo e quero um pro meu evento.`
  )
}

/**
 * Faixa no topo das páginas de um evento de exemplo (a vitrine da home).
 * Fica acima da cena do envelope (z-40) e abaixo dos modais (z-50).
 */
export function DemoBanner({ eventType }: { eventType: EventType }) {
  return (
    <div className="fixed inset-x-0 top-0 z-[45] border-b border-brand-primary-soft bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex h-10 max-w-3xl items-center gap-3 px-4 text-xs text-[#6b5d80] sm:text-sm">
        <Link to="/" aria-label="Página inicial do Presenzo" className="shrink-0">
          <img src="/presenzo-icon.svg" alt="" className="h-5 w-5" />
        </Link>
        <p className="min-w-0 flex-1 truncate">
          <span className="font-semibold text-[#3f3450]">Convite de exemplo</span>
          <span className="hidden sm:inline"> · explore à vontade, nada aqui é salvo</span>
        </p>
        <a
          href={demoWhatsappLink(eventType)}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 rounded-full bg-brand-primary px-3 py-1 font-semibold text-white transition hover:bg-brand-primary-hover"
        >
          Quero o meu
        </a>
      </div>
    </div>
  )
}

/** Chamada no fim da confirmação de um convite de exemplo. */
export function DemoCta({ eventType }: { eventType: EventType }) {
  return (
    <div className="mt-8 rounded-3xl border border-brand-primary-soft bg-white/80 p-5 text-center">
      <p className="font-semibold text-[#3f3450]">Gostou? O convite do seu evento pode ficar assim.</p>
      <p className="mt-1 text-sm text-[#6b5d80]">
        Este é um exemplo: no convite de verdade, a confirmação chega na hora no seu painel.
      </p>
      <a
        href={demoWhatsappLink(eventType)}
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover"
      >
        <MessageCircle size={18} />
        Quero um convite assim
      </a>
    </div>
  )
}
