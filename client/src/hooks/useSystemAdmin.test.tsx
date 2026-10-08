import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const authState = vi.hoisted(() => ({ user: null as { id: string } | null }))
const mockIsSystemAdmin = vi.hoisted(() => vi.fn())

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: authState.user }),
}))

vi.mock('@/services/SystemAdminService', () => ({
  systemAdminService: { isSystemAdmin: mockIsSystemAdmin },
}))

async function loadHook() {
  vi.resetModules()
  const { useSystemAdmin } = await import('./useSystemAdmin')
  return useSystemAdmin
}

describe('useSystemAdmin caching', () => {
  beforeEach(() => {
    vi.resetModules()
    mockIsSystemAdmin.mockReset()
    authState.user = null
  })

  it('When two consumers mount for the same user, the RPC runs once', async () => {
    authState.user = { id: 'u1' }
    mockIsSystemAdmin.mockResolvedValue(true)
    const useSystemAdmin = await loadHook()

    const a = renderHook(() => useSystemAdmin())
    const b = renderHook(() => useSystemAdmin())

    await waitFor(() => expect(a.result.current.loading).toBe(false))
    await waitFor(() => expect(b.result.current.loading).toBe(false))
    expect(mockIsSystemAdmin).toHaveBeenCalledTimes(1)
    expect(a.result.current.isSystemAdmin).toBe(true)
    expect(b.result.current.isSystemAdmin).toBe(true)
  })

  it('When the value is already cached, a new consumer mounts without an RPC call', async () => {
    authState.user = { id: 'u1' }
    mockIsSystemAdmin.mockResolvedValue(true)
    const useSystemAdmin = await loadHook()

    const first = renderHook(() => useSystemAdmin())
    await waitFor(() => expect(first.result.current.loading).toBe(false))

    const second = renderHook(() => useSystemAdmin())
    expect(second.result.current.isSystemAdmin).toBe(true)
    expect(second.result.current.loading).toBe(false)
    expect(mockIsSystemAdmin).toHaveBeenCalledTimes(1)
  })

  it('When the user changes, the check runs again for the new user', async () => {
    authState.user = { id: 'u1' }
    mockIsSystemAdmin.mockResolvedValue(true)
    const useSystemAdmin = await loadHook()

    const { result, rerender } = renderHook(() => useSystemAdmin())
    await waitFor(() => expect(result.current.loading).toBe(false))

    authState.user = { id: 'u2' }
    rerender()
    await waitFor(() => expect(mockIsSystemAdmin).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isSystemAdmin).toBe(true)
  })

  it('When signed out, no RPC call happens and the flag is false', async () => {
    const useSystemAdmin = await loadHook()

    const { result } = renderHook(() => useSystemAdmin())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(mockIsSystemAdmin).not.toHaveBeenCalled()
    expect(result.current.isSystemAdmin).toBe(false)
  })

  it('When refetch is called, it bypasses the cache', async () => {
    authState.user = { id: 'u1' }
    mockIsSystemAdmin.mockResolvedValueOnce(true).mockResolvedValueOnce(false)
    const useSystemAdmin = await loadHook()

    const { result } = renderHook(() => useSystemAdmin())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isSystemAdmin).toBe(true)

    await act(async () => {
      await result.current.refetch()
    })
    expect(mockIsSystemAdmin).toHaveBeenCalledTimes(2)
    expect(result.current.isSystemAdmin).toBe(false)
  })

  it('When the RPC fails, consumers see false and the next consumer retries', async () => {
    authState.user = { id: 'u1' }
    mockIsSystemAdmin
      .mockRejectedValueOnce(new Error('rpc down'))
      .mockResolvedValueOnce(true)
    const useSystemAdmin = await loadHook()

    const first = renderHook(() => useSystemAdmin())
    await waitFor(() => expect(first.result.current.loading).toBe(false))
    expect(first.result.current.isSystemAdmin).toBe(false)

    const second = renderHook(() => useSystemAdmin())
    await waitFor(() => expect(second.result.current.isSystemAdmin).toBe(true))
    expect(mockIsSystemAdmin).toHaveBeenCalledTimes(2)
  })
})
