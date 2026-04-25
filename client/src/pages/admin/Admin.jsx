import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'

const STEPS = [
  { num: 1, label: 'Create Company' },
  { num: 2, label: 'App Details' },
  { num: 3, label: 'Social Sources' },
  { num: 4, label: 'Configuration' },
  { num: 5, label: 'Review & Complete' }
]

const SOCIAL_PLATFORMS = ['Instagram', 'Twitter/X', 'Reddit', 'Facebook', 'YouTube', 'Other']
const TIMEFRAMES = ['Last 7 days', 'Last 30 days', 'Last 90 days']

const MOCK_APPS = [
  { name: 'Swiggy', package: 'in.swiggy.android', ios: 'id989540920', developer: 'Swiggy' },
  { name: 'Zomato', package: 'com.application.zomato', ios: 'id434612044', developer: 'Zomato Ltd' },
  { name: 'Nike', package: 'com.nike.omega', ios: 'id1095459556', developer: 'Nike, Inc.' },
  { name: 'Spotify', package: 'com.spotify.music', ios: 'id324684580', developer: 'Spotify Ltd.' },
  { name: 'Airbnb', package: 'com.airbnb.android', ios: 'id401626263', developer: 'Airbnb, Inc.' },
  { name: 'Slack', package: 'com.Slack', ios: 'id618783545', developer: 'Slack Technologies' },
]

const genInviteCode = () =>
  'REVIEW-' + Math.random().toString(36).substring(2, 6).toUpperCase()

