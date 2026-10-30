import { useEvent } from '../../lib/eventContext'
import {
  coverObjectPosition,
  formatEventDay,
  formatEventTime,
  formatEventWeekday,
  NAME_FONT_CLASSES,
  parseMysqlDate,
} from '../../lib/eventFormat'

function HostNames() {
  const event = useEvent()

  return (
    <>
      <h1 className={`${NAME_FONT_CLASSES[event.name_font]} font-normal text-[#3f3450]`}>
        <span className="block">{event.host_name}</span>
        {event.host_name_secondary && (
          <>
            <span className="block font-serif text-3xl leading-none text-brand-primary italic">&amp;</span>
            <span className="block">{event.host_name_secondary}</span>
          </>
        )}
      </h1>
      {event.subtitle && <p className="mt-3 font-serif text-xl text-brand-primary italic">{event.subtitle}</p>}
    </>
  )
}

function EventDateLine() {
  const event = useEvent()
  const date = event.event_date ? parseMysqlDate(event.event_date) : null
  if (!date) return null

  return (
    <p className="mt-4 font-serif text-lg tracking-wide text-[#6b5d80]">
      <span className="capitalize">{formatEventWeekday(date)}</span>
      <span className="mx-2 text-brand-primary">·</span>
      {formatEventDay(date)}
      <span className="mx-2 text-brand-primary">·</span>
      {formatEventTime(date)}
    </p>
  )
}

/**
 * Topo da tela interna. Com foto do casal: foto nítida em cima que vai
 * desfocando e esmaecendo até a cor do papel, com nomes e data por cima do
 * fade. Sem foto: logo + nomes, como no convite antigo.
 *
 * O recorte fica em volta do ponto de foco do admin. No computador a foto
 * nítida fica numa moldura no centro (de ponta a ponta, uma foto vertical
 * mostraria só uma faixa do meio), e a própria foto desfocada preenche as
 * laterais.
 */
export function CoverHero() {
  const event = useEvent()

  if (!event.cover_photo_url) {
    return (
      <header className="px-6 pt-16 text-center">
        {event.logo_url && (
          <img
            src={event.logo_url}
            alt=""
            className="mx-auto mb-8 w-40 rounded-full shadow-lg shadow-brand-primary-soft"
          />
        )}
        <HostNames />
        <EventDateLine />
      </header>
    )
  }

  const objectPosition = coverObjectPosition(event)

  return (
    <header className="relative flex h-[72svh] min-h-120 items-end overflow-hidden">
      <img
        src={event.cover_photo_url}
        alt=""
        aria-hidden
        style={{ objectPosition }}
        className="cover-backdrop absolute inset-0 hidden h-full w-full scale-110 object-cover blur-2xl md:block"
      />
      <div className="cover-frame absolute inset-0 md:inset-x-auto md:left-1/2 md:w-full md:max-w-3xl md:-translate-x-1/2">
        <img
          src={event.cover_photo_url}
          alt=""
          style={{ objectPosition }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <img
          src={event.cover_photo_url}
          alt=""
          aria-hidden
          style={{ objectPosition }}
          className="cover-blur absolute inset-0 h-full w-full scale-110 object-cover blur-xl"
        />
      </div>
      <div className="cover-fade absolute inset-0" />
      <div className="relative w-full px-6 pb-4 text-center">
        <HostNames />
        <EventDateLine />
      </div>
    </header>
  )
}
