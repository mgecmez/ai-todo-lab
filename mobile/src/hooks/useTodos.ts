import { onlineManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { getTodos } from '../services/api/todosApi';
import type { Todo } from '../types/todo';
import { TODOS_QUERY_KEY } from '../query/queryKeys';

/**
 * Todos listesini TanStack Query üzerinden okuyan hook.
 *
 * Davranış:
 *   - İlk açılışta Persister'dan restore edilen cache anında `todos` olarak döner;
 *     aynı anda arka planda API'den taze veri çekilir (SWR benzeri davranış).
 *   - staleTime (5 dk) dolmadıkça arka planda yeniden fetch yapılmaz.
 *   - networkMode: 'offlineFirst' sayesinde cache her zaman önce döner;
 *     network erişilemez durumdayken hata yerine cache gösterilir.
 *   - `refetch` pull-to-refresh için doğrudan kullanılabilir.
 *
 * Backend erişilemezlik kurtarma:
 *   `todosApi.apiFetch`, backend erişilemez olduğunda `onlineManager.setOnline(false)`
 *   çağırır; bu sayede bekleyen mutation'lar `paused` kuyruğuna alınır. Backend geri
 *   geldiğinde ilk başarılı `getTodos()` çağrısı burada algılanır: `onlineManager`
 *   true yapılır ve `resumePausedMutations()` ile kuyruk boşaltılır.
 *
 * Kullanım:
 *   const { todos, isLoading, isError, error, refetch, isRefetching } = useTodos();
 */
export function useTodos() {
  const queryClient = useQueryClient();

  const query = useQuery<Todo[], Error>({
    queryKey: TODOS_QUERY_KEY,
    queryFn: async () => {
      const data = await getTodos();
      // getTodos() başarılı → backend erişilebilir.
      // apiFetch tarafından false yapılmış olabilecek onlineManager'ı geri getir
      // ve kuyruktaki paused mutation'ları tetikle.
      if (!onlineManager.isOnline()) {
        onlineManager.setOnline(true);
        void queryClient.resumePausedMutations();
      }
      return data;
    },
  });

  return {
    /** API'den veya Persister cache'inden gelen todo listesi; henüz veri yoksa boş dizi. */
    todos: query.data ?? [],
    /** İlk yükleme devam ediyor ve cache'te hiç veri yok. */
    isLoading: query.isLoading,
    /** Arka planda yeniden fetch yapılıyor (pull-to-refresh dahil). */
    isRefetching: query.isRefetching,
    /** Son fetch başarısız oldu. */
    isError: query.isError,
    /** Hata varsa Error nesnesi; yoksa null. */
    error: query.error,
    /** Mevcut query'i yeniden tetikler (pull-to-refresh için). */
    refetch: query.refetch,
  };
}
