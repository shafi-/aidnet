'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrgMembers } from '@/hooks/useOrgMembers'

export function MembersTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const {
    members,
    invites,
    loading,
    isAdmin,
    email,
    setEmail,
    inviteRole,
    setInviteRole,
    addMember,
    invite,
    updateRole,
    removeMember,
    revokeInvite,
  } = useOrgMembers(orgId)
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'invites'>(
    'members'
  )

  if (loading) return <div>{t('common.loading')}</div>

  return (
    <div className="space-y-4">
      {isAdmin() && (
        <>
          <p className="text-sm text-gray-500">{t('members.hint')}</p>
          <div className="mb-4 flex gap-2 border-b">
            <button
              onClick={() => setActiveSubTab('members')}
              className={`pb-2 ${activeSubTab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
            >
              {t('orgTabs.members')}
            </button>
            <button
              onClick={() => setActiveSubTab('invites')}
              className={`pb-2 ${activeSubTab === 'invites' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
            >
              {t('members.pendingInvites', { count: invites.length })}
            </button>
          </div>
        </>
      )}

      {activeSubTab === 'members' && (
        <>
          {isAdmin() && (
            <form
              onSubmit={e => {
                e.preventDefault()
                addMember(email)
              }}
              className="flex gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t('members.addPlaceholder')}
                className="flex-1 rounded-md border px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-white"
              >
                {t('common.add')}
              </button>
            </form>
          )}
          <ul className="space-y-2">
            {members.map(m => (
              <li
                key={m.id}
                className="flex items-center gap-3 rounded-lg bg-white p-4 shadow"
              >
                <div className="flex-1">
                  <p className="font-medium">{m.full_name ?? m.email}</p>
                  <p className="text-sm text-gray-500">{m.email}</p>
                </div>
                {isAdmin() ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={e => updateRole(m.user_id, e.target.value)}
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="viewer">{t('roles.viewer')}</option>
                      <option value="member">{t('roles.member')}</option>
                      <option value="admin">{t('roles.admin')}</option>
                    </select>
                    <button
                      onClick={() => removeMember(m.user_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      {t('members.remove')}
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">
                    {t(`roles.${m.role}`, { defaultValue: m.role })}
                  </span>
                )}
              </li>
            ))}
            {members.length === 0 && (
              <p className="text-gray-500">{t('members.noMembers')}</p>
            )}
          </ul>
        </>
      )}

      {activeSubTab === 'invites' && isAdmin() && (
        <>
          <form
            onSubmit={e => {
              e.preventDefault()
              invite(email, inviteRole)
            }}
            className="flex gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('members.invitePlaceholder')}
              className="flex-1 rounded-md border px-3 py-2"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="rounded border px-2 py-2"
            >
              <option value="viewer">{t('roles.viewer')}</option>
              <option value="member">{t('roles.member')}</option>
              <option value="admin">{t('roles.admin')}</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              {t('members.invite')}
            </button>
          </form>
          <ul className="space-y-2">
            {invites.map(inv => (
              <li
                key={inv.id}
                className="flex items-center gap-3 rounded-lg bg-white p-4 shadow"
              >
                <div className="flex-1">
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-sm text-gray-500">
                    {t('members.inviteMeta', {
                      role: t(`roles.${inv.role}`, {
                        defaultValue: inv.role,
                      }),
                      date: new Date(inv.expires_at).toLocaleDateString(),
                    })}
                  </p>
                </div>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  {t('members.revoke')}
                </button>
              </li>
            ))}
            {invites.length === 0 && (
              <p className="text-gray-500">{t('members.noInvites')}</p>
            )}
          </ul>
        </>
      )}
    </div>
  )
}
