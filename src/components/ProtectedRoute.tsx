import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user || !isAdmin) return <Navigate to="/admin/login" replace />
  return <>{children}</>
}
