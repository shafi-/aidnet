/**
 * Central route-access declaration.
 *
 * Single source of truth for who may enter each route. Consumed by
 * RouteAccessGuard (mounted once in the root layout). Pages must NOT
 * hand-roll their own redirect/deny logic on top of this map.
 *
 * NOTE: this is UX gating only. The database functions remain the real
 * authorization boundary — every RPC re-checks roles server-side.
 */
export type AccessLevel = 'public' | 'authenticated' | 'systemAdmin'

export interface AccessRule {
  /** Exact pathname match. */
  exact?: string
  /** Pathname prefix match (covers nested segments). */
  prefix?: string
  level: AccessLevel
}

/**
 * Ordered list — first match wins. Unknown routes default to
 * 'authenticated' (fail-closed).
 */
export const ROUTE_ACCESS: AccessRule[] = [
  // Public content
  { exact: '/', level: 'public' },
  { exact: '/about', level: 'public' },
  { exact: '/privacy', level: 'public' },

  // Auth flows are public (they manage their own signed-in state)
  { prefix: '/auth/', level: 'public' },

  // Public campaign & org browsing
  { exact: '/campaigns', level: 'public' },
  { prefix: '/campaigns/detail', level: 'public' },
  { exact: '/orgs/public', level: 'public' },

  // Invite validation is an anonymous flow (accept requires session inside)
  { exact: '/invite', level: 'public' },

  // System admin area — denied inline (not redirected) to preserve UX
  { prefix: '/admin', level: 'systemAdmin' },

  // Authenticated org area
  { exact: '/orgs', level: 'authenticated' },
  { exact: '/profile', level: 'authenticated' },
  { prefix: '/dashboard', level: 'authenticated' },
]

export function resolveAccessLevel(pathname: string): AccessLevel {
  for (const rule of ROUTE_ACCESS) {
    if (rule.exact !== undefined && pathname === rule.exact) return rule.level
    if (rule.prefix !== undefined && pathname.startsWith(rule.prefix))
      return rule.level
  }
  return 'authenticated'
}
