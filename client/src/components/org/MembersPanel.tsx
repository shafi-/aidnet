'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrgMembers } from '@/hooks/useOrgMembers'
import { buildInviteLink } from '@/lib/inviteToken'
import type { Invite } from '@/types'

// Transient "copied" flash, same as the campaign-detail copy button:
// clipboard write plus a moment of visible feedback, nothing more.
function CopyInviteButton({ invite }: { invite: Invite }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildInviteLink(invite.token))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — the callout still shows the code to copy by hand.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="min-h-11 flex-none rounded-md border px-4 py-2.5 text-sm font-medium hover:bg-muted"
    >
      {copied ? t('members.linkCopied') : t('members.copyLink')}
    </button>
  )
}

// Members (docs/ux-restructure-plan.md §2): one list — active members and
// pending invites side by side with status badges and inline actions. The
// old Members/Pending-Invites sub-tabs are gone; adding and inviting are
// two admin forms above the same list they act on. Invites are delivered
// by the admin — no email is sent — so every invite exposes its share
// link, and a fresh invite gets a share callout until dismissed.
export function MembersPanel({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
  const {
    members,
    invites,
    loading,
    error,
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
    lastInvite,
    clearLastInvite,
  } = useOrgMembers(orgId)

  if (loading)
    return (
      <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
    )

  if (error)
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      >
        {t('members.loadError', { message: error })}
      </div>
    )

  return (
    <div className="space-y-6">
      {isAdmin() && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('members.hint')}</p>
          <form
            onSubmit={e => {
              e.preventDefault()
              addMember(email)
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('members.addPlaceholder')}
              aria-label={t('members.addPlaceholder')}
              className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2.5"
            />
            <button
              type="submit"
              className="min-h-11 rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('common.add')}
            </button>
          </form>
          <form
            onSubmit={e => {
              e.preventDefault()
              invite(email, inviteRole)
            }}
            className="flex flex-wrap gap-2"
          >
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('members.invitePlaceholder')}
              aria-label={t('members.invitePlaceholder')}
              className="min-w-0 flex-1 rounded-md border bg-card px-3 py-2.5"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              aria-label={t('members.inviteRoleAria')}
              className="rounded-md border bg-card px-3 py-2.5"
            >
              <option value="viewer">{t('roles.viewer')}</option>
              <option value="member">{t('roles.member')}</option>
              <option value="admin">{t('roles.admin')}</option>
            </select>
            <button
              type="submit"
              className="min-h-11 rounded-md bg-primary px-4 py-2.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('members.invite')}
            </button>
          </form>
        </div>
      )}

      {lastInvite && (
        <div
          role="status"
          className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-4"
        >
          <p className="text-sm font-medium">
            {t('members.inviteReady', { email: lastInvite.email })}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('members.inviteReadyHint')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="min-w-0 truncate rounded bg-card px-2 py-1 text-xs">
              {lastInvite.token}
            </code>
            <CopyInviteButton invite={lastInvite} />
            <button
              type="button"
              onClick={clearLastInvite}
              aria-label={t('members.dismissInvite')}
              className="min-h-11 rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted"
            >
              {t('members.dismissInvite')}
            </button>
          </div>
        </div>
      )}

      <div className="divide-y rounded-lg border bg-card shadow-sm">
        {members.map(member => (
          <div
            key={member.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">
                {member.full_name ?? member.email}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {member.email}
              </p>
            </div>
            {isAdmin() ? (
              <div className="flex flex-none items-center gap-2">
                <select
                  value={member.role}
                  onChange={e => updateRole(member.user_id, e.target.value)}
                  aria-label={t('members.roleAria', { name: member.email })}
                  className="rounded-md border bg-card px-2 py-2 text-sm"
                >
                  <option value="viewer">{t('roles.viewer')}</option>
                  <option value="member">{t('roles.member')}</option>
                  <option value="admin">{t('roles.admin')}</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeMember(member.user_id)}
                  className="min-h-11 rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  {t('members.remove')}
                </button>
              </div>
            ) : (
              <span className="flex-none text-sm text-muted-foreground">
                {t(`roles.${member.role}`, { defaultValue: member.role })}
              </span>
            )}
          </div>
        ))}

        {isAdmin() &&
          invites.map(inviteRow => (
            <div
              key={inviteRow.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate font-medium">
                  <span className="truncate">{inviteRow.email}</span>
                  <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    {t('status.pending')}
                  </span>
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {t('members.inviteMeta', {
                    role: t(`roles.${inviteRow.role}`, {
                      defaultValue: inviteRow.role,
                    }),
                    date: new Date(inviteRow.expires_at).toLocaleDateString(),
                  })}
                </p>
              </div>
              <div className="flex flex-none items-center gap-2">
                <CopyInviteButton invite={inviteRow} />
                <button
                  type="button"
                  onClick={() => revokeInvite(inviteRow.id)}
                  className="min-h-11 flex-none rounded-md border border-destructive/40 px-4 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"
                >
                  {t('members.revoke')}
                </button>
              </div>
            </div>
          ))}

        {members.length === 0 && invites.length === 0 && (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            {t('members.noMembers')}
          </p>
        )}
      </div>
    </div>
  )
}
