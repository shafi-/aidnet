'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useOrganization } from '@/hooks/useOrganization'
import { useSystemAdmin } from '@/hooks/useSystemAdmin'
import { useState } from 'react'

export function Nav() {
  const { user, signOut } = useAuth()
  const { currentOrg } = useOrganization()
  const { isSystemAdmin } = useSystemAdmin()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  return (
    <nav className="border-b bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold">
              SupaNext
            </Link>
            <div className="hidden gap-4 md:flex">
              <Link
                href="/campaigns"
                className="text-gray-600 hover:text-gray-900"
              >
                Campaigns
              </Link>
              {user && (
                <>
                  <Link
                    href="/orgs"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Organizations
                  </Link>
                  {!currentOrg && (
                    <Link
                      href="/org/request"
                      className="text-gray-600 hover:text-gray-900"
                    >
                      Request Org
                    </Link>
                  )}
                  {currentOrg && (
                    <>
                      <Link
                        href="/dashboard"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/dashboard/todos"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Todos
                      </Link>
                      <Link
                        href="/dashboard/members"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Members
                      </Link>
                      <Link
                        href="/dashboard/campaigns"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Org Campaigns
                      </Link>
                    </>
                  )}
                  {isSystemAdmin && (
                    <>
                      <Link
                        href="/admin"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Admin
                      </Link>
                      <Link
                        href="/admin/campaigns"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Review Campaigns
                      </Link>
                      <Link
                        href="/admin/org-requests"
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Review Orgs
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  href="/profile"
                  className="text-gray-600 hover:text-gray-900"
                >
                  {user.email}
                </Link>
                <button
                  onClick={() =>
                    signOut().then(() => router.push('/auth/login/'))
                  }
                  className="text-gray-600 hover:text-gray-900"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/login"
                className="text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
            )}
            <button
              className="md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              Menu
            </button>
          </div>
        </div>
      </div>
      {mobileOpen && (
        <div className="border-t md:hidden">
          <div className="space-y-2 px-4 py-2">
            {user && (
              <>
                <Link
                  href="/campaigns"
                  className="block py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Campaigns
                </Link>
                <Link
                  href="/orgs"
                  className="block py-2"
                  onClick={() => setMobileOpen(false)}
                >
                  Organizations
                </Link>
                {!currentOrg && (
                  <Link
                    href="/org/request"
                    className="block py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Request Org
                  </Link>
                )}
                {currentOrg && (
                  <Link
                    href="/dashboard"
                    className="block py-2"
                    onClick={() => setMobileOpen(false)}
                  >
                    Dashboard
                  </Link>
                )}
                {isSystemAdmin && (
                  <>
                    <Link
                      href="/admin"
                      className="block py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      Admin
                    </Link>
                    <Link
                      href="/admin/campaigns"
                      className="block py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      Review Campaigns
                    </Link>
                    <Link
                      href="/admin/org-requests"
                      className="block py-2"
                      onClick={() => setMobileOpen(false)}
                    >
                      Review Orgs
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
