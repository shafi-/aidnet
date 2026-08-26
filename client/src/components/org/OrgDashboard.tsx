'use client'

import { useState, useEffect, useCallback } from 'react'
import { useOrganization } from '@/hooks/useOrganization'
import { usePermissions } from '@/hooks/usePermissions'
import { useSubscription } from '@/hooks/useSubscription'
import { orgRequestService } from '@/services/OrgRequestService'
import type { Todo, MemberView, Invite } from '@/types'
import { todoService } from '@/services/TodoService'
import { memberService } from '@/services/MemberService'
import { inviteService } from '@/services/InviteService'
import { BillingTab } from '@/components/subscription/BillingTab'

export function OrgDashboard() {
  const { currentOrg } = useOrganization()
  const { isOrgAdmin, isOrgOwner } = usePermissions()
  const { hasFeature } = useSubscription(currentOrg?.id ?? '')
  const [tab, setTab] = useState<'todos' | 'members' | 'settings' | 'billing'>(
    'todos'
  )

  if (!currentOrg) return null

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{currentOrg.name}</h1>
          <p className="text-gray-600">
            {currentOrg.description ?? 'No description'}
          </p>
        </div>
      </div>
      <div className="mb-4 flex gap-4 border-b">
        {hasFeature('todos') && (
          <button
            onClick={() => setTab('todos')}
            className={`pb-2 ${tab === 'todos' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Todos
          </button>
        )}
        {hasFeature('members') && (
          <button
            onClick={() => setTab('members')}
            className={`pb-2 ${tab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Members
          </button>
        )}
        {hasFeature('settings') && isOrgAdmin() && (
          <button
            onClick={() => setTab('settings')}
            className={`pb-2 ${tab === 'settings' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Settings
          </button>
        )}
        {isOrgOwner() && (
          <button
            onClick={() => setTab('billing')}
            className={`pb-2 ${tab === 'billing' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Billing
          </button>
        )}
      </div>
      {tab === 'todos' && hasFeature('todos') && (
        <TodosTab orgId={currentOrg.id} />
      )}
      {tab === 'members' && hasFeature('members') && (
        <MembersTab orgId={currentOrg.id} />
      )}
      {tab === 'settings' && hasFeature('settings') && (
        <SettingsTab orgId={currentOrg.id} />
      )}
      {tab === 'billing' && isOrgOwner() && (
        <BillingTab orgId={currentOrg.id} isOwner={isOrgOwner()} />
      )}
    </div>
  )
}

function TodosTab({ orgId }: { orgId: string }) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await todoService.getTodos(orgId)
    if (data) setTodos(data)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTitle.trim()
    if (!title) return
    await todoService.createTodo(orgId, title)
    setNewTitle('')
    load()
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newTitle}
          onChange={e => setNewTitle(e.target.value)}
          placeholder="New todo..."
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          Add
        </button>
      </form>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="space-y-2">
          {todos.map(t => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-lg bg-white p-4 shadow"
            >
              <input
                type="checkbox"
                checked={t.completed}
                onChange={() =>
                  todoService
                    .updateTodo(t.id, { completed: !t.completed })
                    .then(load)
                }
              />
              <span className={t.completed ? 'text-gray-500 line-through' : ''}>
                {t.title}
              </span>
              <button
                onClick={() => todoService.deleteTodo(t.id).then(load)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                Delete
              </button>
            </li>
          ))}
          {todos.length === 0 && <p className="text-gray-500">No todos yet.</p>}
        </ul>
      )}
    </div>
  )
}

