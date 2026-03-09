/**
 * Offline create için geçici (local) id yönetimi.
 *
 * Kullanıcı offline iken todo oluşturduğunda backend henüz bir id
 * atayamaz. Bu modül, geçici bir id üretir ve bu id'nin geçici mi
 * yoksa gerçek bir backend id'si mi olduğunu ayırt etmeye yarar.
 *
 * Format: "local_<uuid-v4>"
 *   Örn: "local_f47ac10b-58cc-4372-a567-0e02b2c3d479"
 *
 * Yaşam döngüsü:
 *   1. Offline create → geçici todo, id = "local_<uuid>"
 *   2. Bağlantı gelir → mutasyon API'ye gönderilir
 *   3. API başarılı → onSettled → invalidateQueries
 *   4. Yeni sorgu backend'den gerçek id'li todo'yu getirir
 *   5. "local_<uuid>" artık cache'te yok; gerçek id ile değişti
 */

const LOCAL_PREFIX = 'local_';

/**
 * RFC 4122 uyumlu UUID v4 üretir.
 * Harici bağımlılık gerektirmez; Math.random() tabanlıdır.
 * Geçici id olarak kullanıldığından kriptografik güç gerekmez.
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** "local_<uuid>" formatında geçici id üretir. */
export function generateLocalId(): string {
  return `${LOCAL_PREFIX}${generateUUID()}`;
}

/**
 * Verilen id'nin geçici (local) olup olmadığını döndürür.
 *
 * OWS-010'da kart ve detay ekranındaki aksiyon butonlarını
 * sync tamamlanana kadar devre dışı bırakmak için kullanılır.
 */
export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_PREFIX);
}
