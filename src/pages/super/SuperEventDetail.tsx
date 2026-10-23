import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CircleCheck,
  Copy,
  Crown,
  ExternalLink,
  Gift,
  Heart,
  KeyRound,
  LogIn,
  PackageCheck,
  Shirt,
  Sparkles,
  Trash2,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth, type Session } from '../../lib/adminAuthContext'
import { formatEventDate, NAME_FONT_OPTIONS } from '../../lib/eventFormat'
import { EVENT_TYPE_OPTIONS, EVENT_TYPES, eventTypeOptionLabel, formatHostNames } from '../../lib/eventTypes'
import { INVITE_STYLE_OPTIONS, resolveInviteStyle } from '../../lib/inviteStyles'
import { GUEST_TOLERANCE_PERCENT, guestBand, guestCap, PLAN_LABELS, suggestedAccessExpiry } from '../../lib/plans'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { InviteStylePicker } from '../../components/InviteStylePicker'
import { AccessBadge } from '../../components/panel/AccessBadge'
import { GuestBandBadge } from '../../components/panel/GuestBand'
import { PlanBadge } from '../../components/panel/PlanBadge'
import { PlanPicker } from '../../components/panel/PlanPicker'
import {
  boxClass,
  boxTitleClass,
  checkboxLabelClass,
  hintClass,
  inputClass,
  labelClass,
  SaveBar,
  Section,
} from '../../components/panel/form'
import {
  PageHeader,
  panelCardClass,
  primaryButtonClass,
  secondaryButtonClass,
  StatCard,
} from '../../components/panel/ui'
import type { EventPlan, EventType, InviteStyle, NameFont, SuperEvent } from '../../types'
import { EventAdminsPanel } from './EventAdminsPanel'

type Tab = 'geral' | 'dados' | 'acesso' | 'admins'

const TABS: { value: Tab; label: string }[] = [
  { value: 'geral', label: 'Visão geral' },
  { value: 'dados', label: 'Dados do evento' },
  { value: 'acesso', label: 'Plano e financeiro' },
  { value: 'admins', label: 'Admins' },
]

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

type EditForm = {
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
  invite_message: string
  pix_key: string
  color_primary: string
  name_font: NameFont
  invite_style: InviteStyle
  show_countdown: boolean
  show_calendar: boolean
  plan: EventPlan
  gifts_enabled: boolean
  guest_limit: string
  admin_limit: string
  access_expires_at: string
  price_charged: string
  last_payment_at: string
  payment_notes: string
}

function toDatetimeLocalValue(mysqlDateTime: string | null): string {
  if (!mysqlDateTime) return ''
  return mysqlDateTime.replace(' ', 'T').slice(0, 16)
}

function toFormState(event: SuperEvent): EditForm {
  return {
    event_type: event.event_type,
    host_name: event.host_name,
    host_name_secondary: event.host_name_secondary ?? '',
    subtitle: event.subtitle ?? '',
    event_date: toDatetimeLocalValue(event.event_date),
    venue_name: event.venue_name ?? '',
    venue_name_secondary: event.venue_name_secondary ?? '',
    address: event.address ?? '',
    maps_url: event.maps_url ?? '',
    maps_url_secondary: event.maps_url_secondary ?? '',
    dress_code: event.dress_code ?? '',
    invite_message: event.invite_message ?? '',
    pix_key: event.pix_key ?? '',
    color_primary: event.color_primary,
    name_font: event.name_font,
    invite_style: resolveInviteStyle(event),
    show_countdown: event.show_countdown !== false,
    show_calendar: event.show_calendar !== false,
    plan: event.plan,
    gifts_enabled: event.contract.gifts_enabled,
    guest_limit: event.contract.guest_limit !== null ? String(event.contract.guest_limit) : '',
    admin_limit: event.contract.admin_limit !== null ? String(event.contract.admin_limit) : '',
    access_expires_at: toDatetimeLocalValue(event.access_expires_at),
    price_charged: event.price_charged !== null ? String(event.price_charged) : '',
    last_payment_at: event.last_payment_at ?? '',
    payment_notes: event.payment_notes ?? '',
  }
}

