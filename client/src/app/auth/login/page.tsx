'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'
import { AuthLayout } from '@/components/layout/AuthLayout'
import {
  EmailVerificationNotice,
  ResendState,
} from '@/components/auth/EmailVerificationNotice'

function LoginContent() {
  const { t } = useTranslation()
  const { signIn, resendVerificationEmail } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [needsVerification, setNeedsVerification] = useState(false)
  const [resendState, setResendState] = useState<ResendState>('idle')
  const [resendError, setResendError] = useState('')
  const [loading, setLoading] = useState(false)

  usePageTitle(t('titles.signIn'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setNeedsVerification(false)
    setResendState('idle')
    setResendError('')

    if (!email || !password) {
      setError(t('auth.fillAllFields'))
      return
    }

    try {
      setLoading(true)
      const result = await signIn(email, password)
      if (result.needsVerification) {
        setNeedsVerification(true)
      } else if (result.error) {
        setError(result.error)
      } else {
        const dest = next || '/dashboard'
        router.push(dest)
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t('auth.failedToSignIn')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResendError('')
    setResendState('sending')
    const { error } = await resendVerificationEmail(email)
    if (error) {
      setResendError(error)
      setResendState('idle')
    } else {
      setResendState('sent')
    }
  }

  return (
    <AuthLayout>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {t('auth.loginTitle')}
        </h1>
        <p className="mt-2 text-muted-foreground">{t('auth.loginSubtitle')}</p>
      </div>

      {needsVerification ? (
        <EmailVerificationNotice
          email={email}
          resendState={resendState}
          resendError={resendError}
          onResend={handleResend}
        />
      ) : (
        error && (
          <div
            className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            role="alert"
          >
            {error}
          </div>
        )
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {t('auth.emailAddress')}
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => {
              setError('')
              setEmail(e.target.value)
            }}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={t('common.emailPlaceholder')}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            {t('auth.password')}
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => {
              setError('')
              setPassword(e.target.value)
            }}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-end">
          <Link
            href="/auth/reset-password/"
            className="text-sm text-indigo-600 hover:text-indigo-500"
          >
            {t('auth.forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? t('auth.signingIn') : t('auth.loginTitle')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {t('auth.noAccount')}{' '}
          <Link
            href="/auth/register"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {t('auth.signUp')}
          </Link>
        </p>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('common.backToHome')}
        </Link>
      </div>
    </AuthLayout>
  )
}

export default function LoginPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center text-gray-600">{t('common.loading')}</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  )
}
