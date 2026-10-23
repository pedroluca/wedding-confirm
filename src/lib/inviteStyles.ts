import type { InviteStyle, PublicEvent } from '../types'

export const INVITE_STYLE_OPTIONS: { value: InviteStyle; label: string; description: string }[] = [
  { value: 'direct', label: 'Direto', description: 'Abre já no convite' },
  { value: 'letter', label: 'Carta', description: 'Envelope com aba e selo' },
  { value: 'doors', label: 'Portas', description: 'Abre para os lados' },
  { value: 'vertical', label: 'Vertical', description: 'Abre para cima e para baixo' },
]

// Precisa acompanhar a linha do tempo de .is-opening em invite.css (as duas
// aberturas terminam com o mesmo zoom + fade da cena, aos 2,5s).
export const OPEN_DURATION_MS: Record<Exclude<InviteStyle, 'direct'>, number> = {
  letter: 2500,
  doors: 2500,
  vertical: 2500,
}

/**
 * Estilo do evento, com o padrão de antes da coluna existir (casamento com
 * envelope, o resto direto) caso a API ainda não mande o campo.
 */
export function resolveInviteStyle(event: Pick<PublicEvent, 'event_type' | 'invite_style'>): InviteStyle {
  return event.invite_style ?? (event.event_type === 'wedding' ? 'letter' : 'direct')
}
