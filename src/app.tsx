import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import EventLayout from './pages/EventLayout'
import EventHome from './pages/EventHome'
import GuestInvite from './pages/GuestInvite'
import GuestConfirm from './pages/GuestConfirm'
import GuestGifts from './pages/GuestGifts'
import NotFound from './pages/NotFound'
import AdminLogin from './pages/admin/AdminLogin'
import ForgotPassword from './pages/admin/ForgotPassword'
import ResetPassword from './pages/admin/ResetPassword'
import AdminLayout from './pages/admin/AdminLayout'
import AdminConfirmations from './pages/admin/AdminConfirmations'
import AdminGuests from './pages/admin/AdminGuests'
import AdminGifts from './pages/admin/AdminGifts'
import AdminSettings from './pages/admin/AdminSettings'
import SuperAdminLayout from './pages/super/SuperAdminLayout'
import SuperEventList from './pages/super/SuperEventList'
import SuperEventCreate from './pages/super/SuperEventCreate'
import SuperEventEdit from './pages/super/SuperEventEdit'
import SuperEventAdmins from './pages/super/SuperEventAdmins'
import SuperGiftTemplates from './pages/super/SuperGiftTemplates'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin/reset-password" element={<ResetPassword />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="presencas" replace />} />
        <Route path="presencas" element={<AdminConfirmations />} />
        <Route path="pessoas" element={<AdminGuests />} />
        <Route path="presentes" element={<AdminGifts />} />
        <Route path="configuracoes" element={<AdminSettings />} />
      </Route>

      <Route path="/super" element={<SuperAdminLayout />}>
        <Route index element={<Navigate to="eventos" replace />} />
        <Route path="eventos" element={<SuperEventList />} />
        <Route path="eventos/novo" element={<SuperEventCreate />} />
        <Route path="eventos/:eventId" element={<SuperEventEdit />} />
        <Route path="eventos/:eventId/admins" element={<SuperEventAdmins />} />
        <Route path="presentes-sugeridos" element={<SuperGiftTemplates />} />
      </Route>

      <Route path="/:eventSlug" element={<EventLayout />}>
        <Route index element={<EventHome />} />
        <Route path=":guestSlug" element={<GuestInvite />} />
        <Route path=":guestSlug/confirmar" element={<GuestConfirm />} />
        <Route path=":guestSlug/presentes" element={<GuestGifts />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default App
