import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'
import './auth-modern.css'
export default function Auth() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, role, loading: authLoading } = useAuth()
  const roleFromState = location.state?.role ?? 'admin'

  // ── ALL STATE DECLARED FIRST (before any useEffect that references them) ──
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  // Employee: invite step state
  const [step, setStep] = useState(roleFromState === 'employee' ? 'invite' : 'auth')
  const [inviteEmail, setInviteEmail] = useState(location.state?.prefillEmail ?? '')
  const [companyCode, setCompanyCode] = useState(location.state?.prefillCode ?? '')
  const [codeLoading, setCodeLoading] = useState(false)
  const [codeError, setCodeError] = useState('')
  const [validatedCompanyId, setValidatedCompanyId] = useState(null)
  const [validatedInviteId, setValidatedInviteId] = useState(null)
  const [joinSuccess, setJoinSuccess] = useState(false)

  // ── REDIRECT ALREADY-AUTHENTICATED USERS ─────────────────────────────────
  // EXCEPTION: If an employee is mid-invite-validation, do NOT redirect yet.
  useEffect(() => {
    if (!authLoading && user && role) {
      if (role === 'employee' && step === 'invite') return
      const target = role === 'admin' ? '/admin' : '/dashboard'
      navigate(target, { replace: true })
    }
  }, [user, role, authLoading, navigate, step])

  const isLogin = authMode === 'login'
  const isEmployee = roleFromState === 'employee'

  const isValid = () => {
    if (!email.includes('@') || password.length < 6) return false
    if (!isLogin && password !== confirmPassword) return false
    return true
  }

  const switchMode = (mode) => {
    setAuthMode(mode)
    setError(null)
    setSuccessMsg(null)
  }

  // ── POST-AUTH: route employee or admin correctly ──────────────────────────
  const handlePostAuth = async (user) => {
    try {
      if (isEmployee && validatedCompanyId) {
        // Check if already a member to avoid duplicate inserts
        const { data: existing } = await supabase
          .from('employees')
          .select('id')
          .eq('user_id', user.id)
          .eq('company_id', validatedCompanyId)
          .maybeSingle()

        if (!existing) {
          const { error: insertErr } = await supabase.from('employees').insert({
            user_id: user.id,
            company_id: validatedCompanyId,
            role: 'employee'
          })
          if (insertErr) {
            setError(insertErr.message)
            return
          }
        }

        // Mark the invite as used
        if (validatedInviteId) {
          await supabase
            .from('invites')
            .update({ status: 'used' })
            .eq('id', validatedInviteId)
        }

        setJoinSuccess(true)
        setTimeout(() => navigate('/dashboard', { replace: true }), 1800)
      }
      // If not handling an invite link, do nothing here.
      // The useEffect listening to 'role' will automatically route the user
      // to the correct dashboard once AuthContext resolves their role from the DB.
    } catch (e) {
      console.error('Post auth error:', e)
      setError('An error occurred while completing authentication.')
    }
  }

  // ── MAIN SUBMIT (login + signup) ─────────────────────────────────────────
  const handleSubmit = async () => {
    if (!isValid() || loading) return
    setError(null)
    setSuccessMsg(null)
    setLoading(true)

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        if (!data?.user) throw new Error('No user returned from login')
        // Route correctly: employees link workspace, admins go to /admin
        await handlePostAuth(data.user)
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        // For new signups that are employees with a validated invite, link immediately
        if (data?.user && isEmployee && validatedCompanyId) {
          await handlePostAuth(data.user)
        } else {
          setSuccessMsg('Account created! Please log in.')
          setAuthMode('login')
        }
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  // ── INVITE CODE VALIDATION ────────────────────────────────────────────────
  const handleCodeSubmit = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { setCodeError('Please enter a valid email address.'); return }
    if (!companyCode.trim()) { setCodeError('Please enter your invite code.'); return }
    setCodeLoading(true)
    setCodeError('')

    try {
      // Look up invite by code + email
      const { data: inviteList, error: lookupErr } = await supabase
        .from('invites')
        .select('id, company_id, expires_at, status')
        .eq('invite_code', companyCode.trim().toUpperCase())
        .eq('email', inviteEmail.trim().toLowerCase())

      if (lookupErr) {
        setCodeError(`Invalid invite. DB Error: ${lookupErr.message}`)
        return
      }

      if (!inviteList || inviteList.length === 0) {
        setCodeError('Invalid invite. Make sure your email and code match the invite sent by your admin.')
        return
      }

      // If multiple exist (e.g. admin clicked send multiple times), prioritize pending ones
      const invite = inviteList.find(i => i.status === 'pending') || inviteList[0]

      if (invite.status === 'used') {
        setCodeError('This invite has already been used. Ask your admin for a new one.')
        return
      }

      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        setCodeError('This invite has expired. Ask your admin for a new one.')
        return
      }

      // Valid! Pre-fill email for login/signup step
      setEmail(inviteEmail.trim().toLowerCase())
      setValidatedCompanyId(invite.company_id)
      setValidatedInviteId(invite.id)
      setStep('auth')
    } catch (e) {
      console.error('Code submit error:', e)
      setCodeError('An error occurred while validating the invite.')
    } finally {
      setCodeLoading(false)
    }
  }

  const roleLabel = isEmployee ? 'Employee' : 'Admin'
  const roleBadgeStyle = isEmployee
    ? { background: 'var(--accent-glow)', color: 'var(--accent)', border: '1px solid rgba(164,106,61,0.25)' }
    : { background: 'var(--primary-glow)', color: 'var(--primary)', border: '1px solid rgba(31,77,59,0.2)' }

  // ── ANIMATION VARIANTS ────────────────────────────────────────────────────
  const pageVariants = {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, scale: 0.96, transition: { duration: 0.3, ease: 'easeIn' } }
  }

  // ── JOIN SUCCESS OVERLAY ──────────────────────────────────────────────────
  if (joinSuccess) {
    return (
      <motion.div 
        className="center-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0.5 } }}
        exit={{ opacity: 0 }}
      >
        <div className="bg-grid" />
        <div className="success-ring">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="complete-title">You've joined the workspace!</h1>
        <p className="complete-sub">Redirecting to your dashboard…</p>
      </motion.div>
    )
  }

  // ── INVITE VALIDATION SCREEN ──────────────────────────────────────────────
  if (step === 'invite') {
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

        <motion.div 
          className="auth-card-main"
          initial="initial" animate="animate" exit="exit" variants={pageVariants}
        >
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 className="auth-title">Join Your Team Workspace</h1>
            <p className="auth-subtitle">Get access to your company’s insights using the referral code provided by your admin</p>
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Full Name</label>
            <p style={{fontSize: '0.75rem', color: '#6B7280', marginBottom: 4}}>Enter your full name as used in your organization</p>
            <input
              className="auth-input"
              type="text"
              placeholder="Jane Doe"
              onChange={() => {}} 
            />
          </div>

          <div className="auth-input-group">
            <label className="auth-label">Work Email</label>
            <input
              className="auth-input"
              type="email"
              placeholder="jane@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
            />
          </div>

          <div className="auth-input-group" style={{ marginBottom: 24 }}>
            <label className="auth-label">Referral / Invite Code</label>
            <p style={{fontSize: '0.75rem', color: '#6B7280', marginBottom: 4}}>Enter the code shared by your admin</p>
            <input
              className="auth-input"
              type="text"
              placeholder="e.g. REVIEW-AB12"
              value={companyCode}
              onChange={e => setCompanyCode(e.target.value)}
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
              onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
            />
          </div>

          {codeError && <div className="auth-error">⚠ {codeError.includes('Invalid invite') ? 'Invalid referral code. Please check with your admin and try again.' : codeError}</div>}

          <button 
            className="auth-button" 
            onClick={handleCodeSubmit}
            disabled={!companyCode.trim() || codeLoading}
          >
            {codeLoading ? <span className="loader" /> : 'Access Workspace'}
          </button>
          
          <p className="auth-trust-microcopy" style={{ marginTop: 24 }}>
            Your access is securely managed by your organization
          </p>
          
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <a href="#" onClick={e => { e.preventDefault(); navigate('/') }} style={{ color: '#6B7280', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>← Back to role selection</a>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── MAIN AUTH SCREEN ─────────────────────────────────────────────────────
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

      <motion.div 
        className="auth-card-main"
        initial="initial" animate="animate" exit="exit" variants={pageVariants}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 className="auth-title">{isLogin ? 'Welcome Back' : 'Create Your Account'}</h1>
          <p className="auth-subtitle">
            {isLogin 
              ? 'Continue where you left off and stay connected to your customer insights' 
              : 'Start turning customer feedback into clear, actionable insights'}
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#F9FAFB', padding: 6, borderRadius: 12, border: '1px solid #E5E7EB', marginBottom: 24 }}>
          <button 
            onClick={() => switchMode('login')}
            style={{ flex: 1, padding: '10px 0', border: 'none', background: isLogin ? '#FFFFFF' : 'transparent', borderRadius: 8, fontWeight: 600, color: isLogin ? '#111827' : '#6B7280', boxShadow: isLogin ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Login
          </button>
          <button 
            onClick={() => switchMode('signup')}
            style={{ flex: 1, padding: '10px 0', border: 'none', background: !isLogin ? '#FFFFFF' : 'transparent', borderRadius: 8, fontWeight: 600, color: !isLogin ? '#111827' : '#6B7280', boxShadow: !isLogin ? '0 2px 8px rgba(0,0,0,0.05)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            Sign Up
          </button>
        </div>

        <div className="auth-input-group">
          <label className="auth-label">Email address</label>
          <input className="auth-input" type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="auth-input-group">
          <label className="auth-label">Password</label>
          <input className="auth-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
        </div>

        {!isLogin && (
          <div className="auth-input-group">
            <label className="auth-label">Confirm Password</label>
            <input className="auth-input" type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            {confirmPassword && password !== confirmPassword && (
              <span style={{ fontSize: '0.8rem', color: '#991B1B', marginTop: 4, display: 'block' }}>Passwords do not match</span>
            )}
          </div>
        )}

        {error && <div className="auth-error">⚠ Something doesn’t look right. Please check your details and try again.</div>}
        {successMsg && <div className="auth-error" style={{ background: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' }}>✓ {successMsg}</div>}

        <button className="auth-button" disabled={!isValid() || loading} onClick={handleSubmit} style={{ marginTop: 8 }}>
          {loading ? <span className="loader" /> : isLogin ? 'Access Dashboard' : 'Create Account'}
        </button>

        <p className="auth-trust-microcopy">
          Your data is secure and encrypted • No credit card required • Setup takes less than 2 minutes
        </p>

        {isEmployee && !isLogin && !validatedCompanyId && (
          <p style={{ fontSize: '0.8rem', color: '#8A3C38', marginTop: 16, textAlign: 'center', fontWeight: 600 }}>
            Note: You need a valid invite to join a workspace.
          </p>
        )}
      </motion.div>
    </div>
  )
}