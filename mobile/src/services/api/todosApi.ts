import type {
  CreateTodoRequest,
  Todo,
  UpdateTodoRequest,
} from '../../types/todo';
import { API_BASE_URL, apiFetch } from './config';

const BASE = `${API_BASE_URL}/api/todos`;

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = await response.json();
      message = body?.title ?? body?.message ?? message;
    } catch {
      // JSON parse edilemezse ham mesajı kullan
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function getTodos(): Promise<Todo[]> {
  const response = await apiFetch(BASE);
  return parseResponse<Todo[]>(response);
}

export async function createTodo(request: CreateTodoRequest): Promise<Todo> {
  // reminderOffset Faz 1'de yalnızca mobile'da tutulur; backend bu alanı bilmez.
  const { reminderOffset: _reminderOffset, ...body } = request;
  const response = await apiFetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<Todo>(response);
}

export async function updateTodo(
  id: string,
  request: UpdateTodoRequest,
): Promise<Todo> {
  const { reminderOffset: _reminderOffset, ...body } = request;
  const response = await apiFetch(`${BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseResponse<Todo>(response);
}

export async function deleteTodo(id: string): Promise<void> {
  const response = await apiFetch(`${BASE}/${id}`, { method: 'DELETE' });
  return parseResponse<void>(response);
}

export async function toggleTodo(id: string): Promise<Todo> {
  const response = await apiFetch(`${BASE}/${id}/toggle`, { method: 'PATCH' });
  return parseResponse<Todo>(response);
}

export async function pinTodo(id: string): Promise<Todo> {
  const response = await apiFetch(`${BASE}/${id}/pin`, { method: 'PATCH' });
  return parseResponse<Todo>(response);
}
