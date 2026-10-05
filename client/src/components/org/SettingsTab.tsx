'use client'

import { useOrgSettings } from '@/hooks/useOrgSettings'
import { usePermissions } from '@/hooks/usePermissions'

export function SettingsTab({ orgId }: { orgId: string }) {
  const { isOrgAdmin } = usePermissions()
  const {
    name,
    setName,
    slug,
    setSlug,
    description,
    setDescription,
    saving,
    saved,
    save,
  } = useOrgSettings(orgId)

  if (!isOrgAdmin())
    return <p>You don&apos;t have permission to edit settings.</p>

  return (
    <div className="space-y-6">
      <form
        onSubmit={e => {
          e.preventDefault()
          save()
        }}
        className="max-w-2xl space-y-4"
      >
        <div>
          <label
            htmlFor="org-settings-name"
            className="block text-sm font-medium text-gray-700"
          >
            Organization Name
          </label>
          <input
            id="org-settings-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
            required
          />
        </div>
        <div>
          <label
            htmlFor="org-settings-slug"
            className="block text-sm font-medium text-gray-700"
          >
            Slug
          </label>
          <input
            id="org-settings-slug"
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2 font-mono"
            required
            pattern="[a-z0-9-]+"
          />
          <p className="mt-1 text-xs text-gray-500">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
        <div>
          <label
            htmlFor="org-settings-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="org-settings-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
            rows={3}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </form>
    </div>
  )
}
