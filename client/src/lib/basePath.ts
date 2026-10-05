// Infers the app's deployed base path from the browser so a single build works
// both at a root domain and under a GitHub Pages project sub-path. Next bakes
// asset URLs at build time (NEXT_PUBLIC_BASE_PATH) — this helper covers
// hand-built absolute URLs such as auth redirects, which basePath does not touch.
export function getAppBasePath(): string {
  if (typeof window === 'undefined') {
    // Static prerender has no location; trust the build-time value.
    return process.env.NEXT_PUBLIC_BASE_PATH ?? ''
  }
  const { hostname, pathname } = window.location
  // GitHub Pages project sites serve under /<repo>; user/org sites and custom
  // domains serve at the root.
  if (hostname.endsWith('.github.io')) {
    const firstSegment = pathname.split('/')[1]
    if (firstSegment) return `/${firstSegment}`
  }
  return ''
}
