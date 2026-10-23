import type { ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Church,
  CircleCheck,
  Gift,
  GraduationCap,
  Heart,
  MapPin,
  PartyPopper,
  Shirt,
  Wine,
  type LucideIcon,
} from 'lucide-react'
import { DevCredit } from '../DevCredit'
import { useEvent } from '../../lib/eventContext'
import { NAME_FONT_CLASSES_COMPACT, parseMysqlDate } from '../../lib/eventFormat'
import { EVENT_TYPES, hasTwoHosts } from '../../lib/eventTypes'
import { guestRoleOptions } from '../../lib/guestRoles'
import { giftsEnabled } from '../../lib/plans'
import type { EventType, GuestInviteResponse } from '../../types'
import { AddToCalendar } from './AddToCalendar'
import { Countdown } from './Countdown'
import { CoverHero } from './CoverHero'
import { Reveal } from './Reveal'
import { RoleCard } from './RoleCard'
import { WaxSeal } from './WaxSeal'

const listFormatter = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' })

const sectionLabelClass = 'text-xs font-semibold tracking-[0.3em] text-brand-primary uppercase'

// Ícones dos dois locais (EVENT_TYPES[...].venueLabels), na mesma ordem.
const VENUE_ICONS: Record<EventType, [LucideIcon, LucideIcon]> = {
  wedding: [Church, Wine],
  birthday: [MapPin, PartyPopper],
  graduation: [GraduationCap, PartyPopper],
  other: [MapPin, PartyPopper],
}

function Ornament() {
  return (
    <div aria-hidden className="flex items-center justify-center gap-3 text-brand-primary/50">
      <span className="h-px w-16 bg-current" />
      <Heart size={12} className="fill-current" />
      <span className="h-px w-16 bg-current" />
    </div>
  )
}

function DetailCard({
  icon,
  label,
  title,
  subtitle,
  mapsUrl,
}: {
  icon: ReactNode
  label: string
  title: string
  subtitle?: string | null
  mapsUrl?: string | null
}) {
  return (
    <div className="flex gap-4 rounded-3xl border border-brand-primary-soft bg-white/70 p-5 text-left">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary-soft text-brand-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold tracking-[0.2em] text-brand-primary uppercase">{label}</p>
        <p className="mt-1 font-serif text-xl leading-snug text-[#3f3450]">{title}</p>
        {subtitle && <p className="mt-1 text-sm text-[#6b5d80]">{subtitle}</p>}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-primary px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-primary-hover"
          >
            <MapPin size={14} />
            Como chegar
          </a>
        )}
      </div>
    </div>
  )
}

