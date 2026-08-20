'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { campaignService } from '@/services/CampaignService'
import { useCampaignTags } from '@/hooks/useCampaigns'
import type { Campaign, CampaignTag, CreateCampaignDto, UpdateCampaignDto } from '@/types'

type FormState = {
  title: string
  slug: string
  description: string
  coverImageUrl: string
  goalAmount: string
  currency: string
  startDate: string
  endDate: string
  isZakatEligible: boolean
}

const empty: FormState = {
  title: '',
  slug: '',
  description: '',
  coverImageUrl: '',
  goalAmount: '',
  currency: 'BDT',
  startDate: '',
  endDate: '',
  isZakatEligible: false,
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function CampaignForm({
  orgId,
  mode,
  initial,
  campaignId,
}: {
  orgId: string
  mode: 'create' | 'edit'
  initial?: Campaign
  campaignId?: string
}) {
  const router = useRouter()
  const { tags, loading: tagsLoading } = useCampaignTags()
  const [form, setForm] = useState<FormState>(
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          description: initial.description ?? '',
          coverImageUrl: initial.cover_image_url ?? '',
          goalAmount: initial.goal_amount != null ? String(initial.goal_amount) : '',
          currency: initial.currency ?? 'BDT',
          startDate: initial.start_date ?? '',
          endDate: initial.end_date ?? '',
          isZakatEligible: initial.is_zakat_eligible ?? false,
        }
      : empty
  )
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const slug = form.slug || slugify(form.title)
    const goal = form.goalAmount ? Number(form.goalAmount) : null

    if (mode === 'create') {
      const dto: CreateCampaignDto = {
        orgId,
        title: form.title,
        slug,
        description: form.description || null,
        coverImageUrl: form.coverImageUrl || null,
        goalAmount: goal,
        currency: form.currency,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isZakatEligible: form.isZakatEligible,
      }
      const { data, error: err } = await campaignService.createCampaign(dto)
      if (err) {
        setError(err)
        setSaving(false)
        return
      }
      const created = data as Campaign
      if (selectedTags.length && created?.id) {
        await campaignService.setCampaignTags(created.id, selectedTags)
      }
      router.push('/dashboard/campaigns')
    } else if (campaignId) {
      const dto: UpdateCampaignDto = {
        title: form.title,
        slug,
        description: form.description || null,
        coverImageUrl: form.coverImageUrl || null,
        goalAmount: goal,
        currency: form.currency,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        isZakatEligible: form.isZakatEligible,
      }
      const { error: err } = await campaignService.updateCampaign(campaignId, dto)
      if (err) {
        setError(err)
        setSaving(false)
        return
      }
      await campaignService.setCampaignTags(campaignId, selectedTags)
      router.push('/dashboard/campaigns')
    }
  }

  const toggleTag = (id: string) =>
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <Field label="Title">
        <input
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Clean Water for Village X"
        />
      </Field>

      <Field label="Slug (auto from title if empty)">
        <input
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.slug}
          onChange={(e) => set('slug', e.target.value)}
          placeholder="clean-water-for-village-x"
        />
      </Field>

      <Field label="Description">
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>

      <Field label="Cover Image URL">
        <input
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.coverImageUrl}
          onChange={(e) => set('coverImageUrl', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Goal Amount (display only)">
          <input
            type="number"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.goalAmount}
            onChange={(e) => set('goalAmount', e.target.value)}
          />
        </Field>
        <Field label="Currency">
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.currency}
            onChange={(e) => set('currency', e.target.value)}
            maxLength={3}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Start Date">
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </Field>
        <Field label="End Date">
          <input
            type="date"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.endDate}
            onChange={(e) => set('endDate', e.target.value)}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={form.isZakatEligible}
          onChange={(e) => set('isZakatEligible', e.target.checked)}
        />
        <span className="text-sm text-gray-700">Zakat eligible</span>
      </label>

      <Field label="Tags">
        {tagsLoading ? (
          <p className="text-sm text-gray-500">Loading tags...</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(tags as CampaignTag[]).map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => toggleTag(t.id)}
                className={`px-3 py-1 rounded-full text-sm border ${
                  selectedTags.includes(t.id)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-indigo-600 text-white px-5 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create Campaign' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/dashboard/campaigns')}
          className="border border-gray-300 px-5 py-2 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}
