import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import type { EventType, NameFont, SuperEvent } from '../../types'

type EditForm = {
  event_type: EventType
  host_name: string
  host_name_secondary: string
  event_date: string
  venue_name: string
  venue_name_secondary: string
  address: string
  maps_url: string
  dress_code: string
  pix_key: string
  color_primary: string
  name_font: NameFont
  access_expires_at: string
  price_charged: string
  last_payment_at: string
  payment_notes: string
}

const NAME_FONT_OPTIONS: { value: NameFont; label: string; fontFamily: string }[] = [
  { value: 'sans', label: 'Padrão', fontFamily: 'inherit' },
  { value: 'fleur', label: 'Caligrafia (Fleur De Leah)', fontFamily: "'Fleur De Leah', cursive" },
  { value: 'pinyon', label: 'Caligrafia (Pinyon Script)', fontFamily: "'Pinyon Script', cursive" },
]

function toDatetimeLocalValue(mysqlDateTime: string | null): string {
  if (!mysqlDateTime) return ''
  return mysqlDateTime.replace(' ', 'T').slice(0, 16)
}

function toFormState(event: SuperEvent): EditForm {
  return {
    event_type: event.event_type,
    host_name: event.host_name,
    host_name_secondary: event.host_name_secondary ?? '',
    event_date: toDatetimeLocalValue(event.event_date),
    venue_name: event.venue_name ?? '',
    venue_name_secondary: event.venue_name_secondary ?? '',
    address: event.address ?? '',
    maps_url: event.maps_url ?? '',
    dress_code: event.dress_code ?? '',
    pix_key: event.pix_key ?? '',
    color_primary: event.color_primary,
    name_font: event.name_font,
    access_expires_at: toDatetimeLocalValue(event.access_expires_at),
    price_charged: event.price_charged !== null ? String(event.price_charged) : '',
    last_payment_at: event.last_payment_at ?? '',
    payment_notes: event.payment_notes ?? '',
  }
}

export default function SuperEventEdit() {
  const { eventId = '' } = useParams()
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const [form, setForm] = useState<EditForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    api
      .get<{ event: SuperEvent }>(`/admin/super/events/${eventId}`, token)
      .then((res) => setForm(toFormState(res.event)))
      .catch(() => setError('Não foi possível carregar o evento.'))
      .finally(() => setLoading(false))
  }, [eventId, token])

  const handleSubmit = async (e: FormEvent) => {
    if (!form) return
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await api.put<{ event: SuperEvent }>(
        `/admin/super/events/${eventId}`,
        {
          event_type: form.event_type,
          host_name: form.host_name.trim(),
          host_name_secondary: form.host_name_secondary.trim() || undefined,
          event_date: form.event_date || undefined,
          venue_name: form.venue_name.trim() || undefined,
          venue_name_secondary: form.venue_name_secondary.trim() || undefined,
          address: form.address.trim() || undefined,
          maps_url: form.maps_url.trim() || undefined,
          dress_code: form.dress_code.trim() || undefined,
          pix_key: form.pix_key.trim() || undefined,
          color_primary: form.color_primary,
          name_font: form.name_font,
          access_expires_at: form.access_expires_at || undefined,
          price_charged: form.price_charged || undefined,
          last_payment_at: form.last_payment_at || undefined,
          payment_notes: form.payment_notes.trim() || undefined,
        },
        token
      )
      setForm(toFormState(res.event))
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-[#8b7a9c]">Carregando...</p>
  if (!form) return <p className="text-[#8b7a9c]">{error ?? 'Evento não encontrado.'}</p>

  const isWedding = form.event_type === 'wedding'

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Editar evento</h1>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-2xl border border-brand-primary-soft p-5 sm:grid-cols-2"
      >
        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Tipo de evento
          <select
            value={form.event_type}
            onChange={(e) => setForm((prev) => prev && { ...prev, event_type: e.target.value as EventType })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          >
            <option value="wedding">Casamento</option>
            <option value="birthday">Aniversário</option>
          </select>
        </label>

        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          {isWedding ? 'Nome de um(a) dos noivos' : 'Nome do aniversariante'}
          <input
            required
            value={form.host_name}
            onChange={(e) => setForm((prev) => prev && { ...prev, host_name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {isWedding && (
          <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
            Nome do(a) outro(a) noivo(a)
            <input
              value={form.host_name_secondary}
              onChange={(e) => setForm((prev) => prev && { ...prev, host_name_secondary: e.target.value })}
              className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
            />
          </label>
        )}

        <label className="text-sm font-medium text-[#3f3450]">
          Data e hora
          <input
            type="datetime-local"
            value={form.event_date}
            onChange={(e) => setForm((prev) => prev && { ...prev, event_date: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Cor de destaque
          <input
            type="color"
            value={form.color_primary}
            onChange={(e) => setForm((prev) => prev && { ...prev, color_primary: e.target.value })}
            className="mt-1 h-10 w-full rounded-xl border border-brand-primary-soft px-1 outline-none"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Fonte do nome
          <select
            value={form.name_font}
            onChange={(e) => setForm((prev) => prev && { ...prev, name_font: e.target.value as NameFont })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          >
            {NAME_FONT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} style={{ fontFamily: option.fontFamily }}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          {isWedding ? 'Local da cerimônia' : 'Local'}
          <input
            value={form.venue_name}
            onChange={(e) => setForm((prev) => prev && { ...prev, venue_name: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {isWedding && (
          <label className="text-sm font-medium text-[#3f3450]">
            Local da festa
            <input
              value={form.venue_name_secondary}
              onChange={(e) => setForm((prev) => prev && { ...prev, venue_name_secondary: e.target.value })}
              className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
            />
          </label>
        )}

        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Endereço
          <input
            value={form.address}
            onChange={(e) => setForm((prev) => prev && { ...prev, address: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Link do mapa
          <input
            value={form.maps_url}
            onChange={(e) => setForm((prev) => prev && { ...prev, maps_url: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Traje
          <input
            value={form.dress_code}
            onChange={(e) => setForm((prev) => prev && { ...prev, dress_code: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Chave Pix
          <input
            value={form.pix_key}
            onChange={(e) => setForm((prev) => prev && { ...prev, pix_key: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <div className="border-t border-brand-primary-soft pt-4 sm:col-span-2">
          <p className="text-sm font-semibold text-[#3f3450]">Acesso e financeiro</p>
          <p className="mt-1 text-xs text-[#8b7a9c]">
            Visível só para o admin superior. Deixe "Acesso liberado até" em branco para nunca expirar.
          </p>
        </div>

        <label className="text-sm font-medium text-[#3f3450]">
          Acesso liberado até
          <input
            type="datetime-local"
            value={form.access_expires_at}
            onChange={(e) => setForm((prev) => prev && { ...prev, access_expires_at: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Valor cobrado (R$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price_charged}
            onChange={(e) => setForm((prev) => prev && { ...prev, price_charged: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Último pagamento
          <input
            type="date"
            value={form.last_payment_at}
            onChange={(e) => setForm((prev) => prev && { ...prev, last_payment_at: e.target.value })}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Notas de pagamento
          <textarea
            value={form.payment_notes}
            onChange={(e) => setForm((prev) => prev && { ...prev, payment_notes: e.target.value })}
            rows={2}
            className="mt-1 w-full resize-none rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}
        {saved && !error && <p className="text-sm text-emerald-600 sm:col-span-2">Alterações salvas!</p>}

        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-full bg-brand-primary px-6 py-2 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60 sm:col-span-2"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
