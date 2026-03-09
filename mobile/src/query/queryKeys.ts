/**
 * TanStack Query anahtar sabitleri.
 *
 * Tüm query ve mutation invalidasyonları bu dosyadaki sabitleri kullanır.
 * String literal yerine sabit kullanmak; yanlış yazım hatalarını ve
 * dağınık invalidasyon çağrılarını önler.
 *
 * Genişleme notu: Alt sorgular için tuple genişletme kullanılır.
 * Örn. todo detayı: [...TODOS_QUERY_KEY, id] as const
 */

export const TODOS_QUERY_KEY = ['todos'] as const;
