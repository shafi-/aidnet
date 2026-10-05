import { describe, expect, it } from 'vitest'
import { OrgRequestRepository, OrgMetaRepository } from './OrgRequestRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import type { OrgRequest, OrgMeta } from '@/types'

describe('OrgRequestRepository', () => {
  describe('submitRequest', () => {
    it('submits org request with correct parameters', async () => {
      const gw = createMockRpcGateway({
        submit_org_request: { data: 'request-id-123' },
      })
      const repo = new OrgRequestRepository(gw)

      const result = await repo.submitRequest(
        'Test Org',
        'test-org',
        'A test organization'
      )

      expect(result.data).toBe('request-id-123')
      expect(gw.callsTo('submit_org_request')[0].params).toEqual({
        p_org_name: 'Test Org',
        p_org_slug: 'test-org',
        p_org_description: 'A test organization',
      })
    })

    it('handles optional description', async () => {
      const gw = createMockRpcGateway({
        submit_org_request: { data: 'request-id-456' },
      })
      const repo = new OrgRequestRepository(gw)

      const result = await repo.submitRequest('Test Org', 'test-org')

      expect(result.data).toBe('request-id-456')
      expect(gw.callsTo('submit_org_request')[0].params).toEqual({
        p_org_name: 'Test Org',
        p_org_slug: 'test-org',
        p_org_description: null,
      })
    })
  })

  describe('getMyRequests', () => {
    it('returns user org requests', async () => {
      const requests: OrgRequest[] = [
        {
          id: 'req-1',
          user_id: 'user-1',
          org_name: 'Org 1',
          org_slug: 'org-1',
          org_description: 'Description 1',
          status: 'pending',
          rejection_reason: null,
          requested_at: '2024-01-01T00:00:00Z',
          reviewed_at: null,
          reviewed_by: null,
          created_org_id: null,
        },
      ]

      const gw = createMockRpcGateway({
        get_my_org_requests: { data: requests },
      })
      const repo = new OrgRequestRepository(gw)

      const result = await repo.getMyRequests()

      expect(result.data).toEqual(requests)
      expect(gw.callsTo('get_my_org_requests')[0].params).toBeUndefined()
    })
  })

  describe('getAllRequests', () => {
    it('returns all org requests (system_admin)', async () => {
      const requests: OrgRequest[] = [
        {
          id: 'req-1',
          user_id: 'user-1',
          org_name: 'Org 1',
          org_slug: 'org-1',
          org_description: 'Description 1',
          status: 'pending',
          rejection_reason: null,
          requested_at: '2024-01-01T00:00:00Z',
          reviewed_at: null,
          reviewed_by: null,
          created_org_id: null,
        },
      ]

      const gw = createMockRpcGateway({
        get_all_org_requests: { data: requests },
      })
      const repo = new OrgRequestRepository(gw)

      const result = await repo.getAllRequests()

      expect(result.data).toEqual(requests)
      expect(gw.callsTo('get_all_org_requests')[0].params).toBeUndefined()
    })
  })

  describe('approveRequest', () => {
    it('approves org request with correct parameters', async () => {
      const gw = createMockRpcGateway({
        approve_org_request: { data: 'new-org-id' },
      })
      const repo = new OrgRequestRepository(gw)

      const result = await repo.approveRequest('req-123')

      expect(result.data).toBe('new-org-id')
      expect(gw.callsTo('approve_org_request')[0].params).toEqual({
        p_request_id: 'req-123',
      })
    })
  })

  describe('rejectRequest', () => {
    it('rejects org request with reason', async () => {
      const gw = createMockRpcGateway({
        reject_org_request: { data: true },
      })
      const repo = new OrgRequestRepository(gw)

      const result = await repo.rejectRequest('req-123', 'Not suitable')

      expect(result.data).toBe(true)
      expect(gw.callsTo('reject_org_request')[0].params).toEqual({
        p_request_id: 'req-123',
        p_rejection_reason: 'Not suitable',
      })
    })

    it('rejects org request without reason', async () => {
      const gw = createMockRpcGateway({
        reject_org_request: { data: true },
      })
      const repo = new OrgRequestRepository(gw)

      const result = await repo.rejectRequest('req-123')

      expect(result.data).toBe(true)
      expect(gw.callsTo('reject_org_request')[0].params).toEqual({
        p_request_id: 'req-123',
        p_rejection_reason: null,
      })
    })
  })
})

describe('OrgMetaRepository', () => {
  describe('getOrgMeta', () => {
    it('returns org metadata for organization', async () => {
      const meta: OrgMeta = {
        organization_id: 'org-1',
        name: 'Test Org',
        description: 'Test Description',
        logo_url: 'https://example.com/logo.png',
        website_url: 'https://example.com',
        contact_email: 'contact@example.com',
        contact_phone: '+1234567890',
        address: '123 Test St',
        social_links: {},
        settings: {},
        updated_by: 'user-1',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const gw = createMockRpcGateway({
        get_org_meta: { data: [meta] },
      })
      const repo = new OrgMetaRepository(gw)

      const result = await repo.getOrgMeta('org-1')

      expect(result.data).toEqual(meta)
      expect(gw.callsTo('get_org_meta')[0].params).toEqual({
        p_org_id: 'org-1',
      })
    })

    it('handles empty result', async () => {
      const gw = createMockRpcGateway({
        get_org_meta: { data: [] },
      })
      const repo = new OrgMetaRepository(gw)

      const result = await repo.getOrgMeta('org-1')

      expect(result.data).toBeNull()
    })
  })

  describe('updateOrgMeta', () => {
    it('updates org metadata with partial updates', async () => {
      const gw = createMockRpcGateway({
        update_org_meta: { data: true },
      })
      const repo = new OrgMetaRepository(gw)

      const updates: Partial<OrgMeta> = {
        name: 'Updated Name',
        description: 'Updated Description',
      }

      const result = await repo.updateOrgMeta('org-1', updates)

      expect(result.data).toBe(true)
      expect(gw.callsTo('update_org_meta')[0].params).toEqual({
        p_org_id: 'org-1',
        p_name: 'Updated Name',
        p_description: 'Updated Description',
        p_logo_url: null,
        p_website_url: null,
        p_contact_email: null,
        p_contact_phone: null,
        p_address: null,
        p_social_links: null,
        p_settings: null,
      })
    })

    it('handles all update fields', async () => {
      const gw = createMockRpcGateway({
        update_org_meta: { data: true },
      })
      const repo = new OrgMetaRepository(gw)

      const updates: Partial<OrgMeta> = {
        name: 'Full Update',
        description: 'Full Description',
        logo_url: 'https://example.com/logo.png',
        website_url: 'https://example.com',
        contact_email: 'contact@example.com',
        contact_phone: '+1234567890',
        address: '123 Test St',
        social_links: { twitter: '@test' },
        settings: { theme: 'dark' },
      }

      const result = await repo.updateOrgMeta('org-1', updates)

      expect(result.data).toBe(true)
      expect(gw.callsTo('update_org_meta')[0].params).toEqual({
        p_org_id: 'org-1',
        p_name: 'Full Update',
        p_description: 'Full Description',
        p_logo_url: 'https://example.com/logo.png',
        p_website_url: 'https://example.com',
        p_contact_email: 'contact@example.com',
        p_contact_phone: '+1234567890',
        p_address: '123 Test St',
        p_social_links: { twitter: '@test' },
        p_settings: { theme: 'dark' },
      })
    })
  })
})
