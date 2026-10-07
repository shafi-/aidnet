import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AuthApiError } from '@supabase/supabase-js'
import { act, renderHook, waitFor } from '@testing-library/react'

import { AuthProvider, useAuth } from './useAuth'

const mockAuth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseManager: {
    getClient: () => ({ auth: mockAuth }),
  },
}))

function renderUseAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

describe('useAuth verification-aware results', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockAuth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    })
    mockAuth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    })
  })

  describe('signIn', () => {
    it('When the email is unconfirmed, reports needsVerification', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError(
          'Email not confirmed',
          400,
          'email_not_confirmed'
        ),
      })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      let outcome: { error: string | null; needsVerification: boolean }
      await act(async () => {
        outcome = await result.current.signIn('unverified@example.com', 'pw')
      })

      expect(outcome!).toEqual({
        error: 'Email not confirmed',
        needsVerification: true,
      })
      expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
        email: 'unverified@example.com',
        password: 'pw',
      })
    })

    it('When the auth server only sends the legacy prose message, reports needsVerification', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError('Email not confirmed', 400, undefined),
      })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const outcome = await result.current.signIn('a@b.c', 'pw')
        expect(outcome.needsVerification).toBe(true)
      })
    })

    it('When credentials are invalid, reports a plain error', async () => {
      mockAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError(
          'Invalid login credentials',
          400,
          'invalid_credentials'
        ),
      })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const outcome = await result.current.signIn('a@b.c', 'wrong')
        expect(outcome).toEqual({
          error: 'Invalid login credentials',
          needsVerification: false,
        })
      })
    })
  })

  describe('signUp', () => {
    it('When confirmation is required (no session issued), reports needsVerification', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: { id: 'u1' }, session: null },
        error: null,
      })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const outcome = await result.current.signUp('new@example.com', 'pw')
        expect(outcome).toEqual({ error: null, needsVerification: true })
      })
      expect(mockAuth.signUp).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'pw',
        options: { data: { full_name: undefined } },
      })
    })

    it('When a session is issued immediately, reports no verification needed', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: {
          user: { id: 'u1' },
          session: { access_token: 'token' } as never,
        },
        error: null,
      })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const outcome = await result.current.signUp('new@example.com', 'pw')
        expect(outcome).toEqual({ error: null, needsVerification: false })
      })
    })

    it('When signup fails, reports the error without verification flag', async () => {
      mockAuth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: new AuthApiError(
          'User already registered',
          422,
          'user_already_exists'
        ),
      })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const outcome = await result.current.signUp('taken@example.com', 'pw')
        expect(outcome).toEqual({
          error: 'User already registered',
          needsVerification: false,
        })
      })
    })
  })

  describe('resendVerificationEmail', () => {
    it('When called, re-sends the signup confirmation via auth.resend', async () => {
      mockAuth.resend.mockResolvedValue({ data: {}, error: null })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const outcome = await result.current.resendVerificationEmail('a@b.c')
        expect(outcome).toEqual({ error: null })
      })
      expect(mockAuth.resend).toHaveBeenCalledWith({
        type: 'signup',
        email: 'a@b.c',
      })
    })

    it('When resend is rate-limited, surfaces the error message', async () => {
      mockAuth.resend.mockResolvedValue({
        data: {},
        error: new AuthApiError(
          'Only 2 requests per hour',
          429,
          'over_email_send_rate_limit'
        ),
      })

      const { result } = renderUseAuth()
      await waitFor(() => expect(result.current.loading).toBe(false))

      await act(async () => {
        const outcome = await result.current.resendVerificationEmail('a@b.c')
        expect(outcome).toEqual({ error: 'Only 2 requests per hour' })
      })
    })
  })
})
