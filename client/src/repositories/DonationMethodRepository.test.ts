import { describe, expect, it } from 'vitest'
import { DonationMethodRepository } from './DonationMethodRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aDonationMethod } from '@/testing/fixtures'

describe('DonationMethodRepository', () => {
  it('getDonationMethods scopes by p_org_id', async () => {
    const methods = [aDonationMethod()]
    const gw = createMockRpcGateway({ get_donation_methods: { data: methods } })
    const res = await new DonationMethodRepository(gw).getDonationMethods(
      'org-1'
    )

    expect(res.data).toEqual(methods)
    expect(gw.callsTo('get_donation_methods')[0].params).toEqual({
      p_org_id: 'org-1',
    })
  })

  it('upsertDonationMethods maps camelCase DTO to snake_case params with defaults', async () => {
    const method = aDonationMethod()
    const gw = createMockRpcGateway({
      upsert_donation_methods: { data: method },
    })
    const res = await new DonationMethodRepository(gw).upsertDonationMethods(
      'org-1',
      {
        bkashNumber: '01700-000000',
        bkashAccountName: 'Demo Org',
        isPreferred: true,
      }
    )

    expect(res.data).toEqual(method)
    expect(gw.callsTo('upsert_donation_methods')[0].params).toEqual({
      p_org_id: 'org-1',
      p_bkash_number: '01700-000000',
      p_bkash_account_name: 'Demo Org',
      p_nagad_number: null,
      p_nagad_account_name: null,
      p_rocket_number: null,
      p_rocket_account_name: null,
      p_bank_name: null,
      p_bank_account_number: null,
      p_bank_account_name: null,
      p_bank_routing_number: null,
      p_bank_branch: null,
      p_donation_url: null,
      p_qr_image_url: null,
      p_instructions: null,
      p_is_preferred: true,
    })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      upsert_donation_methods: { error: 'forbidden' },
    })
    const res = await new DonationMethodRepository(gw).upsertDonationMethods(
      'org-1',
      {}
    )

    expect(res).toEqual({ data: null, error: 'forbidden' })
  })
})
