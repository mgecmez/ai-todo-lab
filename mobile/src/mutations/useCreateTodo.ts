import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo } from '../services/api/todosApi';
import type { CreateTodoRequest, Todo } from '../types/todo';
import { TODO_PRIORITY } from '../types/todo';
import { TODOS_QUERY_KEY } from '../query/queryKeys';
import { generateLocalId } from '../utils/localId';

/** onMutate'in döndürdüğü ve onError/onSettled'a iletilen context tipi. */
interface CreateTodoContext {
  previous: Todo[] | undefined;
  tempId: string;
}

/**
 * Todo oluşturma mutation hook'u — optimistic update + offline queue desteği.
 *
 * ── Akış (online) ────────────────────────────────────────────────────────────
 *
 *   mutate(request) çağrıldığında:
 *     1. onMutate  → geçici todo cache'in başına eklenir; kullanıcı anında görür.
 *     2. mutationFn → createTodo(request) API isteği gönderilir.
 *     3. onSettled → invalidateQueries ile backend'den gerçek liste çekilir.
 *                    Geçici id yerini backend id'sine bırakır.
 *
 * ── Akış (offline) ───────────────────────────────────────────────────────────
 *
 *   networkMode: 'offlineFirst' (QueryClient varsayılanı) sayesinde:
 *     1. onMutate  → her zaman çalışır; geçici todo cache'e eklenir.
 *     2. mutationFn → ağ erişilemez; mutasyon 'paused' kuyruğuna alınır.
 *     3. Bağlantı gelir → resumePausedMutations otomatik çalışır.
 *     4. Mutasyon gönderilir → onSettled → invalidateQueries.
 *
 *   Kuyruk Persister tarafından da seri hale getirilir; uygulama
 *   kapatılıp açılsa bile paused mutasyon kaybolmaz.
 *
 * ── Rollback ─────────────────────────────────────────────────────────────────
 *
 *   onMutate, işlem öncesi cache snapshot'ı context olarak döndürür.
 *   API hatası durumunda onError bu snapshot'ı cache'e geri yazar;
 *   optimistic güncelleme geri alınır.
 *
 * ── Kullanım ─────────────────────────────────────────────────────────────────
 *
 *   const { mutateAsync, isPending } = useCreateTodo();
 *   await mutateAsync({ title: 'Yeni görev', priority: TODO_PRIORITY.High });
 */
export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation<Todo, Error, CreateTodoRequest, CreateTodoContext>({
    mutationFn: (request) => createTodo(request),

    onMutate: async (request) => {
      // 1) Devam eden refetch'leri iptal et: yarışma koşulu önlenir.
      //    Aksi hâlde API'den dönen eski liste optimistic güncellemeyi
      //    ezebilir.
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      // 2) Mevcut cache'i snapshot al; hata durumunda rollback için sakla.
      const previous = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      // 3) Geçici todo oluştur ve cache'in başına ekle.
      //    Backend'in atayacağı varsayılan değerleri yansıtır;
      //    isCompleted ve IsPinned create'de her zaman false'tur.
      const tempTodo: Todo = {
        id: generateLocalId(),
        title: request.title.trim(),
        description: request.description?.trim() ?? null,
        isCompleted: false,
        priority: request.priority ?? TODO_PRIORITY.Normal,
        dueDate: request.dueDate ?? null,
        isPinned: false,
        tags: request.tags?.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) => [tempTodo, ...(old ?? [])]);

      // Context olarak döndür: onError rollback + tempId için kullanılır.
      return { previous, tempId: tempTodo.id };
    },

    onError: (_error, _request, context) => {
      // Optimistic güncellemeyi geri al: snapshot'a dön.
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      // Başarılı ya da hatalı her senaryoda backend'den taze listeyi çek.
      // Bu çağrı geçici id'yi gerçek backend id'siyle değiştirir.
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