export default function Admin() {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(1)
  const [isComplete, setIsComplete] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  // Per-step loading & error
  const [step1Loading, setStep1Loading] = useState(false)
  const [step1Error, setStep1Error] = useState('')
  const [step5Loading, setStep5Loading] = useState(false)
  const [step5Error, setStep5Error] = useState('')

  // New states for company management
  const [companies, setCompanies] = useState([])
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [showDashboard, setShowDashboard] = useState(false)
  const [loadingCompanies, setLoadingCompanies] = useState(true)

  // Invite email state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null) // { type: 'success'|'error', text }
  const [isCopied, setIsCopied] = useState(false)

  const [wizardData, setWizardData] = useState({
    companyName: '',
    companyId: null,
    inviteCode: '',
    appName: '',
    androidPackage: '',
    iosAppId: '',
    socialSources: [],
    timeframe: 'Last 30 days',
    alertsEnabled: false
  })

  // Social step local state
  const [socialPlatform, setSocialPlatform] = useState(SOCIAL_PLATFORMS[0])
  const [socialHandle, setSocialHandle] = useState('')
  const [socialError, setSocialError] = useState('')

  // App search state
  const [appSearchQuery, setAppSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [appSearchResults, setAppSearchResults] = useState([])
  const [appVerified, setAppVerified] = useState(false)
  const [packageError, setPackageError] = useState('')

  const handleUpdate = (key, value) =>
    setWizardData(prev => ({ ...prev, [key]: value }))

  const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, STEPS.length))
  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  // ── STEP 1: Save company to Supabase ───────────────────────────────────────
  const handleStep1Continue = async () => {
    setStep1Loading(true)
    setStep1Error('')
    const { data: { user } } = await supabase.auth.getUser()
    const code = genInviteCode()

    const { data, error } = await supabase
      .from('companies')
      .insert({ name: wizardData.companyName, created_by: user?.id, invite_code: code })
      .select()
      .single()

    if (error) {
      setStep1Error(error.message)
    } else {
      handleUpdate('companyId', data.id)
      handleUpdate('inviteCode', data.invite_code)
      // Add to companies list for multi-company support
      setCompanies(prev => [...prev, data])
      nextStep()
    }
    setStep1Loading(false)
  }

  // ── STEP 5: Save project to Supabase ──────────────────────────────────────
  const handleCompleteSetup = async () => {
    setStep5Loading(true)
    setStep5Error('')

    const { error } = await supabase.from('projects').insert({
      company_id: wizardData.companyId,
      app_name: wizardData.appName,
      android_package: wizardData.androidPackage,
      ios_app_id: wizardData.iosAppId,
      social_handles: wizardData.socialSources,
      timeframe: wizardData.timeframe,
      alerts_enabled: wizardData.alertsEnabled
    })

    if (error) {
      setStep5Error(error.message)
    } else {
      // Find the newly created company and go to dashboard
      const newCompany = companies.find(c => c.id === wizardData.companyId)
      if (newCompany) {
        setSelectedCompany(newCompany)
        localStorage.setItem('selectedCompanyId', newCompany.id)
      }
      setShowDashboard(true)
    }
    setStep5Loading(false)
  }

  // ── Invite via email ───────────────────────────────────────────────────────
  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteMsg({ type: 'error', text: 'Please enter a valid email address.' })
      return
    }
    setInviteLoading(true)
    setInviteMsg(null)

    const companyId = selectedCompany?.id ?? wizardData.companyId
    const inviteCode = selectedCompany?.invite_code ?? wizardData.inviteCode
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString() // 72h from now

    const { error } = await supabase.from('invites').insert({
      email: inviteEmail.trim().toLowerCase(),
      company_id: companyId,
      invite_code: inviteCode,
      status: 'pending',
      expires_at: expiresAt
    })

    if (error) {
      setInviteMsg({ type: 'error', text: error.message })
    } else {
      const joinLink = `${window.location.origin}/join?code=${inviteCode}&email=${encodeURIComponent(inviteEmail.trim().toLowerCase())}`
      setInviteMsg({
        type: 'success',
        text: `Invite created for ${inviteEmail}. Link: ${joinLink}`,
        link: joinLink
      })
      setInviteEmail('')
    }
    setInviteLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  const handleCopyCode = () => {
    const code = selectedCompany ? selectedCompany.invite_code : wizardData.inviteCode
    navigator.clipboard.writeText(code)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  const { user } = useAuth()

  // Fetch companies for the logged‑in admin
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('created_by', user.id)
        if (error) {
          console.error('Error fetching companies', error)
          return
        }
        setCompanies(data)
        if (data && data.length > 0) {
          const stored = localStorage.getItem('selectedCompanyId')
          const preselected = data.find(c => c.id === stored) || data[0]
          setSelectedCompany(preselected)
          setShowDashboard(true)
        }
      } catch (err) {
        console.error('Unexpected error fetching companies:', err)
      } finally {
        setLoadingCompanies(false)
      }
    }
    fetchCompanies()
  }, [user])

  const handleCompanySwitch = e => {
    const company = companies.find(c => c.id === e.target.value)
    setSelectedCompany(company)
    localStorage.setItem('selectedCompanyId', company.id)
  }

  const handleAddNewCompany = () => {
    // Reset wizard for a fresh company creation
    setShowDashboard(false)
    setCurrentStep(1)
    setWizardData({
      companyName: '',
      companyId: null,
      inviteCode: '',
      appName: '',
      androidPackage: '',
      iosAppId: '',
      socialSources: [],
      timeframe: 'Last 30 days',
      alertsEnabled: false
    })
  }


  const handleAppSearch = (val) => {
    setAppSearchQuery(val)
    handleUpdate('appName', val)
    setAppVerified(false)
    if (val.trim().length > 1) {
      setIsSearching(true)
      const matches = MOCK_APPS.filter(app => app.name.toLowerCase().includes(val.toLowerCase()))
      setAppSearchResults(matches)
    } else {
      setIsSearching(false)
      setAppSearchResults([])
    }
  }

  const handleSelectMockApp = (app) => {
    handleUpdate('appName', app.name)
    handleUpdate('androidPackage', app.package)
    handleUpdate('iosAppId', app.ios)
    setAppSearchQuery(app.name)
    setIsSearching(false)
    setAppVerified(true)
    setPackageError('')
  }

  const handleManualPackage = (val) => {
    handleUpdate('androidPackage', val)
    setAppVerified(false)
    const pkgRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i
    if (val.trim() && !pkgRegex.test(val)) {
      setPackageError('Invalid package format (e.g. com.example.app)')
    } else {
      setPackageError('')
    }
  }

  const addSocialSource = () => {
    const handle = socialHandle.trim()
    if (!handle) { setSocialError('Handle cannot be empty'); return }
    
    // Platform Validation
    if (socialPlatform === 'Instagram' && (!handle.startsWith('@') || handle.includes(' '))) {
      setSocialError('❌ Invalid format. Instagram handles must start with @ and have no spaces.')
      return
    }
    if (socialPlatform === 'Twitter/X' && !handle.startsWith('@')) {
      setSocialError('❌ Invalid format. Twitter/X handles must start with @.')
      return
    }
    if (socialPlatform === 'Reddit' && !handle.startsWith('r/') && !handle.startsWith('u/')) {
      setSocialError('❌ Invalid format. Reddit handles must start with r/ or u/.')
      return
    }

    setWizardData(prev => ({
      ...prev,
      socialSources: [...prev.socialSources, { platform: socialPlatform, handle, verified: true }]
    }))
    setSocialHandle('')
    setSocialError('')
  }
  const removeSocialSource = (idx) =>
    setWizardData(prev => ({ ...prev, socialSources: prev.socialSources.filter((_, i) => i !== idx) }))

  const pct = ((currentStep - 1) / (STEPS.length - 1)) * 100

  // ─────────────────────────────────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark" style={{ marginBottom: 0 }}>
          <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
            <rect width="36" height="36" rx="8" fill="url(#lgAdmin)" />
            <path d="M10 23l5-8 4 6 3-4 4 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="lgAdmin" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stopColor="#1F4D3B" />
                <stop offset="1" stopColor="#143528" />
              </linearGradient>
            </defs>
          </svg>
          <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>ReviewAI</span>
        </div>
      </div>

      <div className="step-nav">
        {STEPS.map(step => {
          let cls = ''
          if (step.num === currentStep) cls = 'active'
          else if (step.num < currentStep) cls = 'done'
          return (
            <div key={step.num} className={`nav-item ${cls}`}>
              <div className="nav-num">{step.num}</div>
              <div className="nav-label">{step.label}</div>
            </div>
          )
        })}
      </div>

      {currentStep > 1 && (
        <div className="sidebar-invite-box">
          <div className="sidebar-invite-title">Invite Team</div>
          <div className="sidebar-invite-code">{wizardData.inviteCode}</div>
          <div className="sidebar-invite-hint">Share this code with your team to join your workspace</div>
          
          <div className="share-btn-row">
            <a 
              href={`mailto:?subject=Join our workspace on ReviewAI&body=Hi, join our company workspace using this code: ${wizardData.inviteCode}`}
              className="share-btn share-btn--gmail"
              title="Share via Email"
            >
              ✉
            </a>
            <a 
              href={`https://wa.me/?text=Join our workspace on ReviewAI using code ${wizardData.inviteCode}`}
              target="_blank" 
              rel="noreferrer"
              className="share-btn share-btn--whatsapp"
              title="Share via WhatsApp"
            >
              ✆
            </a>
            <div style={{ position: 'relative' }}>
              <button 
                className="share-btn share-btn--copy" 
                onClick={handleCopyCode}
                title="Copy to Clipboard"
              >
                ⎘
              </button>
              {isCopied && <div className="copy-toast">Copied!</div>}
            </div>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="user-chip" style={{ cursor: 'pointer' }} onClick={handleLogout}>
          <div className="avatar">A</div>
          <div>
            <div className="uname">Admin</div>
            <div className="uemail">Sign Out</div>
          </div>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Create Company (saves to DB)
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className={`step-pane ${currentStep === 1 ? 'active' : ''}`}>
      <div className="card step-card">
        <div className="card-head">
          <div className="card-icon">🏢</div>
          <div>
            <h2>Create Company</h2>
            <p>Set up your organization. This will be saved immediately.</p>
          </div>
        </div>
        <div className="field-group">
          <label>Company Name <span className="req">*</span></label>
          <input
            type="text"
            placeholder="e.g. Acme Corp"
            value={wizardData.companyName}
            onChange={e => handleUpdate('companyName', e.target.value)}
            autoFocus
          />
        </div>
        {step1Error && <div className="wiz-alert wiz-alert--error">⚠ {step1Error}</div>}
        <div className="btn-row">
          <button
            className="btn btn-primary"
            disabled={!wizardData.companyName.trim() || step1Loading}
            onClick={handleStep1Continue}
          >
            {step1Loading ? <span className="loader" /> : <>Continue <span className="arrow">→</span></>}
          </button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — App Details
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep2 = () => (
    <div className={`step-pane ${currentStep === 2 ? 'active' : ''}`}>
      <div className="card step-card">
        <div className="card-head">
          <div className="card-icon">📱</div>
          <div>
            <h2>App Details</h2>
            <p style={{ color: 'var(--accent)' }}>Used to fetch reviews from Play Store and App Store.</p>
          </div>
        </div>
        <div className="field-group">
          <label>App Name <span className="req">*</span></label>
          <div className="search-input-wrap">
            <input 
              type="text" 
              placeholder="Search your app (e.g., Swiggy, Zomato...)" 
              value={appSearchQuery} 
              onChange={e => handleAppSearch(e.target.value)} 
              onFocus={() => appSearchQuery.trim().length > 1 && setIsSearching(true)}
              onBlur={() => setTimeout(() => setIsSearching(false), 200)}
            />
            {isSearching && appSearchResults.length > 0 && (
              <div className="search-dropdown">
                {appSearchResults.map((app, i) => (
                  <div key={i} className="search-result-item" onMouseDown={() => handleSelectMockApp(app)}>
                    <div className="app-icon-ph">{app.name.charAt(0)}</div>
                    <div>
                      <div className="app-res-title">{app.name}</div>
                      <div className="app-res-dev">{app.developer}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="field-row">
          <div className="field-group">
            <label>Android Package <span className="req">*</span> {appVerified && <span className="verified-badge">✓ Verified</span>}</label>
            <input type="text" placeholder="com.example.app" value={wizardData.androidPackage} onChange={e => handleManualPackage(e.target.value)} />
            {packageError && <span style={{ color: '#ef4444', fontSize: '0.78rem', marginTop: 4 }}>{packageError}</span>}
          </div>
          <div className="field-group">
            <label>iOS App ID <span className="req">*</span> {appVerified && <span className="verified-badge">✓ Verified</span>}</label>
            <input type="text" placeholder="123456789" value={wizardData.iosAppId} onChange={e => { handleUpdate('iosAppId', e.target.value); setAppVerified(false); }} />
          </div>
        </div>
        <div className="btn-row spaced">
          <button className="btn btn-ghost" onClick={prevStep}>Back</button>
          <button className="btn btn-primary" disabled={!wizardData.appName.trim() || !wizardData.androidPackage.trim()} onClick={nextStep}>Continue <span className="arrow">→</span></button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Social Sources
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep3 = () => (
    <div className={`step-pane ${currentStep === 3 ? 'active' : ''}`}>
      <div className="card step-card">
        <div className="card-head">
          <div className="card-icon">🌐</div>
          <div>
            <h2>Social Media</h2>
            <p>Connect profiles to track sentiment and mentions.</p>
          </div>
        </div>

        {/* Platform Selection */}
        <div className="platform-selector">
          {SOCIAL_PLATFORMS.map(p => (
            <button 
              key={p} 
              className={`platform-btn ${socialPlatform === p ? 'active' : ''}`}
              onClick={() => setSocialPlatform(p)}
            >
              {p}
            </button>
          ))}
        </div>

        {/* Add row */}
        <div className="social-add-wrap">
          <div className="field-group" style={{ marginBottom: 0 }}>
            <label>Handle / Identifier</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder={socialPlatform === 'Instagram' || socialPlatform === 'Twitter/X' ? '@brandname' : socialPlatform === 'Reddit' ? 'r/community' : 'Channel or Handle ID'}
                value={socialHandle}
                onChange={e => setSocialHandle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSocialSource()}
                style={{ flex: 1 }}
              />
              <button className="btn btn-secondary" style={{ flexShrink: 0 }} onClick={addSocialSource}>+ Add Source</button>
            </div>
          </div>
          {socialError && <div style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: 8, fontWeight: 500 }}>{socialError}</div>}
        </div>

        {/* Sources list */}
        {wizardData.socialSources.length === 0 ? (
          <div className="empty-state">
            <span>🔍</span>
            <p>No social sources added yet</p>
          </div>
        ) : (
          <div className="source-list">
            {wizardData.socialSources.map((s, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="source-tag">
                  <div>
                    <span className="source-platform">{s.platform}</span>
                    <span className="source-handle">{s.handle}</span>
                  </div>
                  <button className="source-remove" onClick={() => removeSocialSource(i)}>✕</button>
                </div>
                {s.verified && (
                  <div className="mock-preview-card">
                    <div className="mock-preview-row">
                      <span className="mock-icon-success">✔</span> Profile detected
                    </div>
                    <div className="mock-preview-row">
                      <span className="mock-icon-success">✔</span> Public data available
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="btn-row spaced">
          <button className="btn btn-ghost" onClick={prevStep}>Back</button>
          <button className="btn btn-primary" onClick={nextStep}>Continue <span className="arrow">→</span></button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4 — Configuration
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep4 = () => (
    <div className={`step-pane ${currentStep === 4 ? 'active' : ''}`}>
      <div className="card step-card">
        <div className="card-head">
          <div className="card-icon">⚙️</div>
          <div>
            <h2>Configuration</h2>
            <p>Set your global analysis preferences.</p>
          </div>
        </div>
        <div className="field-group">
          <label>Default Timeframe <span className="req">*</span></label>
          <select value={wizardData.timeframe} onChange={e => handleUpdate('timeframe', e.target.value)}>
            {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="toggle-row">
          <div>
            <div className="toggle-label">Enable real-time alerts</div>
            <div className="toggle-sub">Get notified on negative sentiment spikes</div>
          </div>
          <label className="toggle">
            <input type="checkbox" checked={wizardData.alertsEnabled} onChange={e => handleUpdate('alertsEnabled', e.target.checked)} />
            <span className="track"><span className="thumb" /></span>
          </label>
        </div>
        <div className="btn-row spaced">
          <button className="btn btn-ghost" onClick={prevStep}>Back</button>
          <button className="btn btn-primary" onClick={nextStep}>Continue <span className="arrow">→</span></button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5 — Review & Complete (saves project to DB)
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep5 = () => (
    <div className={`step-pane ${currentStep === 5 ? 'active' : ''}`}>
      <div className="card step-card">
        <div className="card-head">
          <div className="card-icon">✨</div>
          <div>
            <h2>Review & Complete</h2>
            <p>Confirm your setup before saving.</p>
          </div>
        </div>
        <div className="summary-grid" style={{ marginBottom: 24 }}>
          {[
            { k: 'Company', v: wizardData.companyName },
            { k: 'App Name', v: wizardData.appName },
            { k: 'Android Package', v: wizardData.androidPackage },
            { k: 'iOS App ID', v: wizardData.iosAppId },
            { k: 'Timeframe', v: wizardData.timeframe },
            { k: 'Alerts', v: wizardData.alertsEnabled ? 'Enabled' : 'Disabled' }
          ].map(({ k, v }) => (
            <div key={k} className="summary-item">
              <div className="summary-key">{k}</div>
              <div className="summary-val">{v || <span className="empty">—</span>}</div>
            </div>
          ))}
          <div className="summary-item" style={{ gridColumn: '1/-1' }}>
            <div className="summary-key">Social Sources</div>
            <div className="summary-val">
              {wizardData.socialSources.length === 0
                ? <span className="empty">None added</span>
                : wizardData.socialSources.map((s, i) => (
                    <span key={i} style={{ display: 'inline-block', marginRight: 8, color: 'var(--primary)' }}>
                      {s.platform}: {s.handle}
                    </span>
                  ))}
            </div>
          </div>
        </div>
        {step5Error && <div className="wiz-alert wiz-alert--error">⚠ {step5Error}</div>}
        <div className="btn-row spaced">
          <button className="btn btn-ghost" onClick={prevStep}>Back</button>
          <button className="btn btn-primary" onClick={handleCompleteSetup} disabled={step5Loading}>
            {step5Loading ? <span className="loader" /> : 'Complete Setup'}
          </button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // INVITE TEAM (post-setup)
  // ─────────────────────────────────────────────────────────────────────────
  if (showInvite) {
    return (
      <div className="center-screen" id="screen-complete">
        <div className="bg-grid" />
        <div className="success-ring">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="complete-title">Setup Complete!</h1>
        <p className="complete-sub">Your ReviewAI workspace is ready. Now invite your team.</p>

        {/* Invite Code */}
        <div className="invite-card">
          <div className="invite-card__label">Company Invite Code</div>
          <div className="invite-card__code">{wizardData.inviteCode}</div>
          <p className="invite-card__hint">Share this code with employees so they can join your workspace.</p>
        </div>

        {/* Email Invite */}
        <div className="invite-card" style={{ maxWidth: 420 }}>
          <div className="invite-card__label">Invite via Email</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <input
              type="email"
              placeholder="colleague@company.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              style={{ flex: 1, padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontFamily: 'var(--font)', outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
            />
            <button className="btn btn-primary" onClick={handleSendInvite} disabled={inviteLoading}>
              {inviteLoading ? <span className="loader" /> : 'Send Invite'}
            </button>
          </div>
          {inviteMsg && (
            <div style={{ marginTop: 10 }}>
              <div className={`wiz-alert wiz-alert--${inviteMsg.type}`}>
                {inviteMsg.type === 'success' ? '✓' : '⚠'} {inviteMsg.type === 'success' ? `Invite created for ${inviteMsg.text.split('Invite created for ')[1]?.split('.')[0]}` : inviteMsg.text}
              </div>
              {inviteMsg.link && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    readOnly
                    value={inviteMsg.link}
                    style={{ flex: 1, padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontFamily: 'monospace', background: 'var(--surface2)', color: 'var(--text2)' }}
                    onClick={e => e.target.select()}
                  />
                  <button
                    className="btn btn-ghost"
                    style={{ flexShrink: 0, fontSize: '0.8rem' }}
                    onClick={() => { navigator.clipboard.writeText(inviteMsg.link); }}
                  >
                    Copy Link
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
          Go to Dashboard →
        </button>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DASHBOARD VIEW (returning admins)
  // ─────────────────────────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10,
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
      }}>
        {/* Left: logo + company selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              <rect width="36" height="36" rx="8" fill="url(#lgDash)" />
              <path d="M10 23l5-8 4 6 3-4 4 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              <defs>
                <linearGradient id="lgDash" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#1F4D3B" /><stop offset="1" stopColor="#143528" />
                </linearGradient>
              </defs>
            </svg>
            ReviewAI
          </div>
          {companies.length > 1 ? (
            <select
              value={selectedCompany?.id || ''}
              onChange={handleCompanySwitch}
              style={{
                padding: '6px 12px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'var(--surface2)',
                fontSize: '0.88rem', fontFamily: 'var(--font)', cursor: 'pointer',
                color: 'var(--text)', outline: 'none'
              }}
            >
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          ) : (
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>
              {selectedCompany?.name}
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={handleAddNewCompany}>+ Add New Company</button>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem' }}
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '40px 28px', maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {/* Welcome */}
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
          Welcome back 👋
        </h1>
        <p style={{ color: 'var(--text2)', marginBottom: 36 }}>
          Manage your workspace and invite team members below.
        </p>

        {/* Company card */}
        <div className="card" style={{ padding: 28, marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 4 }}>
                Company
              </div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)' }}>
                {selectedCompany?.name}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)', marginBottom: 4 }}>
                Invite Code
              </div>
              <div style={{
                fontFamily: 'Courier New, monospace', fontSize: '1.3rem', fontWeight: 800,
                color: 'var(--primary)', background: 'var(--primary-glow)',
                padding: '4px 14px', borderRadius: 8, display: 'inline-block'
              }}>
                {selectedCompany?.invite_code}
              </div>
            </div>
          </div>
        </div>

        {/* Invite / Share card */}
        <div className="card" style={{ padding: 28 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 6 }}>Invite Team Members</div>
          <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginBottom: 20 }}>
            Share this code or use the quick-share buttons below to onboard your team.
          </p>

          <div className="sidebar-invite-code" style={{ fontSize: '1.4rem', marginBottom: 20 }}>
            {selectedCompany?.invite_code}
          </div>

          <div className="share-btn-row" style={{ justifyContent: 'flex-start', gap: 12 }}>
            <a
              href={`mailto:?subject=Join our workspace on ReviewAI&body=Hi, join our ReviewAI workspace using invite code: ${selectedCompany?.invite_code}`}
              className="share-btn share-btn--gmail"
              title="Share via Email"
              style={{ width: 42, height: 42, fontSize: '1.1rem' }}
            >
              ✉
            </a>
            <a
              href={`https://wa.me/?text=Hey! Join our ReviewAI workspace using invite code: ${selectedCompany?.invite_code}`}
              target="_blank"
              rel="noreferrer"
              className="share-btn share-btn--whatsapp"
              title="Share via WhatsApp"
              style={{ width: 42, height: 42, fontSize: '1.1rem' }}
            >
              ✆
            </a>
            <div style={{ position: 'relative' }}>
              <button
                className="share-btn share-btn--copy"
                onClick={handleCopyCode}
                title="Copy Invite Code"
                style={{ width: 42, height: 42, fontSize: '1.1rem' }}
              >
                ⎘
              </button>
              {isCopied && <div className="copy-toast">Copied!</div>}
            </div>
          </div>

          {/* Email invite with link generation */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 8, color: 'var(--text2)' }}>
              Send a personalised invite link
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                style={{ flex: 1, padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.88rem', fontFamily: 'var(--font)', outline: 'none' }}
                onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
              />
              <button className="btn btn-primary" style={{ flexShrink: 0 }} onClick={handleSendInvite} disabled={inviteLoading}>
                {inviteLoading ? <span className="loader" /> : 'Generate Link'}
              </button>
            </div>
            {inviteMsg && (
              <div style={{ marginTop: 8 }}>
                <div className={`wiz-alert wiz-alert--${inviteMsg.type}`}>
                  {inviteMsg.type === 'success' ? '✓ Invite created!' : `⚠ ${inviteMsg.text}`}
                </div>
                {inviteMsg.link && (
                  <div style={{ marginTop: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      readOnly value={inviteMsg.link}
                      style={{ flex: 1, padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', fontFamily: 'monospace', background: 'var(--surface2)', color: 'var(--text2)' }}
                      onClick={e => e.target.select()}
                    />
                    <button className="btn btn-ghost" style={{ flexShrink: 0, fontSize: '0.8rem' }} onClick={() => navigator.clipboard.writeText(inviteMsg.link)}>
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loadingCompanies) {
    return <div className="center-screen"><span className="loader" /></div>;
  }

  if (showDashboard && selectedCompany) {
    return renderDashboard();
  }

  // Default wizard layout
  return (
    <div className="screen active" id="screen-wizard" style={{ alignItems: 'stretch' }}>
      {renderSidebar()}
      <div className="wizard-main">
        <div className="step-header">
          <div className="step-badge">Step {currentStep} of {STEPS.length}</div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {renderStep1()}
        {renderStep2()}
        {renderStep3()}
        {renderStep4()}
        {renderStep5()}
      </div>
    </div>
  );
}