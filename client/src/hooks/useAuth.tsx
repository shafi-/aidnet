'use client'

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from 'react'
import { useRouter } from 'next/navigation'
import { supabaseManager } from '@/lib/supabase'
import { isEmailNotConfirmed } from '@/lib/authErrors'
import type { AuthState } from '@/types'

export interface AuthActionResult {
  error: string | null
  // True when Supabase withholds the session because the email is not
  // confirmed: a rejected password grant on sign-in, or a session-less
  // signup when the project requires email confirmation.
  needsVerification: boolean
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<AuthActionResult>
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<AuthActionResult>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  resendVerificationEmail: (email: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  useEffect(() => {
    supabaseManager
      .getClient()
      .auth.getSession()
      .then(({ data: { session } }) => {
        setState({
          user: session?.user
            ? { id: session.user.id, email: session.user.email ?? '' }
            : null,
          loading: false,
          error: null,
        })
      })

    const {
      data: { subscription },
    } = supabaseManager
      .getClient()
      .auth.onAuthStateChange((_event, session) => {
        setState({
          user: session?.user
            ? { id: session.user.id, email: session.user.email ?? '' }
            : null,
          loading: false,
          error: null,
        })
      })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      const { error } = await supabaseManager
        .getClient()
        .auth.signInWithPassword({ email, password })
      return {
        error: error?.message ?? null,
        needsVerification: isEmailNotConfirmed(error),
      }
    },
    []
  )

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<AuthActionResult> => {
      const { data, error } = await supabaseManager.getClient().auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      })
      return {
        error: error?.message ?? null,
        needsVerification: !error && data.session === null,
      }
    },
    []
  )

  const signOut = useCallback(async () => {
    await supabaseManager.getClient().auth.signOut()
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabaseManager
      .getClient()
      .auth.resetPasswordForEmail(email)
    return { error: error?.message ?? null }
  }, [])

  // Re-sends the signup confirmation email through Supabase's built-in
  // email service — no third-party provider, so it stays within the
  // project's zero-cost policy (subject to GoTrue's rate limits).
  const resendVerificationEmail = useCallback(async (email: string) => {
    const { error } = await supabaseManager
      .getClient()
      .auth.resend({ type: 'signup', email })
    return { error: error?.message ?? null }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        resetPassword,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function useRequireAuth() {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!auth.loading && !auth.user) {
      router.push('/auth/login')
    }
  }, [auth.loading, auth.user, router])

  return auth
}
