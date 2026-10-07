'use client'

import { useTranslation } from 'react-i18next'

export type ResendState = 'idle' | 'sending' | 'sent'

interface EmailVerificationNoticeProps {
  email: string
  resendState: ResendState
  resendError: string
  onResend: () => void
  footer?: React.ReactNode
}

// Explains that the account is unusable until the confirmation email is
// clicked, and offers a resend. Stateless: containers own the resend call.
export function EmailVerificationNotice({
  email,
  resendState,
  resendError,
  onResend,
  footer,
}: EmailVerificationNoticeProps) {
  const { t } = useTranslation()

  return (
    <div
      className="mb-4 rounded border border-amber-200 bg-amber-50 px-4 py-3"
      role="alert"
      data-testid="email-verification-notice"
    >
      <p className="font-medium text-amber-800">{t('auth.verifyEmailTitle')}</p>
      <p className="mt-1 text-sm text-amber-700">
        {t('auth.verifyEmailBody', { email })}
      </p>

      {resendState === 'sent' && (
        <p className="mt-2 text-sm text-green-700" role="status">
          {t('auth.verificationEmailSent', { email })}
        </p>
      )}
      {resendError && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {resendError}
        </p>
      )}

      <button
        type="button"
        onClick={onResend}
        disabled={resendState === 'sending'}
        className="mt-3 rounded-md border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {resendState === 'sending'
          ? t('auth.verificationEmailSending')
          : t('auth.resendVerificationEmail')}
      </button>

      {footer && <div className="mt-3 text-sm">{footer}</div>}
    </div>
  )
}
