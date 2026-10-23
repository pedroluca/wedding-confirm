import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CalendarClock, CircleCheck, Plus, TimerReset, Wallet } from 'lucide-react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { accessStatus } from '../../lib/eventAccess'
import { parseMysqlDate } from '../../lib/eventFormat'
import { EVENT_TYPE_OPTIONS, EVENT_TYPES, formatHostNames } from '../../lib/eventTypes'
import { AccessBadge } from '../../components/panel/AccessBadge'
import { EmptyState, Meter, PageHeader, panelCardClass, primaryButtonClass, StatCard } from '../../components/panel/ui'
import type { SuperEvent } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })
const DAY_MS = 24 * 60 * 60 * 1000
const LIST_SIZE = 5

function daysUntil(date: Date, now: number): number {
  return Math.ceil((date.getTime() - now) / DAY_MS)
}

function inWords(days: number): string {
  if (days <= 0) return 'hoje'
  if (days === 1) return 'amanhã'
  return `em ${days} dias`
}

function DashboardCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className={`${panelCardClass} p-5 sm:p-6`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-[#3f3450]">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

function EventLink({ event, children }: { event: SuperEvent; children: ReactNode }) {
  return (
    <Link
      to={`/super/eventos/${event.id}`}
      className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-[#faf8fb]"
    >
      {children}
    </Link>
  )
}

export default function SuperDashboard() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [events, setEvents] = useState<SuperEvent[] | null>(null)
  const [error, setError] = useState(false)
  const [now] = useState(() => Date.now())

  useEffect(() => {
    api
      .get<{ events: SuperEvent[] }>('/admin/super/events', token)
      .then((res) => setEvents(res.events))
      .catch(() => setError(true))
  }, [token])

  const header = (
    <PageHeader
      title="Visão geral"
      description="Como estão os eventos, os acessos e os pagamentos."
      actions={
        <Link to="/super/eventos/novo" className={primaryButtonClass}>
          <Plus size={16} />
          Novo evento
        </Link>
      }
    />
  )

  if (error) {
    return (
      <div>
        {header}
        <p className="mt-8 text-sm text-rose-600">Não foi possível carregar os eventos.</p>
      </div>
    )
  }

  if (!events) {
    return (
      <div>
        {header}
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      </div>
    )
  }

  const today = new Date(now)
  const withAccess = events.map((event) => ({ event, access: accessStatus(event.access_expires_at, now) }))
  const active = withAccess.filter(({ access }) => access.state !== 'expired')
  const expiring = withAccess
    .filter(({ access }) => access.state === 'expiring')
    .sort((a, b) => (a.access.daysLeft ?? 0) - (b.access.daysLeft ?? 0))

  const paidIn = (match: (date: Date) => boolean) =>
    events.reduce((total, event) => {
      const paidAt = event.last_payment_at ? parseMysqlDate(event.last_payment_at) : null
      return paidAt && match(paidAt) ? total + (event.price_charged ?? 0) : total
    }, 0)
  const paidThisMonth = paidIn(
    (date) => date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
  )
  const paidThisYear = paidIn((date) => date.getFullYear() === today.getFullYear())

  const confirmed = active.reduce((total, { event }) => total + event.stats.confirmed, 0)
  const people = active.reduce((total, { event }) => total + event.stats.people, 0)

  const upcoming = events
    .map((event) => ({ event, date: event.event_date ? parseMysqlDate(event.event_date) : null }))
    .filter((item): item is { event: SuperEvent; date: Date } => item.date !== null && daysUntil(item.date, now) >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, LIST_SIZE)

  const recent = [...events]
    .sort((a, b) => (parseMysqlDate(b.created_at)?.getTime() ?? 0) - (parseMysqlDate(a.created_at)?.getTime() ?? 0))
    .slice(0, LIST_SIZE)

  const byType = EVENT_TYPE_OPTIONS.map((type) => ({
    type,
    count: events.filter((event) => event.event_type === type).length,
  }))
  const maxByType = Math.max(1, ...byType.map((item) => item.count))

  return (
    <div>
      {header}

      <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Eventos ativos"
          value={active.length}
          hint={`${events.length} ${events.length === 1 ? 'evento' : 'eventos'} no total`}
          icon={CalendarClock}
        />
        <StatCard
          label="Acessos vencendo"
          value={expiring.length}
          hint="nos próximos 30 dias"
          icon={TimerReset}
        />
        <StatCard
          label="Recebido no mês"
          value={currency.format(paidThisMonth)}
          hint={`${currency.format(paidThisYear)} em ${today.getFullYear()}`}
          icon={Wallet}
        />
        <StatCard
          label="Confirmações"
          value={confirmed}
          hint={`de ${people} ${people === 1 ? 'convidado' : 'convidados'} em eventos ativos`}
          icon={CircleCheck}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <DashboardCard
            title="Próximos eventos"
            action={
              <Link to="/super/eventos" className="text-sm font-medium text-brand-primary hover:underline">
                Ver todos
              </Link>
            }
          >
            {upcoming.length === 0 ? (
              <EmptyState>Nenhum evento com data marcada pela frente.</EmptyState>
            ) : (
              <ul className="divide-y divide-[#f3eef5]">
                {upcoming.map(({ event, date }) => (
                  <li key={event.id}>
                    <EventLink event={event}>
                      <div className="w-14 shrink-0 rounded-xl bg-brand-primary-soft/60 py-1.5 text-center">
                        <p className="text-lg leading-none font-semibold text-brand-primary">{date.getDate()}</p>
                        <p className="mt-0.5 text-[11px] text-[#8b7a9c] uppercase">
                          {date.toLocaleString('pt-BR', { month: 'short' }).replace('.', '')}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-balance break-words text-[#3f3450]">{formatHostNames(event)}</p>
                        <p className="text-xs text-[#8b7a9c]">
                          {EVENT_TYPES[event.event_type].label} · {inWords(daysUntil(date, now))}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Meter
                            value={event.stats.confirmed}
                            max={event.stats.people}
                            label={`${event.stats.confirmed} de ${event.stats.people} confirmados`}
                          />
                          <span className="shrink-0 text-xs text-[#6b5d80]">
                            {event.stats.confirmed}/{event.stats.people}
                          </span>
                        </div>
                      </div>
                    </EventLink>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>

        <div className="lg:col-span-2">
          <DashboardCard title="Eventos por tipo">
            <ul className="space-y-4">
              {byType.map(({ type, count }) => (
                <li key={type} title={`${EVENT_TYPES[type].label}: ${count}`}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#6b5d80]">{EVENT_TYPES[type].label}</span>
                    <span className="font-medium text-[#3f3450]">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-primary-soft">
                    <div
                      className="h-full rounded-full bg-brand-primary"
                      style={{ width: `${(count / maxByType) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </DashboardCard>
        </div>

        <div className="lg:col-span-3">
          <DashboardCard title="Acessos vencendo">
            {expiring.length === 0 ? (
              <EmptyState>Nenhum acesso vence nos próximos 30 dias.</EmptyState>
            ) : (
              <ul className="divide-y divide-[#f3eef5]">
                {expiring.slice(0, LIST_SIZE).map(({ event }) => (
                  <li key={event.id}>
                    <EventLink event={event}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-balance break-words text-[#3f3450]">{formatHostNames(event)}</p>
                        <p className="text-xs text-[#8b7a9c]">{EVENT_TYPES[event.event_type].label}</p>
                      </div>
                      <AccessBadge expiresAt={event.access_expires_at} />
                    </EventLink>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>

        <div className="lg:col-span-2">
          <DashboardCard title="Criados recentemente">
            {recent.length === 0 ? (
              <EmptyState>Nenhum evento cadastrado ainda.</EmptyState>
            ) : (
              <ul className="divide-y divide-[#f3eef5]">
                {recent.map((event) => (
                  <li key={event.id}>
                    <EventLink event={event}>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-balance break-words text-[#3f3450]">{formatHostNames(event)}</p>
                        <p className="text-xs text-[#8b7a9c]">
                          {shortDate.format(parseMysqlDate(event.created_at) ?? new Date())}
                          {event.price_charged !== null && ` · ${currency.format(event.price_charged)}`}
                        </p>
                      </div>
                    </EventLink>
                  </li>
                ))}
              </ul>
            )}
          </DashboardCard>
        </div>
      </div>
    </div>
  )
}
