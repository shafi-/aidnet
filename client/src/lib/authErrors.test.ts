import { describe, expect, it } from 'vitest'
import { AuthApiError } from '@supabase/supabase-js'

import { isEmailNotConfirmed } from './authErrors'

describe('isEmailNotConfirmed', () => {
  it('When error carries the email_not_confirmed code, returns true', () => {
    const error = new AuthApiError(
      'Email not confirmed',
      400,
      'email_not_confirmed'
    )
    expect(isEmailNotConfirmed(error)).toBe(true)
  })

  it('When error only carries the legacy prose message, returns true', () => {
    const error = new AuthApiError(
      'Email address not confirmed yet',
      400,
      undefined
    )
    expect(isEmailNotConfirmed(error)).toBe(true)
  })

  it('When error is a different auth failure, returns false', () => {
    const error = new AuthApiError(
      'Invalid login credentials',
      400,
      'invalid_credentials'
    )
    expect(isEmailNotConfirmed(error)).toBe(false)
  })

  it('When error is not an auth error, returns false', () => {
    expect(isEmailNotConfirmed(new Error('Email not confirmed'))).toBe(false)
    expect(isEmailNotConfirmed('Email not confirmed')).toBe(false)
    expect(isEmailNotConfirmed(null)).toBe(false)
  })
})
