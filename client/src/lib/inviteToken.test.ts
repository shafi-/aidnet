import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildInviteLink, extractInviteToken } from './inviteToken'

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

describe('buildInviteLink', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('When served at a root domain, it links the join page with the token', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://aidnet.shafi.me',
        hostname: 'aidnet.shafi.me',
        pathname: '/dashboard/members/',
      },
    })
    expect(buildInviteLink(CODE)).toBe(
      `https://aidnet.shafi.me/invite?token=${CODE}`
    )
  })

  it('When served under a GitHub Pages project path, it prefixes the base path', () => {
    vi.stubGlobal('window', {
      location: {
        origin: 'https://shafi-.github.io',
        hostname: 'shafi-.github.io',
        pathname: '/aidnet/dashboard/members/',
      },
    })
    expect(buildInviteLink(CODE)).toBe(
      `https://shafi-.github.io/aidnet/invite?token=${CODE}`
    )
  })
})
