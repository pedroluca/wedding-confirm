import type { KeyboardEvent, MouseEvent } from 'react'

export type CoverFocus = { x: number; y: number }

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

// Setas movem o ponto de 5 em 5% (quem usa teclado não tem como clicar na foto).
const ARROW_STEPS: Record<string, [number, number]> = {
  ArrowLeft: [-5, 0],
  ArrowRight: [5, 0],
  ArrowUp: [0, -5],
  ArrowDown: [0, 5],
}

/**
 * Ponto de foco da foto de capa: o admin clica no que não pode ser cortado
 * (o rosto, o casal) e vê o recorte no celular e no computador, nas mesmas
 * proporções da capa do convite (CoverHero).
 */
export function CoverFocusPicker({
  src,
  focus,
  onChange,
}: {
  src: string
  focus: CoverFocus
  onChange: (focus: CoverFocus) => void
}) {
  const objectPosition = `${focus.x}% ${focus.y}%`

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    // Enter/espaço também disparam click, sem posição: o teclado usa as setas.
    if (e.detail === 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    onChange({
      x: clampPercent(((e.clientX - rect.left) / rect.width) * 100),
      y: clampPercent(((e.clientY - rect.top) / rect.height) * 100),
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = ARROW_STEPS[e.key]
    if (!step) return
    e.preventDefault()
    onChange({ x: clampPercent(focus.x + step[0]), y: clampPercent(focus.y + step[1]) })
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={`Ponto de foco da foto: ${focus.x}% da largura, ${focus.y}% da altura. Clique na foto ou use as setas.`}
        className="relative inline-block max-w-full cursor-crosshair overflow-hidden rounded-xl align-top outline-offset-2"
      >
        <img src={src} alt="" draggable={false} className="block h-auto max-h-64 w-auto max-w-full" />
        <span
          aria-hidden
          style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
          className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-brand-primary/40 shadow-md ring-2 ring-brand-primary"
        />
      </button>

      <div className="flex items-end gap-3">
        <figure>
          <div className="h-28 w-18 overflow-hidden rounded-lg ring-1 ring-black/10">
            <img src={src} alt="" style={{ objectPosition }} className="h-full w-full object-cover" />
          </div>
          <figcaption className="mt-1 text-center text-xs text-[#8b7a9c]">Celular</figcaption>
        </figure>
        <figure>
          <div className="h-28 w-37 overflow-hidden rounded-lg ring-1 ring-black/10">
            <img src={src} alt="" style={{ objectPosition }} className="h-full w-full object-cover" />
          </div>
          <figcaption className="mt-1 text-center text-xs text-[#8b7a9c]">Computador</figcaption>
        </figure>
      </div>
    </div>
  )
}
