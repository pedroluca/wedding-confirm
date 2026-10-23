import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  Check,
  CircleAlert,
  Copy,
  CornerDownRight,
  Gift,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { useAdminEvent } from '../../lib/adminEventContext'
import { StatusBadge } from '../../components/StatusBadge'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { giftsViewsTitle } from '../../lib/giftsViews'
import { GUEST_ROLE_STYLES, guestRoleOptions } from '../../lib/guestRoles'
import { buildShareMessage, resolveShareTemplate } from '../../lib/shareMessage'
import type { AdminDependent, AdminGuest, GuestRole, GuestStatus } from '../../types'

// Mesmo limite do backend (require_string(..., 150) em handlers/admin_guests.php).
const NAME_MAX_LENGTH = 150

type RoleFilter = 'todos' | 'padrinhos' | 'pais' | 'especial'

const ROLE_FILTERS: { value: Exclude<RoleFilter, 'todos'>; label: string; roles: GuestRole[] }[] = [
  { value: 'padrinhos', label: 'Padrinhos e madrinhas', roles: ['padrinho', 'madrinha'] },
  { value: 'pais', label: 'Pais', roles: ['pais'] },
  { value: 'especial', label: 'Especiais', roles: ['especial'] },
]

/** Ignora acentos e caixa, para busca e detecção de nome repetido. */
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

// titularId === null quando o alvo é o próprio titular.
type Target = { id: number; titularId: number | null }

type PendingDelete = Target & {
  name: string
  status: GuestStatus
  titularName: string | null
  dependentNames: string[]
}

type Editing = Target & { value: string }

