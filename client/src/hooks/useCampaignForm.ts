'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { campaignService } from '@/services/CampaignService'
import { useCampaignTags } from '@/hooks/useCampaigns'
import type { Campaign, CreateCampaignDto, UpdateCampaignDto } from '@/types'

export interface CampaignFormState {
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

const empty: CampaignFormState = {
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

/**
 * Owns all campaign-form state and writes. Components render it;
 * they never call services themselves.
 */
export function useCampaignForm({
  orgId,
  mode,
  campaignId,
  initial,
}: {
  orgId: string
  mode: 'create' | 'edit'
  campaignId?: string
  initial?: Campaign
}) {
  const router = useRouter()
  const { tags, loading: tagsLoading } = useCampaignTags()
  const [form, setForm] = useState<CampaignFormState>(
    initial
      ? {
          title: initial.title,
          slug: initial.slug,
          description: initial.description ?? '',
          coverImageUrl: initial.cover_image_url ?? '',
          goalAmount:
            initial.goal_amount != null ? String(initial.goal_amount) : '',
          currency: initial.currency ?? 'BDT',
          startDate: initial.start_date ?? '',
          endDate: initial.end_date ?? '',
          isZakatEligible: initial.is_zakat_eligible ?? false,
        }
      : empty
  )
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initial?.tags ?? []
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof CampaignFormState>(
    key: K,
    value: CampaignFormState[K]
  ) => setForm(f => ({ ...f, [key]: value }))

  const toggleTag = (id: string) =>
    setSelectedTags(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )

  const cancel = () => router.push('/dashboard/campaigns')

  const validate = (): string | null => {
    if (!form.title.trim()) return 'Title is required'
    if (form.goalAmount && isNaN(Number(form.goalAmount)))
      return 'Goal amount must be a number'
    if (form.goalAmount && Number(form.goalAmount) <= 0)
      return 'Goal amount must be greater than zero'
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate)
      const end = new Date(form.endDate)
      if (end < start) return 'End date must be on or after the start date'
    }
    return null
  }

  const submit = async () => {
    setSaving(true)
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      setSaving(false)
      return
    }

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
      const created = data
      if (selectedTags.length && created?.id) {
        const { error: tagErr } = await campaignService.setCampaignTags(
          created.id,
          selectedTags
        )
        if (tagErr) {
          setError(`Campaign created, but tags could not be saved: ${tagErr}`)
          setSaving(false)
          return
        }
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
      const { error: err } = await campaignService.updateCampaign(
        campaignId,
        dto
      )
      if (err) {
        setError(err)
        setSaving(false)
        return
      }
      // Single read composes current tags, so selectedTags already reflects
      // the saved state; writing it back is always safe (never empty-wipe).
      const { error: tagErr } = await campaignService.setCampaignTags(
        campaignId,
        selectedTags
      )
      if (tagErr) {
        setError(`Saved, but tags could not be updated: ${tagErr}`)
        setSaving(false)
        return
      }
      router.push('/dashboard/campaigns')
    }
  }

  return {
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
  }
}

export type CampaignFormController = ReturnType<typeof useCampaignForm>
