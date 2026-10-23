import { useEffect, useState } from 'react'
import { useEvent } from '../../lib/eventContext'
import { OPEN_DURATION_MS, resolveInviteStyle } from '../../lib/inviteStyles'
import { useMusic } from '../../lib/musicContext'
import type { GuestInviteResponse } from '../../types'
import { Envelope } from './Envelope'
import { GateEnvelope } from './GateEnvelope'
import { InviteContent } from './InviteContent'
import './invite.css'

// Convites já abertos nesta aba (memória do módulo, não sessionStorage):
// voltar de /confirmar ou /presentes não repete o envelope, mas recarregar
// a página sim.
const openedInvites = new Set<string>()

type Phase = 'closed' | 'opening' | 'open'

/**
 * Convite do convidado: envelope fechado → animação de abertura → tela
 * interna. No estilo "Direto" vai direto pra tela interna — e aí a música
 * só começa pelo botão, já que não há um toque pra liberar o áudio.
 */
export function Invite({
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
  const style = resolveInviteStyle(event)
  const inviteKey = `${eventSlug}/${guestSlug}`
  const [phase, setPhase] = useState<Phase>(() =>
    style === 'direct' || openedInvites.has(inviteKey) ? 'open' : 'closed'
  )

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

  if (style === 'direct' || phase === 'open') {
    return (
      <div className="invite-root min-h-svh">
        <InviteContent data={data} eventSlug={eventSlug} guestSlug={guestSlug} />
      </div>
    )
  }

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
    window.setTimeout(() => setPhase('open'), OPEN_DURATION_MS[style])
  }

  const opening = phase === 'opening'

  return (
    <div className="invite-root min-h-svh">
      {style === 'letter' ? (
        <Envelope opening={opening} onOpen={handleOpen} />
      ) : (
        <GateEnvelope
          orientation={style === 'doors' ? 'horizontal' : 'vertical'}
          opening={opening}
          onOpen={handleOpen}
        />
      )}
    </div>
  )
}
