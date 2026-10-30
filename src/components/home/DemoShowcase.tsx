import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { demoInvitePath } from '../../lib/demo'
import { coverObjectPosition, NAME_FONT_CLASSES_COMPACT } from '../../lib/eventFormat'
import { EVENT_TYPES, formatHostNames } from '../../lib/eventTypes'
import { INVITE_STYLE_OPTIONS, resolveInviteStyle } from '../../lib/inviteStyles'
import type { DemoEvent } from '../../types'

function DemoCard({ demo }: { demo: DemoEvent }) {
  const style = INVITE_STYLE_OPTIONS.find((option) => option.value === resolveInviteStyle(demo))

  return (
    <Link
      to={demoInvitePath(demo)}
      className="group flex flex-col overflow-hidden rounded-3xl border border-brand-primary-soft bg-white shadow-sm transition hover:shadow-lg motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-4/3 overflow-hidden" style={{ backgroundColor: demo.color_primary }}>
        {demo.cover_photo_url && (
          <img
            src={demo.cover_photo_url}
            alt=""
            loading="lazy"
            style={{ objectPosition: coverObjectPosition(demo) }}
            className="h-full w-full object-cover transition duration-500 motion-safe:group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent" />
        <span
          className="absolute top-4 left-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold"
          style={{ color: demo.color_primary }}
        >
          {EVENT_TYPES[demo.event_type].label}
        </span>
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className={`${NAME_FONT_CLASSES_COMPACT[demo.name_font]} leading-tight drop-shadow`}>
            {formatHostNames(demo)}
          </p>
          {demo.subtitle && <p className="mt-1 text-sm text-white/85">{demo.subtitle}</p>}
        </div>
      </div>
      <div className="flex flex-1 items-center justify-between gap-3 p-5">
        {style && (
          <p className="min-w-0 text-sm text-[#6b5d80]">
            <span className="block text-xs font-semibold tracking-wider text-[#8b7a9c] uppercase">Abertura</span>
            {style.label} · {style.description}
          </p>
        )}
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-white"
          style={{ backgroundColor: demo.color_primary }}
        >
          Abrir
          <ArrowRight size={16} className="transition motion-safe:group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

/** Vitrine da home: um card por evento de exemplo, abrindo o convite de verdade. */
export function DemoShowcase({ demos }: { demos: DemoEvent[] }) {
  return (
    <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {demos.map((demo) => (
        <DemoCard key={demo.slug} demo={demo} />
      ))}
    </div>
  )
}