function NameEditForm({
  value,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: {
  value: string
  saving: boolean
  onChange: (value: string) => void
  onSubmit: (e: FormEvent) => void
  onCancel: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="flex min-w-0 flex-1 items-center gap-1">
      <input
        autoFocus
        value={value}
        maxLength={NAME_MAX_LENGTH}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        aria-label="Nome"
        className="min-w-0 flex-1 rounded-lg border border-brand-primary px-2 py-1 text-[#3f3450] outline-none"
      />
      <button
        type="submit"
        disabled={saving}
        aria-label="Salvar nome"
        title="Salvar"
        className="cursor-pointer rounded-full p-1.5 text-emerald-600 hover:bg-emerald-50 disabled:opacity-60"
      >
        <Check size={16} />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancelar edição"
        title="Cancelar"
        className="cursor-pointer rounded-full p-1.5 text-[#8b7a9c] hover:bg-brand-primary-soft"
      >
        <X size={16} />
      </button>
    </form>
  )
}

export default function AdminGuests() {
  const { session } = useAdminAuth()
  const event = useAdminEvent()
  const token = session?.token ?? null
  // Sempre do mais recente para o mais antigo, para o convite recém-criado
  // aparecer logo abaixo do formulário.
  const [guests, setGuests] = useState<AdminGuest[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('todos')
  // Papel (padrinho, pais...) só existe em alguns tipos de evento (casamento, formatura).
  const roleOptions = guestRoleOptions(event.event_type)

  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<GuestRole>('convidado')
  const [creating, setCreating] = useState(false)
  const newNameRef = useRef<HTMLInputElement>(null)
  const [highlightId, setHighlightId] = useState<number | null>(null)

  const [dependentFormFor, setDependentFormFor] = useState<number | null>(null)
  const [dependentDraft, setDependentDraft] = useState('')
  const [addingDependent, setAddingDependent] = useState(false)

  const [editing, setEditing] = useState<Editing | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null)
  const [deleting, setDeleting] = useState(false)

  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [copiedMessageFor, setCopiedMessageFor] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastTimer = useRef<number | undefined>(undefined)

  useEffect(() => {
    api
      .get<{ guests: AdminGuest[] }>('/admin/guests', token)
      .then((res) => setGuests([...res.guests].sort((a, b) => b.id - a.id)))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [token])

  const showError = (message: string) => {
    window.clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = window.setTimeout(() => setToast(null), 4000)
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name || creating) return
    setCreating(true)
    try {
      const res = await api.post<{ guest: Omit<AdminGuest, 'confirmed_at' | 'created_at'> }>(
        '/admin/guests',
        { name, role: newRole },
        token
      )
      const guest: AdminGuest = { ...res.guest, confirmed_at: null, created_at: new Date().toISOString() }
      setGuests((prev) => [guest, ...prev])
      setNewName('')
      setNewRole('convidado')
      setSearch('')
      setRoleFilter('todos')
      setHighlightId(guest.id)
      setTimeout(() => setHighlightId((current) => (current === guest.id ? null : current)), 2500)
    } catch {
      showError('Não foi possível cadastrar o convidado.')
    } finally {
      setCreating(false)
      newNameRef.current?.focus()
    }
  }

  const openDependentForm = (titularId: number) => {
    setDependentFormFor(titularId)
    setDependentDraft('')
  }

  const closeDependentForm = () => {
    setDependentFormFor(null)
    setDependentDraft('')
  }

  const handleAddDependent = async (e: FormEvent, titularId: number) => {
    e.preventDefault()
    const name = dependentDraft.trim()
    if (!name || addingDependent) return
    setAddingDependent(true)
    try {
      const res = await api.post<{ dependent: Omit<AdminDependent, 'confirmed_at' | 'created_at'> }>(
        `/admin/guests/${titularId}/dependents`,
        { name },
        token
      )
      const dependent: AdminDependent = { ...res.dependent, confirmed_at: null, created_at: new Date().toISOString() }
      setGuests((prev) =>
        prev.map((guest) =>
          guest.id === titularId ? { ...guest, dependents: [...guest.dependents, dependent] } : guest
        )
      )
      // O campo continua aberto e focado para emendar o próximo relacionado.
      setDependentDraft('')
    } catch {
      showError('Não foi possível adicionar o relacionado.')
    } finally {
      setAddingDependent(false)
    }
  }

  const handleRename = async (e: FormEvent) => {
    e.preventDefault()
    if (!editing || savingEdit) return
    const { id, titularId } = editing
    const name = editing.value.trim()
    if (!name) return
    setSavingEdit(true)
    try {
      // O slug do titular não muda no backend, então o link já enviado continua valendo.
      await api.put(`/admin/guests/${id}`, { name }, token)
      setGuests((prev) =>
        prev.map((guest) => {
          if (titularId === null) return guest.id === id ? { ...guest, name } : guest
          if (guest.id !== titularId) return guest
          return { ...guest, dependents: guest.dependents.map((dep) => (dep.id === id ? { ...dep, name } : dep)) }
        })
      )
      setEditing(null)
    } catch {
      showError('Não foi possível salvar o novo nome.')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleRoleChange = async (id: number, role: GuestRole) => {
    const previous = guests.find((guest) => guest.id === id)?.role
    setGuests((prev) => prev.map((guest) => (guest.id === id ? { ...guest, role } : guest)))
    try {
      await api.put(`/admin/guests/${id}`, { role }, token)
    } catch {
      if (previous) {
        setGuests((prev) => prev.map((guest) => (guest.id === id ? { ...guest, role: previous } : guest)))
      }
      showError('Não foi possível alterar o papel do convidado.')
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    const { id, titularId } = pendingDelete
    setDeleting(true)
    try {
      await api.del(`/admin/guests/${id}`, token)
      setGuests((prev) =>
        titularId === null
          ? prev.filter((guest) => guest.id !== id)
          : prev.map((guest) =>
              guest.id === titularId
                ? { ...guest, dependents: guest.dependents.filter((dep) => dep.id !== id) }
                : guest
            )
      )
    } catch {
      showError('Não foi possível remover o convidado.')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  const guestPath = (slug: string) => `${event.slug}/${slug}`

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/${guestPath(slug)}`).then(() => {
      setCopiedSlug(slug)
      setTimeout(() => setCopiedSlug((current) => (current === slug ? null : current)), 2000)
    })
  }

  // Mensagem de envio (Configurações) com o nome e o link deste convite.
  const copyMessage = (guest: AdminGuest) => {
    const message = buildShareMessage(resolveShareTemplate(event), {
      event,
      guestName: guest.name,
      dependentNames: guest.dependents.map((dep) => dep.name),
      link: `${window.location.origin}/${guestPath(guest.slug)}`,
    })
    navigator.clipboard.writeText(message).then(
      () => {
        setCopiedMessageFor(guest.id)
        setTimeout(() => setCopiedMessageFor((current) => (current === guest.id ? null : current)), 2000)
      },
      () => showError('Não foi possível copiar a mensagem.')
    )
  }

  const totalTitulares = guests.length
  const totalPessoas = guests.reduce((total, guest) => total + 1 + guest.dependents.length, 0)
  const totalViewedGifts = guests.filter((guest) => guest.gifts_views > 0).length

  const query = normalize(search)
  const activeRoleFilter = ROLE_FILTERS.find((filter) => filter.value === roleFilter)
  const visibleGuests = guests.filter(
    (guest) =>
      (!query ||
        normalize(guest.name).includes(query) ||
        guest.dependents.some((dep) => normalize(dep.name).includes(query))) &&
      (!activeRoleFilter || activeRoleFilter.roles.includes(guest.role))
  )
  const roleFilterCounts = ROLE_FILTERS.map((filter) => ({
    ...filter,
    count: guests.filter((guest) => filter.roles.includes(guest.role)).length,
  })).filter((filter) => filter.count > 0)

  // Aviso (não bloqueia) para evitar cadastrar a mesma pessoa duas vezes.
  const newNameKey = normalize(newName)
  const duplicateOf = newNameKey
    ? guests.find(
        (guest) =>
          normalize(guest.name) === newNameKey || guest.dependents.some((dep) => normalize(dep.name) === newNameKey)
      )
    : undefined

  const editButtonClass =
    'cursor-pointer shrink-0 rounded-full p-1.5 text-[#8b7a9c] transition hover:bg-brand-primary-soft hover:text-brand-primary focus-visible:opacity-100 pointer-fine:opacity-0'
  const deleteButtonClass =
    'cursor-pointer shrink-0 rounded-full p-2 text-[#8b7a9c] transition hover:bg-rose-50 hover:text-rose-600'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Pessoas e relacionados</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Cada convidado titular recebe um link próprio para confirmar a presença dele e de seus relacionados.
      </p>
      <p className="mt-2 text-sm font-medium text-brand-primary">
        {totalTitulares} {totalTitulares === 1 ? 'convite' : 'convites'} · {totalPessoas}{' '}
        {totalPessoas === 1 ? 'pessoa no total' : 'pessoas no total'}
        {totalViewedGifts > 0 && (
          <span className="font-normal text-[#8b7a9c]">
            {' '}
            · {totalViewedGifts} {totalViewedGifts === 1 ? 'abriu' : 'abriram'} a lista de presentes
          </span>
        )}
      </p>

      <form
        onSubmit={handleCreate}
        className="mt-6 rounded-2xl border border-brand-primary-soft bg-brand-primary-soft/40 p-4 sm:p-5"
      >
        <label htmlFor="new-guest" className="text-sm font-medium text-[#3f3450]">
          Novo convite
        </label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input
            id="new-guest"
            ref={newNameRef}
            value={newName}
            maxLength={NAME_MAX_LENGTH}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do convidado titular"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-xl border border-brand-primary-soft bg-white px-4 py-2.5 outline-none focus:border-brand-primary"
          />
          {roleOptions && (
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as GuestRole)}
              aria-label="Papel do convidado"
              className="cursor-pointer rounded-xl border border-brand-primary-soft bg-white px-3 py-2.5 text-sm text-[#3f3450] outline-none focus:border-brand-primary"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          <button
            type="submit"
            disabled={creating || !newName.trim()}
            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full bg-brand-primary px-6 py-2.5 font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-default disabled:opacity-60"
          >
            <Plus size={18} />
            {creating ? 'Adicionando...' : 'Adicionar'}
          </button>
        </div>
        {duplicateOf ? (
          <p className="mt-2 text-xs text-amber-700">
            Já existe alguém com esse nome na lista
            {normalize(duplicateOf.name) === newNameKey ? '' : ` (relacionado de ${duplicateOf.name})`}.
          </p>
        ) : (
          <p className="mt-2 text-xs text-[#8b7a9c]">
            Os convites mais recentes aparecem no topo da lista.
          </p>
        )}
      </form>

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : loadError ? (
        <p className="mt-8 text-sm text-rose-600">Não foi possível carregar a lista de convidados.</p>
      ) : guests.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-brand-primary-soft px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
            <Users size={22} />
          </div>
          <p className="mt-4 font-medium text-[#3f3450]">Nenhum convidado cadastrado ainda</p>
          <p className="mt-1 max-w-sm text-sm text-[#8b7a9c]">
            Adicione o nome do titular acima. Depois é só incluir os relacionados dele no próprio cartão.
          </p>
        </div>
      ) : (
        <>
          <div className="relative mt-8">
            <Search
              size={18}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8b7a9c]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar convidado ou relacionado"
              aria-label="Buscar convidado ou relacionado"
              className="w-full rounded-xl border border-brand-primary-soft py-2.5 pr-4 pl-10 text-sm outline-none focus:border-brand-primary"
            />
          </div>

          {roleOptions && roleFilterCounts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por papel">
              {[{ value: 'todos' as const, label: 'Todos', count: guests.length }, ...roleFilterCounts].map(
                (filter) => (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setRoleFilter(filter.value)}
                    aria-pressed={roleFilter === filter.value}
                    className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
                      roleFilter === filter.value
                        ? 'border-brand-primary bg-brand-primary text-white'
                        : 'border-brand-primary-soft text-[#6b5d80] hover:bg-brand-primary-soft'
                    }`}
                  >
                    {filter.label} · {filter.count}
                  </button>
                )
              )}
            </div>
          )}

          {visibleGuests.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[#8b7a9c]">
              {query ? `Ninguém encontrado para "${search.trim()}".` : 'Ninguém encontrado com esse filtro.'}{' '}
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('todos')
                }}
                className="cursor-pointer font-medium text-brand-primary underline underline-offset-4"
              >
                {roleFilter === 'todos' ? 'Limpar busca' : 'Limpar filtros'}
              </button>
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {visibleGuests.map((guest) => {
                const isHighlighted = highlightId === guest.id
                const isEditingTitular = editing?.id === guest.id

                return (
                  <li
                    key={guest.id}
                    className={`rounded-2xl border bg-white p-4 transition-[border-color,box-shadow] duration-700 sm:p-5 ${
                      isHighlighted
                        ? 'border-brand-primary ring-4 ring-brand-primary-soft motion-safe:animate-pop-in'
                        : 'border-brand-primary-soft'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        {isEditingTitular ? (
                          <NameEditForm
                            value={editing.value}
                            saving={savingEdit}
                            onChange={(value) => setEditing({ ...editing, value })}
                            onSubmit={handleRename}
                            onCancel={() => setEditing(null)}
                          />
                        ) : (
                          <div className="group/name flex items-center gap-1">
                            <p className="min-w-0 font-semibold wrap-break-word text-[#3f3450]">{guest.name}</p>
                            <button
                              type="button"
                              onClick={() => setEditing({ id: guest.id, titularId: null, value: guest.name })}
                              aria-label={`Renomear ${guest.name}`}
                              title="Renomear"
                              className={`${editButtonClass} group-hover/name:opacity-100`}
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => copyLink(guest.slug)}
                          title="Copiar link do convite"
                          className="cursor-copy mt-0.5 inline-flex max-w-full items-center gap-1.5 text-sm text-brand-primary hover:underline hover:underline-offset-4"
                        >
                          {copiedSlug === guest.slug ? (
                            <>
                              <Check size={14} className="shrink-0" />
                              <span>Link copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} className="shrink-0" />
                              <span className="truncate">
                                {window.location.host}/{guestPath(guest.slug)}
                              </span>
                            </>
                          )}
                        </button>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => copyMessage(guest)}
                            title="Copiar a mensagem de envio com o nome e o link deste convite"
                            className="cursor-copy inline-flex items-center gap-1.5 rounded-full border border-brand-primary-soft px-3 py-1 text-xs font-medium text-brand-primary transition hover:bg-brand-primary-soft"
                          >
                            {copiedMessageFor === guest.id ? (
                              <>
                                <Check size={14} />
                                Mensagem copiada!
                              </>
                            ) : (
                              <>
                                <MessageSquareText size={14} />
                                Copiar mensagem
                              </>
                            )}
                          </button>
                          {roleOptions && (
                            <select
                              value={guest.role}
                              onChange={(e) => handleRoleChange(guest.id, e.target.value as GuestRole)}
                              aria-label={`Papel de ${guest.name}`}
                              title="Papel no evento (aparece em destaque no convite)"
                              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium outline-none focus:border-brand-primary ${GUEST_ROLE_STYLES[guest.role]}`}
                            >
                              {roleOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          )}
                          {guest.gifts_views > 0 && (
                            <span
                              title={giftsViewsTitle(guest)}
                              className="inline-flex items-center gap-1 text-xs text-[#8b7a9c]"
                            >
                              <Gift size={13} aria-hidden />
                              <span className="sr-only">{giftsViewsTitle(guest)}</span>
                              <span aria-hidden>{guest.gifts_views}x</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <StatusBadge status={guest.status} />
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              id: guest.id,
                              titularId: null,
                              name: guest.name,
                              status: guest.status,
                              titularName: null,
                              dependentNames: guest.dependents.map((dep) => dep.name),
                            })
                          }
                          aria-label={`Remover ${guest.name}`}
                          title="Remover"
                          className={deleteButtonClass}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {guest.dependents.length > 0 && (
                      <ul className="mt-3 space-y-1 border-t border-brand-primary-soft pt-3">
                        {guest.dependents.map((dep) => (
                          <li key={dep.id} className="group/dep flex items-center justify-between gap-3">
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <CornerDownRight size={16} className="shrink-0 text-[#c4b6d1]" />
                              {editing?.id === dep.id ? (
                                <NameEditForm
                                  value={editing.value}
                                  saving={savingEdit}
                                  onChange={(value) => setEditing({ ...editing, value })}
                                  onSubmit={handleRename}
                                  onCancel={() => setEditing(null)}
                                />
                              ) : (
                                <>
                                  <span className="min-w-0 wrap-break-word text-[#3f3450]">{dep.name}</span>
                                  <button
                                    type="button"
                                    onClick={() => setEditing({ id: dep.id, titularId: guest.id, value: dep.name })}
                                    aria-label={`Renomear ${dep.name}`}
                                    title="Renomear"
                                    className={`${editButtonClass} -ml-1 group-hover/dep:opacity-100`}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <StatusBadge status={dep.status} />
                              <button
                                type="button"
                                onClick={() =>
                                  setPendingDelete({
                                    id: dep.id,
                                    titularId: guest.id,
                                    name: dep.name,
                                    status: dep.status,
                                    titularName: guest.name,
                                    dependentNames: [],
                                  })
                                }
                                aria-label={`Remover ${dep.name}`}
                                title="Remover"
                                className={deleteButtonClass}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    {dependentFormFor === guest.id ? (
                      <form onSubmit={(e) => handleAddDependent(e, guest.id)} className="mt-3 flex gap-2">
                        <input
                          autoFocus
                          value={dependentDraft}
                          maxLength={NAME_MAX_LENGTH}
                          onChange={(e) => setDependentDraft(e.target.value)}
                          onKeyDown={(e) => e.key === 'Escape' && closeDependentForm()}
                          onBlur={() => !dependentDraft.trim() && closeDependentForm()}
                          placeholder={`Relacionado de ${guest.name.split(' ')[0]}`}
                          aria-label={`Nome do relacionado de ${guest.name}`}
                          autoComplete="off"
                          className="min-w-0 flex-1 rounded-xl border border-brand-primary-soft px-3 py-2 text-sm outline-none focus:border-brand-primary"
                        />
                        <button
                          type="submit"
                          disabled={addingDependent || !dependentDraft.trim()}
                          className="cursor-pointer rounded-full bg-brand-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:cursor-default disabled:opacity-60"
                        >
                          {addingDependent ? 'Adicionando...' : 'Adicionar'}
                        </button>
                        <button
                          type="button"
                          onClick={closeDependentForm}
                          aria-label="Fechar"
                          title="Fechar"
                          className="cursor-pointer shrink-0 rounded-full p-2 text-[#8b7a9c] hover:bg-brand-primary-soft"
                        >
                          <X size={16} />
                        </button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openDependentForm(guest.id)}
                        className="cursor-pointer mt-2 -ml-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-brand-primary transition hover:bg-brand-primary-soft"
                      >
                        <Plus size={16} />
                        Adicionar relacionado
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={`Remover ${pendingDelete.name}?`}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
          description={
            <>
              {pendingDelete.titularId === null ? (
                <p>O link de confirmação deste convite deixa de funcionar.</p>
              ) : (
                <p>
                  {pendingDelete.name} deixa de aparecer no convite de {pendingDelete.titularName}.
                </p>
              )}
              {pendingDelete.dependentNames.length > 0 && (
                <p>
                  {pendingDelete.dependentNames.length === 1 ? 'O relacionado' : 'Os relacionados'}{' '}
                  <span className="font-medium text-[#3f3450]">{pendingDelete.dependentNames.join(', ')}</span>{' '}
                  {pendingDelete.dependentNames.length === 1 ? 'também será removido.' : 'também serão removidos.'}
                </p>
              )}
              {pendingDelete.status !== 'pendente' && (
                <p className="font-medium text-amber-700">
                  Essa pessoa já {pendingDelete.status === 'confirmado' ? 'confirmou presença' : 'recusou o convite'}.
                </p>
              )}
            </>
          }
        />
      )}

      {toast && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-6 z-60 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-[#3f3450] px-4 py-3 text-sm text-white shadow-xl motion-safe:animate-pop-in"
        >
          <CircleAlert size={18} className="shrink-0 text-rose-300" />
          <span className="flex-1">{toast}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Fechar aviso"
            className="cursor-pointer rounded-full p-1 text-white/70 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  )
}
