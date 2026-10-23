export type GuestStatus = 'pendente' | 'confirmado' | 'recusado'

/** Papel do convidado titular no evento (guests.role), destacado no convite. */
export type GuestRole = 'convidado' | 'padrinho' | 'madrinha' | 'pais' | 'especial'

export type AdminInfo = {
  id: number
  event_id: number | null
  name: string
  email: string
}

export type EventType = 'wedding' | 'birthday' | 'graduation' | 'other'

export type NameFont = 'sans' | 'fleur' | 'pinyon'

/** Abertura do convite: direto no conteúdo ou um dos envelopes. */
export type InviteStyle = 'direct' | 'letter' | 'doors' | 'vertical'

/**
 * Plano do evento. O Ilimitado é interno (nunca aparece em venda nem para o
 * cliente) e o super-admin pode colocar qualquer evento nele.
 */
export type EventPlan = 'standard' | 'premium' | 'unlimited'

export type PublicEvent = {
  slug: string
  event_type: EventType
  host_name: string
  host_name_secondary: string | null
  /** Linha abaixo dos nomes ("Medicina · UFMG", "30 anos"). */
  subtitle: string | null
  event_date: string | null
  venue_name: string | null
  venue_name_secondary: string | null
  address: string | null
  maps_url: string | null
  maps_url_secondary: string | null
  dress_code: string | null
  invite_message: string | null
  pix_key: string | null
  logo_url: string | null
  cover_photo_url: string | null
  music_url: string | null
  color_primary: string
  name_font: NameFont
  invite_style: InviteStyle
  /** Seções opcionais da tela interna do convite. */
  show_countdown: boolean
  show_calendar: boolean
  /** Lista de presentes e Pix no ar, já considerando o plano. */
  gifts_enabled: boolean
}

export type AdminEvent = PublicEvent & {
  plan: EventPlan
  /**
   * Faixa de pessoas contratada e o teto (faixa + margem de tolerância), já
   * considerando o plano. No teto o cadastro trava. null = sem limite.
   */
  guest_limit: number | null
  guest_cap: number | null
  access_expires_at: string | null
  /** Modelo da mensagem de envio do convite ({primeiro_nome}, {link}...). null = texto padrão. */
  share_message: string | null
}

/** Números do evento para o super-admin (pessoas = titulares + relacionados). */
export type EventStats = {
  invites: number
  people: number
  confirmed: number
  pending: number
  declined: number
  admins: number
  gift_claims: number
}

/**
 * O que foi contratado, como está gravado. O plano Ilimitado passa por cima
 * (libera tudo), sem apagar esses valores. Limite null = sem limite.
 */
export type EventContract = {
  gifts_enabled: boolean
  guest_limit: number | null
  admin_limit: number | null
}

export type SuperEvent = AdminEvent & {
  id: number
  contract: EventContract
  price_charged: number | null
  last_payment_at: string | null
  payment_notes: string | null
  created_at: string
  stats: EventStats
}

export type GuestMember = {
  id: number
  name: string
  status: GuestStatus
  is_titular: boolean
}

export type GuestInviteResponse = {
  titular: { id: number; name: string; role: GuestRole }
  members: GuestMember[]
  has_dependents: boolean
}

export type AdminDependent = {
  id: number
  name: string
  status: GuestStatus
  confirmed_at: string | null
  created_at: string
}

export type AdminGuest = {
  id: number
  name: string
  slug: string
  role: GuestRole
  status: GuestStatus
  confirmed_at: string | null
  /** Quantas vezes o link abriu a lista de presentes (métrica só do admin). */
  gifts_views: number
  gifts_last_viewed_at: string | null
  created_at: string
  dependents: AdminDependent[]
}

export type AdminUser = {
  id: number
  name: string
  email: string
  created_at: string
}

export type Gift = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  suggested_amount: number
  remaining: number
  claimed_by_me: boolean
}

export type GiftClaim = {
  id: number
  guest_name: string
  message: string | null
  created_at: string
}

export type AdminGift = {
  id: number
  name: string
  description: string | null
  image_url: string | null
  suggested_amount: number
  quantity: number
  claimed_count: number
  remaining: number
  created_at: string
  claims: GiftClaim[]
}

export type GiftTemplate = {
  id: number
  event_type: EventType
  name: string
  description: string | null
  image_url: string | null
  suggested_amount: number
  quantity: number
  created_at: string
}
