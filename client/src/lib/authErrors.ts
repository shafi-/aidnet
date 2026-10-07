import { isAuthApiError } from '@supabase/supabase-js'

// GoTrue rejects a password grant for an unconfirmed email with the structured
// `email_not_confirmed` code; older auth servers only send the prose message.
const EMAIL_NOT_CONFIRMED_CODE = 'email_not_confirmed'
const EMAIL_NOT_CONFIRMED_MESSAGE = /email.{0,15}not.{0,15}confirmed/i

export function isEmailNotConfirmed(error: unknown): boolean {
  if (isAuthApiError(error)) {
    return (
      error.code === EMAIL_NOT_CONFIRMED_CODE ||
      EMAIL_NOT_CONFIRMED_MESSAGE.test(error.message)
    )
  }
  return false
}
