'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const linkClass =
  'text-sm text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded'

export function Footer() {
  const { t } = useTranslation()

  const links = [
    { href: '/about', label: t('footer.about') },
    { href: '/privacy', label: t('footer.privacy') },
    { href: '/terms', label: t('footer.terms') },
    { href: '/contact', label: t('footer.contact') },
  ]

  return (
    <footer className="border-t bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:px-6 md:flex-row md:justify-between lg:px-8">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {t('nav.brand')}
          </p>
          <p className="mt-1 text-sm text-gray-500">{t('footer.tagline')}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {links.map(link => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="text-sm text-gray-400">
          {t('footer.copyright', { year: new Date().getFullYear() })}
        </p>
      </div>
    </footer>
  )
}
