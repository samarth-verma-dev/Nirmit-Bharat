import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useAuth } from '../../context/AuthContext'
import { fetchAppMetadata } from '../../services/appAutofill'
import { finalizeCompanyDraft, loadCompanyDraft, saveCompanyDraft } from '../../services/companyDrafts'
import { sendCompanyInvites, validateInviteEmails } from '../../services/invites'
import Logo from '../../components/Logo'
import DataSources from '../dashboard/DataSources'
import '../auth-modern.css'

const STEPS = [
  { num: 1, label: 'Basic Info' },
  { num: 2, label: 'Business Type' },
  { num: 3, label: 'Review Sources' },
  { num: 4, label: 'Data Input' },
  { num: 5, label: 'Collect Feedback' },
  { num: 6, label: 'Processing' }
]

const SOCIAL_PLATFORMS = ['Instagram', 'Twitter/X', 'Reddit', 'Facebook', 'YouTube', 'Other']
const TIMEFRAMES = ['Last 7 days', 'Last 30 days', 'Last 90 days']

const MOCK_APPS = [
  { name: 'Swiggy', package: 'in.swiggy.android', ios: 'id989540920', developer: 'Swiggy', socials: [{ platform: 'Twitter/X', handle: '@Swiggy' }, { platform: 'Instagram', handle: '@swiggyindia' }] },
  { name: 'Zomato', package: 'com.application.zomato', ios: 'id434612044', developer: 'Zomato Ltd', socials: [{ platform: 'Twitter/X', handle: '@zomato' }, { platform: 'Instagram', handle: '@zomato' }] },
  { name: 'Nike', package: 'com.nike.omega', ios: 'id1095459556', developer: 'Nike, Inc.', socials: [{ platform: 'Twitter/X', handle: '@Nike' }, { platform: 'Instagram', handle: '@nike' }] },
  { name: 'Spotify', package: 'com.spotify.music', ios: 'id324684580', developer: 'Spotify Ltd.', socials: [{ platform: 'Twitter/X', handle: '@Spotify' }, { platform: 'Instagram', handle: '@spotify' }] },
  { name: 'Airbnb', package: 'com.airbnb.android', ios: 'id401626263', developer: 'Airbnb, Inc.', socials: [{ platform: 'Twitter/X', handle: '@Airbnb' }, { platform: 'Instagram', handle: '@airbnb' }] },
  { name: 'Slack', package: 'com.Slack', ios: 'id618783545', developer: 'Slack Technologies', socials: [{ platform: 'Twitter/X', handle: '@SlackHQ' }] },
]

const genInviteCode = () =>
  'REVIEW-' + Math.random().toString(36).substring(2, 6).toUpperCase()

const DEFAULT_WIZARD_DATA = {
  companyName: '',
  companyId: null,
  inviteCode: '',
  appName: '',
  androidPackage: '',
  iosAppId: '',
  socialSources: [],
  timeframe: 'Last 30 days',
  alertsEnabled: false,
  adminFullName: '',
  businessType: 'SaaS',
  reviewSources: [],
  websiteUrl: '',
  noSystem: false
}

const normalizeWizardData = (data = {}) => ({
  ...DEFAULT_WIZARD_DATA,
  ...data,
  reviewSources: data.reviewSources || [],
  socialSources: data.socialSources || []
})

