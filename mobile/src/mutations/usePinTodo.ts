import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pinTodo } from '../services/api/todosApi';
import type { Todo } from '../types/todo';
import { TODOS_QUERY_KEY } from '../query/queryKeys';

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

  return useMutation<Todo, Error, string, PinTodoContext>({
    mutationFn: (id) => pinTodo(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      const previous = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      // isPinned değerini optimistic olarak tersine çevir.
      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) =>
        (old ?? []).map((t) =>
          t.id === id ? { ...t, isPinned: !t.isPinned } : t,
        ),
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      // invalidateQueries ile backend sıralaması (pinned üstte) yansıtılır.
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
