import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { InviteDetails } from '../components/InviteDetails'
import { PageShell } from '../components/PageShell'
import type { GuestInviteResponse } from '../types'

export default function GuestInvite() {
  const { eventSlug = '', guestSlug = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<GuestInviteResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = () => {
      setLoading(true)
      setError(null)
      api
        .get<GuestInviteResponse>(`/events/${eventSlug}/guests/${guestSlug}`)
        .then((res) => {
          if (active) setData(res)
        })
        .catch((err) => {
          if (!active) return
          setError(
            err instanceof ApiError && err.status === 404
              ? 'Convite não encontrado. Verifique o link recebido.'
              : 'Não foi possível carregar o convite. Tente novamente.'
          )
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    load()
    return () => {
      active = false
    }
  }, [eventSlug, guestSlug])

  if (loading) {
    return (
      <PageShell>
        <p className="text-[#6b5d80]">Carregando convite...</p>
      </PageShell>
    )
  }

  if (error || !data) {
    return (
      <PageShell>
        <p className="max-w-sm text-center text-[#6b5d80]">{error}</p>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <div className="w-full max-w-md text-center">
        <InviteDetails />
        <button
          type="button"
          onClick={() => navigate(`/${eventSlug}/${guestSlug}/confirmar`)}
          className="cursor-pointer mt-6 w-full rounded-full bg-brand-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-primary-soft transition hover:bg-brand-primary-hover"
        >
          Confirmar presença
        </button>
      </div>
    </PageShell>
  )
}
