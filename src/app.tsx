import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import Home from './pages/Home'
import EventLayout from './pages/EventLayout'
import EventHome from './pages/EventHome'
import GuestInvite from './pages/GuestInvite'
import GuestConfirm from './pages/GuestConfirm'
import GuestGifts from './pages/GuestGifts'
import NotFound from './pages/NotFound'
import OrderCreate from './pages/OrderCreate'
import OrderStatus from './pages/OrderStatus'
import AdminLogin from './pages/admin/AdminLogin'
import ForgotPassword from './pages/admin/ForgotPassword'
import ResetPassword from './pages/admin/ResetPassword'
import AdminLayout from './pages/admin/AdminLayout'
import AdminEventPicker from './pages/admin/AdminEventPicker'
import AdminConfirmations from './pages/admin/AdminConfirmations'
import AdminGuests from './pages/admin/AdminGuests'
import AdminGifts from './pages/admin/AdminGifts'
import AdminSettings from './pages/admin/AdminSettings'
import SuperAdminLayout from './pages/super/SuperAdminLayout'
import SuperDashboard from './pages/super/SuperDashboard'
import SuperEventList from './pages/super/SuperEventList'
import SuperEventCreate from './pages/super/SuperEventCreate'
import SuperEventDetail from './pages/super/SuperEventDetail'
import SuperOrderDetail from './pages/super/SuperOrderDetail'
import SuperOrderList from './pages/super/SuperOrderList'
import SuperGiftTemplates from './pages/super/SuperGiftTemplates'
import SuperPricing from './pages/super/SuperPricing'

// Endereço antigo da tela de admins do evento, hoje uma aba da página do evento.
function EventAdminsRedirect() {
  const { eventId = '' } = useParams()
  return <Navigate to={`/super/eventos/${eventId}?aba=admins`} replace />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      {/* contratar e pedido são reservados na API: nenhum evento ganha esses endereços (Slug.php) */}
      <Route path="/contratar" element={<OrderCreate />} />
      <Route path="/pedido/:publicId" element={<OrderStatus />} />

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/forgot-password" element={<ForgotPassword />} />
      <Route path="/admin/reset-password" element={<ResetPassword />} />
      <Route path="/admin/eventos" element={<AdminEventPicker />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="presencas" replace />} />
        <Route path="presencas" element={<AdminConfirmations />} />
        <Route path="pessoas" element={<AdminGuests />} />
        <Route path="presentes" element={<AdminGifts />} />
        <Route path="configuracoes" element={<AdminSettings />} />
      </Route>

      <Route path="/super" element={<SuperAdminLayout />}>
        <Route index element={<SuperDashboard />} />
        <Route path="eventos" element={<SuperEventList />} />
        <Route path="eventos/novo" element={<SuperEventCreate />} />
        <Route path="eventos/:eventId" element={<SuperEventDetail />} />
        <Route path="eventos/:eventId/admins" element={<EventAdminsRedirect />} />
        <Route path="pedidos" element={<SuperOrderList />} />
        <Route path="pedidos/:orderId" element={<SuperOrderDetail />} />
        <Route path="presentes-sugeridos" element={<SuperGiftTemplates />} />
        <Route path="precos" element={<SuperPricing />} />
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
