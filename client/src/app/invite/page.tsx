'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { useRequiredParam, isInviteToken } from '@/hooks/useQueryParam'
import { extractInviteToken } from '@/lib/inviteToken'
import { inviteService } from '@/services/InviteService'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePageTitle } from '@/hooks/usePageTitle'
import Link from 'next/link'

type Status =
  'enter-email' | 'loading' | 'valid' | 'invalid' | 'accepted' | 'error'

export default function InvitePage() {
  const { t } = useTranslation()
  const token = useRequiredParam('token')
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('enter-email')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [pasteInput, setPasteInput] = useState('')
  const [pasteInvalid, setPasteInvalid] = useState(false)

  usePageTitle(t(token ? 'invite.invitedTitle' : 'invite.pasteTitle'))

  // No token in the URL (user came from an option card): let them paste
  // the link or code from their email invite, then join the standard flow.
  // Help text below covers the "I don't have an invite" dead end.
  if (!token) {
    const handlePaste = (e: React.FormEvent) => {
      e.preventDefault()
      const code = extractInviteToken(pasteInput)
      if (!code) {
        setPasteInvalid(true)
        return
      }
      router.replace(`/invite?token=${code}`)
    }

    return (
      <AppLayout>
        <div className="mx-auto max-w-md space-y-4 text-center">
          <form onSubmit={handlePaste} className="space-y-4">
            <h1 className="text-2xl font-bold">{t('invite.pasteTitle')}</h1>
            <p className="text-gray-600">{t('invite.pasteHint')}</p>
            <input
              type="text"
              value={pasteInput}
              onChange={e => {
                setPasteInput(e.target.value)
                setPasteInvalid(false)
              }}
              placeholder={t('invite.pastePlaceholder')}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
            {pasteInvalid && (
              <p className="text-sm text-red-600">{t('invite.pasteInvalid')}</p>
            )}
            <button
              type="submit"
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {t('invite.joinButton')}
            </button>
          </form>
          <p className="text-sm text-gray-500">
            {t('invite.noInviteHelp')}{' '}
            <Link
              href="/dashboard/campaigns/new"
              className="text-indigo-600 hover:underline"
            >
              {t('campaignNew.startOwn')}
            </Link>
          </p>
        </div>
      </AppLayout>
    )
  }

  const handleValidate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !isInviteToken(token) || !email.trim()) {
      setStatus('invalid')
      return
    }
    setStatus('loading')
    const { data, error } = await inviteService.validateInvite(
      token,
      email.trim()
    )
    if (error) {
      setStatus('error')
      setErrorMsg(error)
      return
    }
    if (!data) {
      // No distinction between unknown token / wrong email / expired /
      // already-used — the database reveals nothing.
      setStatus('invalid')
      return
    }
    setOrgName(data)
    setStatus('valid')
  }

  const handleAccept = async () => {
    if (!token) return
    setStatus('loading')
    const { error } = await inviteService.acceptInvite(token)
    if (error) {
      setStatus('error')
      setErrorMsg(error)
      return
    }
    setStatus('accepted')
    setTimeout(() => router.push('/manage/orgs'), 2000)
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-md space-y-4 text-center">
        {(status === 'enter-email' || status === 'loading') && (
          <form onSubmit={handleValidate} className="space-y-4">
            <h1 className="text-2xl font-bold">{t('invite.invitedTitle')}</h1>
            <p className="text-gray-600">{t('invite.enterEmail')}</p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('common.emailPlaceholder')}
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {status === 'loading'
                ? t('invite.checking')
                : t('invite.checkInvite')}
            </button>
          </form>
        )}
        {status === 'invalid' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">
              {t('invite.invalidTitle')}
            </h1>
            <p className="text-gray-600">{t('invite.invalidBody')}</p>
            <Link href="/" className="text-blue-600 hover:underline">
              {t('common.goHome')}
            </Link>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">
              {t('invite.errorTitle')}
            </h1>
            <p className="text-gray-600">
              {errorMsg || t('errors.somethingWentWrong')}
            </p>
            <Link href="/" className="text-blue-600 hover:underline">
              {t('common.goHome')}
            </Link>
          </div>
        )}
        {status === 'accepted' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-green-600">
              {t('invite.acceptedTitle')}
            </h1>
            <p className="text-gray-600">{t('invite.redirecting')}</p>
          </div>
        )}
        {status === 'valid' && !user && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">{t('invite.invitedTitle')}</h1>
            <p className="text-gray-600">
              {t('invite.signInToJoin', { email, org: orgName })}
            </p>
            <Link
              href="/auth/login"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {t('auth.loginTitle')}
            </Link>
          </div>
        )}
        {status === 'valid' && user && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">
              {t('invite.joinTitle', { org: orgName })}
            </h1>
            <p className="text-gray-600">{t('invite.acceptPrompt')}</p>
            <button
              onClick={handleAccept}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              {t('invite.accept')}
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
