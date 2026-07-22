export type GuestStatus = 'pendente' | 'confirmado' | 'recusado'

export type AdminInfo = {
  id: number
  name: string
  email: string
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
