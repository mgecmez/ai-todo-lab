import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

/**
 * TanStack Query cache'ini AsyncStorage'a yazan persister.
 *
 * PersistQueryClientProvider bu persister'ı kullanarak:
 *   - QueryClient'ın in-memory cache'ini throttle aralıklarıyla AsyncStorage'a seri hale getirir.
 *   - Uygulama yeniden açıldığında AsyncStorage'dan cache'i okuyup QueryClient'a yükler.
 *   - Paused (offline kuyruğundaki) mutasyonları da seri hale getirir; uygulama
 *     kapatılıp açılsa bile bekleyen işlemler kaybolmaz.
 *
 * Anahtar: 'RQ_TODOS_CACHE'
 *   Mevcut Phase 1 cache anahtarından ('todos_cache') farklı seçildi.
 *   İki sistemin AsyncStorage'da çakışması önlenir; geçiş sürecinde
 *   her ikisi paralel yaşayabilir.
 *
 * Throttle: 1000 ms
 *   Her cache değişikliğinde anında yazmak yerine 1 saniyelik gecikmeyle yazar.
 *   Hızlı ardışık güncelleme senaryolarında (optimistic update zinciri) gereksiz
 *   write trafiğini azaltır; in-memory her zaman günceldir, sadece disk yazımı gecikir.
 */
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'RQ_TODOS_CACHE',
  throttleTime: 1000,
});
