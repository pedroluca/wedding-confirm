import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet } from 'react-router-dom'
import { ArrowLeftRight, ClipboardCheck, ExternalLink, Eye, Gift, Settings, Users } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { isSuperSession, useAdminAuth } from '../../lib/adminAuthContext'
import { AdminEventContext, AdminEventSetterContext } from '../../lib/adminEventContext'
import { parseMysqlDate } from '../../lib/eventFormat'
import { EVENT_TYPES, formatHostNames } from '../../lib/eventTypes'
import { giftsEnabled } from '../../lib/plans'
import { AccessExpired } from '../../components/AccessExpired'
import { PageShell } from '../../components/PageShell'
import { PanelLayout, type PanelNavItem } from '../../components/panel/PanelLayout'
import type { AdminEvent } from '../../types'

const NAV: PanelNavItem[] = [
  { to: '/admin/presencas', label: 'Presenças', icon: ClipboardCheck },
  { to: '/admin/pessoas', label: 'Pessoas', icon: Users },
  { to: '/admin/presentes', label: 'Presentes', icon: Gift },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings },
]

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

const switchLinkClass = 'inline-flex items-center gap-1 text-xs font-medium text-brand-primary hover:underline'

/**
 * Cartão do evento no topo do menu: tipo, nomes, data, o link do convite e,
 * pra quem tem mais de um evento, "Trocar evento".
 */
function EventCard({ event, canSwitch }: { event: AdminEvent; canSwitch: boolean }) {
  const date = event.event_date ? parseMysqlDate(event.event_date) : null

  return (
    <div className="rounded-xl border border-[#ece6f0] bg-[#faf8fb] p-3">
      <p className="text-[11px] font-semibold tracking-wide text-brand-primary uppercase">
        {EVENT_TYPES[event.event_type].label}
      </p>
      <p className="mt-0.5 font-semibold text-balance break-words text-[#3f3450]">{formatHostNames(event)}</p>
      {date && <p className="text-xs text-[#8b7a9c]">{dateFormatter.format(date)}</p>}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
        <a href={`/${event.slug}`} target="_blank" rel="noreferrer" className={switchLinkClass}>
          <ExternalLink size={12} />
          Ver convite
        </a>
        {canSwitch && (
          <Link to="/admin/eventos" className={switchLinkClass}>
            <ArrowLeftRight size={12} />
            Trocar evento
          </Link>
        )}
      </div>
    </div>
  )
}

export default function AdminLayout() {
  const { session, logout, superSession, stopImpersonation, refreshSession } = useAdminAuth()
  // Pra onde ir ao voltar pro super: quem redireciona é o guard abaixo, assim
  // que a sessão volta a ser a do super-admin (um navigate() aqui disputaria
  // com ele e perderia).
  const [returnTo, setReturnTo] = useState<string | null>(null)
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(true)
  // A conta saiu do evento ativo (o super tirou o acesso): a API responde 401.
  const [sessionLost, setSessionLost] = useState(false)

  const token = session?.token ?? null
  const eventId = session?.admin.event_id ?? null
  const superMode = session ? isSuperSession(session) : false

  // Recarrega quando o evento ativo muda (troca de evento), não a cada
  // atualização da sessão.
  useEffect(() => {
    if (!token || eventId === null) return
    let active = true

    const load = () => {
      setLoading(true)
      setExpired(false)
      api
        .get<{ event: AdminEvent }>('/admin/event', token)
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
  }, [token, eventId])

  // Lista de eventos atualizada (um evento novo ligado à conta aparece sem
  // entrar de novo) e completa nas sessões salvas antes de existir a lista.
  useEffect(() => {
    if (!token || superMode) return
    let active = true
    refreshSession(token).catch((err) => {
      if (active && err instanceof ApiError && err.status === 401) setSessionLost(true)
    })
    return () => {
      active = false
    }
  }, [token, superMode, refreshSession])

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  // Sessão de super-admin caiu numa rota de evento por engano (ou acabou de
  // voltar do "entrar como admin") — manda pro lugar certo.
  if (superMode) {
    return <Navigate to={returnTo ?? '/super'} replace />
  }

  if (sessionLost) {
    return (
      <PageShell>
        <div className="w-full max-w-sm rounded-3xl border border-brand-primary-soft bg-white p-8 text-center shadow-lg shadow-brand-primary-soft">
          <h1 className="text-xl font-semibold text-[#3f3450]">Sessão encerrada</h1>
          <p className="mt-3 text-sm text-[#6b5d80]">
            Você não tem mais acesso a este evento. Entre de novo para ver os seus eventos.
          </p>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover"
          >
            Entrar de novo
          </button>
        </div>
      </PageShell>
    )
  }

  const canSwitch = (session.events?.length ?? 0) > 1

  const backToSuper = () => {
    const eventId = stopImpersonation()
    setReturnTo(eventId ? `/super/eventos/${eventId}` : '/super')
  }

  const impersonating = superSession !== null
  // Lista de presentes desligada no plano: o item some do menu.
  const nav = event && !giftsEnabled(event) ? NAV.filter((item) => item.to !== '/admin/presentes') : NAV

  return (
    <PanelLayout
      variant="admin"
      nav={nav}
      context={event ? <EventCard event={event} canSwitch={canSwitch} /> : undefined}
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
        <AccessExpired
          action={
            canSwitch && (
              <Link to="/admin/eventos" className="text-sm font-semibold text-brand-primary hover:underline">
                Ver meus outros eventos
              </Link>
            )
          }
        />
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
