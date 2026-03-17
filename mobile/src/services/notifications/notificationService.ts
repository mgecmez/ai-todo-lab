/**
 * Notification Service — Faz 1 Local Notification Katmanı
 *
 * Dışarıya üç fonksiyon sunar:
 *   initialize()            — App.tsx'te bir kez çağrılır; izin durumunu kontrol eder
 *   scheduleReminder(todo)  — varsa eski bildirimi iptal et, yenisini zamanla
 *   cancelReminder(todoId)  — bildirimi iptal et ve registry'den kaldır
 *
 * Savunma stratejisi:
 *   Her expo-notifications API çağrısı kendi try-catch bloğu içindedir.
 *   Expo Go Android'de modül yüklenebilir ama fonksiyonlar runtime'da
 *   undefined veya çöken stub olabilir. Herhangi bir adım başarısız olursa
 *   notification sistemi sessizce devre dışı kalır; uygulama crash etmez.
 */

import type { Todo } from '../../types/todo';
import { notificationRegistry } from './notificationRegistry';

let permissionGranted = false;

// Modül yüklenip yüklenmediğini ve kullanılabilir olup olmadığını cache'le.
// undefined: henüz denenmedi, null: başarısız/unavailable, diğer: modül.
let _notificationsCache: (typeof import('expo-notifications')) | null | undefined = undefined;

async function loadNotifications(): Promise<(typeof import('expo-notifications')) | null> {
  if (_notificationsCache !== undefined) return _notificationsCache;

  try {
    const mod = await import('expo-notifications');
    // Expo Go Android'de modül yüklenebilir ama fonksiyonlar undefined stub olabilir.
    // setNotificationHandler temel fonksiyon olarak kontrol edilir.
    if (!mod || typeof mod.setNotificationHandler !== 'function') {
      _notificationsCache = null;
      return null;
    }
    _notificationsCache = mod;
    return mod;
  } catch {
    _notificationsCache = null;
    return null;
  }
}

async function scheduleReminder(todo: Todo): Promise<void> {
  if (!permissionGranted) return;

  if (!todo.dueDate || !todo.reminderOffset) {
    await cancelReminder(todo.id);
    return;
  }

  const fireAt = new Date(new Date(todo.dueDate).getTime() - todo.reminderOffset * 60 * 1000);

  if (fireAt <= new Date()) {
    await cancelReminder(todo.id);
    return;
  }

  const Notifications = await loadNotifications();
  if (!Notifications) return;

  const existingId = await notificationRegistry.get(todo.id);
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch {
      // Zaten tetiklenmiş veya iptal edilmiş; yoksay.
    }
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Görev Yaklaşıyor',
        body: todo.title,
        data: { todoId: todo.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });
    await notificationRegistry.set(todo.id, identifier);
  } catch {
    // Cihaz kısıtlaması veya izin eksikliği; sessizce devam et.
  }
}

async function cancelReminder(todoId: string): Promise<void> {
  const identifier = await notificationRegistry.get(todoId);
  if (!identifier) return;

  const Notifications = await loadNotifications();
  if (Notifications) {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      // Zaten tetiklenmiş veya mevcut değil; yoksay.
    }
  }

  await notificationRegistry.remove(todoId);
}

async function initialize(): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) {
    // Expo Go Android: modül unavailable veya fonksiyonlar stub.
    permissionGranted = false;
    return;
  }

  // setNotificationHandler: ön planda bildirim görünümünü ayarla.
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // setNotificationHandler çağrısı başarısız → notification sistemi devre dışı.
    permissionGranted = false;
    return;
  }

  // İzin akışı: önce mevcut durumu oku, gerekirse iste.
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      permissionGranted = true;
      return;
    }

    if (existingStatus === 'undetermined') {
      try {
        const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
        permissionGranted = requestedStatus === 'granted';
      } catch {
        // requestPermissionsAsync başarısız (Expo Go Android'de FCM kaldırıldı).
        // Android < 13 local notification için izin gerektirmez → true güvenli.
        permissionGranted = true;
      }
      return;
    }

    // 'denied': kullanıcı önceden reddetmiş; tekrar sorulamaz.
    permissionGranted = false;
  } catch {
    // getPermissionsAsync başarısız (Expo Go Android remote push kaldırıldı).
    // Android < 13'te local notification izni gerekmez → true güvenli.
    permissionGranted = true;
  }
}

export const notificationService = { scheduleReminder, cancelReminder, initialize };
