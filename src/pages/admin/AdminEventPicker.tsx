import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ChevronRight, LogOut } from 'lucide-react'
import { ApiError } from '../../lib/api'
import { isSuperSession, useAdminAuth } from '../../lib/adminAuthContext'
import { parseMysqlDate } from '../../lib/eventFormat'
import { EVENT_TYPES, formatHostNames } from '../../lib/eventTypes'
import { PageShell } from '../../components/PageShell'
import type { AccountEvent } from '../../types'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

function eventDateLine(event: AccountEvent): string {
  const date = event.event_date ? parseMysqlDate(event.event_date) : null
  const when = date ? dateFormatter.format(date) : 'Sem data definida'
  return event.access_expired ? `${when} · acesso encerrado` : when
}

/**
 * "Seus eventos": quem administra mais de um evento escolhe qual abrir.
 * Aparece logo depois do login e pelo "Trocar evento" do painel. Os de
 * acesso encerrado continuam na lista (o painel avisa ao abrir).
 */
export default function AdminEventPicker() {
  const { session, logout, superSession, switchEvent, refreshSession } = useAdminAuth()
  const navigate = useNavigate()
  const [opening, setOpening] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const token = session?.token ?? null
  const superMode = session ? isSuperSession(session) : false

  useEffect(() => {
    if (!token || superMode) return
    refreshSession(token).catch(() => {})
  }, [token, superMode, refreshSession])

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }
  if (superMode) {
    return <Navigate to="/super" replace />
  }

  const events = session.events ?? []
  const firstName = session.admin.name.trim().split(/\s+/)[0]

  const open = async (event: AccountEvent) => {
    setOpening(event.id)
    setError(null)
    try {
      if (event.id !== session.admin.event_id) {
        await switchEvent(event.id)
      }
      navigate('/admin')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível abrir este evento.')
      setOpening(null)
    }
  }

  return (
    <PageShell>
      <div className="w-full max-w-lg">
        <img src="/presenzo-logo.svg" alt="Presenzo" className="mx-auto h-8 w-auto" />

        <div className="mt-6 rounded-3xl border border-brand-primary-soft bg-white p-6 shadow-lg shadow-brand-primary-soft sm:p-8">
          <h1 className="text-center text-2xl font-semibold text-[#3f3450]">Seus eventos</h1>
          <p className="mt-1 text-center text-sm text-[#8b7a9c]">
            Olá, {firstName}! Escolha o evento que você quer abrir.
          </p>

          {events.length === 0 ? (
            <p className="mt-6 text-center text-sm text-[#6b5d80]">Carregando...</p>
          ) : (
            <ul className="mt-6 space-y-3">
              {events.map((event) => {
                const current = event.id === session.admin.event_id
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => open(event)}
                      disabled={opening !== null}
                      className="cursor-pointer flex w-full items-center gap-4 rounded-2xl border border-[#ece6f0] p-4 text-left transition hover:border-brand-primary/40 hover:bg-brand-primary-soft/30 disabled:cursor-default disabled:opacity-60"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[11px] font-semibold tracking-wide text-brand-primary uppercase">
                          {EVENT_TYPES[event.event_type].label}
                          {event.event_type === 'other' && event.subtitle ? ` · ${event.subtitle}` : ''}
                        </span>
                        <span className="mt-0.5 block font-semibold break-words text-[#3f3450]">
                          {formatHostNames(event)}
                        </span>
                        <span className={`block text-xs ${event.access_expired ? 'text-amber-700' : 'text-[#8b7a9c]'}`}>
                          {eventDateLine(event)}
                        </span>
                      </span>
                      {current && (
                        <span className="shrink-0 rounded-full bg-brand-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary">
                          Aberto agora
                        </span>
                      )}
                      <ChevronRight size={18} className="shrink-0 text-[#8b7a9c]" aria-hidden />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {error && <p className="mt-4 text-center text-sm text-rose-600">{error}</p>}

          <button
            type="button"
            onClick={logout}
            className="cursor-pointer mx-auto mt-6 flex items-center gap-2 text-sm text-[#8b7a9c] transition hover:text-brand-primary hover:underline"
          >
            <LogOut size={15} aria-hidden />
            {superSession ? 'Voltar ao super' : 'Sair'}
          </button>
        </div>
      </div>
    </PageShell>
  )
}
