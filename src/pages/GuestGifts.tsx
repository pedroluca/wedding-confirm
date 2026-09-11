import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { GiftClaimModal } from '../components/GiftClaimModal'
import { PageShell } from '../components/PageShell'
import type { Gift } from '../types'

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GuestGifts() {
  const { eventSlug = '', guestSlug = '' } = useParams()
  const [gifts, setGifts] = useState<Gift[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Gift | null>(null)

  useEffect(() => {
    let active = true
    api
      .get<{ gifts: Gift[] }>(`/events/${eventSlug}/guests/${guestSlug}/gifts`)
      .then((res) => {
        if (active) setGifts(res.gifts)
      })
      .catch((err) => {
        if (!active) return
        setError(
          err instanceof ApiError && err.status === 404
            ? 'Convite não encontrado. Verifique o link recebido.'
            : 'Não foi possível carregar a lista de presentes.'
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [eventSlug, guestSlug])

  const handleClaimed = (giftId: number) => {
    setGifts((prev) => prev.map((g) => (g.id === giftId ? { ...g, claimed_by_me: true } : g)))
  }

  if (loading) {
    return (
      <PageShell>
        <p className="text-[#6b5d80]">Carregando...</p>
      </PageShell>
    )
  }

  if (error) {
    return (
      <PageShell>
        <p className="max-w-sm text-center text-[#6b5d80]">{error}</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="w-full max-w-2xl">
        <h1 className="text-center text-2xl font-semibold text-[#3f3450]">Lista de presentes</h1>
        <p className="mt-2 text-center text-sm text-[#6b5d80]">
          Preparamos algumas sugestões para quem desejar se inspirar. Fique à vontade para escolher um dos itens, presentear-nos de outra forma ou contribuir via Pix com o valor que preferir.
        </p>

        {gifts.length === 0 ? (
          <p className="mt-10 text-center text-[#8b7a9c]">
            Nenhum item disponível na lista no momento.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            {gifts.map((gift) => (
              <div
                key={gift.id}
                className="flex flex-col overflow-hidden rounded-2xl border border-brand-primary-soft bg-white"
              >
                {gift.image_url && (
                  <div className="flex h-28 items-center justify-center bg-brand-primary-soft/40 sm:h-36">
                    <img
                      src={gift.image_url}
                      alt={gift.name}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <p className="text-sm font-medium text-[#3f3450] sm:text-base">{gift.name}</p>
                  {gift.description && (
                    <p className="mt-1 text-xs text-[#8b7a9c] sm:text-sm">{gift.description}</p>
                  )}
                  <p className="mt-2 text-xs text-[#6b5d80] sm:text-sm">
                    Valor sugerido: {currency.format(gift.suggested_amount)}
                  </p>

                  {gift.claimed_by_me ? (
                    <span className="mt-4 inline-flex w-fit items-center rounded-full bg-brand-primary-soft px-3 py-1.5 text-xs font-medium text-brand-primary sm:text-sm">
                      Você já presenteou este item 💜
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelected(gift)}
                      className="cursor-pointer mt-4 rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-brand-primary-hover sm:px-5 sm:text-sm"
                    >
                      Escolher esta sugestão
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Link
          to={`/${eventSlug}/${guestSlug}/confirmar`}
          className="mt-8 block text-center text-sm text-brand-primary underline"
        >
          Voltar
        </Link>
      </div>

      {selected && (
        <GiftClaimModal
          gift={selected}
          eventSlug={eventSlug}
          guestSlug={guestSlug}
          onClose={() => setSelected(null)}
          onClaimed={handleClaimed}
        />
      )}
    </PageShell>
  )
}