function MembersTab({ orgId }: { orgId: string }) {
  const { isOrgAdmin } = usePermissions()
  const [members, setMembers] = useState<MemberView[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [activeSubTab, setActiveSubTab] = useState<'members' | 'invites'>(
    'members'
  )

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: memberData }, { data: inviteData }] = await Promise.all([
      memberService.getMembers(orgId),
      isOrgAdmin()
        ? inviteService.getInvites(orgId)
        : Promise.resolve({ data: [] }),
    ])
    if (memberData) setMembers(memberData)
    if (inviteData) setInvites(inviteData)
    setLoading(false)
  }, [orgId, isOrgAdmin])

  useEffect(() => {
    load()
  }, [load])

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    await memberService.addMember(orgId, val)
    setEmail('')
    load()
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = email.trim()
    if (!val) return
    await inviteService.generateInvite(orgId, val, inviteRole)
    setEmail('')
    load()
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    await memberService.updateMemberRole(orgId, userId, newRole)
    load()
  }

  const handleRemoveMember = async (userId: string) => {
    await memberService.removeMember(orgId, userId)
    load()
  }

  if (loading) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      {isOrgAdmin() && (
        <div className="mb-4 flex gap-2 border-b">
          <button
            onClick={() => setActiveSubTab('members')}
            className={`pb-2 ${activeSubTab === 'members' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Members
          </button>
          <button
            onClick={() => setActiveSubTab('invites')}
            className={`pb-2 ${activeSubTab === 'invites' ? 'border-b-2 border-blue-600 font-medium' : ''}`}
          >
            Pending Invites ({invites.length})
          </button>
        </div>
      )}

      {activeSubTab === 'members' && (
        <>
          {isOrgAdmin() && (
            <form onSubmit={handleAddMember} className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Add member by email..."
                className="flex-1 rounded-md border px-3 py-2"
              />
              <button
                type="submit"
                className="rounded-md bg-blue-600 px-4 py-2 text-white"
              >
                Add
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
                {isOrgAdmin() ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={m.role}
                      onChange={e =>
                        handleRoleChange(m.user_id, e.target.value)
                      }
                      className="rounded border px-2 py-1 text-sm"
                    >
                      <option value="viewer">Viewer</option>
                      <option value="member">Member</option>
                      <option value="admin">Admin</option>
                    </select>
                    <button
                      onClick={() => handleRemoveMember(m.user_id)}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">{m.role}</span>
                )}
              </li>
            ))}
            {members.length === 0 && (
              <p className="text-gray-500">No members yet.</p>
            )}
          </ul>
        </>
      )}

      {activeSubTab === 'invites' && isOrgAdmin() && (
        <>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Invite by email..."
              className="flex-1 rounded-md border px-3 py-2"
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value)}
              className="rounded border px-2 py-2"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-white"
            >
              Invite
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
                    Role: {inv.role} · Expires:{' '}
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await inviteService.revokeInvite(inv.id)
                    load()
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Revoke
                </button>
              </li>
            ))}
            {invites.length === 0 && (
              <p className="text-gray-500">No pending invites.</p>
            )}
          </ul>
        </>
      )}
    </div>
  )
}

function SettingsTab({ orgId }: { orgId: string }) {
  const { currentOrg, refreshOrg } = useOrganization()
  const { isOrgAdmin } = usePermissions()
  const [name, setName] = useState(currentOrg?.name ?? '')
  const [slug, setSlug] = useState(currentOrg?.slug ?? '')
  const [description, setDescription] = useState(currentOrg?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (currentOrg) {
      setName(currentOrg.name)
      setSlug(currentOrg.slug)
      setDescription(currentOrg.description ?? '')
    }
  }, [currentOrg])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setSaved(false)
    try {
      // org_meta is the editable metadata source (see org_request_workflow);
      // writing organizations directly gets masked by the COALESCE read.
      const { error } = await orgRequestService.updateOrgMeta(orgId, {
        name: name.trim(),
        description: description.trim() || undefined,
      })
      if (error) {
        setSaving(false)
        return
      }
      await refreshOrg()
      setSaving(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setSaving(false)
    }
  }

  if (!isOrgAdmin())
    return <p>You don&apos;t have permission to edit settings.</p>

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="max-w-2xl space-y-4">
        <div>
          <label
            htmlFor="org-settings-name"
            className="block text-sm font-medium text-gray-700"
          >
            Organization Name
          </label>
          <input
            id="org-settings-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
            required
          />
        </div>
        <div>
          <label
            htmlFor="org-settings-slug"
            className="block text-sm font-medium text-gray-700"
          >
            Slug
          </label>
          <input
            id="org-settings-slug"
            type="text"
            value={slug}
            onChange={e => setSlug(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2 font-mono"
            required
            pattern="[a-z0-9-]+"
          />
          <p className="mt-1 text-xs text-gray-500">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>
        <div>
          <label
            htmlFor="org-settings-description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="org-settings-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-1 block w-full rounded-md border px-3 py-2"
            rows={3}
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </form>
    </div>
  )
}
