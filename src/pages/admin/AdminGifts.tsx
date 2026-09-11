import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import type { AdminGift, GiftTemplate } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/**
 * Tela de escolha no primeiro acesso (lista de presentes ainda vazia):
 * começar do zero ou clonar uma lista de sugestões pronta para o tipo do
 * evento. Clonar copia os itens (nome, descrição, valor, imagem) para
 * dentro da lista real do evento — a partir daí é só a lista dele, sem
 * nenhum vínculo com o modelo original.
 */
function TemplateChoice({
  token,
  onScratch,
  onCloned,
}: {
  token: string | null
  onScratch: () => void
  onCloned: () => void
}) {
  const [previewing, setPreviewing] = useState(false)
  const [templates, setTemplates] = useState<GiftTemplate[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [cloning, setCloning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openPreview = () => {
    setPreviewing(true)
    setLoadingTemplates(true)
    api
      .get<{ gift_templates: GiftTemplate[] }>('/admin/gift-templates', token)
      .then((res) => setTemplates(res.gift_templates))
      .catch(() => setError('Não foi possível carregar as sugestões.'))
      .finally(() => setLoadingTemplates(false))
  }

  const handleClone = async () => {
    setCloning(true)
    setError(null)
    try {
      await api.post('/admin/gift-templates/clone', undefined, token)
      onCloned()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível usar a lista de sugestões.')
    } finally {
      setCloning(false)
    }
  }

  if (!previewing) {
    return (
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={onScratch}
          className="cursor-pointer rounded-2xl border border-brand-primary-soft p-6 text-left transition hover:bg-brand-primary-soft"
        >
          <p className="font-semibold text-[#3f3450]">Começar do zero</p>
          <p className="mt-1 text-sm text-[#8b7a9c]">Monte sua lista de presentes item por item.</p>
        </button>
        <button
          type="button"
          onClick={openPreview}
          className="cursor-pointer rounded-2xl border border-brand-primary bg-brand-primary-soft p-6 text-left transition"
        >
          <p className="font-semibold text-[#3f3450]">Usar sugestões prontas</p>
          <p className="mt-1 text-sm text-[#8b7a9c]">
            Comece com uma lista pronta e depois edite, remova ou adicione o que quiser.
          </p>
        </button>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setPreviewing(false)}
        className="cursor-pointer text-sm text-brand-primary underline underline-offset-4"
      >
        Voltar
      </button>

      {loadingTemplates ? (
        <p className="mt-4 text-[#8b7a9c]">Carregando sugestões...</p>
      ) : templates.length === 0 ? (
        <p className="mt-4 text-[#8b7a9c]">Nenhuma sugestão disponível para este tipo de evento ainda.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {templates.map((template) => (
              <div key={template.id} className="flex gap-3 rounded-2xl border border-brand-primary-soft p-4">
                {template.image_url && (
                  <img
                    src={template.image_url}
                    alt={template.name}
                    className="h-16 w-16 rounded-xl object-cover"
                  />
                )}
                <div>
                  <p className="font-medium text-[#3f3450]">{template.name}</p>
                  <p className="text-sm text-[#6b5d80]">{currency.format(template.suggested_amount)}</p>
                </div>
              </div>
            ))}
          </div>

          {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            disabled={cloning}
            onClick={handleClone}
            className="cursor-pointer mt-6 rounded-full bg-brand-primary px-6 py-2 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
          >
            {cloning ? 'Adicionando...' : `Usar esta lista (${templates.length} ${templates.length === 1 ? 'item' : 'itens'})`}
          </button>
        </>
      )}
    </div>
  )
}

type GiftForm = {
  name: string
  description: string
  suggested_amount: string
  quantity: string
  image: File | null
}

const EMPTY_FORM: GiftForm = { name: '', description: '', suggested_amount: '', quantity: '1', image: null }

function toFormData(form: GiftForm): FormData {
  const data = new FormData()
  data.set('name', form.name.trim())
  data.set('description', form.description.trim())
  data.set('suggested_amount', form.suggested_amount)
  data.set('quantity', form.quantity)
  if (form.image) {
    data.set('image', form.image)
  }
  return data
}

export default function AdminGifts() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [gifts, setGifts] = useState<AdminGift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const reload = () => setReloadKey((key) => key + 1)

  const [createForm, setCreateForm] = useState<GiftForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const createFileRef = useRef<HTMLInputElement>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<GiftForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [templateChoice, setTemplateChoice] = useState<'undecided' | 'scratch'>('undecided')

  useEffect(() => {
    const load = () => {
      setLoading(true)
      api
        .get<{ gifts: AdminGift[] }>('/admin/gifts', token)
        .then((res) => setGifts(res.gifts))
        .catch(() => setError('Não foi possível carregar a lista de presentes.'))
        .finally(() => setLoading(false))
    }
    load()
  }, [token, reloadKey])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      await api.post('/admin/gifts', toFormData(createForm), token)
      setCreateForm(EMPTY_FORM)
      if (createFileRef.current) createFileRef.current.value = ''
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar o item.')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (gift: AdminGift) => {
    setEditingId(gift.id)
    setEditForm({
      name: gift.name,
      description: gift.description ?? '',
      suggested_amount: String(gift.suggested_amount),
      quantity: String(gift.quantity),
      image: null,
    })
  }

  const handleUpdate = async (e: FormEvent, id: number) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await api.post(`/admin/gifts/${id}`, toFormData(editForm), token)
      setEditingId(null)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Remover este item da lista de presentes?')) return
    try {
      await api.del(`/admin/gifts/${id}`, token)
      reload()
    } catch {
      setError('Não foi possível remover o item.')
    }
  }

  const showTemplateChoice = !loading && gifts.length === 0 && templateChoice === 'undecided'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Lista de presentes</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Itens que aparecem para os convidados na página de presentes, com a quantidade que ainda
        pode ser presenteada.
      </p>

      {loading ? (
        <p className="mt-8 text-[#8b7a9c]">Carregando...</p>
      ) : showTemplateChoice ? (
        <TemplateChoice
          token={token}
          onScratch={() => setTemplateChoice('scratch')}
          onCloned={reload}
        />
      ) : (
        <>
        <form onSubmit={handleCreate} className="mt-6 grid gap-3 rounded-2xl border border-brand-primary-soft p-5 sm:grid-cols-2">
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
            {creating ? 'Cadastrando...' : 'Adicionar item'}
          </button>
        </form>
  
        {error && <p className="mt-4 text-sm text-rose-600">{error}</p>}
  
        <ul className="mt-8 space-y-4">
            {gifts.map((gift) => (
              <li key={gift.id} className="rounded-2xl border border-brand-primary-soft p-5">
                {editingId === gift.id ? (
                  <form onSubmit={(e) => handleUpdate(e, gift.id)} className="grid gap-3 sm:grid-cols-2">
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
                      {gift.image_url && (
                        <img src={gift.image_url} alt={gift.name} className="h-20 w-20 rounded-xl object-cover" />
                      )}
                      <div>
                        <p className="font-medium text-[#3f3450]">{gift.name}</p>
                        {gift.description && <p className="mt-1 text-sm text-[#8b7a9c]">{gift.description}</p>}
                        <p className="mt-1 text-sm text-[#6b5d80]">
                          {currency.format(gift.suggested_amount)} · {gift.claimed_count} de {gift.quantity}{' '}
                          presenteado{gift.quantity === 1 ? '' : 's'}
                          {gift.remaining === 0 && ' · esgotado'}
                        </p>
                        {gift.claims.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedId((current) => (current === gift.id ? null : gift.id))}
                            className="cursor-pointer mt-1 text-sm text-brand-primary underline underline-offset-4"
                          >
                            {expandedId === gift.id ? 'Ocultar presenteios' : `Ver presenteios (${gift.claims.length})`}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(gift)}
                        className="cursor-pointer text-sm text-brand-primary underline underline-offset-4"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(gift.id)}
                        className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                )}
  
                {expandedId === gift.id && editingId !== gift.id && (
                  <ul className="mt-4 space-y-2 border-t border-brand-primary-soft pt-4">
                    {gift.claims.map((claim) => (
                      <li key={claim.id} className="text-sm text-[#3f3450]">
                        <span className="font-medium">{claim.guest_name}</span>
                        {claim.message && <span className="text-[#6b5d80]"> — "{claim.message}"</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
            {gifts.length === 0 && <p className="text-[#8b7a9c]">Nenhum item cadastrado ainda.</p>}
          </ul>
        </>
      )}
    </div>
  )
}
