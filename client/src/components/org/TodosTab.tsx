'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useOrgTodos } from '@/hooks/useOrgTodos'

export function TodosTab({ orgId }: { orgId: string }) {
  const { t } = useTranslation()
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
          placeholder={t('todos.newPlaceholder')}
          className="flex-1 rounded-md border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-2 text-white"
        >
          {t('common.add')}
        </button>
      </form>
      {loading ? (
        <div>{t('common.loading')}</div>
      ) : (
        <ul className="space-y-2">
          {todos.map(todo => (
            <li
              key={todo.id}
              className="flex items-center gap-3 rounded-lg bg-white p-4 shadow"
            >
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleCompleted(todo)}
              />
              <span
                className={todo.completed ? 'text-gray-500 line-through' : ''}
              >
                {todo.title}
              </span>
              <button
                onClick={() => remove(todo.id)}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                {t('common.delete')}
              </button>
            </li>
          ))}
          {todos.length === 0 && (
            <p className="text-gray-500">{t('todos.noTodos')}</p>
          )}
        </ul>
      )}
    </div>
  )
}
