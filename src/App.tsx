import { Routes, Route } from 'react-router-dom'
import { CheckIn } from './pages/CheckIn'
import { AdminLogin } from './pages/AdminLogin'
import { AdminDashboard } from './pages/AdminDashboard'
import { EventDetail } from './pages/EventDetail'
import { CreateEvent } from './pages/CreateEvent'
import { ProtectedRoute } from './components/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<CheckIn />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/create" element={<ProtectedRoute><CreateEvent /></ProtectedRoute>} />
      <Route path="/admin/events/:eventId" element={<ProtectedRoute><EventDetail /></ProtectedRoute>} />
    </Routes>
  )
}
