import { useRef, useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { useAdminEvent } from '../../lib/adminEventContext'
import type { AdminEvent, EventType } from '../../types'

type SettingsForm = {
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
  logo: File | null
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function toDatetimeLocalValue(mysqlDateTime: string | null): string {
  if (!mysqlDateTime) return ''
  // "2026-12-13 10:30:00" -> "2026-12-13T10:30" (formato esperado por <input type="datetime-local">)
  return mysqlDateTime.replace(' ', 'T').slice(0, 16)
}

function formatAccessExpiresAt(mysqlDateTime: string): string {
  const date = new Date(mysqlDateTime.replace(' ', 'T'))
  return Number.isNaN(date.getTime()) ? mysqlDateTime : dateTimeFormatter.format(date)
}

function toFormState(event: AdminEvent): SettingsForm {
  return {
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
    logo: null,
  }
}

function toFormData(form: SettingsForm): FormData {
  const data = new FormData()
  data.set('host_name', form.host_name.trim())
  data.set('host_name_secondary', form.host_name_secondary.trim())
  data.set('event_date', form.event_date)
  data.set('venue_name', form.venue_name.trim())
  data.set('venue_name_secondary', form.venue_name_secondary.trim())
  data.set('address', form.address.trim())
  data.set('maps_url', form.maps_url.trim())
  data.set('dress_code', form.dress_code.trim())
  data.set('pix_key', form.pix_key.trim())
  data.set('color_primary', form.color_primary)
  if (form.logo) {
    data.set('logo', form.logo)
  }
  return data
}

const HOST_LABEL: Record<EventType, [string, string]> = {
  wedding: ['Nome de um(a) dos noivos', 'Nome do(a) outro(a) noivo(a)'],
  birthday: ['Nome do aniversariante', ''],
}

const VENUE_LABEL: Record<EventType, [string, string]> = {
  wedding: ['Local da cerimônia', 'Local da festa'],
  birthday: ['Local', ''],
}

export default function AdminSettings() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const contextEvent = useAdminEvent()
  const [event, setEvent] = useState(contextEvent)
  const [form, setForm] = useState<SettingsForm>(() => toFormState(contextEvent))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const isWedding = event.event_type === 'wedding'
  const [hostLabel, hostSecondaryLabel] = HOST_LABEL[event.event_type]
  const [venueLabel, venueSecondaryLabel] = VENUE_LABEL[event.event_type]

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await api.post<{ event: AdminEvent }>('/admin/event', toFormData(form), token)
      setEvent(res.event)
      setForm(toFormState(res.event))
      if (fileRef.current) fileRef.current.value = ''
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Configurações do evento</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Personalize as informações e a cor que aparecem para os convidados no convite.
      </p>
      <p className="mt-2 text-sm font-medium text-brand-primary">
        {event.access_expires_at
          ? `Seu acesso ao painel está liberado até ${formatAccessExpiresAt(event.access_expires_at)}.`
          : 'Seu acesso ao painel não tem prazo de expiração.'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-2xl border border-brand-primary-soft p-5 sm:grid-cols-2"
      >
        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          {hostLabel}
          <input
            required
            value={form.host_name}
            onChange={(e) => setForm((prev) => ({ ...prev, host_name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {isWedding && (
          <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
            {hostSecondaryLabel}
            <input
              value={form.host_name_secondary}
              onChange={(e) => setForm((prev) => ({ ...prev, host_name_secondary: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
            />
          </label>
        )}

        <label className="text-sm font-medium text-[#3f3450]">
          Data e hora
          <input
            type="datetime-local"
            value={form.event_date}
            onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Cor de destaque
          <input
            type="color"
            value={form.color_primary}
            onChange={(e) => setForm((prev) => ({ ...prev, color_primary: e.target.value }))}
            className="mt-1 h-10 w-full rounded-xl border border-brand-primary-soft px-1 outline-none"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          {venueLabel}
          <input
            value={form.venue_name}
            onChange={(e) => setForm((prev) => ({ ...prev, venue_name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {isWedding && (
          <label className="text-sm font-medium text-[#3f3450]">
            {venueSecondaryLabel}
            <input
              value={form.venue_name_secondary}
              onChange={(e) => setForm((prev) => ({ ...prev, venue_name_secondary: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
            />
          </label>
        )}

        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Endereço
          <input
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Link do mapa
          <input
            value={form.maps_url}
            onChange={(e) => setForm((prev) => ({ ...prev, maps_url: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Traje
          <input
            value={form.dress_code}
            onChange={(e) => setForm((prev) => ({ ...prev, dress_code: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Chave Pix
          <input
            value={form.pix_key}
            onChange={(e) => setForm((prev) => ({ ...prev, pix_key: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Brasão / logo
          {event.logo_url && (
            <img src={event.logo_url} alt="" className="mt-2 h-20 w-20 rounded-full object-cover" />
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.files?.[0] ?? null }))}
            className="mt-2 block text-sm text-[#6b5d80]"
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
