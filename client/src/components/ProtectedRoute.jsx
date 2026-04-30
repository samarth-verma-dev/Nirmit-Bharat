import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from './LoadingSpinner'

export const ProtectedRoute = ({ children, allowedRole }) => {
  const { user, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="center-screen" style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner text="Authenticating..." />
      </div>
    )
  }

  if (!user) {
    // Redirect to login but save the current location
    return <Navigate to="/auth" state={{ from: location }} replace />
  }

  if (allowedRole && role !== allowedRole) {
    // Role mismatch - redirect to appropriate dashboard
    const target = role === 'admin' ? '/admin' : '/dashboard'
    return <Navigate to={target} replace />
  }

  return children
}
