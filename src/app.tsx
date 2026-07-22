import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import GuestInvite from './pages/GuestInvite'
import GuestConfirm from './pages/GuestConfirm'
import NotFound from './pages/NotFound'
import AdminLogin from './pages/admin/AdminLogin'
import AdminLayout from './pages/admin/AdminLayout'
import AdminConfirmations from './pages/admin/AdminConfirmations'
import AdminGuests from './pages/admin/AdminGuests'
import AdminUsers from './pages/admin/AdminUsers'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="presencas" replace />} />
        <Route path="presencas" element={<AdminConfirmations />} />
        <Route path="pessoas" element={<AdminGuests />} />
        <Route path="usuarios" element={<AdminUsers />} />
      </Route>

      <Route path="/:slug" element={<GuestInvite />} />
      <Route path="/:slug/confirmar" element={<GuestConfirm />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
