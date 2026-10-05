import { afterEach, describe, expect, it, vi } from 'vitest'
import { getAppBasePath } from './basePath'

describe('getAppBasePath', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  const at = (hostname: string, pathname: string) => {
    vi.stubGlobal('window', { location: { hostname, pathname } })
  }

  it('infers the repo segment on GitHub Pages project sites', () => {
    at('shafi-.github.io', '/aidnet/dashboard/')
    expect(getAppBasePath()).toBe('/aidnet')
  })

  it('returns empty on GitHub user/org root sites', () => {
    at('shafi-.github.io', '/')
    expect(getAppBasePath()).toBe('')
  })

  it('returns empty on custom domains', () => {
    at('donate.example.com', '/dashboard/')
    expect(getAppBasePath()).toBe('')
  })

  it('returns empty on localhost', () => {
    at('localhost', '/dashboard/')
    expect(getAppBasePath()).toBe('')
  })

  it('falls back to the build-time base path during prerender', () => {
    vi.stubGlobal('window', undefined)
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/aidnet')
    expect(getAppBasePath()).toBe('/aidnet')
  })

  it('returns empty during prerender without a build-time base path', () => {
    vi.stubGlobal('window', undefined)
    vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '')
    expect(getAppBasePath()).toBe('')
  })
})
