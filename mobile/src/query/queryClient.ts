import { MutationCache, QueryClient } from '@tanstack/react-query';
import { captureOfflineSyncError } from '../services/monitoring/sentry';

/**
 * Uygulama genelinde tek QueryClient instance'ı.
 *
 * Bu dosya dışına doğrudan erişilmemelidir; hook'lar ve bileşenler
 * `useQueryClient()` üzerinden aynı instance'a ulaşır. App.tsx'te
 * `PersistQueryClientProvider`'a prop olarak verilir.
 *
 * ── Query varsayılanları ─────────────────────────────────────────────────────
 *
 * networkMode: 'offlineFirst'
 *   Sorguların network durumundan bağımsız çalışmasını sağlar. Offline iken
 *   `queryFn` yine çağrılır; başarısız olursa hata işlenir. Cache'ten okunan
 *   veri her zaman anında döndürülür (Persister'dan restore edilmiş olsa bile).
 *
 * staleTime: 5 dakika
 *   5 dakika geçmeden aynı query tekrar arka planda fetch yapmaz.
 *   Liste açıldığında cache'ten anlık gösterim, arka planda yenileme sağlar.
 *
 * gcTime: 24 saat
 *   Kullanılmayan cache verisi 24 saat bellekte tutulur. Persister ile
 *   birlikte çalıştığında, uygulama kapatılıp açılsa bile verinin
 *   AsyncStorage'dan restore edilmesine yeterli süre tanır.
 *
 * ── Mutation varsayılanları ──────────────────────────────────────────────────
 *
 * networkMode: 'offlineFirst'
 *   Offline iken mutasyonlar anında `paused` kuyruğuna alınır; bağlantı
 *   gelince `resumePausedMutations` otomatik çalışır. Kuyruk, Persister
 *   sayesinde uygulama yeniden açılsa bile korunur.
 *
 * retry: 3
 *   Geçici ağ hatalarında 3 deneme yapılır (üstel geri çekilme ile).
 *   Kalıcı API hatalarında (4xx) retry çalışmaz; TanStack Query 4xx'i
 *   yeniden denenebilir hata olarak işaretlemez.
 */
export const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      captureOfflineSyncError(error, {
        mutationKey: JSON.stringify(mutation.options.mutationKey ?? 'unknown'),
        failureCount: mutation.state.failureCount,
      });
    },
  }),
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst',
      staleTime: 5 * 60 * 1000,   // 5 dakika
      gcTime: 24 * 60 * 60 * 1000, // 24 saat
      retry: 1,
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
    },
  },
});
