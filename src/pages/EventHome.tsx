import { InviteDetails } from '../components/InviteDetails'
import { PageShell } from '../components/PageShell'

/**
 * /:eventSlug sozinho (sem convidado) — mostra só a marca do evento (logo,
 * nome dos noivos/aniversariante), sem data/local/RSVP: não há um convidado
 * específico no contexto pra fazer sentido oferecer confirmar presença aqui.
 */
export default function EventHome() {
  return (
    <PageShell>
      <InviteDetails isHome />
    </PageShell>
  )
}
