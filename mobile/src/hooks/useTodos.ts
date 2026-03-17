import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { getTodos } from '../services/api/todosApi';
import type { Todo } from '../types/todo';
import { cacheKeys } from '../query/queryKeys';

export function useTodos() {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  const query = useQuery<Todo[], Error>({
    queryKey: userId ? cacheKeys.todos(userId) : ['todos', '__disabled__'],
    queryFn: async () => {
      const data = await getTodos();
      if (!onlineManager.isOnline()) {
        onlineManager.setOnline(true);
        void queryClient.resumePausedMutations();
      }
      return data;
    },
    enabled: !!userId,
  });

  return {
    todos: query.data ?? [],
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
