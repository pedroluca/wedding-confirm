import { useEffect, useState } from 'react'
import { useEvent } from '../../lib/eventContext'
import { useMusic } from '../../lib/musicContext'
import type { GuestInviteResponse } from '../../types'
import { Envelope } from './Envelope'
import { InviteContent } from './InviteContent'
import './invite.css'

// Precisa acompanhar a linha do tempo de .is-opening em invite.css.
const OPEN_DURATION_MS = 2500

// Convites já abertos nesta aba (memória do módulo, não sessionStorage):
// voltar de /confirmar ou /presentes não repete o envelope, mas recarregar
// a página sim.
const openedInvites = new Set<string>()

type Phase = 'closed' | 'opening' | 'open'

/** Convite de casamento: envelope fechado → animação de abertura → tela interna. */
export function WeddingInvite({
  data,
  eventSlug,
  guestSlug,
}: {
  data: GuestInviteResponse
  eventSlug: string
  guestSlug: string
}) {
  const event = useEvent()
  const { play, setToggleHidden } = useMusic()
  const inviteKey = `${eventSlug}/${guestSlug}`
  const [phase, setPhase] = useState<Phase>(() => (openedInvites.has(inviteKey) ? 'open' : 'closed'))

  // Tela fechada só com os nomes e o envelope, sem o botão de música.
  useEffect(() => {
    setToggleHidden(phase !== 'open')
    return () => setToggleHidden(false)
  }, [phase, setToggleHidden])

  // Adianta o download da foto de capa enquanto o convidado ainda não abriu.
  useEffect(() => {
    if (phase !== 'closed' || !event.cover_photo_url) return
    const image = new Image()
    image.src = event.cover_photo_url
  }, [phase, event.cover_photo_url])

  const handleOpen = () => {
    if (phase !== 'closed') return
    // Síncrono dentro do toque: é o que libera o áudio no iOS.
    play()
    openedInvites.add(inviteKey)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('open')
      return
    }
    setPhase('opening')
    window.setTimeout(() => setPhase('open'), OPEN_DURATION_MS)
  }

  return (
    <div className="invite-root min-h-svh">
      {phase === 'open' ? (
        <InviteContent data={data} eventSlug={eventSlug} guestSlug={guestSlug} />
      ) : (
        <Envelope opening={phase === 'opening'} onOpen={handleOpen} />
      )}
    </div>
  )
}
