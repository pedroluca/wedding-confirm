import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { CalendarDays, Heart, MessageSquareText, RotateCcw, Shirt, Sparkles } from 'lucide-react'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { useAdminEvent, useSetAdminEvent } from '../../lib/adminEventContext'
import { NAME_FONT_CLASSES_COMPACT } from '../../lib/eventFormat'
import { resizeImage } from '../../lib/resizeImage'
import {
  buildShareMessage,
  DEFAULT_SHARE_MESSAGE,
  SHARE_MESSAGE_MAX_LENGTH,
  shareMessageVariables,
} from '../../lib/shareMessage'
import type { AdminEvent, EventType, NameFont } from '../../types'

// Mesmos limites do backend (read_event_branding_fields e src/Uploads.php).
const INVITE_MESSAGE_MAX_LENGTH = 1000
const MUSIC_MAX_BYTES = 15 * 1024 * 1024

type SettingsForm = {
  host_name: string
  host_name_secondary: string
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
  logo: File | null
  cover_photo: File | null
  remove_cover_photo: boolean
  music: File | null
  remove_music: boolean
}

const NAME_FONT_OPTIONS: { value: NameFont; label: string; fontFamily: string }[] = [
  { value: 'sans', label: 'Padrão', fontFamily: 'inherit' },
  { value: 'fleur', label: 'Caligrafia (Fleur De Leah)', fontFamily: "'Fleur De Leah', cursive" },
  { value: 'pinyon', label: 'Caligrafia (Pinyon Script)', fontFamily: "'Pinyon Script', cursive" },
]

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
    maps_url_secondary: event.maps_url_secondary ?? '',
    dress_code: event.dress_code ?? '',
    invite_message: event.invite_message ?? '',
    // Sem modelo salvo, o campo já abre com o texto padrão pra servir de base.
    share_message: event.share_message ?? DEFAULT_SHARE_MESSAGE[event.event_type],
    pix_key: event.pix_key ?? '',
    color_primary: event.color_primary,
    name_font: event.name_font,
    logo: null,
    cover_photo: null,
    remove_cover_photo: false,
    music: null,
    remove_music: false,
  }
}

function toFormData(form: SettingsForm, eventType: EventType): FormData {
  const data = new FormData()
  data.set('host_name', form.host_name.trim())
  data.set('host_name_secondary', form.host_name_secondary.trim())
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
  if (form.logo) {
    data.set('logo', form.logo)
  }
  if (form.cover_photo) {
    data.set('cover_photo', form.cover_photo)
  } else if (form.remove_cover_photo) {
    data.set('remove_cover_photo', '1')
  }
  if (form.music) {
    data.set('music', form.music)
  } else if (form.remove_music) {
    data.set('remove_music', '1')
  }
  return data
}

const HOST_LABEL: Record<EventType, [string, string]> = {
  wedding: ['Nome de um(a) dos noivos', 'Nome do(a) outro(a) noivo(a)'],
  birthday: ['Nome do aniversariante', ''],
}

const inputClass =
  'mt-1 w-full rounded-xl border border-brand-primary-soft bg-white px-4 py-2 font-normal outline-none focus:border-brand-primary'
const labelClass = 'block text-sm font-medium text-[#3f3450]'
const hintClass = 'mt-1 block text-xs font-normal text-[#8b7a9c]'
const fileInputClass =
  'mt-2 block w-full text-sm text-[#6b5d80] file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-brand-primary-soft file:px-4 file:py-2 file:text-sm file:font-medium file:text-brand-primary hover:file:bg-brand-primary/20'
