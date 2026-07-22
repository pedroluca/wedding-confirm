import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { DevCredit } from '../components/DevCredit'
import { InviteDetails } from '../components/InviteDetails'
import { PageShell } from '../components/PageShell'
import type { GuestInviteResponse } from '../types'

export default function GuestInvite() {
  const { slug = '' } = useParams()
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
        .get<GuestInviteResponse>(`/guests/${slug}`)
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
  }, [slug])

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

  // const greeting = data.has_dependents
  //   ? `${data.titular.name}, confirme a presença de vocês`
  //   : `${data.titular.name}, confirme a sua presença`

  return (
    <PageShell footer={<DevCredit />}>
      <div className="w-full max-w-md text-center">
        <InviteDetails />
        {/* <p className="mt-10 text-xl font-medium text-[#3f3450]">{greeting}</p> */}
        <button
          type="button"
          onClick={() => navigate(`/${slug}/confirmar`)}
          className="cursor-pointer mt-6 w-full rounded-full bg-lilac-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-lilac-300 transition hover:bg-[#c298ff]"
        >
          Confirmar presença
        </button>
      </div>
    </PageShell>
  )
}
