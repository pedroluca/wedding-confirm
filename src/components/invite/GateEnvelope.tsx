import { EnvelopeMonogram, EnvelopeScene, EnvelopeSeal, type EnvelopeProps } from './EnvelopeScene'

/**
 * Estilos "Portas" e "Vertical": envelope de abertura central. Duas abas se
 * encontram no meio, presas pelo selo; ao abrir, o selo racha na emenda, as
 * abas giram para fora (para os lados ou para cima e para baixo) e o cartão
 * de dentro vem para a frente.
 */
export function GateEnvelope({ orientation, ...props }: EnvelopeProps & { orientation: 'horizontal' | 'vertical' }) {
  return (
    <EnvelopeScene {...props} className={`envelope gate gate-${orientation}`}>
      <span className="gate-card">
        <EnvelopeMonogram />
      </span>

      {/* Cada aba tem a frente e o forro (verso), que aparece quando ela passa de 90°. */}
      <span className="gate-door gate-door-start">
        <span className="gate-door-face" />
        <span className="gate-door-liner" />
      </span>
      <span className="gate-door gate-door-end">
        <span className="gate-door-face" />
        <span className="gate-door-liner" />
      </span>

      {/* A rachadura segue a emenda das abas. */}
      <EnvelopeSeal opening={props.opening} crack={orientation === 'horizontal' ? 'vertical' : 'horizontal'} />
    </EnvelopeScene>
  )
}
