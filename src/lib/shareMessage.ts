import { formatEventDay, parseMysqlDate } from './eventFormat'
import type { AdminEvent, EventType } from '../types'

// Mesmo limite do backend (optional_text(..., 1000) em handlers/admin_event.php).
export const SHARE_MESSAGE_MAX_LENGTH = 1000

export const DEFAULT_SHARE_MESSAGE: Record<EventType, string> = {
  wedding:
    'Olá, {primeiro_nome}! 💌\n\nCom muita alegria, convidamos {voce} para o nosso casamento.\n\n' +
    'Abra seu convite e confirme sua presença: {link}\n\nCom carinho,\n{noivos}',
  birthday:
    'Olá, {primeiro_nome}! 🎉\n\nQuero muito {voce} na minha festa de aniversário.\n\n' +
    'Abra seu convite e confirme sua presença: {link}\n\nCom carinho,\n{aniversariante}',
}

export type ShareMessageVariable = { token: string; label: string }

export function shareMessageVariables(eventType: EventType): ShareMessageVariable[] {
  return [
    { token: '{primeiro_nome}', label: 'Primeiro nome' },
    { token: '{nome}', label: 'Nome completo' },
    { token: '{convidados}', label: 'Todos do convite' },
    { token: '{voce}', label: 'você / vocês' },
    { token: '{link}', label: 'Link do convite' },
    eventType === 'wedding'
      ? { token: '{noivos}', label: 'Noivos' }
      : { token: '{aniversariante}', label: 'Aniversariante' },
    { token: '{data}', label: 'Data' },
  ]
}

/** Modelo salvo pelo admin, ou o padrão do tipo de evento se estiver vazio. */
export function resolveShareTemplate(event: AdminEvent): string {
  return event.share_message?.trim() || DEFAULT_SHARE_MESSAGE[event.event_type]
}

const listFormatter = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })

/**
 * Troca as variáveis do modelo pelos dados de um convite. Variável com a
 * primeira letra maiúscula sai capitalizada ({Voce} → "Você"/"Vocês"), pra
 * poder começar frase. Variáveis desconhecidas ficam como estão.
 */
export function buildShareMessage(
  template: string,
  {
    event,
    guestName,
    dependentNames,
    link,
  }: { event: AdminEvent; guestName: string; dependentNames: string[]; link: string }
): string {
  const name = guestName.trim()
  const hosts = event.host_name_secondary ? `${event.host_name} & ${event.host_name_secondary}` : event.host_name
  const date = event.event_date ? parseMysqlDate(event.event_date) : null

  const values: Record<string, string> = {
    nome: name,
    primeiro_nome: name.split(/\s+/)[0],
    convidados: listFormatter.format([name, ...dependentNames]),
    voce: dependentNames.length > 0 ? 'vocês' : 'você',
    link,
    noivos: hosts,
    aniversariante: hosts,
    data: date ? formatEventDay(date) : '',
  }

  return template.replace(/\{([a-zA-Z_]+)\}/g, (match, key: string) => {
    const normalizedKey = key.toLowerCase()
    if (!Object.hasOwn(values, normalizedKey)) return match

    const value = values[normalizedKey]
    const capitalize = key[0] !== key[0].toLowerCase()
    return capitalize ? value.charAt(0).toUpperCase() + value.slice(1) : value
  })
}
