import { useEvent } from '../lib/eventContext'
import { formatEventDate, NAME_FONT_CLASSES, NAME_FONT_CLASSES_COMPACT } from '../lib/eventFormat'

function MaybeMapLink({ href, children }: { href: string | null; children: string }) {
  if (!href) return children

  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline decoration-brand-primary underline-offset-4">
      {children}
    </a>
  )
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
            {event.address && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-brand-primary uppercase">Endereço</dt>
                <dd className="text-[#3f3450]">
                  <MaybeMapLink href={event.maps_url}>{event.address}</MaybeMapLink>
                </dd>
              </div>
            )}
            {isWedding && event.venue_name_secondary && (
              <div>
                <dt className="text-xs font-semibold tracking-wide text-brand-primary uppercase">Recepção</dt>
                <dd className="text-[#3f3450]">
                  <MaybeMapLink href={event.maps_url_secondary}>{event.venue_name_secondary}</MaybeMapLink>
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
