import { describe, expect, it, vi } from 'vitest'
import { TodoService } from './TodoService'
import { TodoRepository } from '@/repositories/TodoRepository'
import { aTodo } from '@/testing/fixtures'
import { mockRepository } from '@/testing/mockRpcClient'

const ok = <T>(data: T) => ({ data, error: null })

describe('TodoService', () => {
  it('createTodo delegates with mapped args', async () => {
    const createTodo = vi.fn().mockResolvedValue(ok(aTodo()))
    const svc = new TodoService(mockRepository<TodoRepository>({ createTodo }))

    const res = await svc.createTodo('org-1', 'Write tests', 'desc')

    expect(createTodo).toHaveBeenCalledWith('org-1', 'Write tests', 'desc')
    expect(res).toEqual(ok(aTodo()))
  })

  it('getTodos delegates org scoping', async () => {
    const getTodos = vi.fn().mockResolvedValue(ok([aTodo()]))
    const svc = new TodoService(mockRepository<TodoRepository>({ getTodos }))

    const res = await svc.getTodos('org-1')

    expect(getTodos).toHaveBeenCalledWith('org-1')
    expect(res.data).toEqual([aTodo()])
  })

  it('updateTodo passes partial data untouched', async () => {
    const updateTodo = vi.fn().mockResolvedValue(ok(aTodo({ completed: true })))
    const svc = new TodoService(mockRepository<TodoRepository>({ updateTodo }))

    const res = await svc.updateTodo('todo-1', { completed: true })

    expect(updateTodo).toHaveBeenCalledWith('todo-1', { completed: true })
    expect(res.data?.completed).toBe(true)
  })

  it('deleteTodo delegates id and propagates errors', async () => {
    const deleteTodo = vi
      .fn()
      .mockResolvedValueOnce(ok(true))
      .mockResolvedValueOnce({ data: null, error: 'permission denied' })
    const svc = new TodoService(mockRepository<TodoRepository>({ deleteTodo }))

    expect(await svc.deleteTodo('todo-1')).toEqual(ok(true))
    expect(await svc.deleteTodo('todo-1')).toEqual({
      data: null,
      error: 'permission denied',
    })
    expect(deleteTodo).toHaveBeenCalledTimes(2)
  })
})