// PUT /admin/super/events/{id} grava todos os campos de marca de uma vez
// (o que não vier vira NULL), então as abas Dados e Acesso salvam juntas.
function toPayload(form: EditForm) {
  return {
    event_type: form.event_type,
    host_name: form.host_name.trim(),
    host_name_secondary: form.host_name_secondary.trim() || undefined,
    // Sempre enviados, mesmo vazios: o backend só mexe nesses quando vêm no corpo.
    subtitle: form.subtitle.trim(),
    invite_style: form.invite_style,
    show_countdown: form.show_countdown,
    show_calendar: form.show_calendar,
    // No Ilimitado o contratado vai como está: fica guardado para quando o
    // evento mudar de plano. Limite em branco = sem limite.
    plan: form.plan,
    gifts_enabled: form.gifts_enabled,
    guest_limit: form.guest_limit,
    admin_limit: form.admin_limit,
    event_date: form.event_date || undefined,
    venue_name: form.venue_name.trim() || undefined,
    venue_name_secondary: form.venue_name_secondary.trim() || undefined,
    address: form.address.trim() || undefined,
    maps_url: form.maps_url.trim() || undefined,
    maps_url_secondary: form.maps_url_secondary.trim() || undefined,
    dress_code: form.dress_code.trim() || undefined,
    invite_message: form.invite_message.trim() || undefined,
    pix_key: form.pix_key.trim() || undefined,
    color_primary: form.color_primary,
    name_font: form.name_font,
    // O Ilimitado não tem prazo: o backend grava NULL de qualquer forma.
    access_expires_at: form.plan === 'unlimited' ? undefined : form.access_expires_at || undefined,
    price_charged: form.price_charged || undefined,
    last_payment_at: form.last_payment_at || undefined,
    payment_notes: form.payment_notes.trim() || undefined,
  }
}

function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="shrink-0 text-[#8b7a9c]">{label}</dt>
      <dd className="min-w-0 text-right text-[#3f3450]">{children}</dd>
    </div>
  )
}

