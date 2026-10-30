import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { CalendarDays, Heart, MailOpen, MessageSquareText, RotateCcw, Shirt, Sparkles } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { useAdminEvent, useSetAdminEvent } from '../../lib/adminEventContext'
import { NAME_FONT_CLASSES_COMPACT, NAME_FONT_OPTIONS } from '../../lib/eventFormat'
import { EVENT_TYPES } from '../../lib/eventTypes'
import { resolveInviteStyle } from '../../lib/inviteStyles'
import { giftsEnabled, PLAN_LABELS } from '../../lib/plans'
import { resizeImage } from '../../lib/resizeImage'
import {
  buildShareMessage,
  DEFAULT_SHARE_MESSAGE,
  SHARE_MESSAGE_MAX_LENGTH,
  shareMessageVariables,
} from '../../lib/shareMessage'
import { InviteStylePicker } from '../../components/InviteStylePicker'
import { CoverFocusPicker, type CoverFocus } from '../../components/panel/CoverFocusPicker'
import {
  boxClass,
  boxTitleClass,
  checkboxLabelClass,
  fileInputClass,
  hintClass,
  inputClass,
  labelClass,
  SaveBar,
  Section,
} from '../../components/panel/form'
import { PageHeader } from '../../components/panel/ui'
import type { AdminEvent, EventType, InviteStyle, NameFont } from '../../types'

// Mesmos limites do backend (read_event_branding_fields e src/Uploads.php).
const INVITE_MESSAGE_MAX_LENGTH = 1000
const SUBTITLE_MAX_LENGTH = 150
const MUSIC_MAX_BYTES = 15 * 1024 * 1024

type SettingsForm = {
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
  share_message: string
  pix_key: string
  color_primary: string
  name_font: NameFont
  invite_style: InviteStyle
  show_countdown: boolean
  show_calendar: boolean
  logo: File | null
  cover_photo: File | null
  remove_cover_photo: boolean
  cover_focus: CoverFocus
  music: File | null
  remove_music: boolean
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
    subtitle: event.subtitle ?? '',
    event_date: toDatetimeLocalValue(event.event_date),
    venue_name: event.venue_name ?? '',
    venue_name_secondary: event.venue_name_secondary ?? '',
    address: event.address ?? '',
    maps_url: event.maps_url ?? '',
    maps_url_secondary: event.maps_url_secondary ?? '',
    dress_code: event.dress_code ?? '',
    invite_message: event.invite_message ?? '',
    // Sem modelo salvo, o campo já abre com o texto padrão pra servir de base.
    share_message: event.share_message ?? DEFAULT_SHARE_MESSAGE[event.event_type],
    pix_key: event.pix_key ?? '',
    color_primary: event.color_primary,
    name_font: event.name_font,
    invite_style: resolveInviteStyle(event),
    show_countdown: event.show_countdown !== false,
    show_calendar: event.show_calendar !== false,
    logo: null,
    cover_photo: null,
    remove_cover_photo: false,
    cover_focus: { x: event.cover_focus_x ?? 50, y: event.cover_focus_y ?? 50 },
    music: null,
    remove_music: false,
  }
}

function toFormData(form: SettingsForm, eventType: EventType): FormData {
  const data = new FormData()
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
  data.set('invite_message', form.invite_message.trim())
  // Igual ao padrão = não salva (NULL), pra acompanhar mudanças futuras no texto padrão.
  const shareMessage = form.share_message.trim()
  data.set('share_message', shareMessage === DEFAULT_SHARE_MESSAGE[eventType] ? '' : shareMessage)
  data.set('pix_key', form.pix_key.trim())
  data.set('color_primary', form.color_primary)
  data.set('name_font', form.name_font)
  data.set('invite_style', form.invite_style)
  data.set('show_countdown', form.show_countdown ? '1' : '0')
  data.set('show_calendar', form.show_calendar ? '1' : '0')
  if (form.logo) {
    data.set('logo', form.logo)
  }
  if (form.cover_photo) {
    data.set('cover_photo', form.cover_photo)
  } else if (form.remove_cover_photo) {
    data.set('remove_cover_photo', '1')
  }
  data.set('cover_focus_x', String(form.cover_focus.x))
  data.set('cover_focus_y', String(form.cover_focus.y))
  if (form.music) {
    data.set('music', form.music)
  } else if (form.remove_music) {
    data.set('remove_music', '1')
  }
  return data
}

