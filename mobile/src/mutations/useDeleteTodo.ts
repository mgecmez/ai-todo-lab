import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTodo } from '../services/api/todosApi';
import type { Todo } from '../types/todo';
import { TODOS_QUERY_KEY } from '../query/queryKeys';

interface DeleteTodoContext {
  previous: Todo[] | undefined;
}

/**
 * Todo silme mutation hook'u — optimistic remove + offline queue desteği.
 *
 * onMutate: ilgili todo cache'ten anında çıkarılır; kullanıcı
 *   silme işlemini beklemeden görür.
 * onError: todo cache'e geri eklenir (snapshot rollback).
 * onSettled: invalidateQueries ile liste backend'den yenilenir.
 *
 * Kullanım:
 *   const { mutate, isPending } = useDeleteTodo();
 *   mutate(todo.id);
 */
export function useDeleteTodo() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, DeleteTodoContext>({
    mutationFn: (id) => deleteTodo(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      const previous = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      // Silinecek todo'yu cache'ten anında çıkar.
      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );

      return { previous };
    },

    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
