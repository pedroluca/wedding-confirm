import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import type { EventType, GiftTemplate } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

type TemplateForm = {
  event_type: EventType
  name: string
  description: string
  suggested_amount: string
  quantity: string
  image: File | null
}

const EMPTY_FORM: TemplateForm = {
  event_type: 'wedding',
  name: '',
  description: '',
  suggested_amount: '',
  quantity: '1',
  image: null,
}

function toFormData(form: TemplateForm): FormData {
  const data = new FormData()
  data.set('event_type', form.event_type)
  data.set('name', form.name.trim())
  data.set('description', form.description.trim())
  data.set('suggested_amount', form.suggested_amount)
  data.set('quantity', form.quantity)
  if (form.image) {
    data.set('image', form.image)
  }
  return data
}

export default function SuperGiftTemplates() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [tab, setTab] = useState<EventType>('wedding')
  const [templates, setTemplates] = useState<GiftTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((key) => key + 1)

  const [createForm, setCreateForm] = useState<TemplateForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const createFileRef = useRef<HTMLInputElement>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<TemplateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = () => {
      setLoading(true)
      api
        .get<{ gift_templates: GiftTemplate[] }>('/admin/super/gift-templates', token)
        .then((res) => setTemplates(res.gift_templates))
        .catch(() => setError('Não foi possível carregar os modelos de presente.'))
        .finally(() => setLoading(false))
    }
    load()
  }, [token, reloadKey])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.post('/admin/super/gift-templates', toFormData({ ...createForm, event_type: tab }), token)
      setCreateForm(EMPTY_FORM)
      if (createFileRef.current) createFileRef.current.value = ''
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível cadastrar o modelo.')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (template: GiftTemplate) => {
    setEditingId(template.id)
    setEditForm({
      event_type: template.event_type,
      name: template.name,
      description: template.description ?? '',
      suggested_amount: String(template.suggested_amount),
      quantity: String(template.quantity),
      image: null,
    })
  }

  const handleUpdate = async (e: FormEvent, id: number) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post(`/admin/super/gift-templates/${id}`, toFormData(editForm), token)
      setEditingId(null)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remover este modelo de presente?')) return
    try {
      await api.del(`/admin/super/gift-templates/${id}`, token)
      reload()
    } catch {
      setError('Não foi possível remover o modelo.')
    }
  }

  const filtered = templates.filter((t) => t.event_type === tab)

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Presentes sugeridos</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Lista pronta que o admin de cada evento pode clonar para a própria lista de presentes, em vez
        de montar do zero. Um conjunto por tipo de evento.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setTab('wedding')}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'wedding' ? 'bg-brand-primary text-white' : 'border border-brand-primary-soft text-[#3f3450]'
          }`}
        >
          Casamento
        </button>
        <button
          type="button"
          onClick={() => setTab('birthday')}
          className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium transition ${
            tab === 'birthday' ? 'bg-brand-primary text-white' : 'border border-brand-primary-soft text-[#3f3450]'
          }`}
        >
          Aniversário
        </button>
      </div>

      <form
        onSubmit={handleCreate}
        className="mt-6 grid gap-3 rounded-2xl border border-brand-primary-soft p-5 sm:grid-cols-2"
      >
        <input
          required
          value={createForm.name}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
          placeholder="Nome do item"
          className="rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary sm:col-span-2"
        />
        <textarea
          value={createForm.description}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Descrição (opcional)"
          rows={2}
          className="resize-none rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary sm:col-span-2"
        />
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={createForm.suggested_amount}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, suggested_amount: e.target.value }))}
          placeholder="Valor sugerido (R$)"
          className="rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
        />
        <input
          required
          type="number"
          min="1"
          step="1"
          value={createForm.quantity}
          onChange={(e) => setCreateForm((prev) => ({ ...prev, quantity: e.target.value }))}
          placeholder="Quantidade"
          className="rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
        />
        <input
          ref={createFileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setCreateForm((prev) => ({ ...prev, image: e.target.files?.[0] ?? null }))}
          className="text-sm text-[#6b5d80] sm:col-span-2"
        />
        <button
          type="submit"
          disabled={creating}
          className="cursor-pointer rounded-full bg-brand-primary px-6 py-2 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60 sm:col-span-2"
        >
          {creating ? 'Cadastrando...' : `Adicionar a ${tab === 'wedding' ? 'casamento' : 'aniversário'}`}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {filtered.map((template) => (
            <li key={template.id} className="rounded-2xl border border-brand-primary-soft p-5">
              {editingId === template.id ? (
                <form onSubmit={(e) => handleUpdate(e, template.id)} className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary sm:col-span-2"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="resize-none rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary sm:col-span-2"
                  />
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={editForm.suggested_amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, suggested_amount: e.target.value }))}
                    className="rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
                  />
                  <input
                    required
                    type="number"
                    min="1"
                    step="1"
                    value={editForm.quantity}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    className="rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
                  />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setEditForm((prev) => ({ ...prev, image: e.target.files?.[0] ?? null }))}
                    className="text-sm text-[#6b5d80] sm:col-span-2"
                  />
                  <div className="flex gap-3 sm:col-span-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="cursor-pointer rounded-full bg-brand-primary px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
                    >
                      {saving ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="cursor-pointer rounded-full border border-brand-primary-soft px-6 py-2 text-sm font-medium text-[#3f3450] hover:bg-brand-primary-soft"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex gap-4">
                    {template.image_url && (
                      <img
                        src={template.image_url}
                        alt={template.name}
                        className="h-20 w-20 rounded-xl object-cover"
                      />
                    )}
                    <div>
                      <p className="font-medium text-[#3f3450]">{template.name}</p>
                      {template.description && (
                        <p className="mt-1 text-sm text-[#8b7a9c]">{template.description}</p>
                      )}
                      <p className="mt-1 text-sm text-[#6b5d80]">
                        {currency.format(template.suggested_amount)} · qtd. {template.quantity}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => startEdit(template)}
                      className="cursor-pointer text-sm text-brand-primary underline underline-offset-4"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(template.id)}
                      className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
          {filtered.length === 0 && (
            <p className="text-[#8b7a9c]">
              Nenhum modelo de {tab === 'wedding' ? 'casamento' : 'aniversário'} cadastrado ainda.
            </p>
          )}
        </ul>
      )}
    </div>
  )
}
