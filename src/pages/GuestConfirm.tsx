import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { rememberDemoAnswers, withDemoAnswers } from '../lib/demo'
import { useEvent } from '../lib/eventContext'
import { giftsEnabled } from '../lib/plans'
import { Checkbox } from '../components/Checkbox'
import { DemoCta } from '../components/DemoBanner'
import { InviteDetails } from '../components/InviteDetails'
import { PageShell } from '../components/PageShell'
import type { GuestInviteResponse } from '../types'

export default function GuestConfirm() {
  const { eventSlug = '', guestSlug = '' } = useParams()
  const event = useEvent()
  const [data, setData] = useState<GuestInviteResponse | null>(null)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const demoKey = `${eventSlug}/${guestSlug}`

  useEffect(() => {
    let active = true
    api
      .get<GuestInviteResponse>(`/events/${eventSlug}/guests/${guestSlug}`)
      .then((loaded) => {
        if (!active) return
        const res = event.is_demo ? withDemoAnswers(demoKey, loaded) : loaded
        setData(res)
        setChecked(Object.fromEntries(res.members.map((m) => [m.id, m.status !== 'recusado'])))
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
    return () => {
      active = false
    }
  }, [eventSlug, guestSlug, event.is_demo, demoKey])

  const handleSubmit = async () => {
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      const res = await api.post<Pick<GuestInviteResponse, 'members'>>(
        `/events/${eventSlug}/guests/${guestSlug}/confirm`,
        { items: data.members.map((m) => ({ id: m.id, confirmed: checked[m.id] ?? false })) }
      )
      // No exemplo a API só devolve como ficaria; o convite lê daqui.
      if (event.is_demo) rememberDemoAnswers(demoKey, res.members)
      setDone(true)
    } catch {
      setError('Não foi possível salvar sua confirmação. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <p className="text-[#6b5d80]">Carregando...</p>
      </PageShell>
    )
  }

  if (error && !data) {
    return (
      <PageShell>
        <p className="max-w-sm text-center text-[#6b5d80]">{error}</p>
      </PageShell>
    )
  }

  if (done) {
    return (
      <PageShell>
        <div className="max-w-sm text-center">
          <h1 className="text-2xl font-semibold text-[#3f3450]">Presença registrada!</h1>
          <p className="mt-3 text-[#6b5d80]">Obrigado por confirmar. Vejo você no grande dia 💜</p>

          {giftsEnabled(event) && (
            <Link
              to={`/${eventSlug}/${guestSlug}/presentes`}
              className="mt-8 block w-full rounded-full border border-brand-primary-soft px-8 py-4 font-semibold text-brand-primary transition hover:bg-brand-primary-soft"
            >
              Não sabe o que dar de presente?
            </Link>
          )}

          {event.is_demo && (
            <>
              <Link
                to={`/${eventSlug}/${guestSlug}`}
                className="mt-4 block text-center text-sm text-brand-primary underline"
              >
                Voltar ao convite
              </Link>
              <DemoCta eventType={event.event_type} />
            </>
          )}
        </div>
      </PageShell>
    )
  }

  if (!data) return null

  const greeting = data.has_dependents
    ? `${data.titular.name}, confirme a presença de vocês`
    : `${data.titular.name}, confirme a sua presença`

  return (
    <PageShell>
      <div className="w-full max-w-md">
        <InviteDetails compact />
        <p className="mt-10 text-center text-xl font-medium text-[#3f3450]">{greeting}</p>

        <div className="mt-8 space-y-3">
          {data.members.map((member) => (
            <Checkbox
              key={member.id}
              label={member.name}
              checked={checked[member.id] ?? false}
              onChange={(value) => setChecked((prev) => ({ ...prev, [member.id]: value }))}
            />
          ))}
        </div>

        {error && <p className="mt-4 text-center text-sm text-rose-600">{error}</p>}

        <button
          type="button"
          disabled={saving}
          onClick={handleSubmit}
          className="cursor-pointer mt-8 w-full rounded-full bg-brand-primary px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-brand-primary-soft transition hover:bg-brand-primary-hover disabled:opacity-60"
        >
          {saving ? 'Enviando...' : 'Confirmar presença'}
        </button>

        <Link to={`/${eventSlug}/${guestSlug}`} className="mt-4 block text-center text-sm text-brand-primary underline">
          Voltar ao convite
        </Link>
      </div>
    </PageShell>
  )
}
