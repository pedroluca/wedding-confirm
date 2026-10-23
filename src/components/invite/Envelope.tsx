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

/**
 * Tela do convite fechado: só os nomes do casal e o envelope com o selo (a
 * dica de interação é o brilho pulsando atrás do selo). As animações de
 * abertura ficam em invite.css, disparadas por .is-opening.
 */
export function Envelope({ opening, onOpen }: { opening: boolean; onOpen: () => void }) {
  const event = useEvent()

  return (
    <div className={`envelope-scene ${opening ? 'is-opening' : ''}`}>
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
      </h1>

      <div className="envelope-stage">
        <span className="envelope-shadow" aria-hidden />
        <button type="button" className="envelope" onClick={onOpen} disabled={opening} aria-label="Abrir convite">
          <span className="envelope-back" />

          <span className="envelope-letter">
            <span className={`${NAME_FONT_FAMILY[event.name_font]} text-3xl text-brand-primary`}>
              {event.host_name.trim().charAt(0)}
              {event.host_name_secondary && <> &amp; {event.host_name_secondary.trim().charAt(0)}</>}
            </span>
          </span>

          {/* Bolso da frente: abas laterais + aba de baixo. */}
          <svg className="envelope-pocket" viewBox="0 0 140 100" preserveAspectRatio="none" aria-hidden>
            <path d="M0 0 L67 55 L0 100 Z" style={{ fill: 'var(--env-side)' }} />
            <path d="M140 0 L73 55 L140 100 Z" style={{ fill: 'var(--env-side)' }} />
            <path
              d="M0 100 L70 45 L140 100 Z"
              style={{ fill: 'var(--env-paper)' }}
              stroke="#3f3450"
              strokeOpacity="0.08"
              strokeWidth="0.6"
            />
          </svg>

          <span className="envelope-flap">
            <span className="envelope-flap-edge" />
            <span className="envelope-flap-face">
              <span className="envelope-flap-liner" />
            </span>
          </span>

          {/* Inteiro enquanto fechado; só vira duas metades na hora de rachar,
              senão a emenda entre elas aparece como um fio no selo parado. */}
          <span className="envelope-seal">
            {opening ? (
              <>
                <span className="envelope-seal-half seal-half-left">
                  <WaxSeal />
                </span>
                <span className="envelope-seal-half seal-half-right">
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
        </button>
      </div>
    </div>
  )
}
