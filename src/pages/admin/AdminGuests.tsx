import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { StatusBadge } from '../../components/StatusBadge'
import type { AdminGuest } from '../../types'

export default function AdminGuests() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [guests, setGuests] = useState<AdminGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [dependentDrafts, setDependentDrafts] = useState<Record<number, string>>({})
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((key) => key + 1)

  useEffect(() => {
    const load = () => {
      setLoading(true)
      api
        .get<{ guests: AdminGuest[] }>('/admin/guests', token)
        .then((res) => setGuests(res.guests))
        .catch(() => setError('Não foi possível carregar a lista de convidados.'))
        .finally(() => setLoading(false))
    }
    load()
  }, [token, reloadKey])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    setError(null)
    try {
      await api.post('/admin/guests', { name: newName.trim() }, token)
      setNewName('')
      reload()
    } catch {
      setError('Não foi possível cadastrar o convidado.')
    } finally {
      setCreating(false)
    }
  }

  const handleAddDependent = async (titularId: number) => {
    const name = (dependentDrafts[titularId] ?? '').trim()
    if (!name) return
    try {
      await api.post(`/admin/guests/${titularId}/dependents`, { name }, token)
      setDependentDrafts((prev) => ({ ...prev, [titularId]: '' }))
      reload()
    } catch {
      setError('Não foi possível adicionar o relacionado.')
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remover este convidado? Isso também remove os relacionados dele.')) return
    try {
      await api.del(`/admin/guests/${id}`, token)
      reload()
    } catch {
      setError('Não foi possível remover o convidado.')
    }
  }

  const copyLink = (slug: string) => {
    const link = `${window.location.origin}/${slug}`
    navigator.clipboard.writeText(link).then(() => {
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 2000)
    })
  }

  const totalTitulares = guests.length
  const totalPessoas = guests.reduce((total, guest) => total + 1 + guest.dependents.length, 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Pessoas e relacionados</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Cada convidado titular recebe um link próprio para confirmar a presença dele e de seus relacionados.
      </p>
      <p className="mt-2 text-sm font-medium text-lilac-500">
        {totalTitulares} {totalTitulares === 1 ? 'convite' : 'convites'} · {totalPessoas}{' '}
        {totalPessoas === 1 ? 'pessoa no total' : 'pessoas no total'}
      </p>

      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap gap-3">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome do convidado"
          className="min-w-50 flex-1 rounded-xl border border-lilac-200 px-4 py-2 outline-none focus:border-lilac-500"
        />
        <button
          type="submit"
          disabled={creating}
          className="cursor-pointer rounded-full bg-lilac-500 px-6 py-2 font-semibold text-white transition hover:bg-[#c298ff] disabled:opacity-60"
        >
          Adicionar convidado
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {guests.map((guest) => (
            <li key={guest.id} className="rounded-2xl border border-lilac-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#3f3450]">{guest.name}</p>
                  <button
                    type="button"
                    onClick={() => copyLink(guest.slug)}
                    className="cursor-copy mt-1 text-sm text-lilac-500 underline underline-offset-4"
                  >
                    {copiedSlug === guest.slug ? 'Link copiado!' : `${window.location.origin}/${guest.slug}`}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={guest.status} />
                  <button
                    type="button"
                    onClick={() => handleDelete(guest.id)}
                    className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                  >
                    Remover
                  </button>
                </div>
              </div>

              {guest.dependents.length > 0 && (
                <ul className="mt-4 space-y-2 border-t border-lilac-100 pt-4">
                  {guest.dependents.map((dep) => (
                    <li key={dep.id} className="flex items-center justify-between gap-3 pl-4">
                      <span className="text-[#3f3450]">{dep.name}</span>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={dep.status} />
                        <button
                          type="button"
                          onClick={() => handleDelete(dep.id)}
                          className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                        >
                          Remover
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex gap-3 pl-4">
                <input
                  value={dependentDrafts[guest.id] ?? ''}
                  onChange={(e) => setDependentDrafts((prev) => ({ ...prev, [guest.id]: e.target.value }))}
                  placeholder="Nome do relacionado"
                  className="flex-1 rounded-xl border border-lilac-200 px-3 py-1.5 text-sm outline-none focus:border-lilac-500"
                />
                <button
                  type="button"
                  onClick={() => handleAddDependent(guest.id)}
                  className="cursor-pointer rounded-full border border-lilac-300 px-4 py-1.5 text-sm font-medium text-lilac-500 hover:bg-lilac-100"
                >
                  Adicionar
                </button>
              </div>
            </li>
          ))}
          {guests.length === 0 && <p className="text-[#8b7a9c]">Nenhum convidado cadastrado ainda.</p>}
        </ul>
      )}
    </div>
  )
}