/** Tela interna do convite (depois de abrir o envelope, ou direto no estilo "Direto"). */
export function InviteContent({
  data,
  eventSlug,
  guestSlug,
}: {
  data: GuestInviteResponse
  eventSlug: string
  guestSlug: string
}) {
  const event = useEvent()
  const navigate = useNavigate()
  const date = event.event_date ? parseMysqlDate(event.event_date) : null
  const isGroup = data.has_dependents
  const typeProfile = EVENT_TYPES[event.event_type]
  const [venueLabel, secondVenueLabel] = typeProfile.venueLabels
  const [VenueIcon, SecondVenueIcon] = VENUE_ICONS[event.event_type]
  const twoHosts = hasTwoHosts(event)
  // Papel salvo num tipo que não usa papéis (ex: evento que mudou de tipo) não aparece.
  const showRole = data.titular.role !== 'convidado' && guestRoleOptions(event.event_type) !== null
  // Ligadas a menos que o admin desligue (undefined = API anterior aos campos).
  const showCountdown = event.show_countdown !== false
  const showCalendar = event.show_calendar !== false
  const showGifts = giftsEnabled(event)
  // Premium (e Ilimitado) tiram o "Feito com Presenzo"; undefined = API anterior ao campo.
  const showCredit = event.show_credit !== false

  const answered = data.members.every((member) => member.status !== 'pendente')
  const confirmedCount = data.members.filter((member) => member.status === 'confirmado').length

  return (
    <div className="motion-safe:animate-invite-in">
      <CoverHero />

      <main className="mx-auto max-w-md space-y-14 px-6 pt-10 pb-28">
        <Reveal className="text-center">
          <p className={sectionLabelClass}>Com carinho, para</p>
          <p className="mt-3 font-serif text-2xl text-[#3f3450]">
            {listFormatter.format(data.members.map((member) => member.name))}
          </p>
          <p className="mt-4 font-serif text-lg text-[#6b5d80] italic">
            {`${twoHosts ? 'Temos' : 'Tenho'} a alegria de convidar `}
            {isGroup ? 'vocês' : 'você'}
            {` para ${typeProfile.inviteOccasion[twoHosts ? 1 : 0]}.`}
          </p>
        </Reveal>

        {showRole && (
          <Reveal>
            <RoleCard role={data.titular.role} isGroup={isGroup} twoHosts={twoHosts} />
          </Reveal>
        )}

        {event.invite_message && (
          <Reveal>
            <figure className="text-center">
              <span aria-hidden className="block font-serif text-6xl leading-none text-brand-primary/40">
                “
              </span>
              <blockquote className="-mt-4 font-serif text-xl leading-relaxed whitespace-pre-line text-[#3f3450] italic">
                {event.invite_message}
              </blockquote>
              <figcaption className={`mt-4 ${NAME_FONT_CLASSES_COMPACT[event.name_font]} text-brand-primary`}>
                {event.host_name}
                {event.host_name_secondary && ` & ${event.host_name_secondary}`}
              </figcaption>
            </figure>
          </Reveal>
        )}

        <Ornament />

        {date && showCountdown && (
          <Reveal>
            <Countdown date={date} />
          </Reveal>
        )}

        {(event.venue_name || event.address || event.venue_name_secondary || event.dress_code) && (
          <Reveal className="space-y-3">
            {(event.venue_name || event.address) && (
              <DetailCard
                icon={<VenueIcon size={20} />}
                label={venueLabel}
                title={event.venue_name ?? event.address ?? ''}
                subtitle={event.venue_name ? event.address : null}
                mapsUrl={event.maps_url}
              />
            )}
            {event.venue_name_secondary && (
              <DetailCard
                icon={<SecondVenueIcon size={20} />}
                label={secondVenueLabel}
                title={event.venue_name_secondary}
                mapsUrl={event.maps_url_secondary}
              />
            )}
            {event.dress_code && <DetailCard icon={<Shirt size={20} />} label="Traje" title={event.dress_code} />}
          </Reveal>
        )}

        {date && showCalendar && (
          <Reveal>
            <AddToCalendar date={date} />
          </Reveal>
        )}

        <Reveal className="text-center">
          <p className={sectionLabelClass}>Confirmação</p>
          {answered && confirmedCount > 0 ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
              <CircleCheck size={16} />
              Presença confirmada
              {isGroup && confirmedCount < data.members.length && ` (${confirmedCount} de ${data.members.length})`}
            </p>
          ) : answered ? (
            <p className="mt-3 font-serif text-lg text-[#6b5d80] italic">
              {isGroup
                ? 'Vocês informaram que não poderão comparecer.'
                : 'Você informou que não poderá comparecer.'}
            </p>
          ) : (
            <p className="mt-3 font-serif text-xl text-[#3f3450] italic">
              Contamos com a {isGroup ? 'presença de vocês' : 'sua presença'}!
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate(`/${eventSlug}/${guestSlug}/confirmar`)}
            className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-primary-soft transition hover:bg-brand-primary-hover"
          >
            {answered ? 'Alterar confirmação' : 'Confirmar presença'}
          </button>
          {showGifts && (
            <Link
              to={`/${eventSlug}/${guestSlug}/presentes`}
              state={{ from: 'invite' }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-brand-primary-soft bg-white/70 px-8 py-3.5 font-semibold text-brand-primary transition hover:bg-brand-primary-soft"
            >
              <Gift size={18} />
              Lista de presentes
            </Link>
          )}
        </Reveal>

        <footer className="pt-4 text-center">
          <WaxSeal className="mx-auto block w-16 drop-shadow-md" />
          <p className={`mt-3 ${NAME_FONT_CLASSES_COMPACT[event.name_font]} text-[#3f3450]`}>
            {event.host_name}
            {event.host_name_secondary && ` & ${event.host_name_secondary}`}
          </p>
          {showCredit && (
            <p className="mt-12 text-[11px] tracking-wide">
              <DevCredit />
            </p>
          )}
        </footer>
      </main>
    </div>
  )
}
