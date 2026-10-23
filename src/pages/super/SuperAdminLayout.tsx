import { Navigate, Outlet } from 'react-router-dom'
import { BadgeDollarSign, CalendarHeart, Gift, LayoutDashboard } from 'lucide-react'
import { useAdminAuth } from '../../lib/adminAuthContext'
import { PanelLayout, type PanelNavItem } from '../../components/panel/PanelLayout'

const NAV: PanelNavItem[] = [
  { to: '/super', label: 'Visão geral', icon: LayoutDashboard, end: true },
  { to: '/super/eventos', label: 'Eventos', icon: CalendarHeart },
  { to: '/super/presentes-sugeridos', label: 'Presentes sugeridos', icon: Gift },
  { to: '/super/precos', label: 'Preços e planos', icon: BadgeDollarSign },
]

export default function SuperAdminLayout() {
  const { session, logout } = useAdminAuth()

  if (!session) {
    return <Navigate to="/admin/login" replace />
  }

  // Sessão de admin de evento caiu numa rota de super-admin por engano.
  if (session.admin.event_id !== null) {
    return <Navigate to="/admin" replace />
  }

  return (
    <PanelLayout variant="super" nav={NAV} badge="Super" userName={session.admin.name} onLogout={logout}>
      <Outlet />
    </PanelLayout>
  )
}