const hasDraftContent = (data, step) =>
  step > 1 ||
  Boolean(data.inviteCode) ||
  Object.entries(data).some(([key, value]) => {
    if (['timeframe', 'businessType', 'noSystem', 'alertsEnabled'].includes(key)) return false
    if (Array.isArray(value)) return value.length > 0
    return Boolean(value)
  })

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
  const [draftId, setDraftId] = useState(null)
  const [draftSaveState, setDraftSaveState] = useState('idle')
  const draftLoadedRef = useRef(false)

  // Invite email state
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState(null)
  const [companyStats, setCompanyStats] = useState({ employees: 0, reviews: 0 })
  const [pendingInvites, setPendingInvites] = useState([])
  const [statsLoading, setStatsLoading] = useState(false)

  // Edit mode for existing company settings
  const [isEditing, setIsEditing] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')
  const [editData, setEditData] = useState({
    appName: '', androidPackage: '', iosAppId: '',
    socialSources: [], timeframe: 'Last 30 days', alertsEnabled: false
  })

  const [wizardData, setWizardData] = useState(DEFAULT_WIZARD_DATA)
  /*
    const defaultData = {
      companyName: '',
      companyId: null,
      inviteCode: '',
      appName: '',
      androidPackage: '',
      iosAppId: '',
      socialSources: [],
      timeframe: 'Last 30 days',
      alertsEnabled: false,
      // NEW UI FIELDS
      adminFullName: '',
      businessType: 'SaaS',
      reviewSources: [],
      websiteUrl: '',
      noSystem: false
    }

    const saved = localStorage.getItem('adminOnboardingData')
    if (saved) {
      try { 
        const parsed = JSON.parse(saved)
        return {
          ...defaultData,
          ...parsed,
          reviewSources: parsed.reviewSources || [],
          socialSources: parsed.socialSources || []
        }
      } catch (e) { 
        console.error('Failed to parse saved onboarding data', e) 
      }
    }
    return defaultData
  })

  // Persist state to localStorage on change
  useEffect(() => {
    localStorage.setItem('adminOnboardingStep', currentStep.toString())
    localStorage.setItem('adminOnboardingData', JSON.stringify(wizardData))
  }, [currentStep, wizardData])

  // Sync FORM DATA across tabs (but NOT the step number — each tab navigates independently)
  useEffect(() => {
    const handleStorageChange = (e) => {
      // Do NOT sync 'adminOnboardingStep' — it would force the other tab to jump steps unexpectedly.
      // Only sync the payload so that field values entered on one tab appear on the other.
      if (e.key === 'adminOnboardingData') {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed) {
            setWizardData(prev => ({
              ...prev,
              // Only sync fields that don't affect navigation (no companyId or step-gating flags)
              companyName: parsed.companyName ?? prev.companyName,
              adminFullName: parsed.adminFullName ?? prev.adminFullName,
              businessType: parsed.businessType ?? prev.businessType,
              reviewSources: parsed.reviewSources ?? prev.reviewSources,
              androidPackage: parsed.androidPackage ?? prev.androidPackage,
              iosAppId: parsed.iosAppId ?? prev.iosAppId,
              socialSources: parsed.socialSources ?? prev.socialSources,
              websiteUrl: parsed.websiteUrl ?? prev.websiteUrl,
              timeframe: parsed.timeframe ?? prev.timeframe,
            }))
          }
        } catch (err) {
          console.warn('[Admin] Cross-tab sync parse error:', err)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  */

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
  const [autofillLoading, setAutofillLoading] = useState(false)
  const [autofillError, setAutofillError] = useState('')
  const [autofillIcon, setAutofillIcon] = useState(null)
  // Track whether user has manually edited each field
  // useRef so async callbacks always read the LATEST value (no stale closure)
  const [manualEdit, setManualEdit] = useState({ android: false, ios: false })
  const manualEditRef = useRef({ android: false, ios: false })

  // Autofill triggered manually — calls iTunes API directly (CORS-safe)
  const handleAutofillClick = async () => {
    const query = appSearchQuery.trim()
    if (query.length <= 1) return

    setAutofillLoading(true)
    setAutofillError('')
    setAutofillIcon(null)

    try {
      console.log('[Autofill] Starting fetch for:', query)
      const data = await fetchAppMetadata(query)
      console.log('[Autofill] Received data:', data)

      if (!data || (!data.iosAppId && !data.androidPackage && (!data.socials || data.socials.length === 0))) {
        setAutofillError('No data found for this app. Try a different spelling or fill manually.')
        setAppVerified(false)
        return
      }

      // Update search display name to canonical app name
      if (data.appName) {
        setAppSearchQuery(data.appName)
      }

      // Set app icon if returned
      if (data.iconUrl) {
        setAutofillIcon(data.iconUrl)
      }

      // Read LATEST manualEdit state from ref (avoids stale closure)
      const me = manualEditRef.current

      // Update wizard data
      setWizardData(prev => {
        const existingPlatforms = new Set(prev.socialSources.map(s => s.platform))
        const newSocials = (data.socials || [])
          .filter(s => !existingPlatforms.has(s.platform))
          .map(s => ({ ...s, verified: true }))

        const updated = {
          ...prev,
          appName: data.appName || prev.appName,
          socialSources: [...prev.socialSources, ...newSocials],
        }

        // Only overwrite if user hasn't manually typed a value
        if (!me.android && data.androidPackage) {
          updated.androidPackage = data.androidPackage
        }
        if (!me.ios && data.iosAppId) {
          updated.iosAppId = data.iosAppId
        }

        console.log('[Autofill] Applying to form:', {
          androidPackage: updated.androidPackage,
          iosAppId: updated.iosAppId,
          socialSources: updated.socialSources.map(s => `${s.platform}: ${s.handle}`),
        })

        return updated
      })

      setAppVerified(true)
      setPackageError('')
    } catch (err) {
      console.error('[Autofill] Error:', err)
      setAutofillError('Failed to fetch app data. Check your connection and try again.')
      setAppVerified(false)
    } finally {
      setAutofillLoading(false)
    }
  }

  const handleUpdate = (key, value) =>
    setWizardData(prev => ({ ...prev, [key]: value }))

  const activeSteps = STEPS.filter(s => wizardData.noSystem || s.num !== 5)

  useEffect(() => {
    if (!activeSteps.some(s => s.num === currentStep)) {
      setCurrentStep(1)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, wizardData.noSystem])

  const nextStep = () => setCurrentStep(prev => {
    const currentIndex = activeSteps.findIndex(s => s.num === prev)
    if (currentIndex >= 0 && currentIndex < activeSteps.length - 1) return activeSteps[currentIndex + 1].num
    return prev
  })
  const prevStep = () => setCurrentStep(prev => {
    const currentIndex = activeSteps.findIndex(s => s.num === prev)
    if (currentIndex > 0) return activeSteps[currentIndex - 1].num
    return prev
  })

  // ── STEP 1: Save company to Supabase ───────────────────────────────────────
  const handleStep1Continue = async () => {
    if (!wizardData.adminFullName.trim() || !wizardData.companyName.trim()) {
      setStep1Error('Full Name and Company Name are required')
      return
    }

    setStep1Loading(true)
    setStep1Error('')
    const updatedWizardData = {
      ...wizardData,
      inviteCode: wizardData.inviteCode || genInviteCode()
    }

    try {
      const saved = await saveCompanyDraft({
        draftId,
        currentStep: 2,
        formData: updatedWizardData
      })
      setDraftId(saved.id)
      setWizardData(normalizeWizardData(saved.form_data))
      setDraftSaveState('saved')
      nextStep()
    } catch (error) {
      setStep1Error(error.message)
    }
    setStep1Loading(false)
  }

  // ── STEP 5: Save project to Supabase ──────────────────────────────────────
  const handleCompleteSetup = async () => {
    setStep5Loading(true)
    setStep5Error('')

    try {
      let activeDraftId = draftId
      if (!activeDraftId) {
        const saved = await saveCompanyDraft({
          draftId: null,
          currentStep,
          formData: {
            ...wizardData,
            inviteCode: wizardData.inviteCode || genInviteCode()
          }
        })
        activeDraftId = saved.id
        setDraftId(saved.id)
      }

      const finalized = await finalizeCompanyDraft(activeDraftId)
      const newCompany = {
        id: finalized.company_id,
        name: finalized.company_name,
        invite_code: finalized.invite_code,
        created_by: user?.id
      }

      setDraftId(null)
      setWizardData(DEFAULT_WIZARD_DATA)
      setCompanies(prev => [...prev.filter(c => c.id !== newCompany.id), newCompany])
      setSelectedCompany(newCompany)
      localStorage.setItem('selectedCompanyId', newCompany.id)
      setShowDashboard(true)
    } catch (error) {
      setStep5Error(error.message)
    }
    setStep5Loading(false)
  }

  // ── Invite via email ───────────────────────────────────────────────────────
  const handleSendInvite = async () => {
    const { emails, invalid } = validateInviteEmails(inviteEmail)
    if (emails.length === 0) {
      setInviteMsg({ type: 'error', text: 'Enter at least one work email.' })
      return
    }
    if (invalid.length > 0) {
      setInviteMsg({ type: 'error', text: `Check these email addresses: ${invalid.join(', ')}` })
      return
    }

    const companyId = selectedCompany?.id ?? wizardData.companyId
    if (!companyId) {
      setInviteMsg({ type: 'error', text: 'Select or finish creating a company before sending invites.' })
      return
    }

    setInviteLoading(true)
    setInviteMsg(null)

    try {
      const result = await sendCompanyInvites({ companyId, emails })
      setInviteMsg({
        type: 'success',
        text: `${result.email_count || emails.length} invite${emails.length === 1 ? '' : 's'} sent. Links expire in 72 hours.${result.warning ? ` ${result.warning}` : ''}`
      })
      setInviteEmail('')
      await loadCompanyStats(companyId)
    } catch (error) {
      setInviteMsg({ type: 'error', text: error.message || 'Unable to send invites.' })
    } finally {
      setInviteLoading(false)
    }
  }

  const { user, signOut } = useAuth()

  const loadCompanyStats = async (companyId) => {
    if (!companyId) return
    setStatsLoading(true)

    const [employeesRes, reviewsRes, invitesRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
      supabase
        .from('analytics_summaries')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId),
      supabase
        .from('invites')
        .select('id,email,status,expires_at,sent_at,created_at')
        .eq('company_id', companyId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    if (!employeesRes.error || !reviewsRes.error) {
      setCompanyStats({
        employees: employeesRes.count ?? 0,
        reviews: reviewsRes.count ?? 0
      })
    }

    if (!invitesRes.error) {
      setPendingInvites(invitesRes.data || [])
    }

    setStatsLoading(false)
  }

  useEffect(() => {
    if (!user || !draftLoadedRef.current || showDashboard || !hasDraftContent(wizardData, currentStep)) {
      return
    }

    const timeout = setTimeout(async () => {
      setDraftSaveState('saving')
      try {
        const saved = await saveCompanyDraft({ draftId, currentStep, formData: wizardData })
        setDraftId(saved.id)
        setDraftSaveState('saved')
      } catch (error) {
        console.error('Error autosaving company draft:', error)
        setDraftSaveState('error')
      }
    }, 700)

    return () => clearTimeout(timeout)
  }, [currentStep, draftId, showDashboard, user, wizardData])

  const handleLogout = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  // Fetch companies for the logged‑in admin

  // Fetch companies for the logged‑in admin
  useEffect(() => {
    const fetchCompanies = async () => {
      if (!user) {
        setLoadingCompanies(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('created_by', user.id)
        if (error) {
          console.error('Error fetching companies', error)
          return
        }
        const draft = await loadCompanyDraft()
        setCompanies(data)

        if (draft) {
          const formData = normalizeWizardData(draft.form_data)
          setDraftId(draft.id)
          setWizardData(formData)
          setAppSearchQuery(formData.appName || '')
          setCurrentStep(draft.current_step || 1)
          setShowDashboard(false)
          setSelectedCompany(null)
          draftLoadedRef.current = true
          return
        }

        draftLoadedRef.current = true
        if (data && data.length > 0) {
          const stored = localStorage.getItem('selectedCompanyId')
          const preselected = data.find(c => c.id === stored) || data[0]
          setSelectedCompany(preselected)
          
          // Always go straight to dashboard if they already have a company
          // (They can still manually add a new one via the '+ Add Company' button)
          setShowDashboard(true)
        }
      } catch (err) {
        console.error('Unexpected error fetching companies:', err)
        draftLoadedRef.current = true
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

  useEffect(() => {
    if (selectedCompany?.id) {
      loadCompanyStats(selectedCompany.id)
    }
  }, [selectedCompany?.id])

  const handleAddNewCompany = () => {
    setShowDashboard(false)
    setCurrentStep(1)
    setDraftId(null)
    setDraftSaveState('idle')
    setWizardData(DEFAULT_WIZARD_DATA)
  }

  const handleEditCompany = async () => {
    // Pre-fill editData from the current project settings in DB
    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('company_id', selectedCompany.id)
      .maybeSingle()
    setEditData({
      appName: data?.app_name || '',
      androidPackage: data?.android_package || '',
      iosAppId: data?.ios_app_id || '',
      socialSources: data?.social_handles || [],
      timeframe: data?.timeframe || 'Last 30 days',
      alertsEnabled: data?.alerts_enabled || false
    })
    setIsEditing(true)
    setEditError('')
    setEditSuccess('')
  }

  const handleSaveSettings = async () => {
    setEditSaving(true)
    setEditError('')
    setEditSuccess('')
    // Upsert project row for this company
    const { error } = await supabase.from('projects').upsert({
      company_id: selectedCompany.id,
      app_name: editData.appName,
      android_package: editData.androidPackage,
      ios_app_id: editData.iosAppId,
      social_handles: editData.socialSources,
      timeframe: editData.timeframe,
      alerts_enabled: editData.alertsEnabled
    }, { onConflict: 'company_id' })
    if (error) setEditError(error.message)
    else { setEditSuccess('Settings saved!'); setIsEditing(false) }
    setEditSaving(false)
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
    setManualEdit(prev => ({ ...prev, android: true }))
    manualEditRef.current = { ...manualEditRef.current, android: true }
    setAppVerified(false)
    const pkgRegex = /^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+[0-9a-z_]$/i
    if (val.trim() && !pkgRegex.test(val)) {
      setPackageError('Invalid package format (e.g. com.example.app)')
    } else {
      setPackageError('')
    }
  }

  const handleManualIos = (val) => {
    handleUpdate('iosAppId', val)
    setManualEdit(prev => ({ ...prev, ios: true }))
    manualEditRef.current = { ...manualEditRef.current, ios: true }
    setAppVerified(false)
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

  const currentIndex = activeSteps.findIndex(s => s.num === currentStep)
  const pct = (currentIndex / (activeSteps.length - 1)) * 100

  // ─────────────────────────────────────────────────────────────────────────
  // SIDEBAR
  // ─────────────────────────────────────────────────────────────────────────
  const renderSidebar = () => (
    <div className="sidebar">
      <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
        <Logo width={80} height={80} />
      </div>

      <div className="step-nav">
        {activeSteps.map((step, index) => {
          let cls = ''
          if (step.num === currentStep) cls = 'active'
          // A step is done if its actual index in activeSteps is less than currentIndex
          else if (activeSteps.findIndex(s => s.num === step.num) < currentIndex) cls = 'done'
          
          return (
            <div key={step.num} className={`nav-item ${cls}`}>
              <div className="nav-num">{index + 1}</div>
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
  // STEP 1 — Basic Info (saves to DB)
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep1 = () => (
    <div className={`step-pane ${currentStep === 1 ? 'active' : ''}`}>
      <div className="card step-card">
        <div className="card-head">
          <div className="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <div>
            <h2 className="auth-title" style={{ fontSize: '1.8rem' }}>Let’s get you set up</h2>
            <p className="auth-subtitle" style={{ marginBottom: 0 }}>This will only take a minute</p>
            <p style={{ fontSize: '0.8rem', color: '#8A3C38', marginTop: 4, fontWeight: 600 }}>We’ll personalize your experience based on your business</p>
          </div>
        </div>
        <div className="field-group">
          <label>Full Name <span className="req">*</span></label>
          <input
            type="text"
            placeholder="e.g. Jane Doe"
            value={wizardData.adminFullName}
            onChange={e => handleUpdate('adminFullName', e.target.value)}
            autoFocus
          />
        </div>
        <div className="field-group">
          <label>Company Name <span className="req">*</span></label>
          <input
            type="text"
            placeholder="e.g. Acme Corp"
            value={wizardData.companyName}
            onChange={e => handleUpdate('companyName', e.target.value)}
          />
        </div>
        {step1Error && <div className="wiz-alert wiz-alert--error">⚠ {step1Error}</div>}
        <div className="btn-row">
          <button
            className="btn btn-primary"
            disabled={!wizardData.companyName.trim() || !wizardData.adminFullName.trim() || step1Loading}
            onClick={handleStep1Continue}
          >
            {step1Loading ? <span className="loader" /> : <>Continue <span className="arrow">→</span></>}
          </button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Business Type
  // ─────────────────────────────────────────────────────────────────────────
  const BUSINESS_TYPES = ['SaaS', 'E-commerce', 'Restaurant', 'App-based', 'Other']
  const renderStep2 = () => (
    <div className={`step-pane ${currentStep === 2 ? 'active' : ''}`}>
      <div className="card step-card">
        <div className="card-head">
          <div className="card-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
          </div>
          <div>
            <h2 className="auth-title" style={{ fontSize: '1.8rem' }}>Tell us about your business</h2>
            <p className="auth-subtitle" style={{ marginBottom: 0 }}>So we can tailor insights and recommendations for you</p>
            <p style={{ fontSize: '0.8rem', color: '#8A3C38', marginTop: 4, fontWeight: 600 }}>This helps us understand where your customer feedback comes from</p>
          </div>
        </div>
        <div className="field-group" style={{ marginBottom: 24 }}>
          <label>Select your industry</label>
          <select 
            value={wizardData.businessType} 
            onChange={e => handleUpdate('businessType', e.target.value)}
            style={{ appearance: 'none', background: 'var(--surface2) url("data:image/svg+xml;utf8,<svg fill=%27none%27 stroke=%27%231A1A1A%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27 viewBox=%270 0 24 24%27 xmlns=%27http://www.w3.org/2000/svg%27><path d=%27M6 9l6 6 6-6%27/></svg>") no-repeat right 12px center / 16px', paddingRight: 40 }}
          >
            {BUSINESS_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
          </select>
        </div>
        <div className="btn-row spaced">
          <button className="btn btn-ghost" onClick={prevStep}>Back</button>
          <button className="btn btn-primary" onClick={nextStep}>Continue <span className="arrow">→</span></button>
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3 — Review Sources
  // ─────────────────────────────────────────────────────────────────────────
  const SOURCE_OPTIONS = ['Social Media', 'Website / URL', 'Personal Data', 'Play Store']
  const renderStep3 = () => {
    const options = [...SOURCE_OPTIONS]
    if (wizardData.businessType === 'App-based' && !options.includes('App Store')) {
      options.push('App Store')
    }

    const toggleSource = (src) => {
      handleUpdate('noSystem', false)
      setWizardData(prev => {
        const current = prev.reviewSources || []
        const updated = current.includes(src) ? current.filter(x => x !== src) : [...current, src]
        return { ...prev, reviewSources: updated }
      })
    }

    return (
      <div className={`step-pane ${currentStep === 3 ? 'active' : ''}`}>
        <div className="card step-card">
          <div className="card-head">
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <h2 className="auth-title" style={{ fontSize: '1.8rem' }}>Where do your customers share feedback?</h2>
              <p className="auth-subtitle" style={{ marginBottom: 0 }}>Select all the places where you receive reviews—we’ll bring everything together for you</p>
              <p style={{ fontSize: '0.8rem', color: '#8A3C38', marginTop: 4, fontWeight: 600 }}>Connect multiple sources for a complete view of your customer experience</p>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
            {options.map(opt => {
              const isSelected = wizardData.reviewSources.includes(opt) && !wizardData.noSystem
              return (
                <button
                  key={opt}
                  onClick={() => toggleSource(opt)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '16px', background: isSelected ? 'var(--primary-glow)' : 'var(--surface2)',
                    border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', textAlign: 'left',
                    color: isSelected ? 'var(--primary)' : 'var(--text)', fontWeight: 500,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 600 }}>{opt}</span>
                    <span style={{ fontSize: '0.8rem', color: isSelected ? 'var(--primary)' : 'var(--text2)', fontWeight: 400, marginTop: 4 }}>
                      {opt === 'Social Media' && "Track what customers are saying across social platforms"}
                      {opt === 'Website / URL' && "Analyze feedback collected through your website"}
                      {opt === 'Personal Data' && "Upload existing feedback and start instantly"}
                      {(opt === 'Play Store' || opt === 'App Store') && "Understand what your app users are experiencing"}
                    </span>
                  </div>
                  {isSelected && <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>✓</span>}
                </button>
              )
            })}
          </div>

          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text3)' }}>OR</span>
          </div>

          <button
            onClick={() => handleUpdate('noSystem', true)}
            style={{
              width: '100%', padding: '16px', background: wizardData.noSystem ? 'var(--primary-glow)' : 'var(--surface)',
              border: `1px solid ${wizardData.noSystem ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', cursor: 'pointer', color: wizardData.noSystem ? 'var(--primary)' : 'var(--text2)',
              fontWeight: 500, transition: 'all 0.2s', marginBottom: 12
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: '1rem', fontWeight: 600 }}>I don’t have a system yet</span>
              <span style={{ fontSize: '0.8rem', color: wizardData.noSystem ? 'var(--primary)' : 'var(--text2)', fontWeight: 400 }}>We’ll help you set one up in minutes</span>
            </div>
          </button>

          <div className="btn-row spaced">
            <button className="btn btn-ghost" onClick={prevStep}>Back</button>
            <button 
              className="btn btn-primary" 
              onClick={nextStep}
              disabled={wizardData.reviewSources.length === 0 && !wizardData.noSystem}
            >
              Continue <span className="arrow">→</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4 — Data Input (Dynamic based on Step 3)
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep4 = () => {
    if (wizardData.noSystem) {
      return (
        <div className={`step-pane ${currentStep === 4 ? 'active' : ''}`}>
          <div className="card step-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: 12 }}>No Data Input Required</h2>
            <p className="auth-subtitle" style={{ marginBottom: 32, maxWidth: 400, margin: '0 auto' }}>
              Since you don't have an existing review collection system, you can skip this step.
            </p>
            <div className="btn-row spaced" style={{ justifyContent: 'center' }}>
              <button className="btn btn-ghost" onClick={prevStep}>Back</button>
              <button className="btn btn-primary" onClick={nextStep}>Continue <span className="arrow">→</span></button>
            </div>
          </div>
        </div>
      )
    }

    const showApps = wizardData.reviewSources.includes('Play Store') || wizardData.reviewSources.includes('App Store')
    const showSocial = wizardData.reviewSources.includes('Social Media')
    const showWeb = wizardData.reviewSources.includes('Website / URL')
    const showPersonal = wizardData.reviewSources.includes('Personal Data')

    return (
      <div className={`step-pane ${currentStep === 4 ? 'active' : ''}`}>
        <div className="card step-card">
          <div className="card-head" style={{ marginBottom: 16 }}>
            <div className="card-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
            </div>
            <div>
              <h2 className="auth-title" style={{ fontSize: '1.8rem' }}>Connect your sources</h2>
              <p className="auth-subtitle" style={{ marginBottom: 0 }}>Configure your API or Demo integrations to fetch reviews.</p>
            </div>
          </div>

          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: 8, paddingBottom: 16 }}>
             <DataSources hideHeader={true} />
          </div>

          <div className="btn-row spaced">
            <button className="btn btn-ghost" onClick={prevStep}>Back</button>
            <button className="btn btn-primary" onClick={nextStep}>Continue <span className="arrow">→</span></button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5 — Collect Feedback (Google Form)
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep5 = () => {
    return (
      <div className={`step-pane ${currentStep === 5 ? 'active' : ''}`}>
        <div className="card step-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <div style={{ width: 64, height: 64, background: 'var(--primary-glow)', color: 'var(--primary)', borderRadius: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Start Collecting Customer Feedback</h2>
          <p style={{ color: 'var(--text2)', marginBottom: 24, maxWidth: 420, margin: '0 auto 24px' }}>
            Use a simple Google Form to start collecting reviews from your customers. Responses will be stored in a spreadsheet and can be analyzed by our AI.
          </p>
          
          <div style={{ background: 'var(--surface2)', padding: '16px', borderRadius: 'var(--radius-sm)', marginBottom: 32, maxWidth: 420, margin: '0 auto 32px', fontSize: '0.85rem', color: 'var(--text2)' }}>
            <strong>Note:</strong> Responses will be stored in Google Sheets and can be connected later for analysis.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
            <a 
              href="https://docs.google.com/forms/d/11F25MmwiCf3icVepQhhYITwH3ugsYp23VsBlHZ2U-iQ/copy" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn btn-primary btn-lg"
              style={{ textDecoration: 'none', width: '100%', maxWidth: 300, justifyContent: 'center' }}
            >
              Open Feedback Form <span className="arrow">↗</span>
            </a>
            
            <button 
              className="btn btn-ghost" 
              onClick={nextStep}
              style={{ width: '100%', maxWidth: 300, justifyContent: 'center' }}
            >
              I've started collecting responses
            </button>
            
            <div style={{ marginTop: 16 }}>
               <button className="btn btn-ghost" onClick={prevStep} style={{ fontSize: '0.85rem' }}>← Back</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6 — Processing (Loader)
  // ─────────────────────────────────────────────────────────────────────────
  const renderStep6 = () => {
    return (
      <div className={`step-pane ${currentStep === 6 ? 'active' : ''}`}>
        <div className="card step-card" style={{ textAlign: 'center', padding: '64px 32px' }}>
          <div className="pulse-ring" style={{ margin: '0 auto 40px' }}>
             <svg className="proc-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" style={{ position: 'absolute', top: '50%', left: '50%', marginTop: -24, marginLeft: -24 }}>
               <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
             </svg>
          </div>
          <h2 className="auth-title" style={{ fontSize: '1.8rem', marginBottom: 12 }}>Understanding customer sentiment...</h2>
          <p className="auth-subtitle" style={{ marginBottom: 32 }}>
            We're analyzing thousands of data points to uncover the insights that actually matter.
          </p>
          {step5Error && <div className="wiz-alert wiz-alert--error" style={{ textAlign: 'left', marginBottom: 24 }}>⚠ {step5Error}</div>}
          <div className="btn-row spaced" style={{ justifyContent: 'center' }}>
            <button className="btn btn-ghost" onClick={prevStep} disabled={step5Loading}>Back</button>
            <button className="btn btn-primary btn-lg" onClick={handleCompleteSetup} disabled={step5Loading}>
              {step5Loading ? <><span className="loader" /> Processing...</> : 'Complete Setup'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // ADMIN HOME VIEW (returned admins - NO analytics, management only)
  // ─────────────────────────────────────────────────────────────────────────
  const renderAdminHome = () => {
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

        <div className="auth-card-main" style={{ maxWidth: 800, padding: '48px 32px', width: '100%', position: 'relative', zIndex: 10, maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <div className="logo-mark" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Logo width={64} height={64} />
              <span style={{ fontSize: '1rem', fontWeight: 600, color: '#6B7280' }}>Admin Console</span>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {companies.length > 1 && (
                <select
                  value={selectedCompany?.id || ''}
                  onChange={handleCompanySwitch}
                  style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontFamily: 'var(--font)', fontSize: '0.85rem' }}
                >
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
              <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={handleAddNewCompany}>+ Add Company</button>
              <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={handleLogout}>Sign Out</button>
            </div>
          </div>

          {/* Company name */}
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: 6 }}>{selectedCompany?.name}</h1>
          <p style={{ color: 'var(--text2)', marginBottom: 32 }}>Manage your workspace settings and invite team members.</p>

          {/* Invite Section */}
          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>Invite Team Members</div>
            <p style={{ color: 'var(--text2)', fontSize: '0.85rem', marginBottom: 16 }}>Paste multiple emails separated by commas, spaces, or new lines.</p>

            {/* Invite Code display */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 16px', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.1em', color: 'var(--primary)' }}>
                Secure email invite links are generated automatically and never shown in the console.
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>Expires in 72h</span>
              </div>
            </div>

            {/* Email invite */}
            <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}>Send Invite via Email</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'start' }}>
              <textarea
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                style={{ minHeight: 84, resize: 'vertical', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.9rem', fontFamily: 'var(--font)', outline: 'none', lineHeight: 1.5 }}
              />
              <button className="btn btn-primary" onClick={handleSendInvite} disabled={inviteLoading}>
                {inviteLoading ? <span className="loader" /> : 'Send Invite'}
              </button>
            </div>
            {inviteMsg && (
              <div className={`wiz-alert wiz-alert--${inviteMsg.type}`} style={{ marginTop: 10 }}>
                {inviteMsg.type === 'success' ? 'Success: ' : 'Error: '} {inviteMsg.text}
              </div>
            )}
          </div>

          <div className="card" style={{ padding: 28, marginBottom: 24 }}>
            <div style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: 18 }}>Company Overview</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                <div style={{ color: 'var(--text2)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Company</div>
                <div style={{ fontWeight: 700, marginTop: 8 }}>{selectedCompany?.name}</div>
              </div>
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                <div style={{ color: 'var(--text2)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Employees</div>
                <div style={{ fontWeight: 800, fontSize: '1.45rem', marginTop: 8 }}>{statsLoading ? '-' : companyStats.employees}</div>
              </div>
              <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                <div style={{ color: 'var(--text2)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase' }}>Reviews</div>
                <div style={{ fontWeight: 800, fontSize: '1.45rem', marginTop: 8 }}>{statsLoading ? '-' : companyStats.reviews}</div>
              </div>
            </div>
            {pendingInvites.length > 0 && (
              <div style={{ marginTop: 22 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Pending Invites</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {pendingInvites.map(invite => (
                    <div key={invite.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.86rem' }}>
                      <span>{invite.email}</span>
                      <span style={{ color: 'var(--text2)' }}>{invite.expires_at ? `Expires ${new Date(invite.expires_at).toLocaleString()}` : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Company Settings Section */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Company Settings</div>
              {!isEditing && (
                <button className="btn btn-ghost" style={{ fontSize: '0.85rem' }} onClick={handleEditCompany}>Edit Settings</button>
              )}
            </div>

            {!isEditing ? (
              <p style={{ color: 'var(--text2)', fontSize: '0.9rem' }}>Click <strong>Edit Settings</strong> to update your app handles, social sources, and analysis configuration.</p>
            ) : (
              <div>
                <div className="field-row">
                  <div className="field-group">
                    <label>App Name</label>
                    <input type="text" value={editData.appName} onChange={e => setEditData(p => ({ ...p, appName: e.target.value }))} placeholder="e.g. Swiggy" />
                  </div>
                </div>
                <div className="field-row">
                  <div className="field-group">
                    <label>Android Package</label>
                    <input type="text" value={editData.androidPackage} onChange={e => setEditData(p => ({ ...p, androidPackage: e.target.value }))} placeholder="com.example.app" />
                  </div>
                  <div className="field-group">
                    <label>iOS App ID</label>
                    <input type="text" value={editData.iosAppId} onChange={e => setEditData(p => ({ ...p, iosAppId: e.target.value }))} placeholder="123456789" />
                  </div>
                </div>
                <div className="field-group">
                  <label>Default Timeframe</label>
                  <select value={editData.timeframe} onChange={e => setEditData(p => ({ ...p, timeframe: e.target.value }))}>
                    {TIMEFRAMES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="toggle-row" style={{ marginBottom: 20 }}>
                  <div>
                    <div className="toggle-label">Enable real-time alerts</div>
                    <div className="toggle-sub">Get notified on negative sentiment spikes</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" checked={editData.alertsEnabled} onChange={e => setEditData(p => ({ ...p, alertsEnabled: e.target.checked }))} />
                    <span className="track"><span className="thumb" /></span>
                  </label>
                </div>
                {editError && <div className="wiz-alert wiz-alert--error">⚠ {editError}</div>}
                {editSuccess && <div className="wiz-alert wiz-alert--success">✓ {editSuccess}</div>}
                <div className="btn-row spaced">
                  <button className="btn btn-ghost" onClick={() => setIsEditing(false)}>Cancel</button>
                  <button className="btn btn-primary" onClick={handleSaveSettings} disabled={editSaving}>
                    {editSaving ? <span className="loader" /> : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  if (loadingCompanies) {
    return <div className="center-screen"><span className="loader" /></div>;
  }

  if (showDashboard && selectedCompany) {
    return renderAdminHome();
  }

  // Default wizard layout
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

      <div className="auth-card-main" style={{ display: 'flex', maxWidth: 1000, width: '100%', padding: 0, overflow: 'hidden', height: '85vh' }}>
        {renderSidebar()}
        <div className="wizard-main" style={{ flex: 1, padding: 48, overflowY: 'auto' }}>
          <div className="step-header">
            <div className="step-badge">
              Step {currentStep} of {STEPS.length}
              {draftSaveState === 'saving' && ' - Saving...'}
              {draftSaveState === 'saved' && ' - Saved'}
              {draftSaveState === 'error' && ' - Save failed'}
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
          {renderStep1()}
          {renderStep2()}
          {renderStep3()}
          {renderStep4()}
          {renderStep5()}
          {renderStep6()}
        </div>
      </div>
    </div>
  );
}
