import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { ClipboardCheck, ExternalLink, Eye, Gift, Settings, Users } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { AdminEventContext, AdminEventSetterContext } from '../../lib/adminEventContext'
import { parseMysqlDate } from '../../lib/eventFormat'
import { EVENT_TYPES, formatHostNames } from '../../lib/eventTypes'
import { AccessExpired } from '../../components/AccessExpired'
import { PanelLayout, type PanelNavItem } from '../../components/panel/PanelLayout'
import type { AdminEvent } from '../../types'

const NAV: PanelNavItem[] = [
  { to: '/admin/presencas', label: 'Presenças', icon: ClipboardCheck },
  { to: '/admin/pessoas', label: 'Pessoas', icon: Users },
  { to: '/admin/presentes', label: 'Presentes', icon: Gift },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Cartão do evento no topo do menu: tipo, nomes, data e o link do convite. */
function EventCard({ event }: { event: AdminEvent }) {
  const date = event.event_date ? parseMysqlDate(event.event_date) : null

  return (
    <div className="rounded-xl border border-[#ece6f0] bg-[#faf8fb] p-3">
      <p className="text-[11px] font-semibold tracking-wide text-brand-primary uppercase">
        {EVENT_TYPES[event.event_type].label}
      </p>
      <p className="mt-0.5 truncate font-semibold text-[#3f3450]">{formatHostNames(event)}</p>
      {date && <p className="text-xs text-[#8b7a9c]">{dateFormatter.format(date)}</p>}
      <a
        href={`/${event.slug}`}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline"
      >
        <ExternalLink size={12} />
        Ver convite
      </a>
    </div>
  )
}

export default function AdminLayout() {
  const { session, logout, superSession, stopImpersonation } = useAdminAuth()
  // Pra onde ir ao voltar pro super: quem redireciona é o guard abaixo, assim
  // que a sessão volta a ser a do super-admin (um navigate() aqui disputaria
  // com ele e perderia).
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session || session.admin.event_id === null) return
    let active = true

    const load = () => {
      setLoading(true)
      api
        .get<{ event: AdminEvent }>('/admin/event', session.token)
        .then((res) => {
          if (active) setEvent(res.event)
        })
        .catch((err) => {
          if (active && err instanceof ApiError && err.code === 'access_expired') {
            setExpired(true)
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    load()
    return () => {
      active = false
    }
  }, [session])

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  // Sessão de super-admin caiu numa rota de evento por engano (ou acabou de
  // voltar do "entrar como admin") — manda pro lugar certo.
  if (session.admin.event_id === null) {
    return <Navigate to={returnTo ?? '/super'} replace />
  }

  const backToSuper = () => {
    const eventId = stopImpersonation()
    setReturnTo(eventId ? `/super/eventos/${eventId}` : '/super')
  }

  const impersonating = superSession !== null

  return (
    <PanelLayout
      variant="admin"
      nav={NAV}
      context={event ? <EventCard event={event} /> : undefined}
      userName={session.admin.name}
      logoutLabel={impersonating ? 'Voltar ao super' : 'Sair'}
      onLogout={impersonating ? backToSuper : logout}
      banner={
        impersonating && (
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 bg-[#231b2e] px-4 py-2.5 text-sm text-white/80 sm:px-8">
            <span className="inline-flex items-center gap-2">
              <Eye size={16} className="text-presenzo-gold" />
              Você está no painel deste evento como {superSession.admin.name} (super-admin).
            </span>
            <button
              type="button"
              onClick={backToSuper}
              className="cursor-pointer font-semibold text-presenzo-gold hover:underline"
            >
              Voltar ao super
            </button>
          </div>
        )
      }
    >
      {loading ? (
        <p className="text-[#6b5d80]">Carregando...</p>
      ) : expired ? (
        <AccessExpired />
      ) : event ? (
        <AdminEventSetterContext.Provider value={setEvent}>
          <AdminEventContext.Provider value={event}>
            <Outlet />
          </AdminEventContext.Provider>
        </AdminEventSetterContext.Provider>
      ) : (
        <p className="text-[#6b5d80]">Não foi possível carregar os dados do evento.</p>
      )}
    </PanelLayout>
  )
}
