'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import {
  Building2,
  ChevronDown,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  ShieldCheck,
  User,
} from 'lucide-react'
import { LanguageSwitcher } from './LanguageSwitcher'
import { MobileDrawer, type DrawerGroup, type DrawerLink } from './MobileDrawer'
import { buildNavModel, isNavLinkActive } from './navModel'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

// Nav structure comes from the pure role-first model (navModel.ts); this
// component only renders it and owns transient UI state.
const navLinkBase =
  'relative inline-flex h-16 items-center whitespace-nowrap px-3 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
const navLinkActive =
  'font-semibold text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-primary'
const navTriggerBase = `${navLinkBase} gap-1 data-[state=open]:text-foreground`

const itemIconClass = 'h-4 w-4 text-muted-foreground'

function menuItemIcon(href: string) {
  switch (href) {
    case '/orgs':
    case '/admin/org-requests':
      return <Building2 className={itemIconClass} aria-hidden="true" />
    case '/org/request':
      return <Inbox className={itemIconClass} aria-hidden="true" />
    case '/admin':
      return <ShieldCheck className="h-4 w-4 text-warning" aria-hidden="true" />
    case '/admin/campaigns':
      return <Megaphone className={itemIconClass} aria-hidden="true" />
    case '/profile':
      return <User className={itemIconClass} aria-hidden="true" />
    default:
      return null
  }
}

function drawerIcon(href: string) {
  switch (href) {
    case '/dashboard':
      return <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
    case '/dashboard/campaigns':
      return <Megaphone className="h-5 w-5" aria-hidden="true" />
    case '/campaigns':
      return <Search className="h-5 w-5" aria-hidden="true" />
    case '/orgs':
      return <Building2 className="h-5 w-5" aria-hidden="true" />
    case '/org/request':
      return <Inbox className="h-5 w-5" aria-hidden="true" />
    case '/admin':
      return <ShieldCheck className="h-5 w-5" aria-hidden="true" />
    case '/admin/campaigns':
      return <Megaphone className="h-5 w-5" aria-hidden="true" />
    case '/admin/org-requests':
      return <Building2 className="h-5 w-5" aria-hidden="true" />
    default:
      return null
  }
}

export function Nav() {
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrganization()
  const { isSystemAdmin } = useSystemAdmin()
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const model = buildNavModel({ user, currentOrg, isSystemAdmin })

  const isActive = (href: string) => isNavLinkActive(model, href, pathname)

  const handleSignOut = () => {
    setMobileOpen(false)
    signOut().then(() => router.push('/auth/login'))
  }

  const drawerGroups: DrawerGroup[] = model.drawerGroups.map(group => ({
    label: group.label,
    system: group.system,
    links: group.links.map((link): DrawerLink => ({
      ...link,
      active: isActive(link.href),
      icon: drawerIcon(link.href),
    })),
  }))

  return (
    <nav
      className="sticky top-0 z-30 border-b bg-background"
      aria-label={t('nav.primaryAria')}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/"
              aria-current={isActive('/') ? 'page' : undefined}
              className="whitespace-nowrap text-xl font-bold tracking-tight"
            >
              {t('nav.brand')}
            </Link>

            <div className="hidden items-center md:flex">
              {model.items.map(item => {
                if (item.kind === 'organizations-menu') {
                  const menu = model.organizationsMenu!
                  return (
                    <DropdownMenu key="organizations">
                      <DropdownMenuTrigger className={navTriggerBase}>
                        {t('nav.organizations')}
                        <ChevronDown
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {menu.contextOrgName && (
                          <>
                            <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-muted-foreground">
                              <span
                                className="h-2 w-2 flex-none rounded-full bg-success"
                                aria-hidden="true"
                              />
                              <span className="min-w-0 truncate">
                                {t('nav.currentOrg')}:{' '}
                                <strong className="font-semibold text-foreground">
                                  {menu.contextOrgName}
                                </strong>
                              </span>
                            </div>
                            <DropdownMenuSeparator />
                          </>
                        )}
                        {menu.items.map(link => (
                          <DropdownMenuItem key={link.href} asChild>
                            <Link href={link.href}>
                              {menuItemIcon(link.href)}
                              {t(link.label)}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }

                if (item.kind === 'system-menu') {
                  return (
                    <DropdownMenu key="system">
                      <DropdownMenuTrigger
                        className={navTriggerBase}
                        aria-label={`${t('nav.admin')} menu`}
                      >
                        {t('nav.admin')}
                        <ChevronDown
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        {model.systemMenu!.items.map(link => (
                          <DropdownMenuItem key={link.href} asChild>
                            <Link href={link.href}>
                              {menuItemIcon(link.href)}
                              {t(link.label)}
                            </Link>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )
                }

                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`${navLinkBase} ${active ? navLinkActive : ''}`}
                  >
                    {t(item.label)}
                  </Link>
                )
              })}
            </div>
          </div>

          <div className="flex flex-none items-center gap-3">
            <LanguageSwitcher />

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label={`${t('nav.account')} menu`}
                  className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Avatar email={user.email} />
                  <span className="hidden max-w-[11rem] truncate md:block">
                    {user.email}
                  </span>
                  <ChevronDown
                    className="h-3.5 w-3.5 text-muted-foreground"
                    aria-hidden="true"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="min-w-[15rem]"
                >
                  <div className="flex items-center gap-2.5 px-2.5 py-2">
                    <Avatar email={user.email} size="lg" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {user.email}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {isSystemAdmin
                          ? t('nav.roleSystemAdmin')
                          : t('nav.roleMember')}
                      </span>
                    </span>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      {menuItemIcon('/profile')}
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem destructive onSelect={handleSignOut}>
                    <LogOut className={itemIconClass} aria-hidden="true" />
                    {t('nav.signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="hidden items-center whitespace-nowrap rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
                >
                  {t('nav.signIn')}
                </Link>
                <Link
                  href="/auth/register"
                  className="hidden items-center whitespace-nowrap rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 md:inline-flex"
                >
                  {t('nav.signUp')}
                </Link>
              </>
            )}

            <button
              type="button"
              className="inline-flex items-center justify-center rounded p-2 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
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
        groups={drawerGroups}
        user={user ? { email: user.email } : null}
        onSignOut={handleSignOut}
      />
    </nav>
  )
}
