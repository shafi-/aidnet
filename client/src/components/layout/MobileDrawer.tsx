'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export interface DrawerLink {
  href: string
  /** i18n key — the drawer renders it through t(). */
  label: string
  active: boolean
}

interface MobileDrawerProps {
  open: boolean
  onClose: () => void
  links: DrawerLink[]
  user: { email: string } | null
  onSignOut: () => void
}

const linkClass =
  'block rounded px-3 py-2.5 text-gray-700 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

// Mobile app-style drawer: slides in from the right over a dimmed backdrop.
// Stays mounted for enter/exit transitions; hidden state is inert via
// aria-hidden and off-screen translation.
export function MobileDrawer({
  open,
  onClose,
  links,
  user,
  onSignOut,
}: MobileDrawerProps) {
  const { t } = useTranslation()
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  // Closed drawer content stays out of the DOM entirely: keeping hidden
  // links/text mounted leaked into desktop tests (strict-mode violations on
  // text queries) and the accessibility tree. On close, content stays
  // mounted only for the exit transition, then unmounts.
  const [contentMounted, setContentMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setContentMounted(true)
      return
    }
    const timer = setTimeout(() => setContentMounted(false), 300) // duration-300
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open || !contentMounted) return
    const onCloseRef = { current: onClose }
    const previous = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [open, contentMounted, onClose])

  const secondaryLinks = [
    { href: '/about', label: t('footer.about') },
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/terms', label: t('footer.terms') },
    { href: '/contact', label: t('footer.contact') },
  ]

  return (
    <div className="md:hidden" aria-hidden={!open}>
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label={t('nav.openMenu')}
        className={`fixed inset-y-0 right-0 z-50 flex w-4/5 max-w-xs flex-col bg-white shadow-xl transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {contentMounted && (
          <>
            <div className="flex h-16 items-center justify-between border-b px-4">
              <span className="text-xl font-bold">{t('nav.brand')}</span>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label={t('nav.closeMenu')}
                className="rounded p-2 text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-1">
                {links.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={link.active ? 'page' : undefined}
                      className={`${linkClass} ${
                        link.active
                          ? 'bg-indigo-50 font-semibold text-gray-900'
                          : ''
                      }`}
                      onClick={onClose}
                    >
                      {t(link.label)}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="my-4 border-t" />

              {user ? (
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/profile"
                      className={linkClass}
                      onClick={onClose}
                    >
                      {t('nav.profile')}
                      <span className="block truncate text-sm text-gray-500">
                        {user.email}
                      </span>
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={onSignOut}
                      className={`w-full text-left ${linkClass}`}
                    >
                      {t('nav.signOut')}
                    </button>
                  </li>
                </ul>
              ) : (
                <ul className="space-y-1">
                  <li>
                    <Link
                      href="/auth/login"
                      className={linkClass}
                      onClick={onClose}
                    >
                      {t('nav.signIn')}
                    </Link>
                  </li>
                </ul>
              )}

              <div className="my-4 border-t" />

              <ul className="space-y-1">
                {secondaryLinks.map(link => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`${linkClass} text-sm`}
                      onClick={onClose}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </>
        )}
      </aside>
    </div>
  )
}
