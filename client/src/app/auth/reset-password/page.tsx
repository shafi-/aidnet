'use client'

import { useState } from 'react'
import { supabaseManager } from '@/lib/supabase'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await supabaseManager
      .getClient()
      .auth.resetPasswordForEmail(email)
    console.log('[ResetPassword] resetPasswordForEmail result:', result)
    if (result.error) {
      console.log('[ResetPassword] Error:', result.error)
      setError(result.error.message)
    } else {
      console.log('[ResetPassword] Success, setting sent=true')
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-gray-600">
          We sent a password reset link to {email}
        </p>
        <Link href="/auth/login" className="text-blue-600 hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Reset Password</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
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
          Send reset link
        </button>
      </form>
    </div>
  )
}
