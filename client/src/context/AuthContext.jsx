import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../services/supabase'
import { log } from '../utils/logger';

// Inside AuthContext use log instead of console.log
// Replace existing console.log statements:
//   console.log('[AuthContext] onAuthStateChange:', _event)
//   console.log('[AuthContext] Identity changed →', newUserId)
//   console.log(`[AuthContext] checkUserRole attempt ${attempt + 1} for: ${userId}`)
//   console.log('[AuthContext] Role resolved:', resolvedRole)
//   console.log('[AuthContext] loading = false')
//   console.error will remain for errors


const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)
  const [companyId, setCompanyId] = useState(null)
  const [companyName, setCompanyName] = useState(null)

  // Tracks the currently resolved user ID to prevent redundant role fetches
  // on harmless TOKEN_REFRESHED events (e.g., tab focus in background)
  const currentUserId = useRef(null)

  useEffect(() => {
    let mounted = true

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: freshUser } = await supabase.auth.getUser()
      if (!mounted) return

      setSession(session)
      const activeUser = freshUser?.user ?? session?.user ?? null
      const activeUserId = activeUser?.id ?? null

      if (activeUserId !== currentUserId.current) {
        currentUserId.current = activeUserId
        setUser(activeUser)

        if (activeUserId) {
          await checkUserRole(activeUserId, mounted)
        } else {
          setRole(null)
          setCompanyId(null)
          setCompanyName(null)
          setLoading(false)
        }
      } else if (!activeUserId) {
        // No user — stop loading
        setLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      console.log('[AuthContext] onAuthStateChange:', _event)
      if (!mounted) return

      setSession(newSession)
      const newUserId = newSession?.user?.id ?? null

      if (newUserId !== currentUserId.current) {
        // User identity actually changed (new login, logout from another tab)
        console.log('[AuthContext] Identity changed →', newUserId)
        currentUserId.current = newUserId

        setLoading(true) // Block ProtectedRoute until role resolves
        setRole(null)
        setCompanyId(null)
        setCompanyName(null)
        setUser(newSession?.user ?? null)

        if (newUserId) {
          setTimeout(() => {
            if (mounted) checkUserRole(newUserId, mounted)
          }, 0)
        } else {
          setLoading(false)
        }
      } else {
        // Same user — silent token refresh on tab focus. Just update object reference.
        setUser(newSession?.user ?? null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  /**
   * Checks the user's role from the DB with exponential backoff retries.
   * NEVER guesses the role on failure — signs out instead of showing wrong dashboard.
   */
  async function checkUserRole(userId, mounted = true, attempt = 0) {
    const MAX_RETRIES = 3
    const RETRY_DELAYS = [1000, 2000, 4000]

    console.log(`[AuthContext] checkUserRole attempt ${attempt + 1} for: ${userId}`)

    try {
      const { data, error } = await supabase.rpc('get_my_workspace')

      if (!mounted) return

      if (error) {
        console.error('[AuthContext] Role query error:', error.message)
        if (attempt < MAX_RETRIES) {
          await new Promise(res => setTimeout(res, RETRY_DELAYS[attempt]))
          return checkUserRole(userId, mounted, attempt + 1)
        }
        // Exhausted all retries: sign out to prevent wrong dashboard access
        console.error('[AuthContext] Role check failed after all retries. Signing out.')
        setLoading(false)
        setRole(null)
        setCompanyId(null)
        setCompanyName(null)
        await supabase.auth.signOut()
        return
      }

      const workspace = Array.isArray(data) ? data[0] : data
      const intendedRole = sessionStorage.getItem('pending_invite_role')

      if (intendedRole === 'employee' && workspace?.role !== 'employee' && attempt < MAX_RETRIES) {
        await new Promise(res => setTimeout(res, RETRY_DELAYS[attempt]))
        return checkUserRole(userId, mounted, attempt + 1)
      }
      
      if (workspace?.role === 'employee') {
        sessionStorage.removeItem('pending_invite_role')
      }
      const resolvedRole = workspace?.role || 'admin'
      
      log('[AuthContext] Role resolved:', resolvedRole)
      setRole(resolvedRole)
      setCompanyId(workspace?.company_id ?? null)
      setCompanyName(workspace?.company_name ?? null)
    } catch (err) {
      if (!mounted) return
      console.error('[AuthContext] Unexpected error in checkUserRole:', err.message)
      if (attempt < MAX_RETRIES) {
        await new Promise(res => setTimeout(res, RETRY_DELAYS[attempt] ?? 2000))
        return checkUserRole(userId, mounted, attempt + 1)
      }
      console.error('[AuthContext] Unrecoverable. Signing out.')
      setLoading(false)
      setRole(null)
      setCompanyId(null)
      setCompanyName(null)
      await supabase.auth.signOut()
    } finally {
      setLoading(false)
      console.log('[AuthContext] loading = false')
    }
  }

  const signOut = async () => {
    currentUserId.current = null
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setRole(null)
    setCompanyId(null)
    setCompanyName(null)
  }

  const value = {
    user,
    session,
    role,
    companyId,
    companyName,
    loading,
    signOut,
    refreshWorkspace: () => user?.id ? checkUserRole(user.id, true) : Promise.resolve(),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  return useContext(AuthContext)
}
