import { describe, expect, it } from 'vitest'
import { BaseRepository } from './BaseRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'

class ProbeRepository extends BaseRepository {
  call<T>(
    fn: Parameters<BaseRepository['callRpc']>[0],
    params?: Record<string, unknown>
  ) {
    return this.callRpc<T>(fn, params)
  }
  auth() {
    return this.requireAuth()
  }
  oops(e: unknown) {
    return this.handleError(e)
  }
}

describe('BaseRepository', () => {
  it('callRpc delegates to the injected gateway', async () => {
    const gw = createMockRpcGateway({ some_fn: { data: 'ok' } })
    const res = await new ProbeRepository(gw).call<string>('some_fn' as never)

    expect(res.data).toBe('ok')
    expect(gw.callsTo('some_fn')).toEqual([
      { functionName: 'some_fn', params: undefined },
    ])
  })

  it('requireAuth resolves the gateway user id when present', async () => {
    const gw = createMockRpcGateway()
    const userId = await new ProbeRepository(gw).auth()

    expect(userId).toBe('00000000-0000-4000-8000-000000000001')
  })

  it('requireAuth throws when no session user exists', async () => {
    const gw = createMockRpcGateway()
    gw.getUserId.mockResolvedValueOnce(null as unknown as string)
    const probe = new ProbeRepository(gw)

    await expect(probe.auth()).rejects.toThrow('Authentication required')
  })

  it('handleError normalizes Error objects and strings', () => {
    const probe = new ProbeRepository(createMockRpcGateway())

    expect(probe.oops(new Error('real error'))).toBe('real error')
    expect(probe.oops('string error')).toBe('string error')
    expect(probe.oops({ message: 'shaped error' })).toBe('shaped error')
    expect(probe.oops(42)).toBe('An unknown error occurred')
  })
})
