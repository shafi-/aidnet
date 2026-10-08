'use client'

import { useTranslation } from 'react-i18next'
import type { CampaignFormController } from '@/hooks/useCampaignForm'

export function CampaignForm({
  controller,
}: {
  controller: CampaignFormController
}) {
  const { t } = useTranslation()
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
    payment,
    setPayment,
    forPerson,
    setForPerson,
    beneficiary,
    setBeneficiary,
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

      <Field label={t('campaignForm.titleLabel')}>
        <input
          required
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          placeholder={t('campaignForm.titlePlaceholder')}
        />
      </Field>

      <Field
        label={t('campaignForm.slugLabel')}
        hint={t('campaignForm.slugHint')}
      >
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.slug}
          onChange={e => set('slug', e.target.value)}
          placeholder={t('campaignForm.slugPlaceholder')}
        />
      </Field>

      <Field label={t('common.descriptionLabel')}>
        <textarea
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={4}
          value={form.description}
          onChange={e => set('description', e.target.value)}
        />
      </Field>

      <Field
        label={t('campaignForm.addressLabel')}
        hint={t('campaignForm.addressHint')}
      >
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder={t('campaignForm.addressPlaceholder')}
        />
      </Field>

      <Field
        label={t('campaignForm.coverImageUrl')}
        hint={t('campaignForm.coverImageHint')}
      >
        <input
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          value={form.coverImageUrl}
          onChange={e => set('coverImageUrl', e.target.value)}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label={t('campaignForm.goalAmount')}
          hint={t('campaignForm.goalAmountHint')}
        >
          <input
            type="number"
            step="0.01"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.goalAmount}
            onChange={e => set('goalAmount', e.target.value)}
          />
        </Field>
        <Field label={t('campaignForm.currency')}>
          <input
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.currency}
            onChange={e => set('currency', e.target.value)}
            maxLength={3}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label={t('campaignForm.startDate')}>
          <input
            type="date"
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={form.startDate}
            onChange={e => set('startDate', e.target.value)}
          />
        </Field>
        <Field label={t('campaignForm.endDate')}>
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
        <span className="text-sm text-gray-700">
          {t('campaignForm.zakatEligible')}
        </span>
      </label>

      {/* Not a <Field>/<label>: labels must not wrap interactive chips —
          doing so hijacks every chip's accessible name. */}
      <div className="block space-y-1">
        <span className="text-sm font-medium text-gray-700">
          {t('campaignForm.tags')}
        </span>
        {tagsLoading ? (
          <p className="text-sm text-gray-500">
            {t('campaignForm.loadingTags')}
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <button
                  type="button"
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  aria-pressed={selectedTags.includes(tag.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    selectedTags.includes(tag.id)
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                >
                  {tag.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <Field label={t('campaignForm.forLabel')}>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="beneficiary-type"
              checked={!forPerson}
              onChange={() => setForPerson(false)}
            />
            {t('campaignForm.forOrg')}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="beneficiary-type"
              checked={forPerson}
              onChange={() => setForPerson(true)}
            />
            {t('campaignForm.forPerson')}
          </label>
        </div>
      </Field>

      {forPerson && (
        <div className="space-y-3 rounded-md border border-gray-200 p-4">
          <p className="text-sm font-medium text-gray-700">
            {t('campaignForm.benTitle')}
          </p>
          <Field label={t('campaignForm.benFullName')}>
            <input
              required
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={beneficiary.fullName}
              onChange={e =>
                setBeneficiary({ ...beneficiary, fullName: e.target.value })
              }
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('campaignForm.benRelationship')}>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={beneficiary.relationship ?? ''}
                onChange={e =>
                  setBeneficiary({
                    ...beneficiary,
                    relationship: e.target.value,
                  })
                }
              />
            </Field>
            <Field label={t('campaignForm.benPhone')}>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={beneficiary.phone ?? ''}
                onChange={e =>
                  setBeneficiary({ ...beneficiary, phone: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t('campaignForm.benNationalId')}>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={beneficiary.nationalId ?? ''}
                onChange={e =>
                  setBeneficiary({
                    ...beneficiary,
                    nationalId: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              label={t('campaignForm.benDocumentUrl')}
              hint={t('campaignForm.benDocumentHint')}
            >
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={beneficiary.documentUrl ?? ''}
                onChange={e =>
                  setBeneficiary({
                    ...beneficiary,
                    documentUrl: e.target.value,
                  })
                }
              />
            </Field>
          </div>
          <p className="text-xs text-gray-500">
            {t('campaignForm.benPrivacy')}
          </p>
        </div>
      )}

      <div className="space-y-3 rounded-md border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700">
          {t('campaignForm.payTitle')}
        </p>
        <p className="text-xs text-gray-500">{t('campaignForm.payHint')}</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label={t('campaignForm.bkashNumber')}>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={payment.bkashNumber}
              onChange={e => setPayment({ bkashNumber: e.target.value })}
            />
          </Field>
          <Field label={t('campaignForm.nagadNumber')}>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={payment.nagadNumber}
              onChange={e => setPayment({ nagadNumber: e.target.value })}
            />
          </Field>
          <Field label={t('campaignForm.rocketNumber')}>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={payment.rocketNumber}
              onChange={e => setPayment({ rocketNumber: e.target.value })}
            />
          </Field>
          <Field label={t('campaignForm.bankName')}>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={payment.bankName}
              onChange={e => setPayment({ bankName: e.target.value })}
            />
          </Field>
          <Field label={t('campaignForm.bankAccountNumber')}>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={payment.bankAccountNumber}
              onChange={e => setPayment({ bankAccountNumber: e.target.value })}
            />
          </Field>
          <Field label={t('campaignForm.donationUrl')}>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={payment.donationUrl}
              onChange={e => setPayment({ donationUrl: e.target.value })}
            />
          </Field>
        </div>
        <Field label={t('campaignForm.instructions')}>
          <textarea
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            value={payment.instructions}
            onChange={e => setPayment({ instructions: e.target.value })}
          />
        </Field>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-indigo-600 px-5 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {saving
            ? t('common.saving')
            : mode === 'create'
              ? t('campaignForm.create')
              : t('common.saveChanges')}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-md border border-gray-300 px-5 py-2 hover:bg-gray-50"
        >
          {t('common.cancel')}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      {children}
    </label>
  )
}
