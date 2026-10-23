import { useId } from 'react'
import { useEvent } from '../../lib/eventContext'
import { NAME_FONT_FAMILY } from '../../lib/eventFormat'

type Point = [number, number]

const fmt = (n: number) => n.toFixed(2)
const midpoint = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]

/**
 * Contorno irregular de cera derretida: raio varia de forma determinística
 * em volta do círculo, ligado por curvas quadráticas nos pontos médios.
 */
function buildWaxOutline(): string {
  const count = 22
  const points: Point[] = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2
    const radius = 45 + 2.4 * Math.sin(i * 2.3) + 1.6 * Math.cos(i * 4.7)
    return [50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle)]
  })

  const start = midpoint(points[count - 1], points[0])
  const curves = points.map((point, i) => {
    const end = midpoint(point, points[(i + 1) % count])
    return `Q ${fmt(point[0])} ${fmt(point[1])} ${fmt(end[0])} ${fmt(end[1])}`
  })
  return `M ${fmt(start[0])} ${fmt(start[1])} ${curves.join(' ')} Z`
}

const WAX_OUTLINE = buildWaxOutline()

// Bolinhas em relevo em volta da área carimbada, como nos sinetes clássicos.
const BEADS: Point[] = Array.from({ length: 28 }, (_, i) => {
  const angle = (i / 28) * Math.PI * 2
  return [50 + 38 * Math.cos(angle), 50 + 38 * Math.sin(angle)]
})

const wax = (percent: number, mix: string) =>
  `color-mix(in srgb, var(--color-brand-primary) ${percent}%, ${mix})`

const initialOf = (name: string) => name.trim().charAt(0).toLocaleUpperCase('pt-BR')

/** Selo de cera com as iniciais do casal, na cor e na fonte do evento. */
export function WaxSeal({ className }: { className?: string }) {
  const event = useEvent()
  // useId pode ter caracteres que quebram url(#...); fica só com o seguro.
  const id = `seal${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const initials = event.host_name_secondary
    ? `${initialOf(event.host_name)}&${initialOf(event.host_name_secondary)}`
    : initialOf(event.host_name)
  const isScript = event.name_font !== 'sans'
  const fontSize = event.host_name_secondary ? (isScript ? 30 : 21) : isScript ? 40 : 30

  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-wax`} cx="36%" cy="30%" r="78%">
          <stop offset="0%" style={{ stopColor: wax(60, 'white') }} />
          <stop offset="45%" style={{ stopColor: wax(82, 'black') }} />
          <stop offset="100%" style={{ stopColor: wax(48, 'black') }} />
        </radialGradient>
        {/* área carimbada: levemente afundada (mais escura em cima) */}
        <radialGradient id={`${id}-press`} cx="62%" cy="68%" r="75%">
          <stop offset="0%" style={{ stopColor: wax(78, 'black') }} />
          <stop offset="100%" style={{ stopColor: wax(52, 'black') }} />
        </radialGradient>
        <filter id={`${id}-emboss`} x="-10%" y="-10%" width="120%" height="120%">
          {/* letras em relevo: sombra embaixo/direita, brilho em cima/esquerda */}
          <feDropShadow dx="0.6" dy="0.8" stdDeviation="0.3" floodColor="#000" floodOpacity="0.55" />
          <feDropShadow dx="-0.4" dy="-0.5" stdDeviation="0.2" floodColor="#fff" floodOpacity="0.3" />
        </filter>
      </defs>

      <path d={WAX_OUTLINE} style={{ fill: `url(#${id}-wax)` }} />
      <circle cx="50" cy="50" r="34.5" fill="none" stroke="#fff" strokeOpacity="0.2" strokeWidth="0.8" />
      <circle cx="50" cy="50" r="33" style={{ fill: `url(#${id}-press)` }} stroke="#000" strokeOpacity="0.28" />
      {BEADS.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" fill="#fff" fillOpacity="0.22" />
      ))}
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={fontSize}
        letterSpacing={isScript ? 0 : 1}
        className={NAME_FONT_FAMILY[event.name_font]}
        style={{ fill: wax(70, 'white') }}
        filter={`url(#${id}-emboss)`}
      >
        {initials}
      </text>
    </svg>
  )
}
