import type { AdminGuest } from '../types'

type GiftsViews = Pick<AdminGuest, 'gifts_views' | 'gifts_last_viewed_at'>

const lastViewFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** Último acesso à lista de presentes ("18/10, 14:32"), ou null se nunca abriu. */
export function formatGiftsLastView(guest: GiftsViews): string | null {
  if (!guest.gifts_last_viewed_at) return null
  const date = new Date(guest.gifts_last_viewed_at.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? null : lastViewFormatter.format(date)
}

export function giftsViewsTitle(guest: GiftsViews): string {
  const times = `${guest.gifts_views} ${guest.gifts_views === 1 ? 'vez' : 'vezes'}`
  const last = formatGiftsLastView(guest)
  return last
    ? `Abriu a lista de presentes ${times} · último acesso em ${last}`
    : `Abriu a lista de presentes ${times}`
}
