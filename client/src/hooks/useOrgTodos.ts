'use client'

import { useState, useEffect, useCallback } from 'react'
import { todoService } from '@/services/TodoService'
import type { Todo } from '@/types'

export function useOrgTodos(orgId: string) {
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await todoService.getTodos(orgId)
    if (data) setTodos(data)
    setLoading(false)
  }, [orgId])

  useEffect(() => {
    load()
  }, [load])

  const add = useCallback(
    async (title: string) => {
      const trimmed = title.trim()
      if (!trimmed) return
      await todoService.createTodo(orgId, trimmed)
      await load()
    },
    [orgId, load]
  )

  const toggleCompleted = useCallback(
    async (todo: Todo) => {
      await todoService.updateTodo(todo.id, { completed: !todo.completed })
      await load()
    },
    [load]
  )

  const remove = useCallback(
    async (id: string) => {
      await todoService.deleteTodo(id)
      await load()
    },
    [load]
  )

  return { todos, loading, add, toggleCompleted, remove }
}

export type OrgTodosController = ReturnType<typeof useOrgTodos>
