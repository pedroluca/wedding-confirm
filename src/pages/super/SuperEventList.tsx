import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import type { SuperEvent } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function isExpired(event: SuperEvent): boolean {
  if (!event.access_expires_at) return false
  return new Date(event.access_expires_at.replace(' ', 'T')).getTime() <= Date.now()
}

export default function SuperEventList() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [events, setEvents] = useState<SuperEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    api
      .get<{ events: SuperEvent[] }>('/admin/super/events', token)
      .then((res) => setEvents(res.events))
      .finally(() => setLoading(false))
  }, [token, reloadKey])

  const handleDelete = async (event: SuperEvent) => {
    const name = event.host_name_secondary ? `${event.host_name} e ${event.host_name_secondary}` : event.host_name
    const confirmed = window.confirm(
      `Remover o evento "${name}" (/${event.slug})?\n\n` +
        'Isso apaga PERMANENTEMENTE todos os convidados, presentes e admins deste evento. Não pode ser desfeito.'
    )
    if (!confirmed) return

    try {
      await api.del(`/admin/super/events/${event.id}`, token)
      setReloadKey((key) => key + 1)
    } catch {
      setError('Não foi possível remover o evento.')
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-[#3f3450]">Eventos</h1>
        <Link
          to="/super/eventos/novo"
          className="cursor-pointer rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover"
        >
          Novo evento
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="rounded-2xl border border-brand-primary-soft p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#3f3450]">
                    {event.host_name_secondary
                      ? `${event.host_name} e ${event.host_name_secondary}`
                      : event.host_name}
                  </p>
                  <p className="mt-1 text-sm text-[#8b7a9c]">
                    /{event.slug} · {event.event_type === 'wedding' ? 'Casamento' : 'Aniversário'}
                    {event.price_charged !== null && ` · ${currency.format(event.price_charged)}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isExpired(event) ? (
                    <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-600">
                      Expirado
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-600">
                      Ativo
                    </span>
                  )}
                  <Link
                    to={`/super/eventos/${event.id}`}
                    className="text-sm text-brand-primary underline underline-offset-4"
                  >
                    Editar
                  </Link>
                  <Link
                    to={`/super/eventos/${event.id}/admins`}
                    className="text-sm text-brand-primary underline underline-offset-4"
                  >
                    Admins
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDelete(event)}
                    className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                  >
                    Remover
                  </button>
                </div>
              </div>
            </li>
          ))}
          {events.length === 0 && <p className="text-[#8b7a9c]">Nenhum evento cadastrado ainda.</p>}
        </ul>
      )}
    </div>
  )
}
