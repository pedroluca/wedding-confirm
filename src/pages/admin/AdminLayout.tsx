import { NavLink, Navigate, Outlet } from 'react-router-dom'
import { useAdminAuth } from '../../lib/adminAuthContext'

export default function AdminLayout() {
  const { session, logout } = useAdminAuth()

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-sm font-medium transition ${
      isActive ? 'bg-lilac-500 text-white' : 'text-[#3f3450] hover:bg-lilac-100'
    }`

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-lilac-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <p className="text-sm text-[#8b7a9c]">Olá, {session.admin.name}</p>
          <nav className="flex flex-wrap gap-2">
            <NavLink to="/admin/presencas" className={linkClass}>
              Presenças
            </NavLink>
            <NavLink to="/admin/pessoas" className={linkClass}>
              Pessoas
            </NavLink>
            <NavLink to="/admin/usuarios" className={linkClass}>
              Usuários
            </NavLink>
          </nav>
          <button
            type="button"
            onClick={logout}
            className="cursor-pointer text-sm font-medium text-lilac-500 underline underline-offset-4"
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
