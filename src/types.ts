export type GuestStatus = 'pendente' | 'confirmado' | 'recusado'

/** Papel do convidado titular no evento (guests.role), destacado no convite. */
export type GuestRole = 'convidado' | 'padrinho' | 'madrinha' | 'pais' | 'especial'

export type AdminInfo = {
  id: number
  /** Evento ativo da sessão (null no super-admin). Uma conta pode ter vários eventos. */
  event_id: number | null
  name: string
  email: string
  /** Ausente em sessões salvas antes de existir: aí vale o sinal antigo, event_id === null. */
  is_super?: boolean
}

/** Um evento da conta, na lista "Seus eventos". */
export type AccountEvent = Pick<PublicEvent, 'slug' | 'event_type' | 'host_name' | 'host_name_secondary' | 'subtitle'> & {
  id: number
  event_date: string | null
  access_expired: boolean
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
  /** Ponto de foco da capa, em % da foto (50/50 = centro): o recorte fica em volta dele. */
  cover_focus_x: number
  cover_focus_y: number
  music_url: string | null
  color_primary: string
  name_font: NameFont
  invite_style: InviteStyle
  /** Seções opcionais da tela interna do convite. */
  show_countdown: boolean
  show_calendar: boolean
  /** Lista de presentes e Pix no ar, já considerando o plano. */
  gifts_enabled: boolean
  /** "Feito com Presenzo" no rodapé do convite (some só no Premium). */
  show_credit: boolean
  /**
   * Evento de exemplo da vitrine da home: confirmar e escolher presente não
   * gravam nada, e a chave Pix nunca vem (o convite mostra um aviso).
   */
  is_demo: boolean
}

/** Evento de exemplo na vitrine da home (GET /demos), com o link de um convite dele. */
export type DemoEvent = Pick<
  PublicEvent,
  | 'slug'
  | 'event_type'
  | 'host_name'
  | 'host_name_secondary'
  | 'subtitle'
  | 'color_primary'
  | 'name_font'
  | 'invite_style'
  | 'cover_photo_url'
  | 'cover_focus_x'
  | 'cover_focus_y'
> & {
  guest_slug: string
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

/**
 * Orçamento aplicado na venda, como estava no dia. A faixa fica pela
 * quantidade (max_guests): salvar a tabela de preços recria as faixas.
 */
export type PriceBreakdown = {
  choice: {
    event_type: EventType
    max_guests: number
    gifts: boolean
    premium: boolean
    extra_admins: number
    coupon: string | null
  }
  items: { label: string; amount: number }[]
  subtotal: number
  discount: number
  total: number
  quoted_at: string
}

export type SuperEvent = AdminEvent & {
  id: number
  contract: EventContract
  price_charged: number | null
  price_breakdown: PriceBreakdown | null
  /** Cupom usado na venda. */
  coupon_code: string | null
  last_payment_at: string | null
  payment_notes: string | null
  created_at: string
  stats: EventStats
}

/** Valor fixo da tabela de preços: base de um tipo de evento (base_wedding...) ou adicional. */
export type PriceItem = {
  key: string
  label: string
  amount: number
}

/** Faixa de convidados à venda. A maior é aberta ("500+"): o evento fica sem limite. */
export type GuestTier = {
  id: number
  max_guests: number
  amount: number
  open_ended: boolean
  label: string
}

/** Parâmetros dos planos editáveis em "Preços e planos" no super-admin. */
export type PricingSettings = {
  guest_tolerance_percent: number
  included_admins: number
  grace_days_standard: number
  grace_days_premium: number
}

export type Pricing = {
  prices: PriceItem[]
  tiers: GuestTier[]
  settings: PricingSettings
  /** Contratar pelo site (pagamento online). Ausente na resposta de salvar a tabela no super-admin. */
  checkout?: { enabled: boolean; max_installments: number }
}

export type OrderStatus = 'pending' | 'paid' | 'event_created' | 'expired' | 'canceled' | 'refunded'

/** Pedido feito pelo site, como a página pública /pedido/:publicId vê (sem email nem telefone). */
export type PublicOrder = {
  public_id: string
  status: OrderStatus
  customer_first_name: string
  event_type: EventType
  host_name: string
  host_name_secondary: string | null
  subtitle: string | null
  event_date: string | null
  items: { label: string; amount: number }[]
  total: number
  coupon_code: string | null
  /** pix, credit_card, debit_card, account_money… (depois de pago) */
  payment_method: string | null
  installments: number | null
  /** Página de pagamento do Mercado Pago, enquanto o pedido aguarda pagamento. */
  checkout_url: string | null
  expires_in_seconds: number | null
}

export type CouponDiscountType = 'percent' | 'amount'

export type Coupon = {
  id: number
  code: string
  discount_type: CouponDiscountType
  /** 20 = 20% ou R$ 20,00, conforme discount_type. */
  discount_value: number
  valid_until: string | null
  /** Quantos eventos podem ser vendidos com ele (os "5 primeiros"). null = sem limite. */
  max_uses: number | null
  active: boolean
  notes: string | null
  created_at: string
  /** Quantos eventos foram vendidos com este cupom (só na lista do super-admin). */
  uses?: number
  /** Usos que ainda restam, quando tem limite (só no orçamento). */
  remaining?: number
}

export type QuoteRequest = {
  event_type: EventType
  guest_tier_id: number
  gifts: boolean
  premium: boolean
  extra_admins: number
  coupon?: string
  /** Evento cujo orçamento está sendo recalculado: não conta contra o limite do próprio cupom. */
  event_id?: number
}

/** Orçamento calculado pela API (POST /pricing/quote). O cupom vem como item negativo. */
export type Quote = {
  items: { label: string; amount: number }[]
  subtotal: number
  discount: number
  total: number
  coupon: Coupon | null
  /** Cupom informado que não vale (não encontrado, vencido); o orçamento sai sem desconto. */
  coupon_error: string | null
  /** O que o evento recebe ao fechar esta venda. */
  contract: {
    plan: Exclude<EventPlan, 'unlimited'>
    gifts_enabled: boolean
    guest_limit: number | null
    admin_limit: number
  }
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
  /** Outros eventos que a mesma conta administra (editar nome/email vale para todos). */
  other_events?: { id: number; label: string }[]
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
