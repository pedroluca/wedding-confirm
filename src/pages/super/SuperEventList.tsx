import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { accessStatus, type AccessState } from '../../lib/eventAccess'
import { parseMysqlDate } from '../../lib/eventFormat'
import { EVENT_TYPE_OPTIONS, EVENT_TYPES, formatHostNames } from '../../lib/eventTypes'
import { guestBand, PLAN_OPTIONS } from '../../lib/plans'
import { AccessBadge } from '../../components/panel/AccessBadge'
import { GuestBandBadge } from '../../components/panel/GuestBand'
import { PlanBadge } from '../../components/panel/PlanBadge'
import { EmptyState, Meter, PageHeader, panelCardClass, primaryButtonClass } from '../../components/panel/ui'
import type { EventPlan, EventType, SuperEvent } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const shortDate = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

type AccessFilter = 'todos' | Exclude<AccessState, 'none'>

const ACCESS_FILTERS: { value: AccessFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'active', label: 'Ativos' },
  { value: 'expiring', label: 'Vencendo' },
  { value: 'expired', label: 'Expirados' },
]

/** Ignora acentos e caixa na busca. */
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

const COLUMNS = 'md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1.3fr)_8.5rem_6.5rem]'

export default function SuperEventList() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [events, setEvents] = useState<SuperEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<EventType | 'todos'>('todos')
  const [planFilter, setPlanFilter] = useState<EventPlan | 'todos'>('todos')
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('todos')

  useEffect(() => {
    api
      .get<{ events: SuperEvent[] }>('/admin/super/events', token)
      .then((res) => setEvents(res.events))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  const filtered = useMemo(() => {
    const term = normalize(search)
    return events.filter((event) => {
      // "Sem prazo" conta como ativo: o acesso não vence.
      const state = accessStatus(event.access_expires_at).state
      const accessState = state === 'none' ? 'active' : state
      return (
        (typeFilter === 'todos' || event.event_type === typeFilter) &&
        (planFilter === 'todos' || event.plan === planFilter) &&
        (accessFilter === 'todos' || accessState === accessFilter) &&
        (!term || normalize(`${formatHostNames(event)} ${event.subtitle ?? ''} ${event.slug}`).includes(term))
      )
    })
  }, [events, search, typeFilter, planFilter, accessFilter])

  return (
    <div>
      <PageHeader
        title="Eventos"
        description={loading ? undefined : `${events.length} ${events.length === 1 ? 'evento cadastrado' : 'eventos cadastrados'}.`}
        actions={
          <Link to="/super/eventos/novo" className={primaryButtonClass}>
            <Plus size={16} />
            Novo evento
          </Link>
        }
      />

      <div className="mt-8 flex flex-col gap-3 lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8b7a9c]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou endereço do convite"
            aria-label="Buscar eventos"
            className="w-full rounded-full border border-[#ece6f0] bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-brand-primary"
          />
        </label>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as EventType | 'todos')}
          aria-label="Filtrar por tipo"
          className="cursor-pointer rounded-full border border-[#ece6f0] bg-white px-4 py-2.5 text-sm text-[#3f3450] outline-none focus:border-brand-primary"
        >
          <option value="todos">Todos os tipos</option>
          {EVENT_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {EVENT_TYPES[type].label}
            </option>
          ))}
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as EventPlan | 'todos')}
          aria-label="Filtrar por plano"
          className="cursor-pointer rounded-full border border-[#ece6f0] bg-white px-4 py-2.5 text-sm text-[#3f3450] outline-none focus:border-brand-primary"
        >
          <option value="todos">Todos os planos</option>
          {PLAN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por acesso">
          {ACCESS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setAccessFilter(filter.value)}
              aria-pressed={accessFilter === filter.value}
              className={`cursor-pointer rounded-full px-3.5 py-2 text-sm font-medium transition ${
                accessFilter === filter.value
                  ? 'bg-[#231b2e] text-white'
                  : 'border border-[#ece6f0] bg-white text-[#6b5d80] hover:text-[#3f3450]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className={`mt-4 overflow-hidden ${panelCardClass}`}>
        <div
          className={`hidden gap-4 border-b border-[#f3eef5] px-5 py-3 text-xs font-medium tracking-wide text-[#8b7a9c] uppercase md:grid ${COLUMNS}`}
        >
          <span>Evento</span>
          <span>Data</span>
          <span>Confirmados</span>
          <span>Acesso</span>
          <span className="text-right">Valor</span>
        </div>

        {loading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : error ? (
          <EmptyState>Não foi possível carregar os eventos.</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>
            {events.length === 0 ? 'Nenhum evento cadastrado ainda.' : 'Nenhum evento com esses filtros.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-[#f3eef5]">
            {filtered.map((event) => {
              const date = event.event_date ? parseMysqlDate(event.event_date) : null
              const { confirmed, people } = event.stats

              return (
                <li key={event.id}>
                  <Link
                    to={`/super/eventos/${event.id}`}
                    className={`grid grid-cols-1 gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-[#faf8fb] md:items-center ${COLUMNS}`}
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-balance break-words text-[#3f3450]">
                        {formatHostNames(event)}
                        <PlanBadge plan={event.plan} />
                        <GuestBandBadge band={guestBand(people, event)} />
                      </p>
                      <p className="text-xs break-words text-[#8b7a9c]">
                        {EVENT_TYPES[event.event_type].label}
                        {event.subtitle && ` · ${event.subtitle}`} · /{event.slug}
                      </p>
                    </div>
                    <p className="text-sm text-[#6b5d80]">{date ? shortDate.format(date) : 'Sem data'}</p>
                    <div className="flex items-center gap-2">
                      <Meter value={confirmed} max={people} label={`${confirmed} de ${people} confirmados`} />
                      <span className="shrink-0 text-xs text-[#6b5d80] tabular-nums">
                        {confirmed}/{people}
                      </span>
                    </div>
                    <div>
                      <AccessBadge expiresAt={event.access_expires_at} />
                    </div>
                    {/* No celular a linha do valor só aparece quando há valor. */}
                    <p
                      className={`text-sm text-[#3f3450] tabular-nums md:block md:text-right ${
                        event.price_charged === null ? 'hidden' : ''
                      }`}
                    >
                      {event.price_charged !== null ? currency.format(event.price_charged) : '—'}
                    </p>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
