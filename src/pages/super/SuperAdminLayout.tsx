import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../lib/adminAuthContext'

export default function SuperAdminLayout() {
  const { session, logout } = useAdminAuth()

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  // Sessão de admin de evento caiu numa rota de super-admin por engano.
  if (session.admin.event_id !== null) {
    return <Navigate to="/admin" replace />
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive ? 'bg-brand-primary text-white' : 'text-[#3f3450] hover:bg-brand-primary-soft'
    }`

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-brand-primary-soft bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <p className="text-sm text-[#8b7a9c]">Olá, {session.admin.name} (super-admin)</p>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/super/eventos" className={linkClass}>
              Eventos
            </NavLink>
            <NavLink to="/super/presentes-sugeridos" className={linkClass}>
              Presentes sugeridos
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
        <Outlet />
      </main>
    </div>
  )
}
