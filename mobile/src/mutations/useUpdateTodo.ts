import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTodo } from '../services/api/todosApi';
import type { Todo, UpdateTodoRequest } from '../types/todo';
import { TODO_PRIORITY } from '../types/todo';
import { TODOS_QUERY_KEY } from '../query/queryKeys';
import { notificationService } from '../services/notifications/notificationService';

/** useMutation değişken tipi: id + request birlikte taşınır. */
interface UpdateTodoVariables {
  id: string;
  request: UpdateTodoRequest;
}

/** onMutate'in döndürdüğü ve onError'a iletilen context tipi. */
interface UpdateTodoContext {
  previous: Todo[] | undefined;
}

/**
 * Todo güncelleme mutation hook'u — optimistic update + offline queue desteği.
 *
 * ── Akış (online) ────────────────────────────────────────────────────────────
 *
 *   mutate({ id, request }) çağrıldığında:
 *     1. onMutate  → cache'teki ilgili todo güncellenen değerlerle değiştirilir.
 *     2. mutationFn → updateTodo(id, request) API isteği gönderilir.
 *     3. onSettled → invalidateQueries ile backend'den doğrulanmış veri alınır.
 *
 * ── Akış (offline) ───────────────────────────────────────────────────────────
 *
 *   networkMode: 'offlineFirst' (QueryClient varsayılanı) sayesinde:
 *     1. onMutate  → cache anında güncellenir; kullanıcı değişikliği görür.
 *     2. mutationFn → ağ erişilemez; mutasyon 'paused' kuyruğuna alınır.
 *     3. Bağlantı gelir → resumePausedMutations ile mutasyon gönderilir.
 *     4. onSettled → invalidateQueries ile cache backend'den yenilenir.
 *
 * ── Rollback ─────────────────────────────────────────────────────────────────
 *
 *   onMutate, işlem öncesi cache snapshot'ı saklar.
 *   API hatası durumunda onError bu snapshot'ı cache'e geri yazar.
 *
 * ── Kullanım ─────────────────────────────────────────────────────────────────
 *
 *   const { mutate, isPending } = useUpdateTodo();
 *   mutate({ id: todo.id, request: { title, isCompleted, ... } });
 */
export function useUpdateTodo() {
  const queryClient = useQueryClient();

  return useMutation<Todo, Error, UpdateTodoVariables, UpdateTodoContext>({
    mutationFn: ({ id, request }) => updateTodo(id, request),

    onMutate: async ({ id, request }) => {
      // 1) Devam eden refetch'leri iptal et: yarışma koşulunu önler.
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      // 2) Mevcut cache'i snapshot al; rollback için sakla.
      const previous = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      // 3) İlgili todo'yu optimistic olarak güncelle.
      //    Belirtilmeyen opsiyonel alanlar için mevcut todo değeri korunur.
      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) =>
        (old ?? []).map((t) => {
          if (t.id !== id) return t;
          return {
            ...t,
            title: request.title.trim(),
            description: request.description?.trim() ?? null,
            isCompleted: request.isCompleted,
            priority: request.priority ?? TODO_PRIORITY.Normal,
            dueDate: request.dueDate !== undefined ? request.dueDate : t.dueDate,
            isPinned: request.isPinned !== undefined ? request.isPinned : t.isPinned,
            tags: request.tags !== undefined ? (request.tags?.trim() || null) : t.tags,
            // reminderOffset Faz 1'de yalnızca mobile'da tutulur; optimistic
            // güncellemeye eklenmezse TaskDetail gibi okuma noktaları stale kalır.
            reminderOffset: request.reminderOffset !== undefined
              ? (request.reminderOffset ?? null)
              : t.reminderOffset,
            updatedAt: new Date().toISOString(),
          };
        }),
      );

      return { previous };
    },

    onSuccess: (updatedTodo, { request }) => {
      // Backend, reminderOffset'i bilmez; server'dan dönen todo'ya
      // request'teki reminderOffset'i ekleyerek scheduleReminder'a ilet.
      // scheduleReminder: eski bildirimi iptal edip yenisini zamanlar;
      // reminderOffset null veya dueDate yoksa sadece iptal eder.
      void notificationService.scheduleReminder({
        ...updatedTodo,
        reminderOffset: request.reminderOffset ?? null,
      });
    },

    onError: (_error, _variables, context) => {
      // Optimistic güncellemeyi geri al: snapshot'a dön.
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      // Başarılı ya da hatalı; backend'den doğrulanmış listeyi çek.
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
