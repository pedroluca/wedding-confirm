import type { EventType, PublicEvent } from '../types'

/**
 * Textos que mudam conforme o tipo do evento. O tipo só decide rótulos e
 * padrões: segundo nome, segundo local, subtítulo etc. valem pra qualquer um.
 * A mensagem de envio e os papéis dos convidados ficam em shareMessage.ts e
 * guestRoles.ts, também indexados por EventType.
 */
type EventTypeProfile = {
  label: string
  /** Exemplos no seletor de tipo, quando o nome sozinho não diz tudo. */
  examples?: string
  /** Título da seção dos nomes nas configurações. */
  hostsTitle: string
  /** Campos de nome: o principal e o segundo (opcional — gêmeos, irmãos...). */
  hostLabels: [primary: string, secondary: string]
  subtitlePlaceholder: string
  /** Os dois locais do convite; o segundo é opcional. */
  venueLabels: [primary: string, secondary: string]
  venuePlaceholders: [primary: string, secondary: string]
  giftMessageLabel: string
  /** Fim de "Tenho/Temos a alegria de convidar você para ...", com um ou dois anfitriões. */
  inviteOccasion: [oneHost: string, twoHosts: string]
  inviteMessagePlaceholder: string
}

export const EVENT_TYPES: Record<EventType, EventTypeProfile> = {
  wedding: {
    label: 'Casamento',
    hostsTitle: 'Os noivos',
    hostLabels: ['Nome de um(a) dos noivos', 'Nome do(a) outro(a) noivo(a)'],
    subtitlePlaceholder: 'Ex: Celebração religiosa',
    venueLabels: ['Cerimônia', 'Recepção'],
    venuePlaceholders: ['Ex: Paróquia São José', 'Ex: Espaço Villa Jardim'],
    giftMessageLabel: 'Mensagem para os noivos (opcional)',
    inviteOccasion: ['celebrar o nosso casamento', 'celebrar o nosso casamento'],
    inviteMessagePlaceholder:
      'Ex: Com a bênção de Deus e de nossas famílias, convidamos você para celebrar conosco o início da nossa história.',
  },
  birthday: {
    label: 'Aniversário',
    hostsTitle: 'Aniversariante',
    hostLabels: ['Nome do(a) aniversariante', 'Segundo(a) aniversariante (opcional)'],
    subtitlePlaceholder: 'Ex: 30 anos',
    venueLabels: ['Local', 'Festa'],
    venuePlaceholders: ['Ex: Salão de festas Alegria', 'Ex: Espaço Villa Jardim'],
    giftMessageLabel: 'Mensagem para quem está comemorando (opcional)',
    inviteOccasion: ['celebrar o meu aniversário', 'celebrar o nosso aniversário'],
    inviteMessagePlaceholder: 'Ex: Mais um ano de vida merece ser comemorado com quem eu amo. Conto com você!',
  },
  graduation: {
    label: 'Formatura',
    hostsTitle: 'Formando(a)',
    hostLabels: ['Nome do(a) formando(a)', 'Segundo(a) formando(a) (opcional)'],
    subtitlePlaceholder: 'Ex: Medicina · UFMG',
    venueLabels: ['Colação de grau', 'Baile'],
    venuePlaceholders: ['Ex: Teatro Municipal', 'Ex: Espaço Villa Jardim'],
    giftMessageLabel: 'Mensagem para quem está se formando (opcional)',
    inviteOccasion: ['celebrar a minha formatura', 'celebrar a nossa formatura'],
    inviteMessagePlaceholder:
      'Ex: Depois de anos de dedicação, chegou a hora de celebrar essa conquista com quem esteve ao meu lado.',
  },
  other: {
    label: 'Celebração',
    examples: 'chá de bebê, bodas, batizado...',
    hostsTitle: 'Anfitriões',
    hostLabels: ['Nome do anfitrião', 'Segundo anfitrião (opcional)'],
    subtitlePlaceholder: 'Ex: Chá de bebê do Theo',
    venueLabels: ['Local', 'Festa'],
    venuePlaceholders: ['Ex: Salão de festas Alegria', 'Ex: Espaço Villa Jardim'],
    giftMessageLabel: 'Mensagem para quem está celebrando (opcional)',
    inviteOccasion: ['celebrar comigo', 'celebrar conosco'],
    inviteMessagePlaceholder: 'Ex: Esse momento só fica completo com as pessoas que amamos por perto.',
  },
}

export const EVENT_TYPE_OPTIONS = Object.keys(EVENT_TYPES) as EventType[]

/** "Casamento" ou "Celebração (chá de bebê, bodas, batizado...)", pro seletor de tipo. */
export function eventTypeOptionLabel(type: EventType): string {
  const { label, examples } = EVENT_TYPES[type]
  return examples ? `${label} (${examples})` : label
}

type EventNames = Pick<PublicEvent, 'event_type' | 'host_name' | 'host_name_secondary' | 'subtitle'>

/** O convite fala na primeira pessoa do plural? Casamento sempre; o resto, com dois nomes. */
export function hasTwoHosts(event: Pick<PublicEvent, 'event_type' | 'host_name_secondary'>): boolean {
  return event.event_type === 'wedding' || Boolean(event.host_name_secondary)
}

export function formatHostNames(event: EventNames, joiner = ' & '): string {
  return event.host_name_secondary ? `${event.host_name}${joiner}${event.host_name_secondary}` : event.host_name
}

/**
 * "Casamento de Ana & João", "Formatura de Caio". Na celebração genérica o
 * subtítulo faz as vezes do nome do evento ("Chá de bebê do Theo"). O
 * backend monta o equivalente do email em format_event_label() (src/Mailer.php).
 */
export function eventTitle(event: EventNames): string {
  const names = formatHostNames(event)
  if (event.event_type === 'other') {
    return event.subtitle?.trim() || `Evento de ${names}`
  }
  return `${EVENT_TYPES[event.event_type].label} de ${names}`
}
