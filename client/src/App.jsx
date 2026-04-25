import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import RoleSelect from './pages/RoleSelect'
import Auth from './pages/auth'
import Admin from './pages/admin/Admin'
import Dashboard from './pages/dashboard/Dashboard'
import Join from './pages/Join'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
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
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App