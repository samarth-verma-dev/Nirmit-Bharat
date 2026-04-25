import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const roles = [
  {
    id: 'admin',
    icon: '⚙️',
    title: 'Admin',
    description: 'Configure integrations and manage review analysis',
    gradient: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
    glowColor: 'var(--primary-glow)',
  },
  {
    id: 'employee',
    icon: '📊',
    title: 'Employee',
    description: 'View insights and respond to customer feedback',
    gradient: 'linear-gradient(135deg, var(--accent), #7B4F2E)',
    glowColor: 'var(--accent-glow)',
  },
]

export default function RoleSelect() {
  const navigate = useNavigate()
  const { user, role, loading } = useAuth()
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

      <div className="role-wrap">
        {/* Logo */}
        <div className="logo-mark" style={{ marginBottom: 40 }}>
          <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="10" fill="url(#lgRole)" />
            <path
              d="M10 23l5-8 4 6 3-4 4 6"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="lgRole" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="var(--primary)" />
                <stop offset="1" stopColor="var(--primary-dark)" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em' }}>ReviewAI</span>
        </div>

        {/* Heading */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--text)', marginBottom: 8 }}>
            Welcome to ReviewAI
          </h1>
          <p style={{ color: 'var(--text2)', fontSize: '1rem' }}>
            Select your role to continue
          </p>
        </div>

        {/* Role Cards */}
        <div className="role-cards">
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
                  '--role-glow': role.glowColor,
                  '--role-gradient': role.gradient,
                }}
              >
                <div className="role-card__icon-wrap" style={{ background: role.glowColor }}>
                  <span className="role-card__icon">{role.icon}</span>
                </div>
                <div className="role-card__body">
                  <div className="role-card__title">{role.title}</div>
                  <div className="role-card__desc">{role.description}</div>
                </div>
                <div className="role-card__arrow">→</div>
              </button>
            )
          })}
        </div>

        <p className="footer-note" style={{ marginTop: 40 }}>
          © 2026 ReviewAI Inc. · Privacy · Terms
        </p>
      </div>
    </div>
  )
}
