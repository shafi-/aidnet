import { isInviteToken } from '@/hooks/useQueryParam'

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
