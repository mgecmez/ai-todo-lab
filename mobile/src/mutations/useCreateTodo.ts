import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo } from '../services/api/todosApi';
import type { CreateTodoRequest, Todo } from '../types/todo';
import { TODO_PRIORITY } from '../types/todo';
import { cacheKeys } from '../query/queryKeys';
import { generateLocalId } from '../utils/localId';
import { notificationService } from '../services/notifications/notificationService';
import { useAuth } from '../context/AuthContext';

interface CreateTodoContext {
  previous: Todo[] | undefined;
  tempId: string;
}

export function useCreateTodo() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  const queryKey = userId ? cacheKeys.todos(userId) : (['todos', '__disabled__'] as const);

  return useMutation<Todo, Error, CreateTodoRequest, CreateTodoContext>({
    mutationFn: (request) => createTodo(request),

    onMutate: async (request) => {
      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<Todo[]>(queryKey);

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
        reminderOffset: request.reminderOffset ?? null,
      };

      queryClient.setQueryData<Todo[]>(queryKey, (old) => [tempTodo, ...(old ?? [])]);

      return { previous, tempId: tempTodo.id };
    },

    onSuccess: (newTodo, request) => {
      void notificationService.scheduleReminder({
        ...newTodo,
        reminderOffset: request.reminderOffset ?? null,
      });
    },

    onError: (_error, _request, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData<Todo[]>(queryKey, context.previous);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });
}
