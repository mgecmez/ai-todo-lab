# Notifications / Reminders Architecture

**Sprint:** Step 4 — Notifications / Reminders
**Hazırlayan:** Architect Agent
**Tarih:** 2026-03-12
**Hedef:** Todo uygulamasına local bildirim ve hatırlatıcı desteği eklemek.

---

## 1. Bildirim / Reminder Neden Gerekli

Mevcut uygulamada todo'lara `dueDate` eklenebilmektedir; ancak kullanıcı bu tarihi yalnızca listeyi açarak görebilir. Uygulamayı açmayan kullanıcı, yaklaşan son tarihleri kaçırır.

| Sorun | Etkisi |
|-------|--------|
| Görev son tarihi sessizce geçiyor | Kullanıcı görevleri geciktirir veya unutur |
| Önemli görevler pinlendi ama hatırlatıcı yok | Pin, aktif bir uyarı değil; pasif bir işaret |
| Uygulama kapalıyken hiç bilgi yok | Todo uygulamasının temel amacından sapar |

**Beklenti:** Kullanıcı bir todo'ya `dueDate` + `reminderOffset` (kaç dakika/saat önce hatırlatılacak) belirleyebilmeli. Belirlenen zamanda sistem bildirimi düşmeli; kullanıcı uygulamayı açmasa bile uyarılmalı.

---

## 2. Faz 1 Kapsamı

Faz 1, **local notifications** üzerine kuruludur. Sunucu tarafı push altyapısı gerektirmez.

**Faz 1'de yapılacaklar:**

