import { supabaseManager } from '@/lib/supabase'
import type { ServiceData } from '@/types'
import { type RpcFunction } from '@/types/rpc'

/**
 * Minimal structural contract the repository layer needs from the Supabase
 * gateway. Defaults to the app singleton; tests inject a mock (src/testing).
 */
export interface RpcGateway {
  rpc<T = unknown>(
    functionName: string,
    params?: Record<string, unknown>
  ): Promise<{ data: T | null; error: string | null }>
  getUserId(): Promise<string | null>
}

/**
 * Base Repository Class
 * All database access goes through RPC functions via callRpc.
 * Direct table access is not allowed — use database functions instead.
 */
export abstract class BaseRepository {
  constructor(protected readonly supabase: RpcGateway = supabaseManager) {}

  /**
   * Call a Supabase RPC function.
   * functionName must be from the Rpc enum, and `params` is checked against that
   * function's registered `Args` (see DbFunction) — so call sites can no longer
   * pass a wrong/missing parameter without a compile error.
   */
  protected async callRpc<T = unknown>(
    functionName: RpcFunction,
    params?: Record<string, unknown>
  ): ServiceData<T> {
    return this.supabase.rpc<T>(functionName, params)
  }

  /**
   * Handle errors from Supabase operations
   */
  protected handleError(error: unknown): string {
    if (error instanceof Error) {
      return error.message
    }
    if (typeof error === 'string') {
      return error
    }
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message)
    }
    return 'An unknown error occurred'
  }

  /**
   * Check if user is authenticated, returns user ID or throws
   */
  protected async requireAuth(): Promise<string> {
    const userId = await this.supabase.getUserId()
    if (!userId) {
      throw new Error('Authentication required')
    }
    return userId
  }
}