export default function AdminSettings() {
  const { session } = useAdminAuth()
  const token = session?.token ?? null
  const contextEvent = useAdminEvent()
  const setAdminEvent = useSetAdminEvent()
  const [event, setEvent] = useState(contextEvent)
  const [form, setForm] = useState<SettingsForm>(() => toFormState(contextEvent))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const musicRef = useRef<HTMLInputElement>(null)
  const shareRef = useRef<HTMLTextAreaElement>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [preparingCover, setPreparingCover] = useState(false)
  const [previewWithGroup, setPreviewWithGroup] = useState(true)

  const typeProfile = EVENT_TYPES[event.event_type]
  const [hostLabel, hostSecondaryLabel] = typeProfile.hostLabels
  const [venueLabel, secondVenueLabel] = typeProfile.venueLabels
  const [venuePlaceholder, secondVenuePlaceholder] = typeProfile.venuePlaceholders
  const shownCover = coverPreview ?? event.cover_photo_url
  const defaultShareMessage = DEFAULT_SHARE_MESSAGE[event.event_type]
  // O Ilimitado é interno: o cliente não vê o nome do plano, só que o acesso não tem prazo.
  const planLabel = event.plan && event.plan !== 'unlimited' ? PLAN_LABELS[event.plan] : null

  // Prévias (mensagem de envio, miniaturas da abertura) com o que está no
  // formulário, mesmo antes de salvar.
  const previewEvent: AdminEvent = {
    ...event,
    host_name: form.host_name.trim() || event.host_name,
    host_name_secondary: form.host_name_secondary.trim() || null,
    event_date: form.event_date || null,
    color_primary: form.color_primary,
    name_font: form.name_font,
  }
  const sharePreview = buildShareMessage(form.share_message.trim() || defaultShareMessage, {
    event: previewEvent,
    guestName: 'João Silva',
    dependentNames: previewWithGroup ? ['Ana Silva', 'Pedro Silva'] : [],
    link: `${window.location.origin}/${event.slug}/joao-silva-1`,
  })

  // Libera o object URL do preview anterior (troca de foto ou saída da página).
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setForm((prev) => ({ ...prev, cover_photo: null }))
      setCoverPreview(null)
      return
    }
    // Reduz no próprio browser: foto de celular costuma ter 5–10MB.
    setPreparingCover(true)
    const resized = await resizeImage(file)
    setPreparingCover(false)
    setForm((prev) => ({ ...prev, cover_photo: resized, remove_cover_photo: false, cover_focus: { x: 50, y: 50 } }))
    setCoverPreview(URL.createObjectURL(resized))
  }

  const handleMusicChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (file && file.size > MUSIC_MAX_BYTES) {
      e.target.value = ''
      setForm((prev) => ({ ...prev, music: null }))
      setError('A música deve ter no máximo 15MB.')
      return
    }
    setError(null)
    setForm((prev) => ({ ...prev, music: file, remove_music: false }))
  }

  // Insere a variável onde está o cursor (ou substitui a seleção).
  const insertShareVariable = (token: string) => {
    const textarea = shareRef.current
    const current = form.share_message
    const start = textarea?.selectionStart ?? current.length
    const end = textarea?.selectionEnd ?? current.length
    const next = current.slice(0, start) + token + current.slice(end)
    if (next.length > SHARE_MESSAGE_MAX_LENGTH) return

    setForm((prev) => ({ ...prev, share_message: next }))
    requestAnimationFrame(() => {
      textarea?.focus()
      textarea?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await api.post<{ event: AdminEvent }>('/admin/event', toFormData(form, event.event_type), token)
      setEvent(res.event)
      setAdminEvent(res.event)
      setForm(toFormState(res.event))
      if (fileRef.current) fileRef.current.value = ''
      if (coverRef.current) coverRef.current.value = ''
      if (musicRef.current) musicRef.current.value = ''
      setCoverPreview(null)
      setSaved(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível salvar as alterações.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Configurações do evento"
        description={
          <>
            Personalize as informações e a cor que aparecem para os convidados no convite.{' '}
            <span className="font-medium text-brand-primary">
              {planLabel && `Plano ${planLabel}. `}
              {event.access_expires_at
                ? `Seu acesso ao painel está liberado até ${formatAccessExpiresAt(event.access_expires_at)}.`
                : 'Seu acesso ao painel não tem prazo de expiração.'}
            </span>
          </>
        }
      />

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <Section
          icon={<Heart size={18} />}
          title={typeProfile.hostsTitle}
          description="Como os nomes aparecem no envelope e no convite."
        >
          <label className={labelClass}>
            {hostLabel}
            <input
              required
              value={form.host_name}
              onChange={(e) => setForm((prev) => ({ ...prev, host_name: e.target.value }))}
              className={inputClass}
            />
          </label>

          <label className={labelClass}>
            {hostSecondaryLabel}
            <input
              value={form.host_name_secondary}
              onChange={(e) => setForm((prev) => ({ ...prev, host_name_secondary: e.target.value }))}
              className={inputClass}
            />
          </label>

          <label className={`${labelClass} sm:col-span-2`}>
            Subtítulo <span className="font-normal text-[#8b7a9c]">(opcional)</span>
            <input
              value={form.subtitle}
              maxLength={SUBTITLE_MAX_LENGTH}
              onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))}
              placeholder={typeProfile.subtitlePlaceholder}
              className={inputClass}
            />
            <span className={hintClass}>Aparece logo abaixo dos nomes.</span>
          </label>

          <label className={labelClass}>
            Fonte do nome
            <select
              value={form.name_font}
              onChange={(e) => setForm((prev) => ({ ...prev, name_font: e.target.value as NameFont }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, color_primary: e.target.value }))}
                className="h-10 w-16 cursor-pointer rounded-xl border border-brand-primary-soft bg-white px-1 outline-none"
              />
              <span className="font-mono text-sm font-normal text-[#6b5d80] uppercase">{form.color_primary}</span>
            </span>
          </label>

          <div className="rounded-xl bg-brand-primary-soft/25 px-4 py-5 text-center sm:col-span-2">
            <p className={`${NAME_FONT_CLASSES_COMPACT[form.name_font]} text-[#3f3450]`}>
              {form.host_name.trim() || 'Nome'}
              {form.host_name_secondary.trim() && (
                <>
                  {' '}
                  <span className="font-serif italic" style={{ color: form.color_primary }}>
                    &amp;
                  </span>{' '}
                  {form.host_name_secondary.trim()}
                </>
              )}
            </p>
            {form.subtitle.trim() && (
              <p className="mt-1 font-serif text-lg italic" style={{ color: form.color_primary }}>
                {form.subtitle.trim()}
              </p>
            )}
            <p className="mt-1 text-xs text-[#8b7a9c]">Prévia</p>
          </div>

          <div className={`${labelClass} sm:col-span-2`}>
            <label htmlFor="logo">Brasão / logo</label>
            <div className="mt-1 flex items-center gap-4">
              {event.logo_url && (
                <img src={event.logo_url} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
              )}
              <input
                id="logo"
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.files?.[0] ?? null }))}
                className={fileInputClass}
              />
            </div>
          </div>
        </Section>

        <Section icon={<CalendarDays size={18} />} title="Quando e onde">
          <label className={`${labelClass} sm:col-span-2 sm:max-w-xs`}>
            Data e hora
            <input
              type="datetime-local"
              value={form.event_date}
              onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
              className={inputClass}
            />
          </label>

          <div className={boxClass}>
            <p className={boxTitleClass}>{venueLabel}</p>
            <label className={labelClass}>
              Local
              <input
                value={form.venue_name}
                onChange={(e) => setForm((prev) => ({ ...prev, venue_name: e.target.value }))}
                placeholder={venuePlaceholder}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Endereço
              <input
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Rua, número - bairro, cidade"
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Link do mapa
              <input
                value={form.maps_url}
                onChange={(e) => setForm((prev) => ({ ...prev, maps_url: e.target.value }))}
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
                onChange={(e) => setForm((prev) => ({ ...prev, venue_name_secondary: e.target.value }))}
                placeholder={secondVenuePlaceholder}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              Link do mapa
              <input
                value={form.maps_url_secondary}
                onChange={(e) => setForm((prev) => ({ ...prev, maps_url_secondary: e.target.value }))}
                placeholder="https://maps.app.goo.gl/..."
                className={inputClass}
              />
            </label>
            <p className={hintClass}>Deixe em branco se for tudo no mesmo local.</p>
          </div>
        </Section>

        <Section icon={<Shirt size={18} />} title="Detalhes">
          <label className={labelClass}>
            Traje
            <input
              value={form.dress_code}
              onChange={(e) => setForm((prev) => ({ ...prev, dress_code: e.target.value }))}
              placeholder="Ex: Esporte fino"
              className={inputClass}
            />
          </label>

          {/* Escondida com a lista de presentes desligada, mas continua no
              formulário e é salva como está. */}
          {giftsEnabled(event) && (
            <label className={labelClass}>
              Chave Pix
              <input
                value={form.pix_key}
                onChange={(e) => setForm((prev) => ({ ...prev, pix_key: e.target.value }))}
                className={inputClass}
              />
              <span className={hintClass}>Aparece na lista de presentes.</span>
            </label>
          )}
        </Section>

        <Section
          icon={<MailOpen size={18} />}
          title="Abertura do convite"
          description="O que o convidado vê ao abrir o link, antes do convite. Toque em um estilo para ver a abertura."
        >
          <div className="sm:col-span-2">
            <InviteStylePicker
              event={previewEvent}
              value={form.invite_style}
              onChange={(style) => setForm((prev) => ({ ...prev, invite_style: style }))}
            />
          </div>
        </Section>

        <Section
          icon={<Sparkles size={18} />}
          title="Convite"
          description="Mensagem, foto, música e o que mais aparece no convite."
        >
          <label className={`${labelClass} sm:col-span-2`}>
            Mensagem do convite
            <textarea
              rows={4}
              maxLength={INVITE_MESSAGE_MAX_LENGTH}
              value={form.invite_message}
              onChange={(e) => setForm((prev) => ({ ...prev, invite_message: e.target.value }))}
              placeholder={typeProfile.inviteMessagePlaceholder}
              className={`${inputClass} resize-y`}
            />
            <span className="block text-right text-xs font-normal text-[#8b7a9c]">
              {form.invite_message.length}/{INVITE_MESSAGE_MAX_LENGTH}
            </span>
          </label>

          <div className={`${boxClass} sm:col-span-2`}>
            <p className={boxTitleClass}>Seções</p>
            <p className={hintClass}>Só aparecem quando o evento tem data e hora definidas.</p>
            <div className="flex flex-col gap-x-8 sm:flex-row">
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={form.show_countdown}
                  onChange={(e) => setForm((prev) => ({ ...prev, show_countdown: e.target.checked }))}
                  className="accent-brand-primary"
                />
                Contagem regressiva
              </label>
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={form.show_calendar}
                  onChange={(e) => setForm((prev) => ({ ...prev, show_calendar: e.target.checked }))}
                  className="accent-brand-primary"
                />
                Salve a data (adicionar à agenda)
              </label>
            </div>
          </div>

          <div className={boxClass}>
            <p className={boxTitleClass}>Foto de capa</p>
            <p className={hintClass}>
              Aparece no topo do convite e vai desfocando até o fundo. Clique na foto no ponto que não pode ser
              cortado (o rosto, o casal): as prévias mostram o recorte no celular e no computador.
            </p>
            {shownCover &&
              (form.remove_cover_photo ? (
                <img src={shownCover} alt="" className="h-40 w-32 rounded-xl object-cover opacity-40 grayscale transition" />
              ) : (
                <CoverFocusPicker
                  src={shownCover}
                  focus={form.cover_focus}
                  onChange={(cover_focus) => setForm((prev) => ({ ...prev, cover_focus }))}
                />
              ))}
            <input
              ref={coverRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              aria-label="Foto de capa"
              onChange={handleCoverChange}
              className={fileInputClass}
            />
            {preparingCover && <p className={hintClass}>Preparando a foto...</p>}
            {event.cover_photo_url && !form.cover_photo && (
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={form.remove_cover_photo}
                  onChange={(e) => setForm((prev) => ({ ...prev, remove_cover_photo: e.target.checked }))}
                  className="accent-brand-primary"
                />
                Remover foto atual
              </label>
            )}
          </div>

          <div className={boxClass}>
            <p className={boxTitleClass}>Música</p>
            <p className={hintClass}>
              {form.invite_style === 'direct'
                ? 'Na abertura "Direto" o convidado não toca em nada para abrir, então a música só começa quando ele aperta o botão de música.'
                : 'Começa a tocar quando o convidado abre o envelope, com um botão para pausar.'}{' '}
              MP3, M4A ou OGG, até 15MB.
            </p>
            {event.music_url && !form.music && (
              <audio
                controls
                preload="none"
                src={event.music_url}
                className={`w-full transition ${form.remove_music ? 'opacity-40' : ''}`}
              />
            )}
            <input
              ref={musicRef}
              type="file"
              accept=".mp3,.m4a,.ogg,audio/mpeg,audio/mp4,audio/ogg"
              aria-label="Música do convite"
              onChange={handleMusicChange}
              className={fileInputClass}
            />
            {event.music_url && !form.music && (
              <label className={checkboxLabelClass}>
                <input
                  type="checkbox"
                  checked={form.remove_music}
                  onChange={(e) => setForm((prev) => ({ ...prev, remove_music: e.target.checked }))}
                  className="accent-brand-primary"
                />
                Remover música atual
              </label>
            )}
          </div>
        </Section>

        <Section
          icon={<MessageSquareText size={18} />}
          title="Mensagem de envio"
          description='Texto que o botão "Copiar mensagem", na lista de pessoas, copia já com o nome e o link de cada convidado.'
        >
          <div>
            <label htmlFor="share-message" className={labelClass}>
              Texto
            </label>
            <textarea
              id="share-message"
              ref={shareRef}
              rows={9}
              maxLength={SHARE_MESSAGE_MAX_LENGTH}
              value={form.share_message}
              onChange={(e) => setForm((prev) => ({ ...prev, share_message: e.target.value }))}
              className={`${inputClass} resize-y text-sm`}
            />
            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[#8b7a9c]">
              {form.share_message.trim() !== defaultShareMessage ? (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, share_message: defaultShareMessage }))}
                  className="cursor-pointer inline-flex items-center gap-1 font-medium text-brand-primary hover:underline"
                >
                  <RotateCcw size={12} />
                  Restaurar texto padrão
                </button>
              ) : (
                <span>Texto padrão</span>
              )}
              <span>
                {form.share_message.length}/{SHARE_MESSAGE_MAX_LENGTH}
              </span>
            </div>

            <p className="mt-3 text-xs font-medium text-[#3f3450]">Inserir no texto</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {shareMessageVariables(event.event_type).map((variable) => (
                <button
                  key={variable.token}
                  type="button"
                  onClick={() => insertShareVariable(variable.token)}
                  title={variable.token}
                  className="cursor-pointer rounded-full border border-brand-primary-soft bg-white px-2.5 py-1 text-xs font-medium text-brand-primary transition hover:bg-brand-primary-soft"
                >
                  + {variable.label}
                </button>
              ))}
            </div>
            <p className={hintClass}>
              Dica: {'{Voce}'} com V maiúsculo vira "Você" / "Vocês", pra começar uma frase.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={labelClass}>Prévia</p>
              <div className="flex rounded-full border border-brand-primary-soft p-0.5 text-xs" role="group">
                {[
                  { value: true, label: 'Com relacionados' },
                  { value: false, label: 'Individual' },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setPreviewWithGroup(option.value)}
                    aria-pressed={previewWithGroup === option.value}
                    className={`cursor-pointer rounded-full px-3 py-1 font-medium transition ${
                      previewWithGroup === option.value ? 'bg-brand-primary text-white' : 'text-[#6b5d80]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-1 rounded-xl bg-[#efeae2] p-3">
              <p className="rounded-xl rounded-tr-sm bg-[#d9fdd3] px-3 py-2 text-sm wrap-break-word whitespace-pre-line text-[#111b21] shadow-sm">
                {sharePreview}
              </p>
            </div>
          </div>
        </Section>

        <SaveBar saving={saving} disabled={preparingCover} error={error} saved={saved} />
      </form>
    </div>
  )
}
