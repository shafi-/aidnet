import { describe, expect, it, vi } from 'vitest'
import { OrgRequestService } from '../services/OrgRequestService'
import {
  OrgRequestRepository,
  OrgMetaRepository,
} from '../repositories/OrgRequestRepository'
import type { OrgRequest, OrgMeta } from '@/types'

describe('OrgRequestService', () => {
  describe('submitRequest', () => {
    it('submits org request through repository', async () => {
      const mockRepo = {
        submitRequest: vi.fn().mockResolvedValue({
          data: 'request-id-123',
          error: null,
        }),
        getMyRequests: vi.fn(),
        getAllRequests: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
      } as any

      const service = new OrgRequestService(mockRepo)

      const result = await service.submitRequest(
        'Test Org',
        'test-org',
        'Description'
      )

      expect(mockRepo.submitRequest).toHaveBeenCalledWith(
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

      const mockRepo = {
        submitRequest: vi.fn(),
        getMyRequests: vi.fn().mockResolvedValue({
          data: requests,
          error: null,
        }),
        getAllRequests: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
      } as any

      const service = new OrgRequestService(mockRepo)

      const result = await service.getMyRequests()

      expect(mockRepo.getMyRequests).toHaveBeenCalled()
      expect(result.data).toEqual(requests)
    })
  })

  describe('getAllRequests', () => {
    it('gets all requests through repository', async () => {
      const requests: OrgRequest[] = []

      const mockRepo = {
        submitRequest: vi.fn(),
        getMyRequests: vi.fn(),
        getAllRequests: vi.fn().mockResolvedValue({
          data: requests,
          error: null,
        }),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn(),
      } as any

      const service = new OrgRequestService(mockRepo)

      const result = await service.getAllRequests()

      expect(mockRepo.getAllRequests).toHaveBeenCalled()
      expect(result.data).toEqual(requests)
    })
  })

  describe('approveRequest', () => {
    it('approves request through repository', async () => {
      const mockRepo = {
        submitRequest: vi.fn(),
        getMyRequests: vi.fn(),
        getAllRequests: vi.fn(),
        approveRequest: vi.fn().mockResolvedValue({
          data: 'new-org-id',
          error: null,
        }),
        rejectRequest: vi.fn(),
      } as any

      const service = new OrgRequestService(mockRepo)

      const result = await service.approveRequest('req-123')

      expect(mockRepo.approveRequest).toHaveBeenCalledWith('req-123')
      expect(result.data).toBe('new-org-id')
    })

    it('handles approval errors', async () => {
      const mockRepo = {
        submitRequest: vi.fn(),
        getMyRequests: vi.fn(),
        getAllRequests: vi.fn(),
        approveRequest: vi.fn().mockResolvedValue({
          data: null,
          error: 'Not authorized',
        }),
        rejectRequest: vi.fn(),
      } as any

      const service = new OrgRequestService(mockRepo)

      const result = await service.approveRequest('req-123')

      expect(result.data).toBeNull()
      expect(result.error).toBe('Not authorized')
      expect(result.error).toBe('Not authorized')
    })
  })

  describe('rejectRequest', () => {
    it('rejects request with reason through repository', async () => {
      const mockRepo = {
        submitRequest: vi.fn(),
        getMyRequests: vi.fn(),
        getAllRequests: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn().mockResolvedValue({
          data: true,
          error: null,
        }),
      } as any

      const service = new OrgRequestService(mockRepo)

      const result = await service.rejectRequest('req-123', 'Not suitable')

      expect(mockRepo.rejectRequest).toHaveBeenCalledWith(
        'req-123',
        'Not suitable'
      )
      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })

    it('rejects request without reason through repository', async () => {
      const mockRepo = {
        submitRequest: vi.fn(),
        getMyRequests: vi.fn(),
        getAllRequests: vi.fn(),
        approveRequest: vi.fn(),
        rejectRequest: vi.fn().mockResolvedValue({
          data: true,
          error: null,
        }),
      } as any

      const service = new OrgRequestService(mockRepo)

      const result = await service.rejectRequest('req-123')

      expect(mockRepo.rejectRequest).toHaveBeenCalledWith('req-123', undefined)
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

      const mockMetaRepo = {
        getOrgMeta: vi.fn().mockResolvedValue({
          data: meta,
          error: null,
        }),
        updateOrgMeta: vi.fn(),
      } as any

      const service = new OrgRequestService({} as any, mockMetaRepo)

      const result = await service.getOrgMeta('org-1')

      expect(mockMetaRepo.getOrgMeta).toHaveBeenCalledWith('org-1')
      expect(result.data).toEqual(meta)
    })
  })

  describe('updateOrgMeta', () => {
    it('updates org metadata through repository', async () => {
      const mockMetaRepo = {
        getOrgMeta: vi.fn(),
        updateOrgMeta: vi.fn().mockResolvedValue({
          data: true,
          error: null,
        }),
      } as any

      const service = new OrgRequestService({} as any, mockMetaRepo)

      const updates: Partial<OrgMeta> = {
        name: 'Updated Name',
        description: 'Updated Description',
      }

      const result = await service.updateOrgMeta('org-1', updates)

      expect(mockMetaRepo.updateOrgMeta).toHaveBeenCalledWith('org-1', updates)
      expect(result.data).toBe(true)
      expect(result.error).toBeNull()
    })

    it('handles update errors', async () => {
      const mockMetaRepo = {
        getOrgMeta: vi.fn(),
        updateOrgMeta: vi.fn().mockResolvedValue({
          data: null,
          error: 'Not authorized',
        }),
      } as any

      const service = new OrgRequestService({} as any, mockMetaRepo)

      const result = await service.updateOrgMeta('org-1', {
        name: 'Updated Name',
      })

      expect(result.data).toBeNull()
      expect(result.error).toBe('Not authorized')
    })
  })
})
