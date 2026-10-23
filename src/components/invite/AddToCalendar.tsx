import { CalendarPlus, Download } from 'lucide-react'
import { useEvent } from '../../lib/eventContext'
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from '../../lib/calendar'
import { EVENT_TYPES, eventTitle } from '../../lib/eventTypes'

// Duração padrão do evento na agenda (event_date só tem o início).
const DURATION_HOURS = 5

const buttonClass =
  'cursor-pointer inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-brand-primary-soft bg-white/70 px-4 py-2.5 text-sm font-medium text-brand-primary transition hover:bg-brand-primary-soft'

export function AddToCalendar({ date }: { date: Date }) {
  const event = useEvent()

  const location = [event.venue_name, event.address].filter(Boolean).join(' - ')
  const secondVenueLabel = EVENT_TYPES[event.event_type].venueLabels[1]
  const secondVenue = event.venue_name_secondary ? `\n${secondVenueLabel}: ${event.venue_name_secondary}` : ''

  const calendarEvent: CalendarEvent = {
    uid: `${event.slug}@presenzo.com.br`,
    title: eventTitle(event),
    start: date,
    durationHours: DURATION_HOURS,
    location,
    description: `Convite: ${window.location.href}${secondVenue}`,
  }

  return (
    <div className="text-center">
      <p className="text-xs font-semibold tracking-[0.3em] text-brand-primary uppercase">Salve a data</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a href={googleCalendarUrl(calendarEvent)} target="_blank" rel="noreferrer" className={buttonClass}>
          <CalendarPlus size={16} />
          Google Agenda
        </a>
        <button
          type="button"
          onClick={() => downloadIcs(calendarEvent, `${event.slug}.ics`)}
          className={buttonClass}
        >
          <Download size={16} />
          iPhone / Outlook
        </button>
      </div>
    </div>
  )
}
