'use client'

import { useTranslation } from 'react-i18next'
import type { ProfileController } from '@/hooks/useProfile'

export function ProfileComponent({
  controller,
}: {
  controller: ProfileController
}) {
  const { t } = useTranslation()
  const {
    email,
    fullName,
    setFullName,
    orgName,
    loading,
    saving,
    saved,
    saveError,
    save,
  } = controller

  if (loading) return <div>{t('common.loading')}</div>

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('titles.profile')}</h1>
      <div className="space-y-4 rounded-lg bg-white p-6 shadow">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('common.emailLabel')}
          </label>
          <p className="mt-1 text-gray-900">{email}</p>
        </div>
        <div>
          <label
            htmlFor="full-name"
            className="block text-sm font-medium text-gray-700"
          >
            {t('auth.fullName')}
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={e => setFullName(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('profile.organization')}
          </label>
          <p className="mt-1 text-gray-900">{orgName ?? t('profile.noOrg')}</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? t('common.saving') : t('common.saveChanges')}
        </button>
        {saved && (
          <p className="text-sm text-green-600" role="status">
            {t('profile.saved')}
          </p>
        )}
        {saveError && (
          <p className="text-sm text-red-600" role="alert">
            {saveError}
          </p>
        )}
      </div>
    </div>
  )
}
