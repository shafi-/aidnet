'use client'

import { useState } from 'react'
import { useOrgTodos } from '@/hooks/useOrgTodos'

export function TodosTab({ orgId }: { orgId: string }) {
  const { todos, loading, add, toggleCompleted, remove } = useOrgTodos(orgId)
  const [newTitle, setNewTitle] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await add(newTitle)
    setNewTitle('')
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
                onChange={() => toggleCompleted(t)}
              />
              <span className={t.completed ? 'text-gray-500 line-through' : ''}>
                {t.title}
              </span>
              <button
                onClick={() => remove(t.id)}
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
