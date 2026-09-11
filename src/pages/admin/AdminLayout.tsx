import { useEffect, useState } from 'react'
import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { api, ApiError } from '../../lib/api'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { AdminEventContext } from '../../lib/adminEventContext'
import { AccessExpired } from '../../components/AccessExpired'
import type { AdminEvent } from '../../types'

export default function AdminLayout() {
  const { session, logout } = useAdminAuth()
  const [event, setEvent] = useState<AdminEvent | null>(null)
  const [expired, setExpired] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session || session.admin.event_id === null) return
    let active = true

    const load = () => {
      setLoading(true)
      api
        .get<{ event: AdminEvent }>('/admin/event', session.token)
        .then((res) => {
          if (active) setEvent(res.event)
        })
        .catch((err) => {
          if (active && err instanceof ApiError && err.code === 'access_expired') {
            setExpired(true)
          }
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }

    load()
    return () => {
      active = false
    }
  }, [session])

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  // Sessão de super-admin caiu numa rota de evento por engano — manda pro lugar certo.
  if (session.admin.event_id === null) {
    return <Navigate to="/super" replace />
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-primary text-white' : 'text-[#3f3450] hover:bg-brand-primary-soft'
    }`

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-brand-primary-soft bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <p className="text-sm text-[#8b7a9c]">Olá, {session.admin.name}</p>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/admin/presencas" className={linkClass}>
              Presenças
            </NavLink>
            <NavLink to="/admin/pessoas" className={linkClass}>
              Pessoas
            </NavLink>
            <NavLink to="/admin/presentes" className={linkClass}>
              Presentes
            </NavLink>
            <NavLink to="/admin/configuracoes" className={linkClass}>
              Configurações
            </NavLink>
          </nav>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer text-sm font-medium text-brand-primary underline underline-offset-4"
          >
            Sair
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {loading ? (
          <p className="text-[#6b5d80]">Carregando...</p>
        ) : expired ? (
          <AccessExpired />
        ) : event ? (
          <AdminEventContext.Provider value={event}>
            <Outlet />
          </AdminEventContext.Provider>
        ) : (
          <p className="text-[#6b5d80]">Não foi possível carregar os dados do evento.</p>
        )}
      </main>
    </div>
  )
}
