import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../lib/api'
import { Checkbox } from '../components/Checkbox'
import { PageShell } from '../components/PageShell'
import type { GuestInviteResponse } from '../types'

export default function GuestConfirm() {
  const { slug = '' } = useParams()
  const [data, setData] = useState<GuestInviteResponse | null>(null)
  const [checked, setChecked] = useState<Record<number, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let active = true
    api
      .get<GuestInviteResponse>(`/guests/${slug}`)
      .then((res) => {
        if (!active) return
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
  }, [slug])

  const handleSubmit = async () => {
    if (!data) return
    setSaving(true)
    setError(null)
    try {
      await api.post(`/guests/${slug}/confirm`, {
        items: data.members.map((m) => ({ id: m.id, confirmed: checked[m.id] ?? false })),
      })
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
        <p className="text-center text-xl font-medium text-[#3f3450]">{greeting}</p>

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
          className="cursor-pointer mt-8 w-full rounded-full bg-lilac-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-lilac-300 transition hover:bg-[#c298ff] disabled:opacity-60"
        >
          {saving ? 'Enviando...' : 'Confirmar presença'}
        </button>

        <Link to={`/${slug}`} className="mt-4 block text-center text-sm text-lilac-500 underline">
          Voltar ao convite
        </Link>
      </div>
    </PageShell>
  )
}
