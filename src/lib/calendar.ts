export type CalendarEvent = {
  uid: string
  title: string
  start: Date
  durationHours: number
  location: string
  description: string
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * "20261213T163000", sem fuso: event_date vem do MySQL sem timezone e é
 * sempre o horário local do evento, então é tratado como horário "flutuante".
 */
function toFloatingDateTime(date: Date): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(date.getHours())}${pad(date.getMinutes())}00`
  )
}

function endOf(event: CalendarEvent): Date {
  return new Date(event.start.getTime() + event.durationHours * 60 * 60 * 1000)
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${toFloatingDateTime(event.start)}/${toFloatingDateTime(endOf(event))}`,
    ctz: 'America/Sao_Paulo',
    details: event.description,
    location: event.location,
  })
  return `https://calendar.google.com/calendar/render?${params}`
}

const escapeIcsText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/([,;])/g, '\\$1')

/** Baixa um .ics (Apple Agenda, Outlook etc). */
export function downloadIcs(event: CalendarEvent, filename: string): void {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Presenzo//Convite//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${toFloatingDateTime(event.start)}`,
    `DTEND:${toFloatingDateTime(endOf(event))}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]

  const url = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
