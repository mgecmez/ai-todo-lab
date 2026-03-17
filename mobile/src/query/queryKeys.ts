/**
 * TanStack Query anahtar sabitleri.
 */

export const cacheKeys = {
  todos: (userId: string) => ['todos', userId] as const,
};

/** Geriye dönük uyumluluk için — mutation'larda userId varsa cacheKeys.todos kullan */
export const TODOS_QUERY_KEY = ['todos'] as const;
