import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './landing.module.css'
import './auth-modern.css'

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
  
  const [stage, setStage] = useState('landing')

  useEffect(() => {
    if (!loading && user && role) {
      const target = role === 'admin' ? '/admin' : '/dashboard'
      navigate(target, { replace: true })
    }
  }, [user, role, loading, navigate])

  const handleSelect = (roleId) => {
    navigate('/auth', { state: { role: roleId } })
  }

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3, ease: 'easeIn' } }
  }

  return (
    <div className="modern-auth-container">
      <div className="modern-auth-left">
        <AnimatePresence mode="wait">
          {stage === 'role' ? (
            <motion.div 
              key="role"
              className="modern-auth-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: { duration: 0.4 } }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
            >
              <div className={styles.brandHeader} style={{ marginBottom: '2rem', justifyContent: 'center' }}>
                <div className={styles.logoIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <span className={styles.brandName} style={{ color: '#1A1A1A' }}>Analaysta</span>
              </div>

              <h1 style={{ textAlign: 'center', marginBottom: 8 }}>Welcome to Analaysta</h1>
              <p style={{ textAlign: 'center', marginBottom: 32 }}>Select your role to continue</p>

              <div style={{ width: '100%' }}>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    className="roleCard"
                    onClick={() => handleSelect(r.id)}
                  >
                    <div className="roleIconWrapper" style={{ width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(138, 60, 56, 0.08)', borderRadius: 12 }}>
                      {r.icon}
                    </div>
                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <div className={styles.roleCardTitle}>{r.title}</div>
                    <div className={styles.roleCardDesc}>{r.description}</div>
                  </div>
                  <div style={{ color: '#8A3C38' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </div>
                </button>
              ))}
              </div>

              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button 
                  onClick={() => setStage('landing')} 
                  style={{ background: 'transparent', border: 'none', color: '#666', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
                >
                  ← Back
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="landing"
              className="modern-auth-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
            >
              <div className={styles.brandHeader} style={{ marginBottom: 32 }}>
                <div className={styles.logoIcon} style={{ background: '#8A3C38' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  </svg>
                </div>
                <span className={styles.brandName} style={{ color: '#1A1A1A' }}>Analaysta</span>
              </div>

              <h1 style={{ fontSize: '2.5rem', lineHeight: 1.1, marginBottom: 16 }}>
                Turn Insights into Impactful Action with <span style={{ color: '#8A3C38' }}>Analaysta</span>
              </h1>
              <div style={{ width: 64, height: 4, background: '#8A3C38', borderRadius: 2, marginBottom: 24 }}></div>
              <p style={{ fontSize: '1.05rem', color: '#666', lineHeight: 1.6, marginBottom: 40 }}>
                The modern platform for collecting, analyzing, and responding to customer feedback using AI.
              </p>
              <button className="btn-primary" onClick={() => setStage('role')}>
                Get Started <span style={{ fontSize: '1.2em', lineHeight: 1 }}>→</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="modern-auth-right">
        <div className="modern-auth-grid-overlay"></div>
        <div className="modern-auth-noise"></div>
        <div className="modern-shapes-container">
          <div className="shape shape-polygon"></div>
          <div className="shape shape-starburst"></div>
          <div className="shape shape-circle"></div>
          <div className="shape shape-half-circle"></div>
          <div className="shape shape-stepped"></div>
        </div>
      </div>
    </div>
  )
}
