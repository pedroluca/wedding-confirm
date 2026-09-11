export type GuestStatus = 'pendente' | 'confirmado' | 'recusado'

export type AdminInfo = {
  id: number
  event_id: number | null
  name: string
  email: string
}

export type EventType = 'wedding' | 'birthday'

export type NameFont = 'sans' | 'fleur' | 'pinyon'

export type PublicEvent = {
  slug: string
  event_type: EventType
  host_name: string
  host_name_secondary: string | null
  event_date: string | null
  venue_name: string | null
  venue_name_secondary: string | null
  address: string | null
  maps_url: string | null
  dress_code: string | null
  pix_key: string | null
  logo_url: string | null
  color_primary: string
  name_font: NameFont
}

export type AdminEvent = PublicEvent & {
  access_expires_at: string | null
}

export type SuperEvent = AdminEvent & {
  id: number
  price_charged: number | null
  last_payment_at: string | null
  payment_notes: string | null
  created_at: string
}

export type GuestMember = {
  id: number
  name: string
  status: GuestStatus
  is_titular: boolean
}

export type GuestInviteResponse = {
  titular: { id: number; name: string }
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
  status: GuestStatus
  confirmed_at: string | null
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
