'use client'

import type { CampaignFormController } from '@/hooks/useCampaignForm'

export function CampaignForm({
  controller,
}: {
  controller: CampaignFormController
}) {
  const {
    mode,
    form,
    set,
    tags,
    tagsLoading,
    selectedTags,
    toggleTag,
    saving,
    error,
    submit,
    cancel,
  } = controller

  return (
    <form
      onSubmit={e => {
        e.preventDefault()
        submit()
      }}
      className="space-y-4"
    >
      {error && <div className="text-sm text-red-600">{error}</div>}

      <Field label="Title">
        <input
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder="Clean Water for Village X"
        />
      </Field>

      <Field label="Slug (auto from title if empty)">
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.slug}
          onChange={e => set('slug', e.target.value)}
          placeholder="clean-water-for-village-x"
        />
      </Field>

      <Field label="Description">
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />
      </Field>

      <Field label="Cover Image URL">
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.coverImageUrl}
          onChange={e => set('coverImageUrl', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Goal Amount (display only)">
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.goalAmount}
            onChange={e => set('goalAmount', e.target.value)}
          />
        </Field>
        <Field label="Currency">
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.currency}
            onChange={e => set('currency', e.target.value)}
            maxLength={3}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date">
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="End Date">
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.endDate}
            onChange={e => set('endDate', e.target.value)}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isZakatEligible}
          onChange={e => set('isZakatEligible', e.target.checked)}
        />
        <span className="text-sm text-gray-700">Zakat eligible</span>
      </label>

      {/* Not a <Field>/<label>: labels must not wrap interactive chips —
          doing so hijacks every chip's accessible name. */}
      <div className="block space-y-1">
        <span className="text-sm font-medium text-gray-700">Tags</span>
        {tagsLoading ? (
          <p className="text-sm text-gray-500">Loading tags...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map(t => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={selectedTags.includes(t.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selectedTags.includes(t.id)
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving
            ? 'Saving...'
            : mode === 'create'
              ? 'Create Campaign'
              : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-md border border-gray-300 px-5 py-2 hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}
