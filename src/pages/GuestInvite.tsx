import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { PageShell } from '../components/PageShell'
import { Invite } from '../components/invite/Invite'
import type { GuestInviteResponse } from '../types'

export default function GuestInvite() {
  const { eventSlug = '', guestSlug = '' } = useParams()
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

  return <Invite data={data} eventSlug={eventSlug} guestSlug={guestSlug} />
}
