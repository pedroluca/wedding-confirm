import { useEffect, useMemo, useState } from 'react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { StatusBadge } from '../../components/StatusBadge'
import type { AdminGuest, GuestStatus } from '../../types'

type Row = { id: number; name: string; group: string; status: GuestStatus }

const FILTERS: { key: GuestStatus | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'confirmado', label: 'Confirmados' },
  { key: 'pendente', label: 'Pendentes' },
  { key: 'recusado', label: 'Recusados' },
]

export default function AdminConfirmations() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [guests, setGuests] = useState<AdminGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<GuestStatus | 'todos'>('todos')

  useEffect(() => {
    api
      .get<{ guests: AdminGuest[] }>('/admin/guests', token)
      .then((res) => setGuests(res.guests))
      .finally(() => setLoading(false))
  }, [token])

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = []
    for (const guest of guests) {
      result.push({ id: guest.id, name: guest.name, group: guest.name, status: guest.status })
      for (const dep of guest.dependents) {
        result.push({ id: dep.id, name: dep.name, group: guest.name, status: dep.status })
      }
    }
    return result
  }, [guests])

  const filtered = filter === 'todos' ? rows : rows.filter((row) => row.status === filter)

  const counts = useMemo(
    () => ({
      confirmado: rows.filter((r) => r.status === 'confirmado').length,
      pendente: rows.filter((r) => r.status === 'pendente').length,
      recusado: rows.filter((r) => r.status === 'recusado').length,
    }),
    [rows]
  )

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Lista de presenças</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        {counts.confirmado} confirmados · {counts.pendente} pendentes · {counts.recusado} recusados
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === f.key
                ? 'bg-lilac-500 text-white'
                : 'border border-lilac-200 text-[#3f3450] hover:bg-lilac-100'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-lilac-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-lilac-100/60 text-[#3f3450]">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Grupo</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-t border-lilac-100">
                  <td className="px-4 py-3 text-[#3f3450]">{row.name}</td>
                  <td className="px-4 py-3 text-[#8b7a9c]">{row.group}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-[#8b7a9c]">
                    Nenhum registro.
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
