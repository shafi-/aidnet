import { vi } from 'vitest'

export interface RpcCall {
  functionName: string
  params?: Record<string, unknown>
}

export interface RpcHandler {
  data?: unknown
  error?: string | null
}

export type RpcRouteTable = Record<string, RpcHandler>

/**
 * Fake RPC gateway for repository tests. Register one handler per RPC function
 * name the code under test is expected to call. Unregistered calls throw so a
 * test can never silently pass against an unintended backend call.
 *
 * Usage:
 *   const gw = createMockRpcGateway({ get_campaigns: { data: [campaign] } })
 *   const repo = new CampaignRepository(gw)
 *   await repo.getCampaigns('org-1')
 *   expect(gw.callsTo('get_campaigns')[0].params).toEqual({ p_org_id: 'org-1' })
 */
export function createMockRpcGateway(handlers: RpcRouteTable = {}) {
  const calls: RpcCall[] = []

  const gateway = {
    rpc: vi.fn(
      async (functionName: string, params?: Record<string, unknown>) => {
        calls.push({ functionName, params })
        const handler = handlers[functionName]
        if (!handler) {
          throw new Error(
            `Unexpected RPC call "${functionName}". Register it in createMockRpcGateway.`
          )
        }
        return {
          data: (handler.data ?? null) as never,
          error: handler.error ?? null,
        }
      }
    ),
    getUserId: vi.fn(async () => '00000000-0000-4000-8000-000000000001'),
    /** Every rpc() invocation in order. */
    calls,
    /** Filter recorded calls by RPC function name. */
    callsTo(functionName: string): RpcCall[] {
      return calls.filter(c => c.functionName === functionName)
    },
  }

  return gateway
}

export type MockRpcGateway = ReturnType<typeof createMockRpcGateway>

/**
 * Typed mock for a concrete repository when testing SERVICES. Pass an object
 * of vi.fn()s shaped like the real repo; missing methods surface as TS errors
 * at the injection site.
 */
export function mockRepository<T extends object>(
  overrides: Partial<T> = {}
): T {
  return overrides as T
}
