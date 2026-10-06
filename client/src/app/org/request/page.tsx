'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { useRequireAuth } from '@/hooks/useAuth'
import { useOrgRequests } from '@/hooks/useOrgRequests'
import { AppLayout } from '@/components/layout/AppLayout'
import { usePageTitle } from '@/hooks/usePageTitle'

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function OrgRequestPage() {
  useRequireAuth()
  const { t } = useTranslation()
  const { requests, loading, submitRequest } = useOrgRequests()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  usePageTitle(t('orgRequest.title'))

  const pendingRequest = requests.find(r => r.status === 'pending')
  const approvedRequest = requests.find(r => r.status === 'approved')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!name.trim() || !slug.trim()) {
      setError(t('orgRequest.nameAndSlugRequired'))
      return
    }

    setSubmitting(true)
    const result = await submitRequest(
      name.trim(),
      slug.trim(),
      description.trim() || undefined
    )
    setSubmitting(false)

    if (!result.success) {
      setError(result.error || t('orgRequest.submitFailed'))
    } else {
      setSuccess(t('orgRequest.submitSuccess'))
      setName('')
      setSlug('')
      setDescription('')
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="py-12 text-center">{t('common.loading')}</div>
      </AppLayout>
    )
  }

  // Show approved org with redirect to dashboard
  if (approvedRequest) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
          <div className="rounded-lg bg-green-50 p-8 text-center">
            <h1 className="text-2xl font-bold text-green-900">
              {t('orgRequest.approvedTitle')}
            </h1>
            <p className="mt-2 text-green-700">
              {t('orgRequest.approvedBody', { name: approvedRequest.org_name })}
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-md bg-green-600 px-6 py-3 text-white hover:bg-green-700"
            >
              {t('orgRequest.goDashboard')}
            </Link>
          </div>
        </div>
      </AppLayout>
    )
  }

  // Show pending request status
  if (pendingRequest) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
          <div className="rounded-lg bg-yellow-50 p-8 text-center">
            <h1 className="text-2xl font-bold text-yellow-900">
              {t('orgRequest.pendingTitle')}
            </h1>
            <p className="mt-2 text-yellow-700">
              {t('orgRequest.pendingBody')}
            </p>
            <div className="mt-6 rounded-md bg-yellow-100 p-4 text-left">
              <p className="text-sm font-medium text-yellow-900">
                {t('orgRequest.pendingName', { name: pendingRequest.org_name })}
              </p>
              <p className="text-sm text-yellow-800">
                {t('orgRequest.submittedAt', {
                  date: new Date(pendingRequest.requested_at).toLocaleString(),
                })}
              </p>
            </div>
            <p className="mt-4 text-sm text-yellow-600">
              {t('orgRequest.pendingNote')}
            </p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            {t('orgRequest.title')}
          </h1>
          <p className="mt-2 text-gray-600">{t('orgRequest.subtitle')}</p>
        </div>

        {success && (
          <div className="rounded-md bg-green-50 p-4 text-green-800">
            {success}
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 p-4 text-red-800">{error}</div>
        )}

        <div className="rounded-lg bg-white p-8 shadow">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="orgName"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {t('orgRequest.orgName')}
              </label>
              <input
                id="orgName"
                type="text"
                value={name}
                onChange={e => {
                  setName(e.target.value)
                  setSlug(slugify(e.target.value))
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('orgRequest.orgNamePlaceholder')}
                required
              />
            </div>

            <div>
              <label
                htmlFor="orgSlug"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {t('orgRequest.slugLabel')}
              </label>
              <input
                id="orgSlug"
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={t('orgRequest.slugPlaceholder')}
                pattern="[a-z0-9-]+"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('orgRequest.slugHelp')}
              </p>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-medium text-gray-700"
              >
                {t('common.descriptionLabel')}
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder={t('orgRequest.descriptionPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-indigo-600 px-4 py-3 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? t('orgRequest.submitting') : t('orgRequest.submit')}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-indigo-600 hover:text-indigo-700"
          >
            {t('orgRequest.backToDashboard')}
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}
