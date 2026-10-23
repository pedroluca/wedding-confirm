import { CircleAlert, MessageCircle, TriangleAlert } from 'lucide-react'
import { whatsappLink } from '../../lib/contact'
import type { GuestBand, GuestBandState } from '../../lib/plans'
import { Meter, type MeterTone } from './ui'

const BAND_TONES: Record<GuestBandState, MeterTone> = { ok: 'brand', tolerance: 'warning', full: 'danger' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/**
 * Uso da faixa de convidados na tela Pessoas: só a barra dentro da faixa,
 * um aviso na margem de tolerância e, no teto, o convite pra mudar de faixa
 * pelo WhatsApp (o cadastro trava).
 */
export function GuestBandNotice({ band, contactMessage }: { band: GuestBand; contactMessage: string }) {
  const meter = (
    <Meter
      value={band.people}
      max={band.limit}
      tone={BAND_TONES[band.state]}
      label={`${band.people} de ${band.limit} pessoas da faixa contratada`}
    />
  )

  if (band.state === 'ok') {
    return (
      <div className="mt-4 rounded-2xl border border-[#ece6f0] bg-white px-4 py-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-[#6b5d80]">Faixa contratada</span>
          <span className="font-medium text-[#3f3450] tabular-nums">
            {band.people} de {plural(band.limit, 'pessoa', 'pessoas')}
          </span>
        </div>
        <div className="mt-2">{meter}</div>
      </div>
    )
  }

  if (band.state === 'tolerance') {
    return (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
        <p className="flex items-start gap-2">
          <TriangleAlert size={18} className="mt-px shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Você passou da faixa de {band.limit} convidados.</strong> Dá pra adicionar
            mais {plural(band.remaining, 'pessoa', 'pessoas')} antes de precisar mudar de faixa.
          </span>
        </p>
        <div className="mt-3">{meter}</div>
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2">
          <CircleAlert size={18} className="mt-px shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">Você chegou ao limite da faixa de {band.limit} convidados.</strong> Para
            adicionar mais pessoas, fale com a gente e mude de faixa. Remover alguém também libera vaga.
          </span>
        </p>
        <a
          href={whatsappLink(contactMessage)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-rose-600 px-5 py-2.5 font-semibold text-white transition hover:bg-rose-700"
        >
          <MessageCircle size={16} />
          Falar no WhatsApp
        </a>
      </div>
      <div className="mt-3">{meter}</div>
    </div>
  )
}

/** Selo do super-admin para evento acima da faixa contratada. Dentro dela (ou sem faixa), nada. */
export function GuestBandBadge({ band }: { band: GuestBand | null }) {
  if (!band || band.state === 'ok') return null

  const full = band.state === 'full'
  return (
    <span
      title={`${band.people} pessoas, faixa de ${band.limit} (trava em ${band.cap})`}
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${
        full ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {full ? 'Faixa cheia' : 'Acima da faixa'}
    </span>
  )
}
