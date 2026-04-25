import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext({})

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState(null)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        checkUserRole(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes — only set user/session here
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('[AuthContext] onAuthStateChange:', _event)
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        checkUserRole(session.user.id)
      } else {
        setRole(null)
        setLoading(false)
        if (_event === 'SIGNED_OUT') {
          // Force UI update and clear stale state by hard redirecting
          window.location.href = '/auth'
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const checkUserRole = async (userId) => {
    console.log('[AuthContext] checkUserRole start:', userId)
    try {
      // Use plain .select() — returns array, NEVER throws 406
      // (.single() and .maybeSingle() can hang or throw on RLS-blocked tables)
      const result = await Promise.race([
        supabase
          .from('employees')
          .select('id')
          .eq('user_id', userId),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Role check timed out')), 5000)
        )
      ])

      const { data, error } = result
      console.log('[AuthContext] Role query result:', { data, error })

      if (error) {
        console.error('[AuthContext] Role query error:', error)
        setRole('admin')
        return
      }

      const resolvedRole = (data && data.length > 0) ? 'employee' : 'admin'
      console.log('[AuthContext] Role resolved:', resolvedRole)
      setRole(resolvedRole)
    } catch (err) {
      console.error('[AuthContext] checkUserRole failed:', err.message)
      setRole('admin')
    } finally {
      setLoading(false)
      console.log('[AuthContext] loading = false')
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    session,
    role,
    loading,
    signOut
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
