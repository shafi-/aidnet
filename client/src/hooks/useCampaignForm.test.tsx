import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import { useCampaignForm } from './useCampaignForm'

const mockPush = vi.fn()
const mockCreate = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn() }),
}))

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaignTags: () => ({ tags: [], loading: false }),
}))

const mockSetBeneficiary = vi.hoisted(() => vi.fn())
const mockSetPaymentMethods = vi.hoisted(() => vi.fn())

vi.mock('@/services/CampaignService', () => ({
  campaignService: {
    createCampaign: mockCreate,
    updateCampaign: vi.fn().mockResolvedValue({ data: null, error: null }),
    setCampaignTags: vi.fn().mockResolvedValue({ data: null, error: null }),
    setBeneficiary: mockSetBeneficiary,
    getBeneficiary: vi.fn().mockResolvedValue({ data: [], error: null }),
    getPaymentMethods: vi.fn().mockResolvedValue({ data: null, error: null }),
    setPaymentMethods: mockSetPaymentMethods,
  },
}))

vi.mock('@/hooks/useDonationMethods', () => ({
  useDonationMethods: () => ({ methods: [], loading: false, error: null }),
}))

const ORG_ID = '33333333-3333-3333-3333-333333333333'

function setupCreate() {
  return renderHook(() => useCampaignForm({ orgId: ORG_ID, mode: 'create' }))
}

function setupEdit(initial: { title: string; slug: string }) {
  return renderHook(() =>
    useCampaignForm({
      orgId: ORG_ID,
      mode: 'edit',
      campaignId: 'c1',
      initial: {
        ...initial,
        description: null,
        cover_image_url: null,
        goal_amount: 100,
        currency: 'BDT',
        start_date: null,
        end_date: null,
        is_zakat_eligible: false,
        tags: [],
      } as never,
    })
  )
}

describe('useCampaignForm slug auto-generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreate.mockResolvedValue({ data: { id: 'c1' }, error: null })
    mockSetBeneficiary.mockResolvedValue({ data: null, error: null })
    mockSetPaymentMethods.mockResolvedValue({ data: null, error: null })
  })

  it('When the title is typed, the slug auto-generates in create mode', () => {
    const { result } = setupCreate()
    act(() => result.current.set('title', 'Clean Water for Village X!'))
    expect(result.current.form.slug).toBe('clean-water-for-village-x')
  })

  it('When the user overrides the slug, title changes no longer touch it', () => {
    const { result } = setupCreate()
    act(() => result.current.set('title', 'First Title'))
    act(() => result.current.set('slug', 'my-own-slug'))
    act(() => result.current.set('title', 'Second Title'))
    expect(result.current.form.slug).toBe('my-own-slug')
  })

  it('When editing an existing campaign, the slug is never auto-rewritten', () => {
    const { result } = setupEdit({ title: 'Old Title', slug: 'old-title' })
    act(() => result.current.set('title', 'Renamed Campaign'))
    expect(result.current.form.slug).toBe('old-title')
  })

  it('When a slug cannot be derived (non-Latin title), submit fails with a clear error', async () => {
    const { result } = setupCreate()
    act(() => result.current.set('title', 'জল প্রকল্প'))
    await act(async () => result.current.submit())
    expect(result.current.error).toMatch(/slug/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('When submit succeeds, the derived slug and address are sent to the service', async () => {
    const { result } = setupCreate()
    act(() => result.current.set('title', 'Winter Relief'))
    act(() => result.current.set('address', 'Rangpur, Bangladesh'))
    await act(async () => result.current.submit())
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        slug: 'winter-relief',
        address: 'Rangpur, Bangladesh',
      })
    )
  })

  it('When raising for a person, the beneficiary is saved after the campaign', async () => {
    const { result } = setupCreate()
    act(() => {
      result.current.set('title', 'Help Fatema')
      result.current.setForPerson(true)
      result.current.setBeneficiary({
        ...result.current.beneficiary,
        fullName: 'Fatema Begum',
      })
    })
    await act(async () => result.current.submit())
    expect(mockSetBeneficiary).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ fullName: 'Fatema Begum' })
    )
  })

  it('When a person campaign has no beneficiary name, submit fails before the service call', async () => {
    const { result } = setupCreate()
    act(() => {
      result.current.set('title', 'Help Someone')
      result.current.setForPerson(true)
    })
    await act(async () => result.current.submit())
    expect(result.current.error).toMatch(/full name/i)
    expect(mockCreate).not.toHaveBeenCalled()
  })

  it('When payment details are filled in, they are saved to the campaign, not the org', async () => {
    const { result } = setupCreate()
    act(() => {
      result.current.set('title', 'Winter Relief')
      result.current.setPayment({ bkashNumber: '01712345678' })
    })
    await act(async () => result.current.submit())
    expect(mockSetPaymentMethods).toHaveBeenCalledTimes(1)
    expect(mockSetPaymentMethods).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({ bkashNumber: '01712345678' })
    )
  })

  it('When no payment details are entered, no payment write is attempted', async () => {
    const { result } = setupCreate()
    act(() => result.current.set('title', 'No Payment Campaign'))
    await act(async () => result.current.submit())
    expect(mockSetPaymentMethods).not.toHaveBeenCalled()
  })
})
