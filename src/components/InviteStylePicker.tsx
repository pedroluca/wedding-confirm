import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { EventContext } from '../lib/eventContext'
import { INVITE_STYLE_OPTIONS, OPEN_DURATION_MS } from '../lib/inviteStyles'
import type { InviteStyle, PublicEvent } from '../types'
import { Envelope } from './invite/Envelope'
import { GateEnvelope } from './invite/GateEnvelope'
import './invite/invite.css'

// A miniatura é a cena de verdade nesse tamanho, reduzida com scale() até
// caber no cartão (ver .envelope-scene.is-preview em invite.css).
const SCENE_SIZE = 560
// Duração de animate-invite-in (index.css), a "abertura" do estilo Direto.
const DIRECT_OPEN_MS = 700
// Pausa depois da abertura antes de a miniatura voltar a fechar.
const REPLAY_PAUSE_MS = 700

/** Esboço da tela interna, sem foto nem texto: só o formato do convite. */
function DirectThumbnail({ opening }: { opening: boolean }) {
  return (
    <span
      className={`flex h-full flex-col items-center justify-center gap-5 ${opening ? 'motion-safe:animate-invite-in' : ''}`}
    >
      <span className="h-10 w-72 rounded-full bg-brand-primary/50" />
      <span className="h-5 w-56 rounded-full bg-[#3f3450]/15" />
      <span className="h-5 w-64 rounded-full bg-[#3f3450]/15" />
      <span className="mt-6 h-14 w-80 rounded-full bg-brand-primary" />
    </span>
  )
}

function OpeningThumbnail({ style, opening }: { style: InviteStyle; opening: boolean }) {
  if (style === 'direct') return <DirectThumbnail opening={opening} />
  if (style === 'letter') return <Envelope opening={opening} preview />
  return <GateEnvelope orientation={style === 'doors' ? 'horizontal' : 'vertical'} opening={opening} preview />
}

function ThumbnailFrame({ color, children }: { color: string; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden
      className="invite-root block aspect-square w-full overflow-hidden rounded-xl"
      style={{ '--color-brand-primary': color } as CSSProperties}
    >
      <span
        className="absolute top-0 left-0 block origin-top-left"
        style={{ width: SCENE_SIZE, height: SCENE_SIZE, transform: `scale(${width / SCENE_SIZE})` }}
      >
        {children}
      </span>
    </span>
  )
}

/**
 * Escolha do estilo de abertura do convite, com uma miniatura de cada um na
 * cor, na fonte e com as iniciais do evento (vindas de `event`, já com o que
 * está no formulário). Escolher um estilo toca a abertura dele na miniatura.
 */
export function InviteStylePicker({
  event,
  value,
  onChange,
}: {
  event: PublicEvent
  value: InviteStyle
  onChange: (style: InviteStyle) => void
}) {
  // key muda a cada clique pra remontar a miniatura e repetir a animação.
  const [playing, setPlaying] = useState<{ style: InviteStyle; key: number } | null>(null)
  const playCount = useRef(0)
  const timer = useRef(0)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const select = (style: InviteStyle) => {
    onChange(style)
    window.clearTimeout(timer.current)
    playCount.current += 1
    setPlaying({ style, key: playCount.current })
    const duration = style === 'direct' ? DIRECT_OPEN_MS : OPEN_DURATION_MS[style]
    timer.current = window.setTimeout(() => setPlaying(null), duration + REPLAY_PAUSE_MS)
  }

  return (
    <EventContext.Provider value={event}>
      <div role="radiogroup" aria-label="Estilo de abertura" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {INVITE_STYLE_OPTIONS.map((option) => {
          const selected = option.value === value
          const isPlaying = playing?.style === option.value

          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => select(option.value)}
              className={`cursor-pointer flex flex-col rounded-2xl border bg-white p-2 text-left transition ${
                selected
                  ? 'border-brand-primary ring-2 ring-brand-primary/25'
                  : 'border-brand-primary-soft hover:border-brand-primary/40'
              }`}
            >
              <ThumbnailFrame color={event.color_primary}>
                <OpeningThumbnail key={isPlaying ? playing.key : 'idle'} style={option.value} opening={isPlaying} />
              </ThumbnailFrame>
              <span className="mt-2 block px-1 text-sm font-semibold text-[#3f3450]">{option.label}</span>
              <span className="block px-1 pb-1 text-xs text-[#8b7a9c]">{option.description}</span>
            </button>
          )
        })}
      </div>
    </EventContext.Provider>
  )
}
