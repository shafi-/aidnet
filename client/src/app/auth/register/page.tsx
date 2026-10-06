'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Trans, useTranslation } from 'react-i18next'
import { useAuth } from '@/hooks/useAuth'
import { usePageTitle } from '@/hooks/usePageTitle'

const consentLinkClass =
  'font-medium text-indigo-600 hover:text-indigo-700 hover:underline'

function RegisterContent() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  usePageTitle(t('titles.createAccount'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password || !confirmPassword) {
      setError(t('auth.fillRequiredFields'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDoNotMatch'))
      return
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'))
      return
    }

    try {
      setLoading(true)
      const { error } = await signUp(email, password, fullName || undefined)
      if (error) {
        setError(error)
      } else {
        const dest = next || '/dashboard'
        router.push(dest)
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : t('auth.failedToCreateAccount')
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('auth.registerTitle')}
          </h1>
          <p className="mt-2 text-gray-600">{t('auth.joinTagline')}</p>
        </div>

        {error && (
          <div
            className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="fullName"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t('auth.fullName')}{' '}
              <span className="text-gray-400">{t('auth.optional')}</span>
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={t('auth.fullNamePlaceholder')}
            />
          </div>

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
              onChange={e => setEmail(e.target.value)}
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
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              {t('auth.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
          </div>

          <div className="text-sm text-gray-600">
            <p>
              <Trans
                i18nKey="auth.agreeToTerms"
                components={{
                  termsLink: (
                    <Link href="/terms/" className={consentLinkClass} />
                  ),
                  privacyLink: (
                    <Link href="/privacy/" className={consentLinkClass} />
                  ),
                }}
              />
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('auth.creatingAccount') : t('auth.registerTitle')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('auth.haveAccount')}{' '}
            <Link
              href="/auth/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              {t('nav.signIn')}
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            {t('common.backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  const { t } = useTranslation()
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center text-gray-600">{t('common.loading')}</div>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