const boxClass = 'space-y-3 rounded-xl border border-brand-primary-soft bg-brand-primary-soft/25 p-4'
const boxTitleClass = 'text-xs font-semibold tracking-wide text-brand-primary uppercase'
const checkboxLabelClass = 'mt-2 flex cursor-pointer items-center gap-2 text-sm text-[#6b5d80]'

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-brand-primary-soft bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
          {icon}
        </span>
        <div>
          <h2 className="font-semibold text-[#3f3450]">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-[#8b7a9c]">{description}</p>}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
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

  const isWedding = event.event_type === 'wedding'
  const [hostLabel, hostSecondaryLabel] = HOST_LABEL[event.event_type]
  const shownCover = coverPreview ?? event.cover_photo_url
  const defaultShareMessage = DEFAULT_SHARE_MESSAGE[event.event_type]

  // Prévia com o que está no formulário (mesmo antes de salvar).
  const sharePreview = buildShareMessage(form.share_message.trim() || defaultShareMessage, {
    event: {
      ...event,
      host_name: form.host_name.trim() || event.host_name,
      host_name_secondary: form.host_name_secondary.trim() || null,
      event_date: form.event_date || null,
    },
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
    setForm((prev) => ({ ...prev, cover_photo: resized, remove_cover_photo: false }))
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
      <h1 className="text-2xl font-semibold text-[#3f3450]">Configurações do evento</h1>
      <p className="mt-1 text-sm text-[#8b7a9c]">
        Personalize as informações e a cor que aparecem para os convidados no convite.
      </p>
      <p className="mt-2 text-sm font-medium text-brand-primary">
        {event.access_expires_at
          ? `Seu acesso ao painel está liberado até ${formatAccessExpiresAt(event.access_expires_at)}.`
          : 'Seu acesso ao painel não tem prazo de expiração.'}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <Section
          icon={<Heart size={18} />}
          title={isWedding ? 'Os noivos' : 'Aniversariante'}
          description="Como os nomes aparecem no envelope e no convite."
        >
          <label className={`${labelClass} ${isWedding ? '' : 'sm:col-span-2'}`}>
            {hostLabel}
            <input
              required
              value={form.host_name}
              onChange={(e) => setForm((prev) => ({ ...prev, host_name: e.target.value }))}
              className={inputClass}
            />
          </label>

          {isWedding && (
            <label className={labelClass}>
              {hostSecondaryLabel}
              <input
                value={form.host_name_secondary}
                onChange={(e) => setForm((prev) => ({ ...prev, host_name_secondary: e.target.value }))}
                className={inputClass}
              />
            </label>
          )}

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
              {isWedding && form.host_name_secondary.trim() && (
                <>
                  {' '}
                  <span className="font-serif italic" style={{ color: form.color_primary }}>
                    &amp;
                  </span>{' '}
                  {form.host_name_secondary.trim()}
                </>
              )}
            </p>
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

          <div className={`${boxClass} ${isWedding ? '' : 'sm:col-span-2'}`}>
            <p className={boxTitleClass}>{isWedding ? 'Cerimônia' : 'Local'}</p>
            <label className={labelClass}>
              Local
              <input
                value={form.venue_name}
                onChange={(e) => setForm((prev) => ({ ...prev, venue_name: e.target.value }))}
                placeholder={isWedding ? 'Ex: Paróquia São José' : 'Ex: Salão de festas Alegria'}
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

          {isWedding && (
            <div className={boxClass}>
              <p className={boxTitleClass}>Festa</p>
              <label className={labelClass}>
                Local
                <input
                  value={form.venue_name_secondary}
                  onChange={(e) => setForm((prev) => ({ ...prev, venue_name_secondary: e.target.value }))}
                  placeholder="Ex: Espaço Villa Jardim"
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
              <p className={hintClass}>Deixe em branco se a festa for no mesmo local da cerimônia.</p>
            </div>
          )}
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

          <label className={labelClass}>
            Chave Pix
            <input
              value={form.pix_key}
              onChange={(e) => setForm((prev) => ({ ...prev, pix_key: e.target.value }))}
              className={inputClass}
            />
            <span className={hintClass}>Aparece na lista de presentes.</span>
          </label>
        </Section>

        {isWedding && (
          <Section
            icon={<Sparkles size={18} />}
            title="Convite"
            description="Mensagem, foto e música que o convidado vê ao abrir o envelope."
          >
            <label className={`${labelClass} sm:col-span-2`}>
              Mensagem do convite
              <textarea
                rows={4}
                maxLength={INVITE_MESSAGE_MAX_LENGTH}
                value={form.invite_message}
                onChange={(e) => setForm((prev) => ({ ...prev, invite_message: e.target.value }))}
                placeholder="Ex: Com a bênção de Deus e de nossas famílias, convidamos você para celebrar conosco o início da nossa história."
                className={`${inputClass} resize-y`}
              />
              <span className="block text-right text-xs font-normal text-[#8b7a9c]">
                {form.invite_message.length}/{INVITE_MESSAGE_MAX_LENGTH}
              </span>
            </label>

            <div className={boxClass}>
              <p className={boxTitleClass}>Foto do casal</p>
              <p className={hintClass}>
                Aparece no topo do convite e vai desfocando até o fundo. Fotos na vertical funcionam melhor.
              </p>
              {shownCover && (
                <img
                  src={shownCover}
                  alt=""
                  className={`h-40 w-32 rounded-xl object-cover transition ${
                    form.remove_cover_photo ? 'opacity-40 grayscale' : ''
                  }`}
                />
              )}
              <input
                ref={coverRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Foto do casal"
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
                Começa a tocar quando o convidado abre o envelope, com um botão para pausar. MP3, M4A ou OGG, até
                15MB.
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
        )}

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

        <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-end gap-x-4 gap-y-2 border-t border-brand-primary-soft bg-white/90 px-6 py-3 backdrop-blur">
          {error && <p className="mr-auto text-sm text-rose-600">{error}</p>}
          {saved && !error && <p className="mr-auto text-sm text-emerald-600">Alterações salvas!</p>}
          <button
            type="submit"
            disabled={saving || preparingCover}
            className="cursor-pointer rounded-full bg-brand-primary px-8 py-2.5 font-semibold text-white transition hover:bg-brand-primary-hover disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  )
}
