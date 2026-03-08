import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * AsyncStorage üzerinde tip güvenli okuma/yazma/silme işlemleri.
 *
 * JSON serialize/deserialize bu katmanda yapılır; çağıran kod
 * ham string yerine doğrudan TypeScript tipiyle çalışır.
 *
 * Hatalar sessizce loglanır ve null / false döndürülür;
 * cache işlemleri uygulamanın akışını kesmemeli.
 */

/**
 * Verilen key'e karşılık gelen değeri okur.
 * Key yoksa veya hata oluşursa null döndürür.
 */
export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`[storage] getItem hatası — key: "${key}"`, e);
    return null;
  }
}

/**
 * Verilen değeri JSON'a çevirip key'e karşılık yazar.
 * Başarılıysa true, hata oluşursa false döndürür.
 */
export async function setItem<T>(key: string, value: T): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn(`[storage] setItem hatası — key: "${key}"`, e);
    return false;
  }
}

/**
 * Verilen key'i AsyncStorage'dan kaldırır.
 * Başarılıysa true, hata oluşursa false döndürür.
 */
export async function removeItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`[storage] removeItem hatası — key: "${key}"`, e);
    return false;
  }
}
