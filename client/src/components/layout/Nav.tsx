'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState } from 'react'

interface NavLink {
  href: string
  label: string
}

type AuthUser = ReturnType<typeof useAuth>['user']
type CurrentOrg = ReturnType<typeof useOrganization>['currentOrg']

function buildNavLinks(
  user: AuthUser,
  currentOrg: CurrentOrg,
  isSystemAdmin: boolean
): NavLink[] {
  const links: NavLink[] = [{ href: '/campaigns', label: 'Campaigns' }]
  if (!user) return links
  links.push({ href: '/orgs', label: 'Organizations' })
  if (!currentOrg) {
    links.push({ href: '/org/request', label: 'Request Org' })
  }
  if (currentOrg) {
    links.push({ href: '/dashboard', label: 'Dashboard' })
    links.push({ href: '/dashboard/campaigns', label: 'Org Campaigns' })
  }
  if (isSystemAdmin) {
    links.push({ href: '/admin', label: 'Admin' })
    links.push({ href: '/admin/campaigns', label: 'Review Campaigns' })
    links.push({ href: '/admin/org-requests', label: 'Review Orgs' })
  }
  return links
}

const linkClass =
  'rounded text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

export function Nav() {
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrganization()
  const { isSystemAdmin } = useSystemAdmin()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const links = buildNavLinks(user, currentOrg, isSystemAdmin)

  const handleSignOut = () => {
    setMobileOpen(false)
    signOut().then(() => router.push('/auth/login'))
  }

  return (
    <nav className="border-b bg-white" aria-label="Primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              Donate
            </Link>
            <div className="hidden gap-4 md:flex">
              {links.map(link => (
                <Link key={link.href} href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Link
                href="/profile"
                aria-label="Profile"
                className={`hidden md:block ${linkClass}`}
              >
                {user.email}
              </Link>
            ) : (
              <Link
                href="/auth/login"
                className={`hidden md:block ${linkClass}`}
              >
                Sign in
              </Link>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded p-2 text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t md:hidden" id="mobile-menu">
          <div className="space-y-1 px-4 py-2">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className={`block py-2 ${linkClass}`}
                  onClick={() => setMobileOpen(false)}
                >
                  Profile
                </Link>
                {links.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`block py-2 ${linkClass}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={`block w-full py-2 text-left ${linkClass}`}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className={`block py-2 ${linkClass}`}
                onClick={() => setMobileOpen(false)}
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
