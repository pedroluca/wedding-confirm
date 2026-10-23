import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Heart, Shirt, UserPlus } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { NAME_FONT_OPTIONS } from '../../lib/eventFormat'
import { EVENT_TYPE_OPTIONS, EVENT_TYPES, eventTypeOptionLabel } from '../../lib/eventTypes'
import {
  boxClass,
  boxTitleClass,
  fileInputClass,
  hintClass,
  inputClass,
  labelClass,
  Section,
} from '../../components/panel/form'
import { PageHeader } from '../../components/panel/ui'
import type { EventType, NameFont, SuperEvent } from '../../types'

type CreateForm = {
  event_type: EventType
  host_name: string
  host_name_secondary: string
  subtitle: string
  event_date: string
  venue_name: string
  venue_name_secondary: string
  address: string
  maps_url: string
  maps_url_secondary: string
  dress_code: string
  pix_key: string
  color_primary: string
  name_font: NameFont
  logo: File | null
  admin_name: string
  admin_email: string
}

const EMPTY_FORM: CreateForm = {
  event_type: 'wedding',
  host_name: '',
  host_name_secondary: '',
  subtitle: '',
  event_date: '',
  venue_name: '',
  venue_name_secondary: '',
  address: '',
  maps_url: '',
  maps_url_secondary: '',
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
  data.set('subtitle', form.subtitle.trim())
  data.set('event_date', form.event_date)
  data.set('venue_name', form.venue_name.trim())
  data.set('venue_name_secondary', form.venue_name_secondary.trim())
  data.set('address', form.address.trim())
  data.set('maps_url', form.maps_url.trim())
  data.set('maps_url_secondary', form.maps_url_secondary.trim())
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

  const typeProfile = EVENT_TYPES[form.event_type]
  const [hostLabel, hostSecondaryLabel] = typeProfile.hostLabels
  const [venueLabel, secondVenueLabel] = typeProfile.venueLabels
  const [venuePlaceholder, secondVenuePlaceholder] = typeProfile.venuePlaceholders

  const update = <K extends keyof CreateForm>(key: K, value: CreateForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

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
      <Link to="/super/eventos" className="inline-flex items-center gap-1.5 text-sm text-[#8b7a9c] hover:text-brand-primary">
        <ArrowLeft size={15} /> Eventos
      </Link>

      <div className="mt-4">
        <PageHeader
          title="Novo evento"
          description="Cria o evento e o primeiro admin dele, que recebe um email pra definir a senha. Foto, música, abertura do convite e o resto da personalização dá pra ajustar depois."
        />
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Section icon={<Heart size={18} />} title="Evento" description="Tipo, nomes e identidade visual.">
          <label className={`${labelClass} sm:col-span-2`}>
            Tipo de evento
            <select
              value={form.event_type}
              onChange={(e) => update('event_type', e.target.value as EventType)}
              className={inputClass}
            >
              {EVENT_TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>
                  {eventTypeOptionLabel(type)}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            {hostLabel}
            <input required value={form.host_name} onChange={(e) => update('host_name', e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            {hostSecondaryLabel}
            <input
              value={form.host_name_secondary}
              onChange={(e) => update('host_name_secondary', e.target.value)}
              className={inputClass}
            />
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Subtítulo <span className="font-normal text-[#8b7a9c]">(opcional)</span>
            <input
              value={form.subtitle}
              maxLength={150}
              onChange={(e) => update('subtitle', e.target.value)}
              placeholder={typeProfile.subtitlePlaceholder}
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
            Fonte do nome
            <select
              value={form.name_font}
              onChange={(e) => update('name_font', e.target.value as NameFont)}
              className={inputClass}
            >
              {NAME_FONT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} style={{ fontFamily: option.fontFamily }}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Cor de destaque
            <span className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={form.color_primary}
                onChange={(e) => update('color_primary', e.target.value)}
                className="h-10 w-16 cursor-pointer rounded-xl border border-brand-primary-soft bg-white px-1 outline-none"
              />
              <span className="font-mono text-sm font-normal text-[#6b5d80] uppercase">{form.color_primary}</span>
            </span>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Brasão / logo <span className="font-normal text-[#8b7a9c]">(opcional)</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => update('logo', e.target.files?.[0] ?? null)}
              className={fileInputClass}
            />
          </label>
        </Section>

        <Section icon={<CalendarDays size={18} />} title="Quando e onde">
          <label className={`${labelClass} sm:col-span-2 sm:max-w-xs`}>
            Data e hora
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => update('event_date', e.target.value)}
              className={inputClass}
            />
            <span className={hintClass}>O acesso ao painel vale até alguns dias depois dessa data.</span>
          </label>
          <div className={boxClass}>
            <p className={boxTitleClass}>{venueLabel}</p>
            <label className={labelClass}>
              Local
              <input
                value={form.venue_name}
                onChange={(e) => update('venue_name', e.target.value)}
                placeholder={venuePlaceholder}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Endereço
              <input value={form.address} onChange={(e) => update('address', e.target.value)} className={inputClass} />
            </label>
            <label className={labelClass}>
              Link do mapa
              <input
                value={form.maps_url}
                onChange={(e) => update('maps_url', e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className={inputClass}
              />
            </label>
          </div>
          <div className={boxClass}>
            <p className={boxTitleClass}>
              {secondVenueLabel} <span className="font-normal tracking-normal normal-case">(opcional)</span>
            </p>
            <label className={labelClass}>
              Local
              <input
                value={form.venue_name_secondary}
                onChange={(e) => update('venue_name_secondary', e.target.value)}
                placeholder={secondVenuePlaceholder}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Link do mapa
              <input
                value={form.maps_url_secondary}
                onChange={(e) => update('maps_url_secondary', e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className={inputClass}
              />
            </label>
          </div>
        </Section>

        <Section icon={<Shirt size={18} />} title="Detalhes">
          <label className={labelClass}>
            Traje
            <input value={form.dress_code} onChange={(e) => update('dress_code', e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Chave Pix
            <input value={form.pix_key} onChange={(e) => update('pix_key', e.target.value)} className={inputClass} />
          </label>
        </Section>

        <Section
          icon={<UserPlus size={18} />}
          title="Primeiro admin do evento"
          description="Recebe um email com o link pra definir a própria senha."
        >
          <label className={labelClass}>
            Nome
            <input required value={form.admin_name} onChange={(e) => update('admin_name', e.target.value)} className={inputClass} />
          </label>
          <label className={labelClass}>
            Email
            <input
              required
              type="email"
              value={form.admin_email}
              onChange={(e) => update('admin_email', e.target.value)}
              className={inputClass}
            />
          </label>
        </Section>

        <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-[#ece6f0] bg-white/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          {error && <p className="mr-auto text-sm text-rose-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="cursor-pointer rounded-full bg-brand-primary px-8 py-2.5 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
          >
            {saving ? 'Criando...' : 'Criar evento'}
          </button>
        </div>
      </form>
    </div>
  )
}
