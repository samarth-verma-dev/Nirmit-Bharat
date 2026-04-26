import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import styles from './landing.module.css'
import './auth-modern.css'
import Logo from '../components/Logo'

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
    description: 'Set up data sources, manage your team, and unlock powerful insights across your entire business.',
    micro: 'Full control • Data integrations • Team management'
  },
  {
    id: 'employee',
    icon: <EmployeeIcon />,
    title: 'Employee',
    description: 'Access your company’s insights and collaborate on improving customer experience.',
    micro: 'Secure access • Real-time insights • Team collaboration'
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

  return (
    <div className="modern-auth-container">
      {/* SVG filter for the noise effect */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <filter id="noiseFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/>
        </filter>
      </svg>
      <div className="noise-overlay" style={{ filter: 'url(#noiseFilter)' }}></div>
      
      <div className="shape shape-polygon"></div>
      <div className="shape shape-starburst"></div>
      <div className="shape shape-circle"></div>
      <div className="shape shape-half-circle"></div>
      <div className="shape shape-stair"></div>

      <AnimatePresence mode="wait">
        {stage === 'role' ? (
          <motion.div 
            key="role"
            className="auth-card-main"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.4 } }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.3 } }}
          >
            <div className={styles.brandHeader} style={{ marginBottom: '2rem', justifyContent: 'center' }}>
              <Logo width={84} height={84} />
            </div>

            <h1 className="auth-title" style={{ textAlign: 'center' }}>Choose how you want to get started</h1>
            <p className="auth-subtitle" style={{ textAlign: 'center' }}>We’ll tailor your experience based on your role</p>

            <div style={{ width: '100%' }}>
              {roles.map((r) => (
                <button
                  key={r.id}
                  className="role-card"
                  onClick={() => handleSelect(r.id)}
                  style={{ width: '100%', textAlign: 'left', background: 'white' }}
                >
                  <div className="role-card-content">
                    <div className="role-icon">
                      {r.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="role-title">{r.title}</div>
                      <div className="role-desc">{r.description}</div>
                      <div className="role-micro">{r.micro}</div>
                    </div>
                    <div style={{ color: '#8A3C38', alignSelf: 'center' }}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <p className="auth-trust-microcopy">You can switch roles or permissions anytime</p>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <button 
                onClick={() => setStage('landing')} 
                style={{ background: 'transparent', border: 'none', color: '#6B7280', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
              >
                ← Back
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="landing"
            className="auth-card-main"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5 } }}
            exit={{ opacity: 0, y: -20, transition: { duration: 0.3 } }}
          >
            <div className={styles.brandHeader} style={{ marginBottom: 32 }}>
              <Logo width={84} height={84} />
            </div>

            <h1 className="auth-title" style={{ fontSize: '2.4rem', lineHeight: 1.15, marginBottom: 16 }}>
              Turn Customer Reviews Into Revenue-Driving Insights
            </h1>
            <p className="auth-subtitle" style={{ fontSize: '1.05rem' }}>
              Unify feedback from every channel—social media, apps, and direct inputs—into one AI-powered platform that helps you understand customers, fix issues faster, and grow smarter.
            </p>
            
            <div style={{ marginBottom: 32 }}>
              <div className="landing-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Instantly understand how your customers feel—without manual analysis
              </div>
              <div className="landing-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Know what’s working. Fix what’s not.
              </div>
              <div className="landing-feature">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                Stop guessing. Start acting on real feedback.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 16, flexDirection: 'column', alignItems: 'center' }}>
              <button className="auth-button" onClick={() => setStage('role')}>
                Start Analyzing Reviews
              </button>
            </div>

            <p className="auth-trust-microcopy">
              No setup complexity • Works with your existing tools • Enterprise-grade security
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
