import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toggleTodo } from '../services/api/todosApi';
import type { Todo } from '../types/todo';
import { cacheKeys } from '../query/queryKeys';
import { useAuth } from '../context/AuthContext';

interface ToggleTodoContext {
  previous: Todo[] | undefined;
}

/**
 * Todo tamamlanma durumu mutation hook'u — optimistic toggle + offline queue desteği.
 *
 * onMutate:   ilgili todo'nun isCompleted değeri anında tersine çevrilir;
 *             kullanıcı checkbox değişimini API yanıtını beklemeden görür.
 * onSuccess:  backend'den dönen kesin todo ile yalnızca ilgili item güncellenir.
 *             Toggle sıralama değiştirmediğinden (backend: IsPinned DESC, CreatedAt DESC)
 *             tam liste refetch gerekmez. Bu yaklaşım iki sorunu birden çözer:
 *             1) Gereksiz network round-trip önlenir.
 *             2) FlatList data prop gereksiz yere değişmez → iOS RefreshControl
 *                layout shift (scroll jump) oluşmaz.
 * onError:    snapshot rollback ile isCompleted eski değerine döner.
 * onSettled:  yalnızca hata durumunda invalidateQueries tetiklenir; başarıda
 *             onSuccess kesin veriyi zaten yazdı.
 *
 * Kullanım:
 *   const { mutate, isPending } = useToggleTodo();
 *   mutate(todo.id);
 */
export function useToggleTodo() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const queryKey = userId ? cacheKeys.todos(userId) : (['todos', '__disabled__'] as const);

  return useMutation<Todo, Error, string, ToggleTodoContext>({
    mutationFn: (id) => toggleTodo(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Todo[]>(queryKey);

      // isCompleted değerini optimistic olarak tersine çevir.
      queryClient.setQueryData<Todo[]>(queryKey, (old) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, isCompleted: !t.isCompleted } : t,
        ),
      );

      return { previous };
    },

    onSuccess: (updatedTodo) => {
      // Sunucudan dönen kesin veri ile sadece ilgili item'ı güncelle.
      // Tam liste yenilemesi yapılmaz; isRefetching tetiklenmez.
      queryClient.setQueryData<Todo[]>(queryKey, (old) =>
        (old ?? []).map((t) => (t.id === updatedTodo.id ? updatedTodo : t)),
      );
    },

    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(queryKey, context.previous);
      }
    },

    onSettled: (_data, error) => {
      // Başarıda onSuccess kesin veriyi yazdı; ek refetch gerekmez.
      // Hata durumunda rollback yapıldı; backend ile tutarsızlık olabilir → yenile.
      if (error) {
        queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
