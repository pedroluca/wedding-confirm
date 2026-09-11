import { useEvent } from '../lib/eventContext'
import type { NameFont } from '../types'

const NAME_FONT_CLASSES: Record<NameFont, string> = {
  sans: 'font-sans text-5xl',
  fleur: 'font-fleur text-6xl',
  pinyon: 'font-pinyon text-6xl',
}

const NAME_FONT_CLASSES_COMPACT: Record<NameFont, string> = {
  sans: 'font-sans text-2xl',
  fleur: 'font-fleur text-4xl',
  pinyon: 'font-pinyon text-4xl',
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })

function formatEventDate(mysqlDateTime: string): string {
  // DATETIME do MySQL chega como "2026-12-13 10:30:00" (sem timezone); troca
  // o espaço por "T" pra evitar que o browser interprete o formato errado.
  const date = new Date(mysqlDateTime.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return mysqlDateTime

  return `${dateFormatter.format(date)} às ${timeFormatter.format(date).replace(':', 'h')}`
}

export function InviteDetails({
  isHome = false,
  compact = false,
}: {
  isHome?: boolean
  compact?: boolean
}) {
  const event = useEvent()
  const isWedding = event.event_type === 'wedding'

  return (
    <div className="mx-auto w-full max-w-md text-center">
      {event.logo_url && (
        <img
          src={event.logo_url}
          alt=""
          className={
            compact
              ? 'mx-auto mb-3 w-20 rounded-full shadow-md shadow-brand-primary-soft'
              : 'mx-auto mb-8 w-50 rounded-full shadow-lg shadow-brand-primary-soft'
          }
        />
      )}
      <h1
        className={`${compact ? NAME_FONT_CLASSES_COMPACT[event.name_font] : NAME_FONT_CLASSES[event.name_font]} ${compact ? '' : 'mt-2'} font-normal text-[#3f3450]`}
      >
        <span className="block">{event.host_name}</span>
        {event.host_name_secondary && (
          <>
            <span className={compact ? 'block text-base leading-none' : 'block text-3xl leading-none'}>e</span>
            <span className="block">{event.host_name_secondary}</span>
          </>
        )}
      </h1>

      {!isHome && !compact && (
        <>
          {event.event_date && (
            <p className="mt-4 text-lg text-[#6b5d80]">{formatEventDate(event.event_date)}</p>
          )}

          <dl className="mt-8 space-y-4 rounded-3xl border border-brand-primary-soft bg-brand-primary-soft p-6 text-left">
            {event.venue_name && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-brand-primary uppercase">
                  {isWedding ? 'Cerimônia' : 'Local'}
                </dt>
                <dd className="text-[#3f3450]">{event.venue_name}</dd>
              </div>
            )}
            {isWedding && event.venue_name_secondary && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-brand-primary uppercase">Festa</dt>
                <dd className="text-[#3f3450]">{event.venue_name_secondary}</dd>
              </div>
            )}
            {event.address && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-brand-primary uppercase">Endereço</dt>
                <dd className="text-[#3f3450]">
                  {event.maps_url ? (
                    <a
                      href={event.maps_url}
                      target="_blank"
                      rel="noreferrer"
                      className="underline decoration-brand-primary underline-offset-4"
                    >
                      {event.address}
                    </a>
                  ) : (
                    event.address
                  )}
                </dd>
              </div>
            )}
            {event.dress_code && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-brand-primary uppercase">Traje</dt>
                <dd className="text-[#3f3450]">{event.dress_code}</dd>
              </div>
            )}
          </dl>
        </>
      )}
    </div>
  )
}
