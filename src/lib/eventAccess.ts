import { parseMysqlDate } from './eventFormat'

/** A partir de quantos dias antes de vencer o acesso conta como "vencendo". */
export const EXPIRING_SOON_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export type AccessState = 'none' | 'active' | 'expiring' | 'expired'

export type AccessStatus = { state: AccessState; daysLeft: number | null; label: string }

/** Situação do acesso ao painel do evento (events.access_expires_at). */
export function accessStatus(expiresAt: string | null, now = Date.now()): AccessStatus {
  const date = expiresAt ? parseMysqlDate(expiresAt) : null
  if (!date) return { state: 'none', daysLeft: null, label: 'Sem prazo' }

  const daysLeft = Math.ceil((date.getTime() - now) / DAY_MS)
  if (daysLeft <= 0) return { state: 'expired', daysLeft: 0, label: 'Expirado' }
  if (daysLeft <= EXPIRING_SOON_DAYS) {
    return { state: 'expiring', daysLeft, label: daysLeft === 1 ? 'Vence amanhã' : `Vence em ${daysLeft} dias` }
  }
  return { state: 'active', daysLeft, label: 'Ativo' }
}

export const ACCESS_STATE_STYLES: Record<AccessState, string> = {
  none: 'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  expiring: 'bg-amber-50 text-amber-700',
  expired: 'bg-rose-50 text-rose-700',
}
