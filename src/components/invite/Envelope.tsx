import { EnvelopeMonogram, EnvelopeScene, EnvelopeSeal, type EnvelopeProps } from './EnvelopeScene'

/** Estilo "Carta": envelope com aba triangular que gira e deixa a carta subir. */
export function Envelope(props: EnvelopeProps) {
  return (
    <EnvelopeScene {...props} className="envelope">
      <span className="envelope-back" />

      <span className="envelope-letter">
        <EnvelopeMonogram />
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

      <EnvelopeSeal opening={props.opening} />
    </EnvelopeScene>
  )
}
