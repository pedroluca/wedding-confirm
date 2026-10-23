import { useEvent } from '../lib/eventContext'
import { NAME_FONT_CLASSES, NAME_FONT_CLASSES_COMPACT } from '../lib/eventFormat'

/** Logo + nomes do evento: grande na página do evento, compacto no topo da confirmação. */
export function InviteDetails({ compact = false }: { compact?: boolean }) {
  const event = useEvent()

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
      {event.subtitle && !compact && (
        <p className="mt-3 font-serif text-xl text-brand-primary italic">{event.subtitle}</p>
      )}
    </div>
  )
}
