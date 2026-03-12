/**
 * Notification Service — Faz 1 Local Notification Katmanı
 *
 * Dışarıya üç fonksiyon sunar:
 *   initialize()            — App.tsx'te bir kez çağrılır; izin durumunu kontrol eder
 *   scheduleReminder(todo)  — varsa eski bildirimi iptal et, yenisini zamanla
 *   cancelReminder(todoId)  — bildirimi iptal et ve registry'den kaldır
 *
 * Kullanım (NOT-005'te mutation hook'larına eklenecek):
 *   useCreateTodo.onSuccess → notificationService.scheduleReminder(newTodo)
 *   useUpdateTodo.onSuccess → notificationService.scheduleReminder(updatedTodo)
 *   useDeleteTodo.onSuccess → notificationService.cancelReminder(todoId)
 *
 * Permission akışı (initialize içinde):
 *   - granted     → hazır; permissionGranted = true
 *   - undetermined → requestPermissionsAsync() çağrılır; sonuca göre güncellenir
 *   - denied      → sessiz; permissionGranted = false; scheduleReminder no-op olur
 *
 * Mimari kararlar:
 *   - reminderOffset: dakika cinsinden; null veya 0 → bildirim yok
 *   - fireAt = new Date(dueDate) - (reminderOffset dakika)
 *   - fireAt geçmişteyse bildirim zamanlanmaz (sessiz; hata fırlatılmaz)
 *   - İzin reddedilmişse scheduleReminder erken çıkar; uygulama çökmez
 */

import * as Notifications from 'expo-notifications';
import type { Todo } from '../../types/todo';
import { notificationRegistry } from './notificationRegistry';

// Modül ömrü boyunca izin durumunu bellekte tutar.
// initialize() çağrıldıktan sonra güvenilir olur; öncesinde false (güvenli taraf).
let permissionGranted = false;

// Bildirim geldiğinde uygulama ön plandaysa nasıl davransın:
// banner + ses göster (iOS için zorunlu; Android varsayılan olarak gösterir).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Verilen todo için hatırlatıcı bildirim zamanla.
 *
 * Koşullar:
 *   1. İzin verilmiş olmalı (permissionGranted = true)
 *   2. todo.dueDate ve todo.reminderOffset ikisi de dolu olmalı (null/0 değil)
 *   3. Hesaplanan fireAt gelecekte olmalı
 *
 * Önceden zamanlanmış bir bildirim varsa (registry'de kayıtlı) iptal edilir;
 * yerine yeni bildirim zamanlanır. Bu sayede update akışında "önce iptal, sonra
 * yeniden zamanla" mantığı otomatik çalışır.
 */
async function scheduleReminder(todo: Todo): Promise<void> {
  // İzin yoksa sessizce çık; uygulama akışını engelleme.
  if (!permissionGranted) return;

  // Reminder için gerekli her iki alan da dolu olmalı.
  if (!todo.dueDate || !todo.reminderOffset) {
    // dueDate veya reminderOffset yoksa varsa eski bildirimi iptal et.
    await cancelReminder(todo.id);
    return;
  }

  // Bildirim zamanını hesapla: son tarih - offset dakika
  const fireAt = new Date(new Date(todo.dueDate).getTime() - todo.reminderOffset * 60 * 1000);

  // Geçmiş tarih kontrolü — geçmişteyse zamanlama yapılmaz.
  if (fireAt <= new Date()) {
    await cancelReminder(todo.id);
    return;
  }

  // Önceki bildirim varsa iptal et (update senaryosu).
  const existingId = await notificationRegistry.get(todo.id);
  if (existingId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(existingId);
    } catch {
      // Zaten tetiklenmiş veya iptal edilmiş olabilir; yoksay.
    }
  }

  // Yeni bildirimi zamanla.
  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Görev Yaklaşıyor',
        body: todo.title,
        // Bildirime tıklanınca hangi todo'ya ait olduğunu bilmek için data eklenir.
        // NOT-003'te deep link için kullanılacak.
        data: { todoId: todo.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
      },
    });

    await notificationRegistry.set(todo.id, identifier);
  } catch {
    // İzin reddedilmişse veya cihaz kısıtlaması varsa sessizce devam et.
    // Hata uygulama akışını kesmemeli.
  }
}

/**
 * Todo'ya ait zamanlanmış bildirimi iptal et ve registry'den kaldır.
 * Todo silindiğinde veya reminder kaldırıldığında çağrılır.
 */
async function cancelReminder(todoId: string): Promise<void> {
  const identifier = await notificationRegistry.get(todoId);
  if (!identifier) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Zaten tetiklenmiş veya mevcut değil; yoksay.
  }

  await notificationRegistry.remove(todoId);
}

/**
 * Uygulama başlangıcında bir kez çağrılır (App.tsx).
 *
 * İzin akışı:
 *   1. getPermissionsAsync() ile mevcut durumu oku.
 *   2. "undetermined" ise requestPermissionsAsync() ile sistem prompt'u göster.
 *   3. "denied" ise sessizce devam et — bildirim scheduling devre dışı kalır.
 *
 * Neden uygulama başlangıcında:
 *   - iOS'ta izin yalnızca bir kez istenebilir; kullanıcı reddederse tekrar
 *     sistem prompt'u açılmaz. Başlangıçta sormak basit ve öngörülebilir.
 *   - Contextual permission (NOT-004 reminder seçici eklendikten sonra) Faz 2'de
 *     değerlendirilebilir; Faz 1 için bu akış yeterli.
 */
async function initialize(): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();

    if (existingStatus === 'granted') {
      // İzin zaten verilmiş; hemen hazır.
      permissionGranted = true;
      return;
    }

    if (existingStatus === 'undetermined') {
      // Henüz sorulmamış → sistem izin diyaloğunu göster.
      const { status: requestedStatus } = await Notifications.requestPermissionsAsync();
      permissionGranted = requestedStatus === 'granted';
      return;
    }

    // existingStatus === 'denied': kullanıcı önceden reddetmiş.
    // Tekrar sormak iOS'ta mümkün değil; sessizce devam et.
    permissionGranted = false;
  } catch {
    // İzin API'sine erişilemiyorsa (simulator kısıtı vb.) çökme; sessiz devam.
    permissionGranted = false;
  }
}

export const notificationService = { scheduleReminder, cancelReminder, initialize };
