import { useEffect, useState } from 'react'
import { Outlet, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { EventContext } from '../lib/eventContext'
import { PageShell } from '../components/PageShell'
import type { PublicEvent } from '../types'

const DEFAULT_TITLE = document.title

/**
 * Envolve as rotas públicas /:eventSlug/*, buscando a marca do evento uma
 * vez e aplicando cor/título em runtime. O cleanup no unmount é essencial:
 * sem ele, a cor/título de um evento vazariam para o admin ao navegar para
 * fora deste subtree — /admin e /super nunca são envolvidos por este
 * layout, de propósito, para não reskinar por evento.
 */
export default function EventLayout() {
  const { eventSlug = '' } = useParams()
  const [event, setEvent] = useState<PublicEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = () => {
      setLoading(true)
      setError(null)
      api
        .get<{ event: PublicEvent }>(`/events/${eventSlug}`)
        .then((res) => {
          if (active) setEvent(res.event)
        })
        .catch((err) => {
          if (!active) return
          setError(
            err instanceof ApiError && err.status === 404
              ? 'Evento não encontrado. Verifique o link recebido.'
              : 'Não foi possível carregar o evento. Tente novamente.'
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
  }, [eventSlug])

  useEffect(() => {
    if (!event) return

    const root = document.documentElement
    root.style.setProperty('--color-brand-primary', event.color_primary)
    document.title = event.host_name_secondary
      ? `${event.host_name} & ${event.host_name_secondary}`
      : event.host_name

    return () => {
      root.style.removeProperty('--color-brand-primary')
      document.title = DEFAULT_TITLE
    }
  }, [event])

  if (loading) {
    return (
      <PageShell>
        <p className="text-[#6b5d80]">Carregando...</p>
      </PageShell>
    )
  }

  if (error || !event) {
    return (
      <PageShell>
        <p className="max-w-sm text-center text-[#6b5d80]">{error}</p>
      </PageShell>
    )
  }

  return (
    <EventContext.Provider value={event}>
      <Outlet />
    </EventContext.Provider>
  )
}
