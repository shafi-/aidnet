import { describe, expect, it } from 'vitest'
import { TodoRepository } from './TodoRepository'
import { createMockRpcGateway } from '@/testing/mockRpcClient'
import { aTodo } from '@/testing/fixtures'

describe('TodoRepository', () => {
  it('createTodo calls create_todo and coerces missing description to null', async () => {
    const todo = aTodo()
    const gw = createMockRpcGateway({ create_todo: { data: todo } })
    const res = await new TodoRepository(gw).createTodo('org-1', 'Write tests')

    expect(res.data).toEqual(todo)
    expect(gw.callsTo('create_todo')).toEqual([
      {
        functionName: 'create_todo',
        params: {
          p_organization_id: 'org-1',
          p_title: 'Write tests',
          p_description: null,
        },
      },
    ])
  })

  it('createTodo passes description when provided', async () => {
    const gw = createMockRpcGateway({ create_todo: { data: aTodo() } })
    await new TodoRepository(gw).createTodo('org-1', 'T', 'D')

    expect(gw.callsTo('create_todo')[0].params).toMatchObject({
      p_description: 'D',
    })
  })

  it('getTodos scopes by p_organization_id', async () => {
    const todos = [aTodo()]
    const gw = createMockRpcGateway({ get_todos: { data: todos } })
    const res = await new TodoRepository(gw).getTodos('org-1')

    expect(res.data).toEqual(todos)
    expect(gw.callsTo('get_todos')[0].params).toEqual({
      p_organization_id: 'org-1',
    })
  })

  it('updateTodo maps only provided fields', async () => {
    const gw = createMockRpcGateway({ update_todo: { data: aTodo() } })
    await new TodoRepository(gw).updateTodo('todo-1', {
      completed: true,
      title: 'New',
    })

    expect(gw.callsTo('update_todo')[0].params).toEqual({
      p_todo_id: 'todo-1',
      p_title: 'New',
      p_description: undefined,
      p_completed: true,
    })
  })

  it('deleteTodo passes p_todo_id', async () => {
    const gw = createMockRpcGateway({ delete_todo: { data: true } })
    const res = await new TodoRepository(gw).deleteTodo('todo-1')

    expect(res.data).toBe(true)
    expect(gw.callsTo('delete_todo')[0].params).toEqual({ p_todo_id: 'todo-1' })
  })

  it('propagates errors untouched', async () => {
    const gw = createMockRpcGateway({
      get_todos: { error: 'permission denied' },
    })
    const res = await new TodoRepository(gw).getTodos('org-1')

    expect(res).toEqual({ data: null, error: 'permission denied' })
  })
})
