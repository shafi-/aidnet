import { describe, expect, it, vi } from 'vitest'
import { OrgRequestService } from '../services/OrgRequestService'
import {
  OrgRequestRepository,
  OrgMetaRepository,
} from '@/repositories/OrgRequestRepository'
import type { OrgRequest, OrgMeta } from '@/types'
import { mockRepository } from '@/testing/mockRpcClient'

describe('OrgRequestService', () => {
  describe('submitRequest', () => {
    it('submits org request through repository', async () => {
      const submitRequest = vi
        .fn()
        .mockResolvedValue({ data: 'request-id-123', error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({ submitRequest })
      )

      const result = await service.submitRequest(
        'Test Org',
        'test-org',
        'Description'
      )

      expect(submitRequest).toHaveBeenCalledWith(
        'Test Org',
        'test-org',
        'Description'
      )
      expect(result.data).toBe('request-id-123')
    })
  })

  describe('getMyRequests', () => {
    it('gets user requests through repository', async () => {
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

      const getMyRequests = vi
        .fn()
        .mockResolvedValue({ data: requests, error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({ getMyRequests })
      )

      const result = await service.getMyRequests()

      expect(getMyRequests).toHaveBeenCalled()
      expect(result.data).toEqual(requests)
    })
  })

  describe('getAllRequests', () => {
    it('gets all requests through repository', async () => {
      const requests: OrgRequest[] = []

      const getAllRequests = vi
        .fn()
        .mockResolvedValue({ data: requests, error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({ getAllRequests })
      )

      const result = await service.getAllRequests()

      expect(getAllRequests).toHaveBeenCalled()
      expect(result.data).toEqual(requests)
    })
  })

  describe('approveRequest', () => {
    it('approves request through repository', async () => {
      const approveRequest = vi
        .fn()
        .mockResolvedValue({ data: 'new-org-id', error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({ approveRequest })
      )

      const result = await service.approveRequest('req-123')

      expect(approveRequest).toHaveBeenCalledWith('req-123')
      expect(result.data).toBe('new-org-id')
    })

    it('handles approval errors', async () => {
      const approveRequest = vi
        .fn()
        .mockResolvedValue({ data: null, error: 'Not authorized' })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({ approveRequest })
      )

      const result = await service.approveRequest('req-123')

      expect(result.data).toBeNull()
      expect(result.error).toBe('Not authorized')
    })
  })

  describe('rejectRequest', () => {
    it('rejects request with reason through repository', async () => {
      const rejectRequest = vi
        .fn()
        .mockResolvedValue({ data: true, error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({ rejectRequest })
      )

      const result = await service.rejectRequest('req-123', 'Not suitable')

      expect(rejectRequest).toHaveBeenCalledWith('req-123', 'Not suitable')
      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })

    it('rejects request without reason through repository', async () => {
      const rejectRequest = vi
        .fn()
        .mockResolvedValue({ data: true, error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({ rejectRequest })
      )

      const result = await service.rejectRequest('req-123')

      expect(rejectRequest).toHaveBeenCalledWith('req-123', undefined)
      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })
  })

  describe('getOrgMeta', () => {
    it('gets org metadata through repository', async () => {
      const meta: OrgMeta = {
        organization_id: 'org-1',
        name: 'Test Org',
        description: 'Test Description',
        logo_url: null,
        website_url: null,
        contact_email: null,
        contact_phone: null,
        address: null,
        social_links: {},
        settings: {},
        updated_by: 'user-1',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const getOrgMeta = vi.fn().mockResolvedValue({ data: meta, error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({}),
        mockRepository<OrgMetaRepository>({ getOrgMeta })
      )

      const result = await service.getOrgMeta('org-1')

      expect(getOrgMeta).toHaveBeenCalledWith('org-1')
      expect(result.data).toEqual(meta)
    })
  })

  describe('updateOrgMeta', () => {
    it('updates org metadata through repository', async () => {
      const updateOrgMeta = vi
        .fn()
        .mockResolvedValue({ data: true, error: null })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({}),
        mockRepository<OrgMetaRepository>({ updateOrgMeta })
      )

      const updates: Partial<OrgMeta> = {
        name: 'Updated Name',
        description: 'Updated Description',
      }

      const result = await service.updateOrgMeta('org-1', updates)

      expect(updateOrgMeta).toHaveBeenCalledWith('org-1', updates)
      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })

    it('handles update errors', async () => {
      const updateOrgMeta = vi
        .fn()
        .mockResolvedValue({ data: null, error: 'Not authorized' })
      const service = new OrgRequestService(
        mockRepository<OrgRequestRepository>({}),
        mockRepository<OrgMetaRepository>({ updateOrgMeta })
      )

      const result = await service.updateOrgMeta('org-1', {
        name: 'Updated Name',
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Not authorized')
    })
  })
})
