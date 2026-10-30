import { useEffect, useState } from 'react'
import { api } from './api'
import type { DemoEvent, Gift, GuestInviteResponse, GuestStatus } from '../types'

/**
 * Eventos de exemplo da vitrine da home (GET /demos). null enquanto carrega;
 * se a API falhar, fica vazio e a vitrine some.
 */
export function useDemos(): DemoEvent[] | null {
  const [demos, setDemos] = useState<DemoEvent[] | null>(null)

  useEffect(() => {
    let active = true
    api
      .get<{ demos: DemoEvent[] }>('/demos')
      .then((res) => {
        if (active) setDemos(res.demos)
      })
      .catch(() => {
        if (active) setDemos([])
      })
    return () => {
      active = false
    }
  }, [])

  return demos
}

/** Link do convite de um exemplo (o primeiro convite cadastrado nele). */
export function demoInvitePath(demo: DemoEvent): string {
  return `/${demo.slug}/${demo.guest_slug}`
}

// Respostas dadas nos convites de exemplo desta aba (memória do módulo, como
// os envelopes já abertos em Invite.tsx). A API não grava nada num evento de
// exemplo, então é daqui que o convite, a confirmação e a lista tiram o que
// o visitante escolheu enquanto navega. Recarregar a página zera.
// A chave é "eventSlug/guestSlug".
const answers = new Map<string, Map<number, GuestStatus>>()
const claims = new Map<string, Set<number>>()

export function rememberDemoAnswers(key: string, members: GuestInviteResponse['members']) {
  answers.set(key, new Map(members.map((member) => [member.id, member.status])))
}

export function withDemoAnswers(key: string, data: GuestInviteResponse): GuestInviteResponse {
  const statuses = answers.get(key)
  if (!statuses) return data
  return {
    ...data,
    members: data.members.map((member) => ({ ...member, status: statuses.get(member.id) ?? member.status })),
  }
}

export function rememberDemoClaim(key: string, giftId: number) {
  const claimed = claims.get(key) ?? new Set<number>()
  claimed.add(giftId)
  claims.set(key, claimed)
}

export function withDemoClaims(key: string, gifts: Gift[]): Gift[] {
  const claimed = claims.get(key)
  if (!claimed) return gifts
  return gifts.map((gift) => (claimed.has(gift.id) ? { ...gift, claimed_by_me: true } : gift))
}