export default function SuperEventDetail() {
  const { eventId: eventIdParam = '' } = useParams()
  const eventId = Number(eventIdParam)
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = TABS.find((item) => item.value === searchParams.get('aba'))?.value ?? 'geral'
  const navigate = useNavigate()
  const { session, startImpersonation } = useAdminAuth()
  const token = session?.token ?? null

  const [event, setEvent] = useState<SuperEvent | null>(null)
  const [form, setForm] = useState<EditForm | null>(null)
  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const [entering, setEntering] = useState(false)
  const [enterError, setEnterError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<{ event: SuperEvent }>(`/admin/super/events/${eventId}`, token)
      .then((res) => {
        setEvent(res.event)
        setForm(toFormState(res.event))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [eventId, token])

  // Depois de mexer nos admins: atualiza só os números, sem perder o que está no formulário.
  const refreshStats = () => {
    api
      .get<{ event: SuperEvent }>(`/admin/super/events/${eventId}`, token)
      .then((res) => setEvent((prev) => (prev ? { ...prev, stats: res.event.stats } : res.event)))
      .catch(() => {})
  }

  const selectTab = (value: Tab) => {
    setSearchParams(value === 'geral' ? {} : { aba: value }, { replace: true })
    setSaved(false)
  }

  if (loading) return <p className="text-[#8b7a9c]">Carregando...</p>
  if (!event || !form) {
    return (
      <div>
        <Link to="/super/eventos" className="inline-flex items-center gap-1.5 text-sm text-[#8b7a9c] hover:text-brand-primary">
          <ArrowLeft size={15} /> Eventos
        </Link>
        <p className="mt-6 text-[#8b7a9c]">Evento não encontrado.</p>
      </div>
    )
  }

  const typeProfile = EVENT_TYPES[form.event_type]
  const [hostLabel, hostSecondaryLabel] = typeProfile.hostLabels
  const [venueLabel, secondVenueLabel] = typeProfile.venueLabels
  const [venuePlaceholder, secondVenuePlaceholder] = typeProfile.venuePlaceholders
  const inviteUrl = `${window.location.origin}/${event.slug}`
  const hasAdmins = event.stats.admins > 0
  const styleLabel = INVITE_STYLE_OPTIONS.find((option) => option.value === resolveInviteStyle(event))?.label
  const unlimited = form.plan === 'unlimited'
  const giftsOn = unlimited || form.gifts_enabled
  const suggestedAccess = suggestedAccessExpiry(form.event_date, form.plan)
  const band = guestBand(event.stats.people, event)
  const formGuestLimit = Number(form.guest_limit)

  const previewEvent: SuperEvent = {
    ...event,
    event_type: form.event_type,
    host_name: form.host_name.trim() || event.host_name,
    host_name_secondary: form.host_name_secondary.trim() || null,
    color_primary: form.color_primary,
    name_font: form.name_font,
  }

  const update = <K extends keyof EditForm>(key: K, value: EditForm[K]) =>
    setForm((prev) => prev && { ...prev, [key]: value })

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await api.put<{ event: SuperEvent }>(`/admin/super/events/${eventId}`, toPayload(form), token)
      setEvent((prev) => ({ ...res.event, stats: prev?.stats ?? res.event.stats }))
      setForm(toFormState(res.event))
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  const handleEnter = async () => {
    setEntering(true)
    setEnterError(null)
    try {
      const eventSession = await api.post<Session>(`/admin/super/events/${eventId}/impersonate`, undefined, token)
      startImpersonation(eventSession)
      navigate('/admin')
    } catch (err) {
      setEnterError(err instanceof ApiError ? err.message : 'Não foi possível entrar no painel do evento.')
      setEntering(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    setDeleteError(null)
    try {
      await api.del(`/admin/super/events/${eventId}`, token)
      navigate('/super/eventos', { replace: true })
    } catch {
      setDeleteError('Não foi possível remover o evento.')
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  const copyInviteUrl = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <Link to="/super/eventos" className="inline-flex items-center gap-1.5 text-sm text-[#8b7a9c] hover:text-brand-primary">
        <ArrowLeft size={15} /> Eventos
      </Link>

      <div className="mt-4">
        <PageHeader
          eyebrow={EVENT_TYPES[event.event_type].label}
          title={formatHostNames(event)}
          description={
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {event.subtitle && <span>{event.subtitle} ·</span>}
              <span>/{event.slug}</span>
              <PlanBadge plan={event.plan} />
              <GuestBandBadge band={band} />
              <AccessBadge expiresAt={event.access_expires_at} />
            </span>
          }
          actions={
            <>
              <a href={inviteUrl} target="_blank" rel="noreferrer" className={secondaryButtonClass}>
                <ExternalLink size={16} />
                Ver convite
              </a>
              <button
                type="button"
                onClick={handleEnter}
                disabled={!hasAdmins || entering}
                title={hasAdmins ? 'Abre o painel do evento como o admin dele' : 'Convide um admin primeiro (aba Admins)'}
                className={primaryButtonClass}
              >
                <LogIn size={16} />
                {entering ? 'Entrando...' : 'Entrar como admin'}
              </button>
            </>
          }
        />
        {enterError && <p className="mt-3 text-sm text-rose-600">{enterError}</p>}
      </div>

      {/* A linha de baixo é uma sombra interna (a aba ativa pinta por cima):
          com borda + margem negativa sobrava 1px de altura e o overflow-x
          ligava uma barra de rolagem vertical. */}
      <div className="mt-8 -mx-4 overflow-x-auto overflow-y-hidden px-4 sm:mx-0 sm:px-0">
        <div className="flex w-max min-w-full gap-1 shadow-[inset_0_-1px_0_#ece6f0]" role="tablist">
          {TABS.map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={tab === item.value}
              onClick={() => selectTab(item.value)}
              className={`cursor-pointer border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition ${
                tab === item.value
                  ? 'border-brand-primary text-brand-primary'
                  : 'border-transparent text-[#8b7a9c] hover:text-[#3f3450]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {tab === 'geral' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard
                label="Convites"
                value={event.stats.invites}
                hint={`${event.stats.people} ${event.stats.people === 1 ? 'pessoa' : 'pessoas'} no total`}
                icon={Users}
              />
              <StatCard
                label="Confirmados"
                value={event.stats.confirmed}
                hint={`${event.stats.pending} ${event.stats.pending === 1 ? 'pendente' : 'pendentes'} · ${event.stats.declined} ${event.stats.declined === 1 ? 'recusado' : 'recusados'}`}
                icon={CircleCheck}
              />
              <StatCard label="Presentes escolhidos" value={event.stats.gift_claims} icon={Gift} />
              <StatCard
                label="Admins"
                value={event.stats.admins}
                hint={hasAdmins ? undefined : 'Convide um na aba Admins'}
                icon={UserCog}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className={`${panelCardClass} p-5 sm:p-6`}>
                <h2 className="font-semibold text-[#3f3450]">Evento</h2>
                <dl className="mt-2 divide-y divide-[#f3eef5]">
                  <InfoRow label="Data">{event.event_date ? formatEventDate(event.event_date) : 'Sem data'}</InfoRow>
                  <InfoRow label={EVENT_TYPES[event.event_type].venueLabels[0]}>{event.venue_name ?? '—'}</InfoRow>
                  {event.venue_name_secondary && (
                    <InfoRow label={EVENT_TYPES[event.event_type].venueLabels[1]}>{event.venue_name_secondary}</InfoRow>
                  )}
                  <InfoRow label="Abertura do convite">{styleLabel}</InfoRow>
                  <InfoRow label="Link do evento">
                    <span className="inline-flex items-center gap-2">
                      <span className="truncate">/{event.slug}</span>
                      <button
                        type="button"
                        onClick={copyInviteUrl}
                        aria-label="Copiar link do evento"
                        title="Copiar link"
                        className="cursor-pointer text-brand-primary"
                      >
                        {copied ? <Check size={15} /> : <Copy size={15} />}
                      </button>
                    </span>
                  </InfoRow>
                </dl>
              </section>

              <section className={`${panelCardClass} p-5 sm:p-6`}>
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-[#3f3450]">Plano e pagamento</h2>
                  <button
                    type="button"
                    onClick={() => selectTab('acesso')}
                    className="cursor-pointer text-sm font-medium text-brand-primary hover:underline"
                  >
                    Editar
                  </button>
                </div>
                <dl className="mt-2 divide-y divide-[#f3eef5]">
                  <InfoRow label="Plano">{PLAN_LABELS[event.plan]}</InfoRow>
                  <InfoRow label="Lista de presentes">{event.gifts_enabled ? 'Ligada' : 'Desligada'}</InfoRow>
                  {band && (
                    <InfoRow label="Faixa de convidados">
                      <span className="inline-flex flex-wrap items-center justify-end gap-2">
                        {band.people} de {band.limit} pessoas
                        <GuestBandBadge band={band} />
                      </span>
                    </InfoRow>
                  )}
                  <InfoRow label="Acesso ao painel">
                    {event.access_expires_at ? `até ${formatEventDate(event.access_expires_at)}` : 'Sem prazo'}
                  </InfoRow>
                  <InfoRow label="Valor cobrado">
                    {event.price_charged !== null ? currency.format(event.price_charged) : '—'}
                  </InfoRow>
                  <InfoRow label="Último pagamento">
                    {event.last_payment_at ? dayFormatter.format(new Date(`${event.last_payment_at}T12:00:00`)) : '—'}
                  </InfoRow>
                  {event.payment_notes && <InfoRow label="Notas">{event.payment_notes}</InfoRow>}
                </dl>
              </section>
            </div>

            <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 sm:p-6">
              <h2 className="font-semibold text-rose-700">Remover evento</h2>
              <p className="mt-1 text-sm text-[#6b5d80]">
                Apaga para sempre o evento, os convidados, os presentes e os admins. Não dá pra desfazer.
              </p>
              {deleteError && <p className="mt-2 text-sm text-rose-600">{deleteError}</p>}
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="cursor-pointer mt-4 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-white px-5 py-2.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2 size={16} />
                Remover evento
              </button>
            </section>
          </div>
        )}

        {tab === 'dados' && (
          <form onSubmit={handleSubmit} className="space-y-5">
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
                <input
                  required
                  value={form.host_name}
                  onChange={(e) => update('host_name', e.target.value)}
                  className={inputClass}
                />
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
              {giftsOn && (
                <label className={labelClass}>
                  Chave Pix
                  <input value={form.pix_key} onChange={(e) => update('pix_key', e.target.value)} className={inputClass} />
                </label>
              )}
            </Section>

            <Section
              icon={<Sparkles size={18} />}
              title="Convite"
              description="Foto, música e mensagem de envio ficam no painel do evento (Entrar como admin)."
            >
              <div className="sm:col-span-2">
                <p className={labelClass}>Abertura</p>
                <div className="mt-2">
                  <InviteStylePicker
                    event={previewEvent}
                    value={form.invite_style}
                    onChange={(style) => update('invite_style', style)}
                  />
                </div>
              </div>
              <div className={`${boxClass} sm:col-span-2`}>
                <p className={boxTitleClass}>Seções</p>
                <div className="flex flex-col gap-x-8 sm:flex-row">
                  <label className={checkboxLabelClass}>
                    <input
                      type="checkbox"
                      checked={form.show_countdown}
                      onChange={(e) => update('show_countdown', e.target.checked)}
                      className="accent-brand-primary"
                    />
                    Contagem regressiva
                  </label>
                  <label className={checkboxLabelClass}>
                    <input
                      type="checkbox"
                      checked={form.show_calendar}
                      onChange={(e) => update('show_calendar', e.target.checked)}
                      className="accent-brand-primary"
                    />
                    Salve a data (adicionar à agenda)
                  </label>
                </div>
              </div>
              <label className={`${labelClass} sm:col-span-2`}>
                Mensagem do convite
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={form.invite_message}
                  onChange={(e) => update('invite_message', e.target.value)}
                  placeholder={typeProfile.inviteMessagePlaceholder}
                  className={`${inputClass} resize-y`}
                />
              </label>
            </Section>

            <SaveBar saving={saving} error={saveError} saved={saved} />
          </form>
        )}

        {tab === 'acesso' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Section icon={<Crown size={18} />} title="Plano" description="Define o prazo de acesso e o que o evento libera.">
              <PlanPicker value={form.plan} onChange={(plan) => update('plan', plan)} />
              {unlimited && (
                <p className="rounded-xl bg-[#231b2e] px-4 py-3 text-sm text-white/80 sm:col-span-2">
                  <strong className="font-semibold text-presenzo-gold">Interno.</strong> Sem limites e sem prazo de
                  acesso, e o cliente não vê o nome do plano. O que foi contratado fica guardado e volta a valer se o
                  evento mudar de plano.
                </p>
              )}
            </Section>

            <Section
              icon={<PackageCheck size={18} />}
              title="O que foi contratado"
              description={
                unlimited
                  ? 'Suspenso enquanto o evento estiver no Ilimitado.'
                  : 'O que o cliente não contratou some do convite e do painel do evento.'
              }
            >
              <div className="sm:col-span-2">
                <label className={checkboxLabelClass}>
                  <input
                    type="checkbox"
                    checked={giftsOn}
                    disabled={unlimited}
                    onChange={(e) => update('gifts_enabled', e.target.checked)}
                    className="accent-brand-primary"
                  />
                  Lista de presentes e chave Pix
                </label>
                <span className={hintClass}>
                  {unlimited
                    ? 'Incluída no Ilimitado.'
                    : 'Desligada, some do convite, da confirmação e do painel do evento. Os presentes e as escolhas já feitas ficam guardados.'}
                </span>
              </div>
              <label className={labelClass}>
                Faixa de convidados (pessoas)
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={unlimited ? '' : form.guest_limit}
                  disabled={unlimited}
                  placeholder="Sem limite"
                  onChange={(e) => update('guest_limit', e.target.value)}
                  className={`${inputClass} disabled:bg-[#faf8fb]`}
                />
                <span className={hintClass}>
                  Hoje: {event.stats.people} {event.stats.people === 1 ? 'pessoa' : 'pessoas'}, contando titulares e
                  relacionados.{' '}
                  {!unlimited && Number.isInteger(formGuestLimit) && formGuestLimit > 0
                    ? `Com a margem de ${GUEST_TOLERANCE_PERCENT}%, o cadastro trava em ${guestCap(formGuestLimit)}.`
                    : 'Em branco = sem limite.'}
                </span>
              </label>
              <label className={labelClass}>
                Admins
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={unlimited ? '' : form.admin_limit}
                  disabled={unlimited}
                  placeholder="Sem limite"
                  onChange={(e) => update('admin_limit', e.target.value)}
                  className={`${inputClass} disabled:bg-[#faf8fb]`}
                />
                <span className={hintClass}>
                  Hoje: {event.stats.admins} {event.stats.admins === 1 ? 'admin' : 'admins'}. Só informativo: não impede
                  convidar mais.
                </span>
              </label>
            </Section>

            <Section
              icon={<KeyRound size={18} />}
              title="Acesso ao painel"
              description="Até quando o admin do evento consegue entrar no painel. O convite continua no ar depois disso."
            >
              {unlimited ? (
                <p className="text-sm text-[#6b5d80] sm:col-span-2">
                  Sem prazo enquanto o evento estiver no Ilimitado. Se mudar de plano, escolha uma data nova aqui.
                </p>
              ) : (
                <>
                  <label className={labelClass}>
                    Acesso liberado até
                    <input
                      type="datetime-local"
                      value={form.access_expires_at}
                      onChange={(e) => update('access_expires_at', e.target.value)}
                      className={inputClass}
                    />
                    <span className={hintClass}>Em branco = nunca expira.</span>
                  </label>
                  <div className="flex items-center sm:pt-6">
                    <AccessBadge expiresAt={event.access_expires_at} />
                  </div>
                  {suggestedAccess && suggestedAccess !== form.access_expires_at && (
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#6b5d80] sm:col-span-2">
                      <span>
                        Pelo plano {PLAN_LABELS[form.plan]}: até {formatEventDate(suggestedAccess)}.
                      </span>
                      <button
                        type="button"
                        onClick={() => update('access_expires_at', suggestedAccess)}
                        className="cursor-pointer font-medium text-brand-primary hover:underline"
                      >
                        Usar data sugerida
                      </button>
                    </p>
                  )}
                </>
              )}
            </Section>

            <Section icon={<Wallet size={18} />} title="Financeiro" description="Visível só para o super-admin.">
              <label className={labelClass}>
                Valor cobrado (R$)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price_charged}
                  onChange={(e) => update('price_charged', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                Último pagamento
                <input
                  type="date"
                  value={form.last_payment_at}
                  onChange={(e) => update('last_payment_at', e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className={`${labelClass} sm:col-span-2`}>
                Notas de pagamento
                <textarea
                  rows={2}
                  value={form.payment_notes}
                  onChange={(e) => update('payment_notes', e.target.value)}
                  className={`${inputClass} resize-y`}
                />
              </label>
            </Section>

            <SaveBar saving={saving} error={saveError} saved={saved} />
          </form>
        )}

        {tab === 'admins' && <EventAdminsPanel eventId={eventId} onChange={refreshStats} />}
      </div>

      {confirmDelete && (
        <ConfirmDialog
          title={`Remover ${formatHostNames(event, ' e ')}?`}
          description={
            <p>
              Isso apaga <strong>permanentemente</strong> o evento /{event.slug}, com todos os convidados, presentes e
              admins. Não pode ser desfeito.
            </p>
          }
          confirmLabel="Remover evento"
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
