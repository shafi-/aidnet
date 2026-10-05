'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileDrawer } from './MobileDrawer'

interface NavLink {
  href: string
  label: string
}

type AuthUser = ReturnType<typeof useAuth>['user']
type CurrentOrg = ReturnType<typeof useOrganization>['currentOrg']

// Labels are i18n keys; the caller renders them through t().
function buildNavLinks(
  user: AuthUser,
  currentOrg: CurrentOrg,
  isSystemAdmin: boolean
): NavLink[] {
  const links: NavLink[] = [{ href: '/campaigns', label: 'nav.campaigns' }]
  if (!user) return links
  links.push({ href: '/orgs', label: 'nav.organizations' })
  links.push({ href: '/dashboard', label: 'nav.dashboard' })
  if (!currentOrg) {
    links.push({ href: '/org/request', label: 'nav.requestOrg' })
  }
  if (currentOrg) {
    links.push({ href: '/dashboard/campaigns', label: 'nav.orgCampaigns' })
  }
  if (isSystemAdmin) {
    links.push({ href: '/admin', label: 'nav.admin' })
    links.push({ href: '/admin/campaigns', label: 'nav.reviewCampaigns' })
    links.push({ href: '/admin/org-requests', label: 'nav.reviewOrgs' })
  }
  return links
}

const linkClass =
  'rounded text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

export function Nav() {
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrganization()
  const { isSystemAdmin } = useSystemAdmin()
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const links = buildNavLinks(user, currentOrg, isSystemAdmin)

  const isActive = (href: string) =>
    href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`)

  const handleSignOut = () => {
    setMobileOpen(false)
    signOut().then(() => router.push('/auth/login'))
  }

  return (
    <nav className="border-b bg-white" aria-label="Primary">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/"
              aria-current={isActive('/') ? 'page' : undefined}
              className="text-xl font-bold"
            >
              {t('nav.brand')}
            </Link>
            <div className="hidden gap-4 md:flex">
              {links.map(link => {
                const active = isActive(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    className={`${linkClass} ${active ? 'font-semibold text-gray-900' : ''}`}
                  >
                    {t(link.label)}
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {user ? (
              <>
                <Link
                  href="/profile"
                  aria-label={t('nav.profile')}
                  className={`hidden md:block ${linkClass}`}
                >
                  {user.email}
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={`hidden md:block ${linkClass}`}
                >
                  {t('nav.signOut')}
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className={`hidden md:block ${linkClass}`}
              >
                {t('nav.signIn')}
              </Link>
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded p-2 text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 md:hidden"
              aria-expanded={mobileOpen}
              aria-controls="mobile-menu"
              aria-label={t('nav.openMenu')}
              onClick={() => setMobileOpen(true)}
            >
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
            </button>
          </div>
        </div>
      </div>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={links.map(link => ({ ...link, active: isActive(link.href) }))}
        user={user ? { email: user.email } : null}
        onSignOut={handleSignOut}
      />
    </nav>
  )
}
