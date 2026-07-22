import { useEffect, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import type { AdminUser } from '../../types'

export default function AdminUsers() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [creating, setCreating] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((key) => key + 1)

  useEffect(() => {
    const load = () => {
      setLoading(true)
      api
        .get<{ users: AdminUser[] }>('/admin/users', token)
        .then((res) => setUsers(res.users))
        .catch(() => setError('Não foi possível carregar os usuários.'))
        .finally(() => setLoading(false))
    }
    load()
  }, [token, reloadKey])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.post('/admin/users', form, token)
      setForm({ name: '', email: '', password: '' })
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o usuário.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remover este usuário admin?')) return
    try {
      await api.del(`/admin/users/${id}`, token)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível remover o usuário.')
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Usuários admin</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">Pessoas com acesso a esta área administrativa.</p>

      <form onSubmit={handleCreate} className="mt-6 grid gap-3 sm:grid-cols-3">
        <input
          required
          value={form.name}
          onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Nome"
          className="rounded-xl border border-lilac-200 px-4 py-2 outline-none focus:border-lilac-500"
        />
        <input
          required
          type="email"
          value={form.email}
          onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
          className="rounded-xl border border-lilac-200 px-4 py-2 outline-none focus:border-lilac-500"
        />
        <input
          required
          type="password"
          value={form.password}
          onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          placeholder="Senha (mín. 8 caracteres)"
          className="rounded-xl border border-lilac-200 px-4 py-2 outline-none focus:border-lilac-500"
        />
        <button
          type="submit"
          disabled={creating}
          className="cursor-pointer rounded-full bg-lilac-500 px-6 py-2 font-semibold text-white transition hover:bg-[#c298ff] disabled:opacity-60 sm:col-span-3"
        >
          Cadastrar usuário
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : (
        <ul className="mt-8 space-y-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex items-center justify-between rounded-2xl border border-lilac-200 px-5 py-3"
            >
              <div>
                <p className="font-medium text-[#3f3450]">{user.name}</p>
                <p className="text-sm text-[#8b7a9c]">{user.email}</p>
              </div>
              {user.id === session?.admin.id ? (
                <span className="text-sm text-[#8b7a9c]">Você</span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleDelete(user.id)}
                  className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                >
                  Remover
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
