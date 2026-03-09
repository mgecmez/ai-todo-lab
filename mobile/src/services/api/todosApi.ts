import { onlineManager } from "@tanstack/react-query";
import type {
  CreateTodoRequest,
  Todo,
  UpdateTodoRequest,
} from "../../types/todo";
import { isNetworkError } from "../../utils/errorMessage";
import { API_BASE_URL } from "./config";

const BASE = `${API_BASE_URL}/api/todos`;

/**
 * fetch() wrapper'ı — ağ/bağlantı hatalarını TanStack Query'nin
 * mutation pause mekanizmasına bağlar.
 *
 * Sorun:
 *   Cihaz WiFi'ya bağlı ama backend kapalıysa NetInfo "online" der.
 *   onlineManager da online kabul eder. Bu durumda mutation, paused
 *   kuyruğuna girmek yerine hata üretir ve rollback yapar.
 *
 * Çözüm:
 *   fetch() bir ağ hatası (connection refused / fetch failed) fırlatırsa
 *   `onlineManager.setOnline(false)` çağrılır. TanStack Query, mutation
 *   sonrası online durumunu kontrol ettiğinde false görür ve mutasyonu
 *   `paused` kuyruğuna alır. Backend erişilebilir hale geldiğinde
 *   `useTodos.queryFn` içindeki başarı algılaması online durumu geri
 *   getirir ve `resumePausedMutations()` tetikler.
 */
async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (e) {
    if (isNetworkError(e)) {
      onlineManager.setOnline(false);
    }
    throw e;
  }
}

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
  const response = await apiFetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseResponse<Todo>(response);
}

export async function updateTodo(
  id: string,
  request: UpdateTodoRequest,
): Promise<Todo> {
  const response = await apiFetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  return parseResponse<Todo>(response);
}

export async function deleteTodo(id: string): Promise<void> {
  const response = await apiFetch(`${BASE}/${id}`, { method: "DELETE" });
  return parseResponse<void>(response);
}

export async function toggleTodo(id: string): Promise<Todo> {
  const response = await apiFetch(`${BASE}/${id}/toggle`, { method: "PATCH" });
  return parseResponse<Todo>(response);
}

export async function pinTodo(id: string): Promise<Todo> {
  const response = await apiFetch(`${BASE}/${id}/pin`, { method: "PATCH" });
  return parseResponse<Todo>(response);
}
