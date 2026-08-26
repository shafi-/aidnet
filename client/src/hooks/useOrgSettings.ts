'use client'

import { useState, useEffect } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { orgRequestService } from '@/services/OrgRequestService'

export function useOrgSettings(orgId: string) {
  const { currentOrg, refreshOrg } = useOrganization()
  const [name, setName] = useState(currentOrg?.name ?? '')
  const [slug, setSlug] = useState(currentOrg?.slug ?? '')
  const [description, setDescription] = useState(currentOrg?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name)
      setSlug(currentOrg.slug)
      setDescription(currentOrg.description ?? '')
    }
  }, [currentOrg])

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    setSaved(false)
    try {
      // org_meta is the editable metadata source (see org_request_workflow);
      // writing organizations directly gets masked by the COALESCE read.
      const { error } = await orgRequestService.updateOrgMeta(orgId, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      if (error) {
        setSaving(false)
        return
      }
      await refreshOrg()
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaving(false)
    }
  }

  return {
    name,
    setName,
    slug,
    setSlug,
    description,
    setDescription,
    saving,
    saved,
    save,
  }
}

export type OrgSettingsController = ReturnType<typeof useOrgSettings>
