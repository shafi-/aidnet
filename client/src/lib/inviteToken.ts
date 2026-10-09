import { isInviteToken } from '@/hooks/useQueryParam'
import { getAppBasePath } from './basePath'

/**
 * Accepts either the bare 64-hex invite code or a full invite link
 * (…/invite?token=<code>) pasted by the invitee on the join page.
 */
export function extractInviteToken(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (isInviteToken(trimmed)) return trimmed
  try {
    const fromUrl = new URL(trimmed).searchParams.get('token')
    return fromUrl && isInviteToken(fromUrl.trim()) ? fromUrl.trim() : null
  } catch {
    return null
  }
}

/**
 * The shareable absolute link an org admin hands to the invitee — invites
 * are delivered by the admin (no email is sent), so this URL is the invite.
 * Base path comes from getAppBasePath() so the link works on GitHub Pages
 * project sites as well as root deployments.
 */
export function buildInviteLink(token: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  return `${origin}${getAppBasePath()}/invite?token=${token}`
}
