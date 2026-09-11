import { useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import type { EventType, NameFont, SuperEvent } from '../../types'

type CreateForm = {
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
  logo: File | null
  admin_name: string
  admin_email: string
}

const NAME_FONT_OPTIONS: { value: NameFont; label: string; fontFamily: string }[] = [
  { value: 'sans', label: 'Padrão', fontFamily: 'inherit' },
  { value: 'fleur', label: 'Caligrafia (Fleur De Leah)', fontFamily: "'Fleur De Leah', cursive" },
  { value: 'pinyon', label: 'Caligrafia (Pinyon Script)', fontFamily: "'Pinyon Script', cursive" },
]

const EMPTY_FORM: CreateForm = {
  event_type: 'wedding',
  host_name: '',
  host_name_secondary: '',
  event_date: '',
  venue_name: '',
  venue_name_secondary: '',
  address: '',
  maps_url: '',
  dress_code: '',
  pix_key: '',
  color_primary: '#d2afff',
  name_font: 'sans',
  logo: null,
  admin_name: '',
  admin_email: '',
}

function toFormData(form: CreateForm): FormData {
  const data = new FormData()
  data.set('event_type', form.event_type)
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
  data.set('name_font', form.name_font)
  data.set('admin_name', form.admin_name.trim())
  data.set('admin_email', form.admin_email.trim())
  if (form.logo) {
    data.set('logo', form.logo)
  }
  return data
}

export default function SuperEventCreate() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const navigate = useNavigate()
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const isWedding = form.event_type === 'wedding'

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await api.post<{ event: SuperEvent }>('/admin/super/events', toFormData(form), token)
      navigate(`/super/eventos/${res.event.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar o evento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-[#3f3450]">Novo evento</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Cria o evento e o primeiro admin dele — um convite por email será enviado para ele definir a
        senha.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 grid gap-4 rounded-2xl border border-brand-primary-soft p-5 sm:grid-cols-2"
      >
        <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
          Tipo de evento
          <select
            value={form.event_type}
            onChange={(e) => setForm((prev) => ({ ...prev, event_type: e.target.value as EventType }))}
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
            onChange={(e) => setForm((prev) => ({ ...prev, host_name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {isWedding && (
          <label className="text-sm font-medium text-[#3f3450] sm:col-span-2">
            Nome do(a) outro(a) noivo(a)
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
          Fonte do nome
          <select
            value={form.name_font}
            onChange={(e) => setForm((prev) => ({ ...prev, name_font: e.target.value as NameFont }))}
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
            onChange={(e) => setForm((prev) => ({ ...prev, venue_name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {isWedding && (
          <label className="text-sm font-medium text-[#3f3450]">
            Local da festa
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
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.files?.[0] ?? null }))}
            className="mt-2 block text-sm text-[#6b5d80]"
          />
        </label>

        <div className="border-t border-brand-primary-soft pt-4 sm:col-span-2">
          <p className="text-sm font-semibold text-[#3f3450]">Primeiro admin do evento</p>
          <p className="mt-1 text-xs text-[#8b7a9c]">Ele receberá um email para definir a própria senha.</p>
        </div>

        <label className="text-sm font-medium text-[#3f3450]">
          Nome do admin
          <input
            required
            value={form.admin_name}
            onChange={(e) => setForm((prev) => ({ ...prev, admin_name: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        <label className="text-sm font-medium text-[#3f3450]">
          Email do admin
          <input
            required
            type="email"
            value={form.admin_email}
            onChange={(e) => setForm((prev) => ({ ...prev, admin_email: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-brand-primary-soft px-4 py-2 outline-none focus:border-brand-primary"
          />
        </label>

        {error && <p className="text-sm text-rose-600 sm:col-span-2">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer rounded-full bg-brand-primary px-6 py-2 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60 sm:col-span-2"
        >
          {saving ? 'Criando...' : 'Criar evento'}
        </button>
      </form>
    </div>
  )
}
