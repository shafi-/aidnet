'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  CreditCard,
  Inbox,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Receipt,
  Search,
  Settings,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubscription } from '@/hooks/useSubscription'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileDrawer, type DrawerGroup, type DrawerLink } from './MobileDrawer'
import {
  buildConsoleSections,
  isConsoleSectionActive,
  type ConsoleVariant,
} from './consoleNavModel'
import { Avatar } from '@/components/ui/avatar'
import { OrgSwitcher } from '@/components/console/OrgSwitcher'

// Console shell (docs/ux-restructure-plan.md §2): a persistent sidebar whose
// sections ARE the routes — one level deep, deep-linkable, no nested tabs.
// The top navbar collapses to brand + org chip + account on small screens,
// where the sidebar becomes a slide-in drawer.
const sectionLinkBase =
  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
const sectionLinkActive = 'bg-primary/10 font-semibold text-primary'
const sectionLinkIdle =
  'text-muted-foreground hover:bg-accent hover:text-foreground'

const iconClass = 'h-4 w-4 flex-none'

function sectionIcon(href: string) {
  switch (href) {
    case '/dashboard':
      return <LayoutDashboard className={iconClass} aria-hidden="true" />
    case '/dashboard/campaigns':
      return <Megaphone className={iconClass} aria-hidden="true" />
    case '/dashboard/donations':
      return <Wallet className={iconClass} aria-hidden="true" />
    case '/dashboard/members':
      return <Users className={iconClass} aria-hidden="true" />
    case '/dashboard/billing':
      return <CreditCard className={iconClass} aria-hidden="true" />
    case '/dashboard/settings':
      return <Settings className={iconClass} aria-hidden="true" />
    case '/admin':
      return <ShieldCheck className={iconClass} aria-hidden="true" />
    case '/admin/campaigns':
      return <Megaphone className={iconClass} aria-hidden="true" />
    case '/admin/org-requests':
      return <Inbox className={iconClass} aria-hidden="true" />
    case '/admin/orgs':
      return <Building2 className={iconClass} aria-hidden="true" />
    case '/admin/plans':
      return <Layers className={iconClass} aria-hidden="true" />
    case '/admin/subscriptions':
      return <Receipt className={iconClass} aria-hidden="true" />
    case '/campaigns':
      return <Search className={iconClass} aria-hidden="true" />
    default:
      return null
  }
}

export function ConsoleShell({
  variant,
  children,
}: {
  variant: ConsoleVariant
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrganization()
  const { isOrgAdmin, isOrgOwner } = usePermissions()
  const { hasFeature } = useSubscription(currentOrg?.id ?? '')
  const pathname = usePathname()
  const router = useRouter()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const sections = useMemo(
    () =>
      buildConsoleSections(variant, {
        isOrgAdmin: isOrgAdmin(),
        isOrgOwner: isOrgOwner(),
        hasFeature,
      }),
    [variant, isOrgAdmin, isOrgOwner, hasFeature]
  )

  const isActive = (href: string) =>
    isConsoleSectionActive(sections, href, pathname)

  const handleSignOut = () => {
    setDrawerOpen(false)
    signOut().then(() => router.push('/auth/login'))
  }

  const drawerGroups: DrawerGroup[] = [
    {
      label: null,
      links: sections.map((section): DrawerLink => ({
        ...section,
        active: isActive(section.href),
        icon: sectionIcon(section.href),
      })),
    },
    ...(variant === 'workspace'
      ? [
          {
            label: null as string | null,
            links: [
              {
                href: '/campaigns',
                label: 'nav.discover',
                active: isActive('/campaigns'),
                icon: sectionIcon('/campaigns'),
              },
            ],
          },
        ]
      : []),
  ]

  const sidebarLink = (href: string, label: string) => (
    <Link
      key={href}
      href={href}
      aria-current={isActive(href) ? 'page' : undefined}
      className={`${sectionLinkBase} ${isActive(href) ? sectionLinkActive : sectionLinkIdle}`}
    >
      {sectionIcon(href)}
      <span className="min-w-0 truncate">{t(label)}</span>
    </Link>
  )

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background md:flex">
        <div className="flex h-16 flex-none items-center gap-2 border-b px-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight"
            aria-label={t('nav.brand')}
          >
            {t('nav.brand')}
          </Link>
          {variant === 'admin' && (
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
              {t('console.adminBadge')}
            </span>
          )}
        </div>

        {variant === 'workspace' && (
          <div className="flex-none p-3">
            <OrgSwitcher />
          </div>
        )}

        <nav
          aria-label={t('console.sectionsAria')}
          className="flex-1 space-y-1 overflow-y-auto px-3 pb-4"
        >
          {sections.map(section => sidebarLink(section.href, section.label))}
          {variant === 'workspace' && (
            <>
              <div className="my-3 border-t" role="presentation" />
              {sidebarLink('/campaigns', 'nav.discover')}
            </>
          )}
        </nav>

        <div className="flex-none border-t p-3">
          <div className="mb-2 flex items-center gap-2 px-1">
            {user && <Avatar email={user.email} />}
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
              {user?.email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LogOut className={iconClass} aria-hidden="true" />
              {t('nav.signOut')}
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex h-14 flex-none items-center justify-between gap-2 border-b bg-background px-4 md:hidden">
          <Link
            href="/"
            className="text-lg font-bold tracking-tight"
            aria-label={t('nav.brand')}
          >
            {t('nav.brand')}
          </Link>
          <div className="flex min-w-0 flex-1 items-center justify-center">
            {variant === 'workspace' && <OrgSwitcher variant="chip" />}
          </div>
          <div className="flex flex-none items-center gap-1">
            <LanguageSwitcher />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-expanded={drawerOpen}
              aria-controls="console-menu"
              aria-label={t('nav.openMenu')}
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 md:px-10">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>

      <MobileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        groups={drawerGroups}
        user={user ? { email: user.email } : null}
        onSignOut={handleSignOut}
      />
    </div>
  )
}
