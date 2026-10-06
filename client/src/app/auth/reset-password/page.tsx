'use client'

import { useState } from 'react'
import { supabaseManager } from '@/lib/supabase'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  usePageTitle(t('titles.resetPassword'))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await supabaseManager
      .getClient()
      .auth.resetPasswordForEmail(email)
    if (result.error) {
      setError(result.error.message)
    } else {
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">{t('resetPassword.sentTitle')}</h1>
        <p className="text-gray-600">
          {t('resetPassword.sentBody', { email })}
        </p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          {t('resetPassword.backToLogin')}
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('resetPassword.title')}</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="reset-email"
            className="block text-sm font-medium text-gray-700"
          >
            {t('resetPassword.emailLabel')}
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          {t('resetPassword.sendLink')}
        </button>
      </form>
    </div>
  )
}