| Alan | Kapsam |
|------|--------|
| İzin yönetimi | Uygulama ilk açılışta bildirim izni ister |
| Reminder veri modeli | `reminderOffset` (dakika) todo'ya eklenir |
| TodoForm | Reminder seçici (Yok / 15 dk / 30 dk / 1 saat / 3 saat / 1 gün önce) |
| Zamanlama | `expo-notifications` ile local notification schedule |
| İptal | Todo silindiğinde veya reminder kaldırıldığında bildirim iptal edilir |
| Güncelleme | Todo güncellendiğinde eski bildirim iptal, yenisi zamanlanır |
| Deep link | Bildirime tıklanınca uygulama açılır (ilgili todo'ya yönlendirme Faz 2) |

**Faz 1'de yapılmayacaklar** → Bölüm 11'de listelenmiştir.

---

## 3. Reminder Veri Modeli

### 3a. Todo Tipine Eklenecek Alan

```typescript
// src/types/todo.ts — mevcut Todo arayüzüne eklenir
interface Todo {
  // ... mevcut alanlar ...
  reminderOffset: number | null; // dakika cinsinden; null = reminder yok
}

// CreateTodoRequest ve UpdateTodoRequest'e de eklenir
interface CreateTodoRequest {
  // ...
  reminderOffset?: number; // opsiyonel; verilmezse null
}
```

**`reminderOffset` semantiği:**

| Değer | Anlamı |
|-------|--------|
| `null` | Reminder yok |
| `15` | Son tarihten 15 dakika önce |
| `60` | Son tarihten 1 saat önce |
| `1440` | Son tarihten 1 gün önce |

Önceden tanımlı seçenekler (picker'da sunulacak):

```
Yok | 15 dk | 30 dk | 1 saat | 3 saat | 6 saat | 1 gün
  0     15     30      60      180      360     1440
```

### 3b. Notification Identifier

Zamanlanmış her bildirim için bir `notificationId` tutulması gerekir; iptal için kullanılır.

```typescript
// src/services/notifications/notificationRegistry.ts
// AsyncStorage'da { [todoId: string]: notificationIdentifier: string } map'i saklanır.
// todo.id → expo-notifications identifier eşlemesi.
```

Bu map ayrı bir `AsyncStorage` anahtarında tutulur (`NOTIFICATION_REGISTRY_KEY`). TanStack Query cache'ine dahil **edilmez**; bildirim altyapısı query cache'ini kirletmemeli.

---

## 4. Backend'e Etkisi Var mı, Yok mu

**Faz 1'de backend değişikliği YOKTUR.**

Local notifications tamamen cihaz üzerinde çalışır. Expo SDK zamanlanmış bildirimi işletim sistemine (iOS `UNUserNotificationCenter`, Android `AlarmManager`) kaydeder; ağ bağlantısı gerektirmez.

`reminderOffset` alanı ise şu şekilde ele alınır:

| Yaklaşım | Avantaj | Dezavantaj |
|----------|---------|------------|
| **Backend'e kaydet (önerilen Faz 2)** | Çok cihaz desteği; veri kaybı olmaz | Backend değişikliği gerekir |
| **Yalnızca mobile'da tut (Faz 1)** | Sıfır backend bağımlılığı; hızlı geliştirme | Cihaz değişince reminder kaybolur |

**Faz 1 kararı:** `reminderOffset` yalnızca mobile'da saklanır. Backend haberdar değildir. Bu, Faz 1'in kabul edilen kısıtıdır.

Uygulama içinde iki seçenek:
1. `reminderOffset`'i TanStack Query cache'teki todo objesine ekle (sunucu ile eşitlenmiş alan gibi davranır ama backend görmez)
2. Ayrı bir `AsyncStorage` key'inde `{ [todoId]: reminderOffset }` map'i tut

**Seçilen yaklaşım → Seçenek 2 (ayrı map):** Todo objesinin backend şemasını kirletmez. Backend'e veri gönderilmez. Faz 2'de kolayca backend'e taşınabilir. Todo tipi `reminderOffset: number | null` alanını opsiyonel olarak ekler ama backend bunu yok sayar.

---

## 5. Mobile Tarafta Önerilen Teknoloji

```
expo-notifications          — local bildirim zamanlama + izin yönetimi
@react-native-async-storage/async-storage  — zaten kurulu; notificationRegistry için kullanılır
```

**Neden başka bir kütüphane değil:**

| Alternatif | Neden Elendi |
|-----------|--------------|
| `react-native-push-notification` | Expo managed workflow ile uyumsuz; native ejection gerektirir |
| `notifee` | Güçlü ama Expo Go desteği yok; bare workflow gerektirir |
| `react-native-notifications` | Aynı sorun; managed workflow dışı |
| **`expo-notifications`** | ✅ Managed workflow tam desteği; Expo SDK ile bütünleşik |

---

## 6. Expo Notifications Neden Seçildi

### Teknik Gerekçeler

| Özellik | Açıklama |
|---------|----------|
| **Managed workflow uyumu** | Expo CLI ile `npx expo install expo-notifications` yeterli; native kod değişikliği yok |
| **Local + Remote** | Faz 1 local; Faz 2'de aynı API ile push notification eklenebilir |
| **Cross-platform** | iOS ve Android için tek API; platform farkları SDK tarafından soyutlanır |
| **Scheduling API** | `scheduleNotificationAsync` ile tarih/saat bazlı zamanlama; `cancelScheduledNotificationAsync` ile iptal |
| **Permission API** | `requestPermissionsAsync` / `getPermissionsAsync` ile izin yönetimi |
| **Trigger tipleri** | `DateTriggerInput` (belirli tarih/saat), `TimeIntervalTriggerInput` (saniye cinsinden interval) |
| **Background handling** | Uygulama arka planda veya kapalıyken de bildirim teslim edilir |

### Öğrenme Dostu Olması

Expo Notifications dökümanasyonu kapsamlı ve örneklidir. Managed workflow geliştirici deneyimini bozmaz.

---

## 7. Local Notification Akışı

```
Kullanıcı Eylemi                  Mobile                              İşletim Sistemi
─────────────────                 ──────                              ───────────────

Todo oluştur/güncelle
(dueDate + reminderOffset var)
        │
        ▼
  notificationService
  .scheduleReminder(todo)
        │
        ├─ Eski bildirim var mı? (notificationRegistry.get(todo.id))
        │   ├─ Evet → cancelScheduledNotificationAsync(oldId)
        │   └─ Hayır → devam
        │
        ├─ Reminder zamanı hesapla:
        │   fireAt = new Date(todo.dueDate) - (reminderOffset * 60 * 1000)
        │
        ├─ fireAt < şimdiki zaman?
        │   ├─ Evet → zamanlama YOK (geçmiş tarih); registry güncelle (null)
        │   └─ Hayır → devam
        │
        ├─ scheduleNotificationAsync({
        │     content: {
        │       title: "⏰ Görev Yaklaşıyor",
        │       body: todo.title,
        │       data: { todoId: todo.id },
        │     },
        │     trigger: { type: 'date', date: fireAt }
        │   })
        │   → notificationIdentifier döner
        │
        └─ notificationRegistry.set(todo.id, notificationIdentifier)
                                                        │
                                                        ▼
                                              OS bildirim kuyruğuna alır

[fireAt zamanı geldiğinde]
                                              OS bildirimi teslim eder
                                                        │
                                                        ▼
                                              Kullanıcı bildirime dokunur
                                                        │
                                                        ▼
                                              addNotificationResponseReceivedListener
                                              → data.todoId okunur
                                              → navigation (Faz 2)

Todo silindiğinde
        │
        ▼
  notificationService
  .cancelReminder(todo.id)
        │
        ├─ notificationRegistry.get(todo.id) → identifier
        ├─ cancelScheduledNotificationAsync(identifier)
        └─ notificationRegistry.delete(todo.id)
```

---

## 8. Todo Create / Update ile Reminder İlişkisinin Kurulması

### Genel Kural

```
reminderOffset = null  VE  dueDate = null  →  bildirim yok
reminderOffset = null  VE  dueDate var     →  bildirim yok (reminder istenmiyor)
reminderOffset > 0     VE  dueDate var     →  bildirim zamanla
reminderOffset > 0     VE  dueDate = null  →  bildirim yok (hedef tarih bilinmiyor)
```

### Mutation Hook'larıyla Entegrasyon Noktaları

```
useCreateTodo.onSuccess(newTodo)
  └─ notificationService.scheduleReminder(newTodo)

useUpdateTodo.onSuccess(updatedTodo)
  └─ notificationService.scheduleReminder(updatedTodo)
     (içeride eski bildirimi iptal edip yenisini zamanlar)

useDeleteTodo.onSuccess(_, todoId)  [veya onMutate içinde]
  └─ notificationService.cancelReminder(todoId)
```

`onSuccess` callback'leri tercih sebebi: optimistic update'te todo henüz server tarafından doğrulanmamıştır; server'dan dönen gerçek `dueDate` ile zamanlamak daha güvenlidir.

### TodoFormScreen Değişikliği

Forma `reminderOffset` seçici eklenir:

```
[ Yok ] [ 15 dk ] [ 30 dk ] [ 1 saat ] [ 3 saat ] [ 6 saat ] [ 1 gün ]
```

Segmented picker veya chip group olarak tasarlanabilir. `dueDate` boşsa seçici disabled gösterilir ("Son tarih belirlenmeden hatırlatıcı eklenemez").

### ReminderOffset Persistence (Faz 1)

`reminderOffset` değeri backend'e gönderilmez. Mutation başarılıysa `notificationRegistry` güncellenir. Uygulama yeniden açıldığında registry'den mevcut bildirimler okunur; geçmiş bildirimler temizlenir.

---

## 9. İzin (Permission) Akışı

iOS bildirim izni kullanıcıdan alınmadan bildirim gönderilemez. Android 13+ (API 33) da benzer izin gerektirir.

```
Uygulama başladığında (App.tsx mount):
  │
  ├─ notificationService.initialize()
  │   ├─ getPermissionsAsync()
  │   │   ├─ granted → hazır
  │   │   ├─ undetermined → requestPermissionsAsync()
  │   │   │   ├─ granted → hazır
  │   │   │   └─ denied → izin banner'ı göster (kalıcı olmayan, sade bir bilgi)
  │   │   └─ denied → izin banner'ı göster
  │   │
  │   └─ addNotificationReceivedListener (uygulama açıkken gelen bildirimler)
  │      addNotificationResponseReceivedListener (bildirime tıklama)
  │
  └─ setupNetInfoSync() ile aynı useEffect içinde çağrılabilir
```

### İzin Reddedildi Durumu

İzin reddedilmişse:
- Reminder seçici TodoForm'da görünür ama ayarlanınca bir bilgi tost'u gösterilir: "Bildirim izni verilmedi. Ayarlardan etkinleştirin."
- Seçici kullanılabilir kalır; kullanıcı izin verse reminder aktif olacak şekilde tasarlanır
- Ayarlara yönlendirme butonu: `Linking.openSettings()`

```
İzin Banner Tasarımı (sade):
┌────────────────────────────────────────────────┐
│ 🔔  Hatırlatıcılar için bildirim izni gerekli  │
│     [Şimdi İzin Ver]  [Daha Sonra]             │
└────────────────────────────────────────────────┘
```

Banner TodoListScreen veya App-level bir context üzerinden gösterilebilir. Faz 1'de sade bir `Alert` da yeterlidir.

---

## 10. Edge Case'ler

| Durum | Beklenen Davranış |
|-------|-------------------|
| `fireAt` geçmiş tarih | Bildirim zamanlanmaz; registry'e `null` yazılır; kullanıcı uyarılmaz (sessiz) |
| `dueDate` güncellendi, `reminderOffset` aynı kaldı | `scheduleReminder` eski bildirimi iptal edip yeni tarih için yenisini zamanlar |
| `reminderOffset` kaldırıldı (null yapıldı), `dueDate` var | Eski bildirim iptal edilir |
| Todo tamamlandı (toggle) | Bildirim iptal **edilmez** (Faz 1); tamamlanan görev için bildirim anlamsız ama görünmez zararı yok. Faz 2'de toggle'da otomatik iptal eklenebilir |
| Uygulama yeniden yüklenirken registry bozulursa | `try/catch` ile hata yutulur; bildirim zamanlanamaz ama uygulama çökmez |
| Çok sayıda zamanlanmış bildirim | iOS max 64, Android pratik limit ~500 zamanlanmış bildirim destekler; bir kullanıcı için yeterli |
| Cihaz saati değiştirilirse | Expo Notifications trigger'ları sistem saatine bağlıdır; saat geri alınırsa bildirim beklenenden geç gelebilir |
| Offline iken todo oluşturulup paused | `onSuccess` offline'da çalışmaz; bildirim ancak sync tamamlandığında zamanlanır (doğru davranış) |

---

## 11. Faz 1 Kapsam Dışı Konular

| Konu | Gerekçe |
|------|---------|
| Push notifications (FCM/APNs) | Sunucu altyapısı, token yönetimi gerektirir; local yeterli |
| Çok cihaz senkronizasyonu | Backend `reminderOffset` alanı olmadan mümkün değil |
| Bildirime tıklayınca ilgili todo'ya yönlendirme | Deep link + navigation state yönetimi karmaşıklığı; Faz 2 |
| Tekrarlayan hatırlatıcılar (daily/weekly repeat) | Faz 1 kapsam dışı; tek seferlik trigger yeterli |
| Sessiz saatler / Do Not Disturb entegrasyonu | Platform-specific; Faz 3 |
| Bildirim geçmişi ekranı | UX iyileştirmesi; Faz 3 |
| Toggle tamamlandığında otomatik bildirim iptali | Küçük iyileştirme; Faz 2 |
| Uygulama badge (app icon sayacı) | Expo Notifications destekler ama ilk sürüm için gereksiz |

---

## 12. Riskler ve Dikkat Edilmesi Gerekenler

### iOS Sandbox / Simulator Kısıtlaması
Expo Go'da local notifications çalışır; ancak iOS Simulator'da bildirim sesi çıkmaz, fiziksel cihazda test etmek gerekir. Geliştirme sürecinde bunu göz önünde bulundurmak gerekir.

### Expo Managed Workflow Kısıtlaması
`expo-notifications` ile Expo managed workflow'da local notifications tam çalışır; ancak background execution (uygulama kapalıyken zamanlanmış görevi çalıştırma) `iOS` için ek konfigürasyon gerektirebilir. Local scheduled notifications bu kısıtın dışındadır — OS zamanlamayı üstlenir.

### `app.json` Konfigürasyonu
Bildirimlerin iOS'ta çalışması için `app.json`'a izin ve entitlement eklenmesi gerekir:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": []
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    }
  }
}
```

Bu konfigürasyon `expo prebuild` veya EAS Build akışında geçerlidir. Expo Go'da test için konfigürasyon gerekmez.

### AsyncStorage Race Condition
`notificationRegistry` okunup-yazılırken (özellikle hızlı art arda create/update) race condition olasılığı düşük ama sıfır değil. Faz 1'de basit sıralı async çağrılar yeterlidir; gerekirse Faz 2'de mutex/queue mekanizması eklenebilir.

### Bildirim İzni Zamanlaması
iOS'ta izin isteği yalnızca bir kez gösterilir. Kullanıcı "Hayır" derse tekrar sistem prompt'u açılmaz; yalnızca `Ayarlar → Uygulama → Bildirimler` yolundan aktif edilebilir. İzin akışının uygulama ilk açılışta değil, kullanıcı ilk reminder eklemeye çalıştığında gösterilmesi (contextual permission) daha iyi kabul oranı sağlar.

### `reminderOffset` Faz 2 Migration
Backend'e `reminderOffset` alanı eklendiğinde, mobile'daki AsyncStorage map'indeki veriler tek seferlik bir migration ile backend'e gönderilebilir. Bu risk kabul edilebilir düzeydedir.

---

## Bağımlılık Grafiği (Faz 1 Ticket Sırası Önerisi)

```
NOT-001: expo-notifications kurulumu + app.json konfigürasyonu
    │
    ├── NOT-002: notificationService (zamanlama + iptal + registry)
    │       │
    │       ├── NOT-003: izin akışı (App.tsx initialize + contextual prompt)
    │       │
    │       └── NOT-004: TodoForm'a reminderOffset seçici eklenmesi
    │               │
    │               └── NOT-005: mutation hook'larına onSuccess entegrasyonu
    │                       │
    │                       └── NOT-006: test ve doğrulama
```

---

## Teknoloji Seçimi Özeti

| Katman | Seçim | Gerekçe |
|--------|-------|---------|
| Bildirim API | `expo-notifications` | Managed workflow; cross-platform; local + remote Faz 2 yolu açık |
| Registry storage | `AsyncStorage` | Zaten kurulu; hafif anahtar-değer saklama için yeterli |
| Zamanlama | OS-native (iOS UNUserNotificationCenter, Android AlarmManager) | Expo SDK soyutluyor; uygulama kapalıyken çalışır |
| Backend değişikliği | Yok (Faz 1) | Hız; bağımsız geliştirme; Faz 2'de kolayca eklenir |
