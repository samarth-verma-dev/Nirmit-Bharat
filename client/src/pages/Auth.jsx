import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from '../context/AuthContext'
import { motion, AnimatePresence } from 'framer-motion'

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
      } else {
        // Admin → go to admin dashboard
        navigate('/admin', { replace: true })
      }
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
      <motion.div 
        className="screen active" 
        style={{ alignItems: 'center', justifyContent: 'center' }}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        <div className="bg-grid" />
        <div className="login-wrap" style={{ maxWidth: 440 }}>
          <div className="logo-mark" style={{ marginBottom: 32, justifyContent: 'center' }}>
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="8" fill="var(--primary)" />
              <path d="M10 23l5-8 4 6 3-4 4 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>ReviewAI</span>
          </div>

          <div className="card login-card" style={{ padding: '36px 32px' }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.02em' }}>Join Workspace</h1>
              <p style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>Enter your details to access company insights.</p>
            </div>

            <div className="field-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Jane Doe"
                onChange={() => {}} 
              />
            </div>

            <div className="field-group">
              <label>Work Email</label>
              <input
                type="email"
                placeholder="jane@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="field-group" style={{ marginBottom: 24 }}>
              <label>Referral / Invite Code</label>
              <input
                type="text"
                placeholder="e.g. REVIEW-AB12"
                value={companyCode}
                onChange={e => setCompanyCode(e.target.value)}
                style={{ textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}
                onKeyDown={e => e.key === 'Enter' && handleCodeSubmit()}
              />
            </div>

            {codeError && <div className="wiz-alert wiz-alert--error">⚠ {codeError}</div>}

            <button 
              className="btn btn-primary btn-full" 
              onClick={handleCodeSubmit}
              disabled={!companyCode.trim() || codeLoading}
            >
              {codeLoading ? <span className="loader" /> : 'Continue to Login →'}
            </button>
            
            <p className="hint-link" style={{ marginTop: 16 }}>
              <a href="#" onClick={e => { e.preventDefault(); navigate('/') }}>← Back to role selection</a>
            </p>
          </div>
          <p className="footer-note">© 2026 ReviewAI Inc. · Privacy · Terms</p>
        </div>
      </motion.div>
    )
  }

  // ── MAIN AUTH SCREEN ─────────────────────────────────────────────────────
  return (
    <motion.div 
      className="screen active" 
      style={{ alignItems: 'center', justifyContent: 'center' }}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <div className="bg-grid" />
      <div className="login-wrap" style={{ maxWidth: 440 }}>

        <div className="logo-mark" style={{ marginBottom: 32, justifyContent: 'center' }}>
          <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="var(--primary)" />
            <path d="M10 23l5-8 4 6 3-4 4 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)' }}>ReviewAI</span>
        </div>

        <div className="card login-card" style={{ padding: '36px 32px' }}>
          {/* Role badge */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 600, padding: '4px 12px', borderRadius: 20, ...roleBadgeStyle }}>
              {roleLabel} Portal
            </span>
            <button
              onClick={() => navigate('/')}
              style={{ fontSize: '0.78rem', color: 'var(--text2)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, transition: 'color 0.2s' }}
              onMouseEnter={e => e.target.style.color = 'var(--text)'}
              onMouseLeave={e => e.target.style.color = 'var(--text2)'}
            >
              — Change role
            </button>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 8, color: 'var(--text)', letterSpacing: '-0.02em' }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p style={{ color: 'var(--text2)', fontSize: '0.95rem' }}>
              {isLogin ? `Sign in to your ${roleLabel} portal` : 'Get started with ReviewAI today'}
            </p>
          </div>

          {/* Tabs */}
          <div className="auth-tabs" style={{ display: 'flex', background: 'var(--surface2)', padding: 4, borderRadius: 'var(--radius-sm)', marginBottom: 24, border: 'none' }}>
            <button 
              className={`auth-tab ${isLogin ? 'active' : ''}`} 
              onClick={() => switchMode('login')}
              style={{ flex: 1, padding: '8px 0', border: 'none', background: isLogin ? 'var(--surface)' : 'transparent', borderRadius: 'var(--radius-sm)', fontWeight: 600, color: isLogin ? 'var(--text)' : 'var(--text2)', boxShadow: isLogin ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Login
            </button>
            <button 
              className={`auth-tab ${!isLogin ? 'active' : ''}`} 
              onClick={() => switchMode('signup')}
              style={{ flex: 1, padding: '8px 0', border: 'none', background: !isLogin ? 'var(--surface)' : 'transparent', borderRadius: 'var(--radius-sm)', fontWeight: 600, color: !isLogin ? 'var(--text)' : 'var(--text2)', boxShadow: !isLogin ? 'var(--shadow-sm)' : 'none', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              Sign Up
            </button>
          </div>

          <div className="field-group">
            <label>Email address</label>
            <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>

          <div className="field-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          {!isLogin && (
            <div className="field-group">
              <label>Confirm Password</label>
              <input type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              {confirmPassword && password !== confirmPassword && (
                <span style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: 2 }}>Passwords do not match</span>
              )}
            </div>
          )}

          {error && <div className="wiz-alert wiz-alert--error" style={{ marginTop: 16 }}>⚠ {error}</div>}
          {successMsg && <div className="wiz-alert wiz-alert--success" style={{ marginTop: 16 }}>✓ {successMsg}</div>}

          <button className="btn btn-primary btn-full" disabled={!isValid() || loading} onClick={handleSubmit} style={{ marginTop: 16 }}>
            {loading ? <span className="loader" /> : isLogin ? 'Login' : 'Sign Up'}
          </button>

          {isEmployee && !isLogin && !validatedCompanyId && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 12, textAlign: 'center' }}>
              Note: You need a valid invite to join a workspace.
            </p>
          )}

        </div>

        <p className="footer-note" style={{ textAlign: 'center' }}>© 2026 ReviewAI Inc. · Privacy · Terms</p>
      </div>
    </motion.div>
  )
}