// React Native / Expo fetch katmanının ağ erişilemezliğinde ürettiği mesaj parçaları.
// "fetch failed"     → Node/Hermes native fetch (iOS/Android)
// "network request failed" → XMLHttpRequest tabanlı fetch (eski RN sürümleri)
const NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'fetch failed',
  'failed to fetch',
] as const;

/**
 * Verilen hatanın bir ağ/bağlantı hatası olup olmadığını döndürür.
 *
 * `true` dönerse backend erişilemez demektir (sunucu kapalı, DNS başarısız,
 * bağlantı reddedildi vb.). HTTP 4xx/5xx yanıtları bu kapsamda DEĞİLDİR;
 * onlar `response.ok === false` ile yakalanır.
 *
 * Kullanım:
 *   `todosApi.ts` içindeki `apiFetch` bu fonksiyonla ağ hatası tespiti yapar.
 */
export function isNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message.toLowerCase() : '';
  return NETWORK_ERROR_PATTERNS.some((p) => msg.includes(p));
}

/**
 * Teknik ağ hata mesajlarını kullanıcı dostu Türkçe metne çevirir.
 *
 * React Native'in ham fetch hataları ("Network request failed", "fetch failed")
 * kullanıcıya gösterilmez; bunların yerine anlaşılır bir mesaj döndürülür.
 * Diğer API hataları (sunucudan gelen başlık/detay) olduğu gibi iletilir.
 */
export function friendlyErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : '';
  if (isNetworkError(e)) {
    return 'İnternet bağlantısı yok. Lütfen tekrar deneyin.';
  }
  return raw || 'Bir hata oluştu. Lütfen tekrar deneyin.';
}
