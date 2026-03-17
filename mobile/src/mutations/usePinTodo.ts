import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pinTodo } from '../services/api/todosApi';
import type { Todo } from '../types/todo';
import { cacheKeys } from '../query/queryKeys';
import { useAuth } from '../context/AuthContext';

interface PinTodoContext {
  previous: Todo[] | undefined;
}

/**
 * Todo sabitleme mutation hook'u — optimistic toggle + offline queue desteği.
 *
 * onMutate: ilgili todo'nun isPinned değeri anında tersine çevrilir;
 *   kullanıcı pin ikonunun değişimini API yanıtını beklemeden görür.
 * onError: snapshot rollback ile isPinned eski değerine döner.
 * onSettled: invalidateQueries ile backend sıralamasına uygun taze liste alınır.
 *
 * Not: onSettled'dan dönen taze listede pinlenen todo sıralama değişebilir
 *   (backend IsPinned DESC sıralar). Bu, SWR davranışının kabul edilen sonucudur.
 *
 * Kullanım:
 *   const { mutate, isPending } = usePinTodo();
 *   mutate(todo.id);
 */
export function usePinTodo() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const queryKey = userId ? cacheKeys.todos(userId) : (['todos', '__disabled__'] as const);

  return useMutation<Todo, Error, string, PinTodoContext>({
    mutationFn: (id) => pinTodo(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Todo[]>(queryKey);

      // isPinned değerini optimistic olarak tersine çevir.
      queryClient.setQueryData<Todo[]>(queryKey, (old) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, isPinned: !t.isPinned } : t,
        ),
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      // invalidateQueries ile backend sıralaması (pinned üstte) yansıtılır.
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
