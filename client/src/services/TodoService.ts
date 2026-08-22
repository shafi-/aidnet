import type { ServiceData, Todo } from '@/types'
import { TodoRepository } from '@/repositories/TodoRepository'

export class TodoService {
  constructor(private todoRepo: TodoRepository = new TodoRepository()) {}

  async createTodo(
    orgId: string,
    title: string,
    description?: string
  ): ServiceData<Todo> {
    return this.todoRepo.createTodo(orgId, title, description)
  }

  async getTodos(orgId: string): ServiceData<Todo[]> {
    return this.todoRepo.getTodos(orgId)
  }

  async updateTodo(
    todoId: string,
    data: { title?: string; description?: string; completed?: boolean }
  ): ServiceData<Todo> {
    return this.todoRepo.updateTodo(todoId, data)
  }

  async deleteTodo(todoId: string): ServiceData<boolean> {
    return this.todoRepo.deleteTodo(todoId)
  }
}

export const todoService = new TodoService()
