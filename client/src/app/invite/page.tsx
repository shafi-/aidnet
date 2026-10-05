'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useRequiredParam, isInviteToken } from '@/hooks/useQueryParam'
import { inviteService } from '@/services/InviteService'
import { useAuth } from '@/hooks/useAuth'
import { AppLayout } from '@/components/layout/AppLayout'
import Link from 'next/link'

type Status =
  'enter-email' | 'loading' | 'valid' | 'invalid' | 'accepted' | 'error'

export default function InvitePage() {
  const token = useRequiredParam('token')
  const router = useRouter()
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>('enter-email')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

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
    setTimeout(() => router.push('/orgs'), 2000)
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-md space-y-4 text-center">
        {(status === 'enter-email' || status === 'loading') && (
          <form onSubmit={handleValidate} className="space-y-4">
            <h1 className="text-2xl font-bold">You&apos;ve been invited!</h1>
            <p className="text-gray-600">
              Enter your email to see which organization invited you.
            </p>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-gray-300 px-3 py-2"
              required
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {status === 'loading' ? 'Checking invite...' : 'Check Invite'}
            </button>
          </form>
        )}
        {status === 'invalid' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">Invalid Invite</h1>
            <p className="text-gray-600">
              This invite is invalid, expired, was already used, or was issued
              to a different email address.
            </p>
            <Link href="/" className="text-blue-600 hover:underline">
              Go home
            </Link>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-red-600">Error</h1>
            <p className="text-gray-600">
              {errorMsg || 'Something went wrong.'}
            </p>
            <Link href="/" className="text-blue-600 hover:underline">
              Go home
            </Link>
          </div>
        )}
        {status === 'accepted' && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-green-600">Welcome!</h1>
            <p className="text-gray-600">
              Redirecting to your organizations...
            </p>
          </div>
        )}
        {status === 'valid' && !user && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">You&apos;ve been invited!</h1>
            <p className="text-gray-600">
              Sign in with <strong>{email}</strong> to join{' '}
              <strong>{orgName}</strong>
            </p>
            <Link
              href="/auth/login"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign in
            </Link>
          </div>
        )}
        {status === 'valid' && user && (
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Join {orgName}</h1>
            <p className="text-gray-600">
              Click below to accept the invitation.
            </p>
            <button
              onClick={handleAccept}
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Accept Invitation
            </button>
          </div>
        )}
      </div>
    </AppLayout>
  )
}
