import type { ReactNode } from 'react'
import { useEvent } from '../../lib/eventContext'
import { NAME_FONT_FAMILY } from '../../lib/eventFormat'
import type { NameFont } from '../../types'
import { WaxSeal } from './WaxSeal'

// Um pouco menores que no topo do convite, pra caber numa linha só no celular.
const CLOSED_NAME_CLASSES: Record<NameFont, string> = {
  sans: 'font-sans text-4xl',
  fleur: 'font-fleur text-5xl',
  pinyon: 'font-pinyon text-5xl',
}

export type EnvelopeProps = {
  opening: boolean
  onOpen?: () => void
  /** Miniatura do seletor de abertura: sem os nomes, sem clique e sem ocupar a tela. */
  preview?: boolean
}

/**
 * Tela do convite fechado, comum a todos os envelopes: os nomes em cima e o
 * envelope (children) flutuando, com a dica de interação no brilho do selo.
 * As animações de abertura ficam em invite.css, disparadas por .is-opening.
 */
export function EnvelopeScene({
  opening,
  onOpen,
  preview = false,
  className,
  children,
}: EnvelopeProps & { className: string; children: ReactNode }) {
  const event = useEvent()

  return (
    <div className={`envelope-scene ${opening ? 'is-opening' : ''} ${preview ? 'is-preview' : ''}`}>
      {!preview && (
        <h1
          className={`envelope-names ${CLOSED_NAME_CLASSES[event.name_font]} text-center font-normal text-balance text-[#3f3450] motion-safe:animate-fade-up`}
        >
          {event.host_name}
          {event.host_name_secondary && (
            <>
              {' '}
              <span className="font-serif text-brand-primary italic">&amp;</span> {event.host_name_secondary}
            </>
          )}
          {event.subtitle && (
            <span className="mt-3 block font-serif text-2xl text-brand-primary italic">{event.subtitle}</span>
          )}
        </h1>
      )}

      <div className="envelope-stage">
        <span className="envelope-shadow" aria-hidden />
        {preview ? (
          <span className={className} aria-hidden>
            {children}
          </span>
        ) : (
          <button type="button" className={className} onClick={onOpen} disabled={opening} aria-label="Abrir convite">
            {children}
          </button>
        )}
      </div>
    </div>
  )
}

/** Iniciais no cartão de dentro do envelope. */
export function EnvelopeMonogram() {
  const event = useEvent()

  return (
    <span className={`${NAME_FONT_FAMILY[event.name_font]} text-3xl text-brand-primary`}>
      {event.host_name.trim().charAt(0)}
      {event.host_name_secondary && <> &amp; {event.host_name_secondary.trim().charAt(0)}</>}
    </span>
  )
}

const SEAL_HALVES = {
  vertical: ['seal-half-left', 'seal-half-right'],
  horizontal: ['seal-half-top', 'seal-half-bottom'],
}

/**
 * Selo de cera que racha ao abrir. crack é a direção da rachadura: vertical
 * (metades esquerda/direita) ou horizontal (de cima/de baixo).
 */
export function EnvelopeSeal({ opening, crack = 'vertical' }: { opening: boolean; crack?: 'vertical' | 'horizontal' }) {
  const [first, second] = SEAL_HALVES[crack]

  // Inteiro enquanto fechado; só vira duas metades na hora de rachar,
  // senão a emenda entre elas aparece como um fio no selo parado.
  return (
    <span className="envelope-seal">
      {opening ? (
        <>
          <span className={`envelope-seal-half ${first}`}>
            <WaxSeal />
          </span>
          <span className={`envelope-seal-half ${second}`}>
            <WaxSeal />
          </span>
        </>
      ) : (
        <>
          <span className="envelope-seal-glow" />
          <span className="envelope-seal-half">
            <WaxSeal />
          </span>
        </>
      )}
    </span>
  )
}
