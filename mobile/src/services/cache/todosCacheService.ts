import type { Todo } from "../../types/todo";
import { TODOS_CACHE_KEY } from "./cacheKeys";
import { getItem, removeItem, setItem } from "./storage";

/**
 * Todo listesi için cache işlemleri.
 *
 * Bu servis AsyncStorage'a doğrudan erişmez; storage.ts wrapper'ını kullanır.
 * Ekranlar ve diğer servisler raw storage yerine bu fonksiyonları çağırır.
 */

/**
 * Teknik ağ hata mesajlarını kullanıcı dostu Türkçe metne çevirir.
 *
 * React Native'in ham fetch hataları ("Network request failed", "fetch failed")
 * kullanıcıya gösterilmez; bunların yerine anlaşılır bir mesaj döndürülür.
 * Diğer API hataları (sunucudan gelen başlık/detay) olduğu gibi iletilir.
 */
export function friendlyErrorMessage(e: unknown): string {
  const raw = e instanceof Error ? e.message : "";
  const lower = raw.toLowerCase();
  if (lower.includes("network request failed") || lower.includes("fetch failed")) {
    return "İnternet bağlantısı yok. Lütfen tekrar deneyin.";
  }
  return raw || "Bir hata oluştu. Lütfen tekrar deneyin.";
}

/**
 * Cache'ten todo listesini okur.
 * Cache boşsa veya okuma başarısız olursa null döndürür.
 */
export async function getCachedTodos(): Promise<Todo[] | null> {
  return getItem<Todo[]>(TODOS_CACHE_KEY);
}

/**
 * Todo listesini cache'e yazar.
 * Başarılıysa true, hata oluşursa false döndürür.
 */
export async function setCachedTodos(todos: Todo[]): Promise<boolean> {
  return setItem<Todo[]>(TODOS_CACHE_KEY, todos);
}

/**
 * Todo cache'ini tamamen siler.
 * Başarılıysa true, hata oluşursa false döndürür.
 */
export async function clearTodosCache(): Promise<boolean> {
  return removeItem(TODOS_CACHE_KEY);
}
