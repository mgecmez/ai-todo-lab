import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

/**
 * NetInfo → onlineManager köprüsü.
 *
 * TanStack Query'nin `onlineManager`, network durumunu izlemek için
 * bir olay dinleyici mekanizması sunar. React Native ortamında bu
 * mekanizmayı besleyen native katman varsayılan olarak bağlı değildir;
 * bu fonksiyon köprüyü kurar.
 *
 * Davranış:
 *   - `NetInfo.addEventListener` her network değişikliğinde tetiklenir.
 *   - `state.isConnected` değeri `onlineManager`'a iletilir.
 *   - `onlineManager.isOnline() === false` iken gönderilemeyen mutasyonlar
 *     otomatik olarak `paused` kuyruğuna alınır.
 *   - Bağlantı geri geldiğinde TanStack Query `resumePausedMutations()`
 *     otomatik çağırır; kuyrukta bekleyen işlemler sırayla gönderilir.
 *
 * Kullanım:
 *   `setupNetInfoSync()` uygulama başlangıcında (App.tsx) bir kez çağrılır.
 *   `setEventListener`'a verilen kurulum fonksiyonu, NetInfo'nun unsubscribe
 *   fonksiyonunu döndürür; TanStack Query bileşen unmount'unda bunu çağırır.
 */
export function setupNetInfoSync(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    }),
  );
}
