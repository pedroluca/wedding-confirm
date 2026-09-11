import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import type { AdminUser } from '../../types'

export default function SuperEventAdmins() {
  const { eventId = '' } = useParams()
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((key) => key + 1)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = () => {
      setLoading(true)
      api
        .get<{ admins: AdminUser[] }>(`/admin/super/events/${eventId}/admins`, token)
        .then((res) => setAdmins(res.admins))
        .catch(() => setError('Não foi possível carregar os admins deste evento.'))
        .finally(() => setLoading(false))
    }
    load()
  }, [eventId, token, reloadKey])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.post(`/admin/super/events/${eventId}/admins`, { name: name.trim(), email: email.trim() }, token)
      setName('')
      setEmail('')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível convidar o admin.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remover este admin do evento?')) return
    try {
      await api.del(`/admin/super/events/${eventId}/admins/${id}`, token)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover o admin.')
    }
  }

  const startEdit = (admin: AdminUser) => {
    setEditingId(admin.id)
    setEditName(admin.name)
    setEditEmail(admin.email)
  }

  const handleUpdate = async (e: FormEvent, id: number) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.put(`/admin/super/events/${eventId}/admins/${id}`, { name: editName.trim(), email: editEmail.trim() }, token)
      setEditingId(null)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Admins do evento</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Cada novo admin recebe um email para definir a própria senha.
      </p>

      <form onSubmit={handleCreate} className="mt-6 flex flex-wrap gap-3">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="min-w-40 flex-1 rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
        />
        <input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="min-w-40 flex-1 rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
        />
        <button
          type="submit"
          disabled={creating}
          className="cursor-pointer rounded-full bg-brand-primary px-6 py-2 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
        >
          {creating ? 'Convidando...' : 'Convidar admin'}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {admins.map((admin) => (
            <li key={admin.id} className="rounded-2xl border border-brand-primary-soft p-4">
              {editingId === admin.id ? (
                <form onSubmit={(e) => handleUpdate(e, admin.id)} className="flex flex-wrap gap-3">
                  <input
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-w-40 flex-1 rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
                  />
                  <input
                    required
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="min-w-40 flex-1 rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={saving}
                      className="cursor-pointer rounded-full bg-brand-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="cursor-pointer rounded-full border border-brand-primary-soft px-5 py-2 text-sm font-medium text-[#3f3450] hover:bg-brand-primary-soft"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#3f3450]">{admin.name}</p>
                    <p className="text-sm text-[#8b7a9c]">{admin.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(admin)}
                      className="cursor-pointer text-sm text-brand-primary underline underline-offset-4"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(admin.id)}
                      className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {admins.length === 0 && <p className="text-[#8b7a9c]">Nenhum admin cadastrado ainda.</p>}
        </ul>
      )}
    </div>
  )
}
