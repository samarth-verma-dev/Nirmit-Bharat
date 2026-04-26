import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './landing.module.css'

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

  // ── ROLE SELECTION VIEW ────────────────────────────────────────────────
  if (stage === 'role') {
    return (
      <div className={styles.landingContainer}>
        <div className="bg-grid" />
        <div className={styles.roleSelectStage}>
          <div className={styles.brandHeader} style={{ marginBottom: '2rem', justifyContent: 'center' }}>
            <div className={styles.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <span className={styles.brandName}>Analaysta</span>
          </div>

          <h2 className={styles.roleTitle}>Welcome to Analaysta</h2>
          <p className={styles.roleSub}>Select your role to continue</p>

          <div style={{ width: '100%' }}>
            {roles.map((r) => (
              <button
                key={r.id}
                className={styles.roleCard}
                onClick={() => handleSelect(r.id)}
              >
                <div className={styles.roleIconWrapper}>
                  {r.icon}
                </div>
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div className={styles.roleCardTitle}>{r.title}</div>
                  <div className={styles.roleCardDesc}>{r.description}</div>
                </div>
                <div style={{ color: '#1F4D3A' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </button>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button 
              onClick={() => setStage('landing')} 
              style={{ background: 'transparent', border: 'none', color: '#1F4D3A', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem' }}
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── LANDING VIEW ──────────────────────────────────────────────────────
  return (
    <div className={styles.landingContainer}>
      <div className="bg-grid" />
      <div className={styles.layoutGrid}>
        {/* Left Column (Content) */}
        <div className={styles.leftCol}>
          <div className={styles.brandHeader}>
            <div className={styles.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
            </div>
            <span className={styles.brandName}>Analaysta</span>
          </div>

          <h1 className={styles.headline}>
            Turn Insights into Impactful Action with <span className={styles.headlineHighlight}>Analaysta</span>
          </h1>
          <div className={styles.decorativeStroke}></div>
          <p className={styles.subheadline}>
            The modern platform for collecting, analyzing, and responding to customer feedback using AI.
          </p>
          <button className={styles.ctaBtn} onClick={() => setStage('role')}>
            Get Started <span style={{ fontSize: '1.2em', lineHeight: 1 }}>→</span>
          </button>
        </div>

        {/* Right Column (Visuals) */}
        <div className={styles.rightCol}>
          <div className={styles.imageComposition}>
            <img src="/indian_large_business.png" alt="Large Business Owner" className={styles.baseImage1} />
            <img src="/indian_small_business.png" alt="Small Business Owner" className={styles.baseImage2} />

            {/* Static Glass Cards */}
            <div className={`${styles.glassCard} ${styles.cardAnalysis}`}>
              <div className={styles.cardAnalysisTitle}>Customer Review Analysis</div>
              <div className={styles.donutWrapper}>
                <div className={styles.donutCircle}>
                  <div className={styles.donutInner}>86%</div>
                </div>
                <div className={styles.sentimentPills}>
                  <div className={`${styles.pill} ${styles.pillGreen}`}>Positive</div>
                  <div className={`${styles.pill} ${styles.pillNeutral}`}>Neutral</div>
                  <div className={`${styles.pill} ${styles.pillRed}`}>Negative</div>
                </div>
              </div>
              <div className={styles.confidenceBadge}>
                <div className={styles.dot}></div> AI Confidence: High
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.cardInsights}`}>
              <div className={styles.cardAnalysisTitle}>Review Insights</div>
              <div className={styles.barRow}>
                <div className={styles.barLabels}><span>Quality</span><span>92%</span></div>
                <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '92%' }}></div></div>
              </div>
              <div className={styles.barRow}>
                <div className={styles.barLabels}><span>Delivery</span><span>78%</span></div>
                <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '78%' }}></div></div>
              </div>
              <div className={styles.barRow}>
                <div className={styles.barLabels}><span>Support</span><span>64%</span></div>
                <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '64%' }}></div></div>
              </div>
              <div className={styles.barRow}>
                <div className={styles.barLabels}><span>Pricing</span><span>42%</span></div>
                <div className={styles.barTrack}><div className={styles.barFill} style={{ width: '42%', background: '#E07A5F' }}></div></div>
              </div>
            </div>

            <div className={`${styles.glassCard} ${styles.cardRoi}`}>
              <div className={styles.cardAnalysisTitle}>ROI & Business Impact</div>
              <div className={styles.roiMetric}>
                <div className={styles.roiValue}>+32%</div>
                <div className={styles.roiLabel}>CSAT</div>
              </div>
              <div className={styles.roiMetric}>
                <div className={styles.roiValue}>+24%</div>
                <div className={styles.roiLabel}>Revenue</div>
              </div>
              <div className={styles.roiSub}>10,500+ Reviews Analyzed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
