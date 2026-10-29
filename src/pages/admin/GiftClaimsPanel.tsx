import { useMemo, useState } from 'react'
import { Gift, MessageSquareText, Search, Wallet } from 'lucide-react'
import { parseMysqlDate } from '../../lib/eventFormat'
import { EmptyState, panelCardClass, StatCard } from '../../components/panel/ui'
import type { AdminGift } from '../../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

/** Ignora acentos e caixa na busca. */
const normalize = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Foto do item; sem foto (ou se ela não carregar), o ícone de presente. */
function GiftThumb({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false)

  if (!url || failed) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-primary-soft text-brand-primary">
        <Gift size={20} aria-hidden />
      </span>
    )
  }

  return <img src={url} alt="" onError={() => setFailed(true)} className="h-14 w-14 shrink-0 rounded-xl object-cover" />
}

type ClaimRow = {
  id: number
  guestName: string
  message: string | null
  createdAt: string
  gift: AdminGift
}

/**
 * Aba "Escolhidos" da lista de presentes: tudo o que os convidados já
 * escolheram numa lista só, do mais recente pro mais antigo, com quem
 * escolheu, a mensagem e o item, sem precisar abrir item por item.
 */
export function GiftClaimsPanel({ gifts }: { gifts: AdminGift[] }) {
  const [search, setSearch] = useState('')
  const [onlyMessages, setOnlyMessages] = useState(false)

  const rows = useMemo<ClaimRow[]>(
    () =>
      gifts
        .flatMap((gift) =>
          gift.claims.map((claim) => ({
            id: claim.id,
            guestName: claim.guest_name,
            message: claim.message,
            createdAt: claim.created_at,
            gift,
          }))
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [gifts]
  )

  const guests = new Set(rows.map((row) => row.guestName)).size
  const withMessage = rows.filter((row) => row.message).length
  const totalValue = rows.reduce((total, row) => total + row.gift.suggested_amount, 0)

  const term = normalize(search)
  const visible = rows.filter(
    (row) =>
      (!onlyMessages || row.message) &&
      (!term || normalize(`${row.guestName} ${row.gift.name} ${row.message ?? ''}`).includes(term))
  )

  if (rows.length === 0) {
    return (
      <div className={panelCardClass}>
        <EmptyState>
          Nenhum presente escolhido ainda. Quando um convidado escolher um item da lista, ele aparece aqui, com a
          mensagem que deixou.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard
          label="Presentes escolhidos"
          value={rows.length}
          hint={`por ${guests} ${guests === 1 ? 'convite' : 'convites'}`}
          icon={Gift}
        />
        <StatCard
          label="Mensagens"
          value={withMessage}
          hint="deixadas junto com o presente"
          icon={MessageSquareText}
        />
        <div className="col-span-2 lg:col-span-1">
          <StatCard
            label="Valor somado"
            value={currency.format(totalValue)}
            hint="pelo valor sugerido de cada item"
            icon={Wallet}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative min-w-0 flex-1">
          <Search size={16} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[#8b7a9c]" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por convidado, presente ou mensagem"
            aria-label="Buscar presentes escolhidos"
            className="w-full rounded-full border border-[#ece6f0] bg-white py-2.5 pr-4 pl-10 text-sm outline-none focus:border-brand-primary"
          />
        </label>
        <button
          type="button"
          onClick={() => setOnlyMessages((value) => !value)}
          aria-pressed={onlyMessages}
          className={`cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-medium transition ${
            onlyMessages
              ? 'bg-brand-primary text-white'
              : 'border border-brand-primary-soft bg-white text-[#3f3450] hover:bg-brand-primary-soft'
          }`}
        >
          <MessageSquareText size={15} aria-hidden />
          Só com mensagem
        </button>
      </div>

      <div className={`overflow-hidden ${panelCardClass}`}>
        {visible.length === 0 ? (
          <EmptyState>
            Nada encontrado com esse filtro.{' '}
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setOnlyMessages(false)
              }}
              className="cursor-pointer font-medium text-brand-primary underline underline-offset-4"
            >
              Limpar
            </button>
          </EmptyState>
        ) : (
          <ul className="divide-y divide-[#f3eef5]">
            {visible.map((row) => {
              const date = parseMysqlDate(row.createdAt)
              return (
                <li key={row.id} className="flex gap-4 px-5 py-4">
                  <GiftThumb url={row.gift.image_url} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
                      <p className="font-medium text-[#3f3450]">{row.guestName}</p>
                      {date && <p className="text-xs text-[#8b7a9c]">{dateFormatter.format(date)}</p>}
                    </div>
                    <p className="text-sm text-[#6b5d80]">
                      {row.gift.name} · {currency.format(row.gift.suggested_amount)}
                    </p>
                    {row.message && (
                      <p className="mt-2 rounded-xl bg-brand-primary-soft/40 px-3 py-2 text-sm text-[#3f3450] italic">
                        “{row.message}”
                      </p>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
