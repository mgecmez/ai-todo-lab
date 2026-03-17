import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteTodo } from '../services/api/todosApi';
import type { Todo } from '../types/todo';
import { cacheKeys } from '../query/queryKeys';
import { notificationService } from '../services/notifications/notificationService';
import { useAuth } from '../context/AuthContext';

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
  const { userId } = useAuth();
  const queryKey = userId ? cacheKeys.todos(userId) : (['todos', '__disabled__'] as const);

  return useMutation<void, Error, string, DeleteTodoContext>({
    mutationFn: (id) => deleteTodo(id),

    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Todo[]>(queryKey);

      // Silinecek todo'yu cache'ten anında çıkar.
      queryClient.setQueryData<Todo[]>(queryKey, (old) =>
        (old ?? []).filter((t) => t.id !== id),
      );

      return { previous };
    },

    onSuccess: (_data, id) => {
      // Backend silmeyi onayladı; registry'deki zamanlanmış bildirimi iptal et.
      // onMutate'te değil onSuccess'te yapılır: silme başarısız olup rollback
      // gerçekleşirse bildirim yanlışlıkla silinmemiş olur.
      void notificationService.cancelReminder(id);
    },

    onError: (_error, _id, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
