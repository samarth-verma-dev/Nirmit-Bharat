import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import RoleSelect from './pages/RoleSelect'
import Auth from './pages/Auth'
import Admin from './pages/admin/Admin'
import Dashboard from './pages/dashboard/Dashboard'
import Join from './pages/Join'
import './App.css'

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/join" element={<Join />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <Admin />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRole="employee">
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App