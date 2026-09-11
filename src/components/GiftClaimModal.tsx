import { useState } from 'react'
import { api, ApiError } from '../lib/api'
import { useEvent } from '../lib/eventContext'
import type { Gift } from '../types'

type GiftClaimModalProps = {
  gift: Gift
  eventSlug: string
  guestSlug: string
  onClose: () => void
  onClaimed: (giftId: number) => void
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function GiftClaimModal({ gift, eventSlug, guestSlug, onClose, onClaimed }: GiftClaimModalProps) {
  const event = useEvent()
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const copyPixKey = () => {
    if (!event.pix_key) return
    navigator.clipboard.writeText(event.pix_key).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleConfirm = async () => {
    setSaving(true)
    setError(null)
    try {
      await api.post(`/events/${eventSlug}/guests/${guestSlug}/gifts/${gift.id}/claim`, {
        message: message.trim() || undefined,
      })
      setDone(true)
      onClaimed(gift.id)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Não foi possível registrar sua escolha. Tente novamente.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="max-h-full w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {gift.image_url && (
          <img
            src={gift.image_url}
            alt={gift.name}
            className="h-40 w-full rounded-xl object-cover"
          />
        )}

        <h2 className="mt-4 text-xl font-semibold text-[#3f3450]">{gift.name}</h2>
        {gift.description && <p className="mt-1 text-sm text-[#6b5d80]">{gift.description}</p>}

        {done ? (
          <div className="mt-5">
            <p className="text-[#3f3450]">
              Presente registrado! Muito obrigado pelo carinho 💜
            </p>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-6 py-3 font-semibold text-white transition hover:bg-brand-primary-hover"
            >
              Fechar
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <p className="text-sm text-[#6b5d80]">
              Este item é apenas uma sugestão. Você pode comprá-lo por conta própria
              {event.pix_key && ' ou, se preferir, contribuir via Pix com qualquer valor'}. O valor abaixo é apenas uma média de preços encontrada na internet.
            </p>

            <p className="text-sm font-medium text-[#3f3450]">
              Sugestão de valor: {currency.format(gift.suggested_amount)}
            </p>

            {event.pix_key && (
              <div>
                <p className="text-xs font-medium text-[#8b7a9c]">Chave Pix</p>
                <button
                  type="button"
                  onClick={copyPixKey}
                  className="cursor-copy mt-1 w-full truncate rounded-xl border border-brand-primary-soft bg-brand-primary-soft px-4 py-2 text-left text-sm text-[#3f3450]"
                >
                  {copied ? 'Chave copiada!' : event.pix_key}
                </button>
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-[#8b7a9c]" htmlFor="gift-message">
                {event.event_type === 'wedding'
                  ? 'Mensagem para os noivos (opcional)'
                  : 'Mensagem para quem está comemorando (opcional)'}
              </label>
              <textarea
                id="gift-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
                className="mt-1 w-full resize-none rounded-xl border border-brand-primary-soft px-4 py-2 text-sm outline-none focus:border-brand-primary"
                placeholder="Escreva uma mensagem, se quiser"
              />
            </div>

            {error && <p className="text-sm text-rose-600">{error}</p>}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer flex-1 rounded-full border border-brand-primary-soft px-6 py-3 font-medium text-[#3f3450] hover:bg-brand-primary-soft"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleConfirm}
                className="cursor-pointer flex-1 rounded-full bg-brand-primary px-6 py-3 font-semibold text-white shadow-lg shadow-brand-primary-soft transition hover:bg-brand-primary-hover disabled:opacity-60"
              >
                {saving ? 'Salvando...' : 'Confirmar escolha'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
