import { describe, expect, it } from 'vitest'
import { extractInviteToken } from './inviteToken'

const CODE = 'a'.repeat(64)

describe('extractInviteToken', () => {
  it('When given a bare invite code, it returns the code', () => {
    expect(extractInviteToken(CODE)).toBe(CODE)
  })

  it('When given a full invite link, it extracts the token query param', () => {
    expect(
      extractInviteToken(`https://aidnet.shafi.me/invite?token=${CODE}`)
    ).toBe(CODE)
  })

  it('When given a link with surrounding whitespace, it trims before parsing', () => {
    expect(extractInviteToken(`  ${CODE}  `)).toBe(CODE)
  })

  it('When given garbage, a non-token query value, or empty input, it returns null', () => {
    expect(extractInviteToken('not-a-code')).toBeNull()
    expect(
      extractInviteToken('https://aidnet.shafi.me/invite?token=short')
    ).toBeNull()
    expect(extractInviteToken('')).toBeNull()
  })
})
