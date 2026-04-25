import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const AdminIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 9h18M9 21V9" />
  </svg>
)

const EmployeeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const roles = [
  {
    id: 'admin',
    icon: <AdminIcon />,
    title: 'Admin',
    description: 'Manage your business and data',
  },
  {
    id: 'employee',
    icon: <EmployeeIcon />,
    title: 'Employee',
    description: 'Access company insights',
  },
]

export default function RoleSelect() {
  const navigate = useNavigate()
  const { user, role, loading } = useAuth()
  
  // stage: 'landing' or 'role'
  const [stage, setStage] = useState('landing')
  const [hoveredRole, setHoveredRole] = useState(null)
  const [selectedRole, setSelectedRole] = useState(null)

  useEffect(() => {
    if (!loading && user && role) {
      const target = role === 'admin' ? '/admin' : '/dashboard'
      navigate(target, { replace: true })
    }
  }, [user, role, loading, navigate])

  const handleSelect = (roleId) => {
    setSelectedRole(roleId)
    setTimeout(() => {
      navigate('/auth', { state: { role: roleId } })
    }, 180)
  }

  return (
    <div className="screen active" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div className="bg-grid" />

      <div className="role-wrap" style={{ maxWidth: 500, width: '100%' }}>
        {/* Logo */}
        <div className="logo-mark" style={{ marginBottom: stage === 'landing' ? 24 : 40, justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="var(--primary)" />
            <path d="M10 23l5-8 4 6 3-4 4 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)' }}>ReviewAI</span>
        </div>

        {stage === 'landing' ? (
          <div style={{ textAlign: 'center', animation: 'fadeUp 0.3s ease' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: 16, lineHeight: 1.1 }}>
              Turn Customer Reviews Into Actionable Insights
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: '1.05rem', marginBottom: 40, lineHeight: 1.5, padding: '0 20px' }}>
              The modern platform for collecting, analyzing, and responding to customer feedback using AI.
            </p>
            <button 
              className="btn btn-primary btn-lg" 
              style={{ width: '100%', maxWidth: 300, borderRadius: 'var(--radius)' }}
              onClick={() => setStage('role')}
            >
              Get Started <span className="arrow">→</span>
            </button>
          </div>
        ) : (
          <div style={{ animation: 'fadeUp 0.3s ease', width: '100%' }}>
            {/* Heading */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text)', marginBottom: 8 }}>
                Welcome to ReviewAI
              </h1>
              <p style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>
                Select your role to continue
              </p>
            </div>

            {/* Role Cards */}
            <div className="role-cards" style={{ width: '100%' }}>
              {roles.map((role) => {
                const isHovered = hoveredRole === role.id
                const isSelected = selectedRole === role.id

                return (
                  <button
                    key={role.id}
                    className={`role-card${isHovered ? ' role-card--hover' : ''}${isSelected ? ' role-card--selected' : ''}`}
                    onClick={() => handleSelect(role.id)}
                    onMouseEnter={() => setHoveredRole(role.id)}
                    onMouseLeave={() => setHoveredRole(null)}
                    style={{
                      background: 'var(--surface)',
                      borderColor: isHovered || isSelected ? 'var(--primary)' : 'var(--border)',
                      boxShadow: isHovered ? 'var(--shadow)' : 'var(--shadow-sm)',
                    }}
                  >
                    <div style={{ 
                      width: 48, height: 48, borderRadius: 'var(--radius-sm)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isHovered || isSelected ? 'var(--primary-glow)' : 'var(--surface2)',
                      color: isHovered || isSelected ? 'var(--primary)' : 'var(--text2)',
                      transition: 'all 0.2s ease'
                    }}>
                      {role.icon}
                    </div>
                    <div className="role-card__body" style={{ textAlign: 'left', flex: 1, paddingLeft: 16 }}>
                      <div className="role-card__title" style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>
                        {role.title}
                      </div>
                      <div className="role-card__desc" style={{ fontSize: '0.85rem', color: 'var(--text2)' }}>
                        {role.description}
                      </div>
                    </div>
                    <div className="role-card__arrow" style={{ color: isHovered ? 'var(--primary)' : 'var(--border)' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </button>
                )
              })}
            </div>
            
            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button className="btn btn-ghost" onClick={() => setStage('landing')} style={{ fontSize: '0.85rem' }}>
                ← Back
              </button>
            </div>
          </div>
        )}

        <p className="footer-note" style={{ marginTop: 40, textAlign: 'center' }}>
          © 2026 ReviewAI Inc. · Privacy · Terms
        </p>
      </div>
    </div>
  )
}
