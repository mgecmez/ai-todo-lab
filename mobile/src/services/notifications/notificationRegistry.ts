/**
 * Notification Registry — todoId → expo notificationIdentifier eşlemesi.
 *
 * Zamanlanmış her bildirim için expo-notifications bir string identifier döndürür.
 * İptal edebilmek için bu identifier'ı tutmamız gerekir.
 * Registry, AsyncStorage'da ayrı bir key altında saklanır; TanStack Query
 * cache'ine dahil edilmez.
 *
 * Yapı:
 *   AsyncStorage["NOTIFICATION_REGISTRY"] = JSON.stringify({
 *     "todo-id-1": "expo-notification-identifier-abc",
 *     "todo-id-2": "expo-notification-identifier-xyz",
 *   })
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const REGISTRY_KEY = 'NOTIFICATION_REGISTRY';

/** Saklanan tüm eşleşmeleri oku. Hata durumunda boş map döner. */
async function readAll(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(REGISTRY_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

/** Todo'ya ait notificationIdentifier'ı getir. Yoksa null döner. */
async function get(todoId: string): Promise<string | null> {
  const registry = await readAll();
  return registry[todoId] ?? null;
}

/** Todo'ya ait notificationIdentifier'ı kaydet (mevcut varsa üzerine yazar). */
async function set(todoId: string, identifier: string): Promise<void> {
  try {
    const registry = await readAll();
    registry[todoId] = identifier;
    await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Registry yazma hatası uygulama akışını durdurmamalı; sessizce devam eder.
  }
}

/** Todo'ya ait kaydı registry'den sil. */
async function remove(todoId: string): Promise<void> {
  try {
    const registry = await readAll();
    delete registry[todoId];
    await AsyncStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Silme hatası sessizce görmezden gelinir.
  }
}

export const notificationRegistry = { get, set, remove };
