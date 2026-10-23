import { useEffect, useState, type FormEvent } from 'react'
import { Plus, TicketPercent } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { formatCouponDiscount } from '../../lib/pricing'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { checkboxLabelClass, fieldClass, inputClass, labelClass } from '../../components/panel/form'
import { EmptyState, panelCardClass, primaryButtonClass } from '../../components/panel/ui'
import type { Coupon, CouponDiscountType } from '../../types'

type CouponForm = {
  code: string
  discount_type: CouponDiscountType
  discount_value: string
  valid_until: string
  active: boolean
  notes: string
}

const EMPTY_FORM: CouponForm = {
  code: '',
  discount_type: 'percent',
  discount_value: '',
  valid_until: '',
  active: true,
  notes: '',
}

function toForm(coupon: Coupon): CouponForm {
  return {
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: String(coupon.discount_value),
    valid_until: coupon.valid_until ?? '',
    active: coupon.active,
    notes: coupon.notes ?? '',
  }
}

function toPayload(form: CouponForm) {
  return { ...form, code: form.code.trim(), notes: form.notes.trim() }
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

/** "2026-10-23" no fuso local, pra comparar com valid_until (DATE). */
function today(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function couponStatus(coupon: Coupon): { label: string; className: string } {
  if (!coupon.active) return { label: 'Desativado', className: 'bg-slate-100 text-slate-600' }
  if (coupon.valid_until && coupon.valid_until < today()) return { label: 'Vencido', className: 'bg-rose-50 text-rose-700' }
  return { label: 'Ativo', className: 'bg-emerald-50 text-emerald-700' }
}

/** Campos do cupom, iguais na criação e na edição. */
function CouponFields({ form, onChange }: { form: CouponForm; onChange: (form: CouponForm) => void }) {
  const update = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => onChange({ ...form, [key]: value })
  const isPercent = form.discount_type === 'percent'

  return (
    <>
      <label className={labelClass}>
        Código
        <input
          required
          value={form.code}
          maxLength={40}
          pattern="[A-Za-z0-9_\-]{3,40}"
          title="De 3 a 40 letras sem acento, números, - ou _"
          onChange={(e) => update('code', e.target.value.toUpperCase())}
          placeholder="Ex: PROMO20"
          autoComplete="off"
          className={`${inputClass} font-mono uppercase placeholder:font-sans placeholder:normal-case`}
        />
      </label>
      <div role="group" aria-label="Desconto">
        <span className={labelClass}>Desconto</span>
        <div className="mt-1 grid grid-cols-[6rem_minmax(0,1fr)] gap-2">
          <select
            value={form.discount_type}
            onChange={(e) => update('discount_type', e.target.value as CouponDiscountType)}
            aria-label="Tipo de desconto"
            className={`${fieldClass} cursor-pointer`}
          >
            <option value="percent">%</option>
            <option value="amount">R$</option>
          </select>
          <input
            required
            type="number"
            min="0.01"
            max={isPercent ? '100' : undefined}
            step="0.01"
            inputMode="decimal"
            value={form.discount_value}
            onChange={(e) => update('discount_value', e.target.value)}
            placeholder={isPercent ? 'Ex: 20' : 'Ex: 50,00'}
            aria-label="Valor do desconto"
            className={fieldClass}
          />
        </div>
      </div>
      <label className={labelClass}>
        Válido até <span className="font-normal text-[#8b7a9c]">(opcional)</span>
        <input
          type="date"
          value={form.valid_until}
          onChange={(e) => update('valid_until', e.target.value)}
          className={inputClass}
        />
      </label>
      <label className={labelClass}>
        Observação <span className="font-normal text-[#8b7a9c]">(opcional, só você vê)</span>
        <input
          value={form.notes}
          maxLength={255}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Ex: parceria com cerimonialista"
          className={inputClass}
        />
      </label>
      <label className={`${checkboxLabelClass} sm:col-span-2`}>
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => update('active', e.target.checked)}
          className="accent-brand-primary"
        />
        Ativo (pode ser usado no orçamento)
      </label>
    </>
  )
}

/** Aba "Cupons" de Preços e planos: cadastro de cupons de desconto (% ou R$). */
export function CouponsPanel() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const [createForm, setCreateForm] = useState<CouponForm>(EMPTY_FORM)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<CouponForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [pendingDelete, setPendingDelete] = useState<Coupon | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ coupons: Coupon[] }>('/admin/super/coupons', token)
      .then((res) => setCoupons(res.coupons))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [token])

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const res = await api.post<{ coupon: Coupon }>('/admin/super/coupons', toPayload(createForm), token)
      setCoupons((prev) => [res.coupon, ...prev])
      setCreateForm(EMPTY_FORM)
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : 'Não foi possível criar o cupom.')
    } finally {
      setCreating(false)
    }
  }

  const startEdit = (coupon: Coupon) => {
    setEditingId(coupon.id)
    setEditForm(toForm(coupon))
    setEditError(null)
  }

  const handleUpdate = async (e: FormEvent, id: number) => {
    e.preventDefault()
    setSaving(true)
    setEditError(null)
    try {
      const res = await api.put<{ coupon: Coupon }>(`/admin/super/coupons/${id}`, toPayload(editForm), token)
      setCoupons((prev) => prev.map((coupon) => (coupon.id === id ? res.coupon : coupon)))
      setEditingId(null)
    } catch (err) {
      setEditError(err instanceof ApiError ? err.message : 'Não foi possível salvar o cupom.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.del(`/admin/super/coupons/${pendingDelete.id}`, token)
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== pendingDelete.id))
    } catch {
      setDeleteError(`Não foi possível remover o cupom ${pendingDelete.code}.`)
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleCreate} className={`${panelCardClass} p-5 sm:p-6`}>
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
            <TicketPercent size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-[#3f3450]">Novo cupom</h2>
            <p className="mt-0.5 text-sm text-[#8b7a9c]">
              Desconto em % ou em reais sobre o total do orçamento. Nunca deixa o valor abaixo de zero.
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <CouponFields form={createForm} onChange={setCreateForm} />
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
          {createError && <p className="mr-auto text-sm text-rose-600">{createError}</p>}
          <button type="submit" disabled={creating} className={primaryButtonClass}>
            <Plus size={16} />
            {creating ? 'Criando...' : 'Criar cupom'}
          </button>
        </div>
      </form>

      {deleteError && <p className="text-sm text-rose-600">{deleteError}</p>}

      <section className={`overflow-hidden ${panelCardClass}`}>
        {loading ? (
          <EmptyState>Carregando...</EmptyState>
        ) : loadError ? (
          <EmptyState>Não foi possível carregar os cupons.</EmptyState>
        ) : coupons.length === 0 ? (
          <EmptyState>Nenhum cupom cadastrado ainda.</EmptyState>
        ) : (
          <ul className="divide-y divide-[#f3eef5]">
            {coupons.map((coupon) => {
              const status = couponStatus(coupon)
              return (
                <li key={coupon.id} className="px-5 py-4">
                  {editingId === coupon.id ? (
                    <form onSubmit={(e) => handleUpdate(e, coupon.id)} className="grid gap-4 sm:grid-cols-2">
                      <CouponFields form={editForm} onChange={setEditForm} />
                      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                        <button type="submit" disabled={saving} className={primaryButtonClass}>
                          {saving ? 'Salvando...' : 'Salvar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="cursor-pointer rounded-full border border-brand-primary-soft px-5 py-2.5 text-sm font-medium text-[#3f3450] hover:bg-brand-primary-soft"
                        >
                          Cancelar
                        </button>
                        {editError && <p className="text-sm text-rose-600">{editError}</p>}
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <p className="flex flex-wrap items-center gap-2">
                          <span className="font-mono font-semibold text-[#3f3450]">{coupon.code}</span>
                          <span className="font-medium text-brand-primary">{formatCouponDiscount(coupon)}</span>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-[#8b7a9c]">
                          {coupon.valid_until
                            ? `Válido até ${dateFormatter.format(new Date(`${coupon.valid_until}T12:00:00`))}`
                            : 'Sem validade'}
                          {coupon.uses !== undefined &&
                            ` · ${coupon.uses === 0 ? 'ainda não usado' : `usado em ${coupon.uses} ${coupon.uses === 1 ? 'evento' : 'eventos'}`}`}
                          {coupon.notes && ` · ${coupon.notes}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => startEdit(coupon)}
                          className="cursor-pointer text-sm text-brand-primary underline underline-offset-4"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(coupon)}
                          className="cursor-pointer text-sm text-rose-600 underline underline-offset-4"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {pendingDelete && (
        <ConfirmDialog
          title={`Remover o cupom ${pendingDelete.code}?`}
          description={<p>Ele deixa de valer nos orçamentos. Para só pausar, desative em vez de remover.</p>}
          confirmLabel="Remover cupom"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  )
}
