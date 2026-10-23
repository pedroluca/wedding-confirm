import { useEffect, useState, type FormEvent } from 'react'
import { Mail, Pencil, Trash2, UserPlus } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { fieldClass } from '../../components/panel/form'
import { EmptyState, panelCardClass, primaryButtonClass, secondaryButtonClass } from '../../components/panel/ui'
import type { AdminUser } from '../../types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Admins de um evento (aba "Admins" da página do evento no super-admin):
 * convidar (o admin recebe um email pra definir a senha), editar e remover.
 * onChange avisa a página pra atualizar a contagem de admins.
 */
export function EventAdminsPanel({ eventId, onChange }: { eventId: number; onChange?: () => void }) {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [saving, setSaving] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<AdminUser | null>(null)
  const [deleting, setDeleting] = useState(false)

  const reload = () => {
    setReloadKey((key) => key + 1)
    onChange?.()
  }

  useEffect(() => {
    api
      .get<{ admins: AdminUser[] }>(`/admin/super/events/${eventId}/admins`, token)
      .then((res) => setAdmins(res.admins))
      .catch(() => setError('Não foi possível carregar os admins deste evento.'))
      .finally(() => setLoading(false))
  }, [eventId, token, reloadKey])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    setInvitedEmail(null)
    try {
      await api.post(`/admin/super/events/${eventId}/admins`, { name: name.trim(), email: email.trim() }, token)
      setInvitedEmail(email.trim())
      setName('')
      setEmail('')
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível convidar o admin.')
    } finally {
      setCreating(false)
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

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setError(null)
    try {
      await api.del(`/admin/super/events/${eventId}/admins/${pendingDelete.id}`, token)
      setPendingDelete(null)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível remover o admin.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleCreate} className={`${panelCardClass} p-5 sm:p-6`}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
            <UserPlus size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-[#3f3450]">Convidar admin</h2>
            <p className="mt-0.5 text-sm text-[#8b7a9c]">
              A pessoa recebe um email com o link pra definir a própria senha.
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome"
            aria-label="Nome do admin"
            className={`${fieldClass} sm:flex-1`}
          />
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email do admin"
            className={`${fieldClass} sm:flex-1`}
          />
          <button type="submit" disabled={creating} className={primaryButtonClass}>
            {creating ? 'Convidando...' : 'Convidar'}
          </button>
        </div>
        {invitedEmail && (
          <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-700">
            <Mail size={14} />
            Convite enviado para {invitedEmail}.
          </p>
        )}
      </form>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className={`overflow-hidden ${panelCardClass}`}>
        {loading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : admins.length === 0 ? (
          <EmptyState>Nenhum admin cadastrado ainda. Sem admin, não dá pra entrar no painel do evento.</EmptyState>
        ) : (
          <ul className="divide-y divide-[#f3eef5]">
            {admins.map((admin) => (
              <li key={admin.id} className="px-5 py-4">
                {editingId === admin.id ? (
                  <form onSubmit={(e) => handleUpdate(e, admin.id)} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <input
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      aria-label="Nome"
                      className={`${fieldClass} sm:flex-1`}
                    />
                    <input
                      required
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      aria-label="Email"
                      className={`${fieldClass} sm:flex-1`}
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={saving} className={primaryButtonClass}>
                        {saving ? 'Salvando...' : 'Salvar'}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)} className={secondaryButtonClass}>
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft font-semibold text-brand-primary">
                      {admin.name.trim().charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[#3f3450]">{admin.name}</p>
                      <p className="truncate text-sm text-[#8b7a9c]">
                        {admin.email} · desde {dateFormatter.format(new Date(admin.created_at.replace(' ', 'T')))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => startEdit(admin)}
                      aria-label={`Editar ${admin.name}`}
                      title="Editar"
                      className="cursor-pointer rounded-full p-2 text-[#8b7a9c] transition hover:bg-brand-primary-soft hover:text-brand-primary"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(admin)}
                      aria-label={`Remover ${admin.name}`}
                      title="Remover"
                      className="cursor-pointer rounded-full p-2 text-[#8b7a9c] transition hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title={`Remover ${pendingDelete.name}?`}
          description={<p>Essa pessoa perde o acesso ao painel do evento. Dá pra convidar de novo depois.</p>}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
