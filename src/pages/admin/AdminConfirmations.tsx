import { useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleX, Clock, Gift } from 'lucide-react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { formatGiftsLastView, giftsViewsTitle } from '../../lib/giftsViews'
import { StatusBadge } from '../../components/StatusBadge'
import { PageHeader, panelCardClass, StatCard } from '../../components/panel/ui'
import type { AdminGuest, GuestStatus } from '../../types'

// Os acessos à lista de presentes são do link do convite, então só a linha
// do titular carrega essa informação (null nos relacionados).
type Row = {
  id: number
  name: string
  group: string
  status: GuestStatus
  gifts: Pick<AdminGuest, 'gifts_views' | 'gifts_last_viewed_at'> | null
}

type Filter = GuestStatus | 'todos' | 'presentes'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'confirmado', label: 'Confirmados' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'recusado', label: 'Recusados' },
  { key: 'presentes', label: 'Viram os presentes' },
]

export default function AdminConfirmations() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [guests, setGuests] = useState<AdminGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('todos')

  useEffect(() => {
    api
      .get<{ guests: AdminGuest[] }>('/admin/guests', token)
      .then((res) => setGuests(res.guests))
      .finally(() => setLoading(false))
  }, [token])

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = []
    for (const guest of guests) {
      result.push({ id: guest.id, name: guest.name, group: guest.name, status: guest.status, gifts: guest })
      for (const dep of guest.dependents) {
        result.push({ id: dep.id, name: dep.name, group: guest.name, status: dep.status, gifts: null })
      }
    }
    return result
  }, [guests])

  // "Viram os presentes" lista os convites (titulares) que abriram a lista ao menos uma vez.
  const filtered =
    filter === 'todos'
      ? rows
      : filter === 'presentes'
        ? rows.filter((row) => (row.gifts?.gifts_views ?? 0) > 0)
        : rows.filter((row) => row.status === filter)

  const counts = useMemo(
    () => ({
      confirmado: rows.filter((r) => r.status === 'confirmado').length,
      pendente: rows.filter((r) => r.status === 'pendente').length,
      recusado: rows.filter((r) => r.status === 'recusado').length,
      presentes: guests.filter((g) => g.gifts_views > 0).length,
    }),
    [rows, guests]
  )

  return (
    <div>
      <PageHeader
        title="Lista de presenças"
        description="Quem já respondeu o convite, quem falta e quem abriu a lista de presentes."
      />

      {!loading && (
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Confirmados"
            value={counts.confirmado}
            hint={`de ${rows.length} ${rows.length === 1 ? 'pessoa' : 'pessoas'}`}
            icon={CircleCheck}
          />
          <StatCard label="Pendentes" value={counts.pendente} icon={Clock} />
          <StatCard label="Recusados" value={counts.recusado} icon={CircleX} />
          <StatCard
            label="Viram os presentes"
            value={counts.presentes}
            hint={`de ${guests.length} ${guests.length === 1 ? 'convite' : 'convites'}`}
            icon={Gift}
          />
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`cursor-pointer inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === f.key
                ? 'bg-brand-primary text-white'
                : 'border border-brand-primary-soft text-[#3f3450] hover:bg-brand-primary-soft'
            }`}
          >
            {f.key === 'presentes' && <Gift size={15} aria-hidden />}
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : (
        <div className={`mt-4 overflow-x-auto ${panelCardClass}`}>
          <table className="w-full text-left text-sm">
            <thead className="text-xs tracking-wide text-[#8b7a9c] uppercase">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">Grupo</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium" title="Quantas vezes o link do convite abriu a lista de presentes">
                  Presentes
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-[#f3eef5]">
                  <td className="px-4 py-3 text-[#3f3450]">{row.name}</td>
                  <td className="px-4 py-3 text-[#8b7a9c]">{row.group}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.gifts && row.gifts.gifts_views > 0 ? (
                      <div title={giftsViewsTitle(row.gifts)}>
                        <span className="inline-flex items-center gap-1.5 font-medium text-brand-primary">
                          <Gift size={14} aria-hidden />
                          {row.gifts.gifts_views}x
                        </span>
                        {formatGiftsLastView(row.gifts) && (
                          <span className="block text-xs text-[#8b7a9c]">{formatGiftsLastView(row.gifts)}</span>
                        )}
                      </div>
                    ) : row.gifts ? (
                      <span className="text-[#c4b6d1]" aria-label="Não abriu a lista de presentes">
                        —
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-[#8b7a9c]">
                    {filter === 'presentes' ? 'Ninguém abriu a lista de presentes ainda.' : 'Nenhum registro.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
