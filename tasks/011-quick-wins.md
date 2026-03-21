# Task List: 011 — Quick Wins (v0.10.0)

Source spec: `docs/quick-wins-spec.md`
Architecture: `docs/quick-wins-architecture.md`
Stack: Expo React Native · TypeScript · TanStack Query · expo-notifications

---

## QW-001
**Owner:** Frontend
**Title:** `isOverdue` utility — shared modüle taşı
**Status:** todo
**Depends on:** —

### Açıklama
`isOverdue(dueDate, isCompleted)` fonksiyonu şu anda `TodoListScreen.tsx` ve
`TaskDetailScreen.tsx` içinde birbirinin aynısı olarak tanımlı. Her iki satır kopyayı
silerek ortak bir utility modülüne (`mobile/src/utils/isOverdue.ts`) taşımak, ilerleyen
sprint'lerde BL-002 gibi başka noktalarda da bu fonksiyona ihtiyaç duyulduğunda tek
kaynak gerçeği (single source of truth) sağlar. Davranış değişmez.

### Adımlar
1. `mobile/src/utils/isOverdue.ts` dosyasını oluştur. İçeriği mimari belgede tanımlanan
   canonical function signature'a göre yaz:
   `export function isOverdue(dueDate: string | null | undefined, isCompleted: boolean): boolean`
2. `TodoListScreen.tsx` içindeki inline `isOverdue` tanımını (satır 29–32 civarı) sil ve
   dosyanın üstüne `import { isOverdue } from '../utils/isOverdue';` ekle.
3. `TaskDetailScreen.tsx` içindeki inline `isOverdue` tanımını (satır 26–29 civarı) sil ve
   dosyanın üstüne `import { isOverdue } from '../utils/isOverdue';` ekle.
4. `npx tsc --noEmit` çalıştır, hata olmadığını doğrula.
5. Uygulamayı başlat (`npx expo start`), iki ekranda da geçmiş tarihli görevlerin kırmızı
   vurgu davranışının değişmediğini manuel kontrol et.

### Değişen / Oluşturulan Dosyalar
| Dosya | İşlem |
|-------|-------|
| `mobile/src/utils/isOverdue.ts` | Yeni dosya |
| `mobile/src/screens/TodoListScreen.tsx` | Inline fn silindi, import eklendi |
| `mobile/src/screens/TaskDetailScreen.tsx` | Inline fn silindi, import eklendi |

**Dokunulmaması gereken dosyalar:** `mobile/src/utils/formatDate.ts`, backend dizini

### Kabul Kriterleri
- [ ] `mobile/src/utils/isOverdue.ts` mevcut ve `isOverdue` named export içeriyor.
- [ ] `TodoListScreen.tsx` içinde `isOverdue` inline tanımı yok; `../utils/isOverdue` üzerinden import ediliyor.
- [ ] `TaskDetailScreen.tsx` içinde `isOverdue` inline tanımı yok; `../utils/isOverdue` üzerinden import ediliyor.
- [ ] `npx tsc --noEmit` yeni hata üretmiyor.
- [ ] `TodoListScreen` üzerindeki overdue vurgu davranışı v0.9.0 ile aynı.
- [ ] `TaskDetailScreen` üzerindeki overdue vurgu davranışı v0.9.0 ile aynı.

---

## QW-002
**Owner:** Frontend
**Title:** `DateTimePickerField` — `placeholder` prop ekle
**Status:** todo
**Depends on:** — (QW-001 ile paralel çalışabilir)

### Açıklama
`DateTimePickerField` bileşeni şu anda `value` null olduğunda sabit kodlanmış `'Tarih seçilmedi'`
string'ini gösteriyor. `placeholder?: string` prop'u ekleyerek bileşeni farklı ekranlarda ve
dillerde kaynak dosyaya dokunmadan kullanılabilir hale getir. `TodoFormScreen`'deki mevcut Türkçe
metin explicit prop olarak aktarılacağı için kullanıcıya görünen UI değişmez.

### Adımlar
1. `mobile/src/components/DateTimePickerField.tsx` dosyasını aç.
2. `DateTimePickerFieldProps` interface'ine `placeholder?: string` alanını ekle.
3. Fonksiyon parametrelerinde destructure ederken `placeholder = 'Select date'` varsayılan değerini
   tanımla.
4. Bileşenin render içindeki `{displayText ?? 'Tarih seçilmedi'}` ifadesini `{displayText ?? placeholder}` olarak güncelle.
5. `mobile/src/screens/TodoFormScreen.tsx` içindeki `<DateTimePickerField>` çağrısına
   `placeholder="Tarih seçilmedi"` prop'unu ekle (görünen metin korunur).
6. `npx tsc --noEmit` çalıştır, hata olmadığını doğrula.

### Değişen / Oluşturulan Dosyalar
| Dosya | İşlem |
|-------|-------|
| `mobile/src/components/DateTimePickerField.tsx` | `placeholder` prop eklendi, render güncellendi |
| `mobile/src/screens/TodoFormScreen.tsx` | `placeholder="Tarih seçilmedi"` prop'u aktarıldı |

**Dokunulmaması gereken dosyalar:** `mobile/src/screens/TodoListScreen.tsx`, `mobile/src/screens/TaskDetailScreen.tsx`, backend dizini

### Kabul Kriterleri
- [ ] `DateTimePickerFieldProps` interface'inde `placeholder?: string` alanı var.
- [ ] `placeholder` prop'u geçilmediğinde bileşen `"Select date"` gösteriyor.
- [ ] `TodoFormScreen`'de Türkçe placeholder (`"Tarih seçilmedi"`) explicit olarak geçiliyor ve ekranda gösteriliyor.
- [ ] v0.9.0 ile karşılaştırıldığında kullanıcıya görünen UI değişmemiş.
- [ ] `npx tsc --noEmit` yeni hata üretmiyor.
- [ ] `DateTimePickerField`'in diğer prop'ları ve davranışları değişmemiş.

---

## QW-003
**Owner:** Frontend
**Title:** All-Day modu — `DateTimePickerField` ve `TodoFormScreen` entegrasyonu
**Status:** todo
**Depends on:** QW-002

### Açıklama
Kullanıcıların bir göreve saat belirtmeksizin sadece takvim günü seçebilmesi için `DateTimePickerField`
bileşenine `allDay?: boolean` prop'u ve `TodoFormScreen`'e "Tüm Gün" toggle'ı ekle. All-Day modunda
picker, tarih seçimi tamamlandıktan sonra saat adımını atlar; `dueDate` değeri seçilen günün
`T00:00:00.000Z` değeri olarak kaydedilir. Bu değer `formatDate.ts`'nin mevcut kuralıyla (UTC saat
ve dakika sıfırsa sadece tarih göster) uyumludur, bu yüzden `TodoListScreen` veya
`TaskDetailScreen`'de ekstra değişiklik gerekmez.

### Adımlar
1. `mobile/src/components/DateTimePickerField.tsx` dosyasına `allDay?: boolean` prop'unu ekle
   (default: `false`).
2. Aynı dosyaya `buildMidnightUTC(localDate: Date): Date` private helper fonksiyonunu ekle
   (mimari belgede tanımlı; export edilmeyecek).
3. Android picker akışını güncelle: `allDay === true` iken tarih seçimi onaylandığında
   `buildMidnightUTC` ile gece yarısı UTC Date oluştur ve `onChange` çağır; saat adımını atla.
4. iOS picker akışını güncelle: `handleIOSConfirm` içinde `phase === 'date'` ve `allDay === true`
   iken `buildMidnightUTC` ile `onChange` çağır, `setPhase('closed')` ile kapat; saat fazına geçme.
5. `mobile/src/screens/TodoFormScreen.tsx` içine `allDay` boolean state ekle; düzenleme modunda
   mevcut `dueDate`'in `T00:00:00.000Z` formatında olup olmadığını kontrol ederek başlangıç değeri
   hesapla.
6. `handleAllDayChange(value: boolean)` handler'ını yaz: All-Day aktive edilince mevcut `dueDate`'i
   gece yarısı UTC'ye dönüştür; deaktive edilince state'i `false` yap (picker bir sonraki açılışta
   tam akışı gösterecek).
7. Mevcut `handleDueDateChange` içine `setAllDay(false)` satırını ekle (`dueDate` temizlendiğinde
   toggle sıfırlansın, FR-BL001-4).
8. `DateTimePickerField` çağrısına `allDay={allDay}` prop'unu aktar.
9. `{dueDate && (...)}` koşuluyla sarmalanmış "Tüm Gün" `Switch` UI'ını `DateTimePickerField`'in
   hemen altına ekle (mimari belgede belirtilen `styles.switchRow` düzeni).
10. `npx tsc --noEmit` çalıştır, hata olmadığını doğrula.

### Değişen / Oluşturulan Dosyalar
| Dosya | İşlem |
|-------|-------|
| `mobile/src/components/DateTimePickerField.tsx` | `allDay` prop, `buildMidnightUTC` helper, Android ve iOS akış dallanması |
| `mobile/src/screens/TodoFormScreen.tsx` | `allDay` state, `handleAllDayChange`, `handleDueDateChange` güncellemesi, toggle UI |

**Dokunulmaması gereken dosyalar:** `mobile/src/utils/formatDate.ts`, `mobile/src/screens/TodoListScreen.tsx`, `mobile/src/screens/TaskDetailScreen.tsx`, backend dizini

### Kabul Kriterleri
- [ ] `TodoFormScreen`'de bir `dueDate` seçildiğinde "Tüm Gün" toggle görünür.
- [ ] `dueDate` null iken toggle görünmez veya devre dışıdır.
- [ ] Toggle aktifken picker, iOS ve Android'de saat adımını göstermez.
- [ ] Toggle aktifken onaylanan `dueDate` değeri `T00:00:00.000Z` formatındadır.
- [ ] `dueDate` temizlendiğinde toggle otomatik olarak `false`'a döner.
- [ ] `TodoListScreen`'de All-Day görevi sadece `DD.MM.YYYY` formatında görünür (saat yok).
- [ ] `TaskDetailScreen`'de All-Day görevi sadece `DD.MM.YYYY` formatında görünür.
- [ ] `buildMidnightUTC` dışa aktarılmamış (private).
- [ ] `npx tsc --noEmit` yeni hata üretmiyor.

---

## QW-004
**Owner:** Frontend
**Title:** Geçmiş tarih uyarısı — picker kapanınca soft Alert göster
**Status:** todo
**Depends on:** QW-001, QW-003

### Açıklama
Kullanıcı picker'dan geçmişe ait bir tarih/saat seçtiğinde, picker kapandıktan hemen sonra
bilgilendirici bir `Alert` göster. Uyarı yalnızca picker'dan yapılan yeni bir seçimde tetiklenir;
düzenleme modunda form açıldığında zaten geçmişte olan bir `dueDate` uyarı göstermez. Kullanıcı
kaydı engellemez; `dueDate` değeri korunur. BL-001 ile uyumlu: All-Day modunda geçmiş takvim günü
seçilirse aynı uyarı gösterilir.

### Adımlar
1. `mobile/src/screens/TodoFormScreen.tsx` dosyasını aç.
2. `react-native`'den `Alert` import'unun mevcut olduğunu kontrol et; yoksa ekle.
3. QW-001 ile oluşturulan `isOverdue` utility'sini import et:
   `import { isOverdue } from '../utils/isOverdue';`
4. `handleDueDateChange(date: Date | null)` fonksiyonunun `date` null olmayan dalına aşağıdaki
   bloğu ekle (mimari belgede tanımlı):
   - `isOverdue(date.toISOString(), false)` true ise `Alert.alert('Geçmiş Tarih', 'Seçilen tarih geçmiş bir zamana ait. Görevi yine de kaydedebilirsiniz.', [{ text: 'Tamam' }])` çağır.
5. `npx tsc --noEmit` çalıştır, hata olmadığını doğrula.

### Değişen / Oluşturulan Dosyalar
| Dosya | İşlem |
|-------|-------|
| `mobile/src/screens/TodoFormScreen.tsx` | `handleDueDateChange` içine `isOverdue` kontrolü ve `Alert.alert` eklendi |

**Dokunulmaması gereken dosyalar:** `mobile/src/utils/isOverdue.ts` (sadece okunur), `mobile/src/components/DateTimePickerField.tsx`, backend dizini

### Kabul Kriterleri
- [ ] Picker'dan gelecekteki bir tarih seçildiğinde herhangi bir alert tetiklenmez.
- [ ] Picker'dan geçmiş bir tarih/saat seçildiğinde picker kapandıktan hemen sonra alert gösterilir.
- [ ] Alert'i kapatmak `dueDate`'i seçilen geçmiş değerde bırakır.
- [ ] Alert'ten sonra form kaydedilebilir.
- [ ] Geçmiş tarihli bir görev düzenlemek için form açılırken picker'a dokunulmadan alert tetiklenmez.
- [ ] All-Day modunda geçmiş bir takvim günü seçildiğinde de alert tetiklenir.
- [ ] `npx tsc --noEmit` yeni hata üretmiyor.

---

## QW-005
**Owner:** Frontend
**Title:** Toggle → bildirim iptali ve yeniden planlaması
**Status:** todo
**Depends on:** — (QW-001–QW-003 ile paralel çalışabilir)

### Açıklama
`useToggleTodo` mutation'ının `onSuccess` callback'ine bildirim yönetimi ekle. Görev tamamlandı
işaretlendiğinde (`isCompleted = true`) o göreve ait bekleyen yerel bildirim iptal edilir.
Tamamlanmadı olarak işaretlendiğinde (`isCompleted = false`) görevin `dueDate` ve `reminderOffset`
değerleri varsa ve hesaplanan tetiklenme zamanı gelecekteyse bildirim yeniden planlanır. Hata
durumunda (`onError`) bildirim sistemi dokunulmaz. Expo Go Android guard `notificationService`
içinde zaten mevcut olduğu için çökme riski yoktur.

### Adımlar
1. `mobile/src/mutations/useToggleTodo.ts` dosyasını aç.
2. `notificationService` import'unu ekle:
   `import { notificationService } from '../services/notifications/notificationService';`
3. `onSuccess` callback'inin mevcut cache güncelleme bloğundan sonra bildirim yönetimi bloğunu ekle
   (mimari belgede tanımlı `onSuccess` yapısına uy):
   - `updatedTodo.isCompleted === true` ise: `notificationService.cancelReminder(updatedTodo.id).catch(() => {})` çağır.
   - `updatedTodo.isCompleted === false` ise: `updatedTodo.dueDate` ve `updatedTodo.reminderOffset`
     null değilse, `fireAt` hesapla; `fireAt > new Date()` ise `notificationService.scheduleReminder(updatedTodo).catch(() => {})` çağır.
4. `onError` callback'ine herhangi bir bildirim mantığı eklenmediğini doğrula.
5. `npx tsc --noEmit` çalıştır, hata olmadığını doğrula.

### Değişen / Oluşturulan Dosyalar
| Dosya | İşlem |
|-------|-------|
| `mobile/src/mutations/useToggleTodo.ts` | `notificationService` import'u, `onSuccess` içine bildirim bloğu |

**Dokunulmaması gereken dosyalar:** `mobile/src/services/notifications/notificationService.ts` (sadece okunur), `mobile/src/services/notifications/notificationRegistry.ts`, backend dizini

### Kabul Kriterleri
- [ ] Görev tamamlandı işaretlendiğinde `cancelReminder` çağrılıyor.
- [ ] İptalin ardından bildirim `notificationRegistry`'den kaldırılmış (registry boş/günceli).
- [ ] Tamamlanmadı işaretlendiğinde ve gelecekte geçerli bir `dueDate` + `reminderOffset` varsa `scheduleReminder` çağrılıyor.
- [ ] Tamamlanmadı işaretlendiğinde `dueDate` veya `reminderOffset` null ise `scheduleReminder` çağrılmıyor.
- [ ] Ağ hatası sonucu toggle geri alındığında (`onError`) bildirim iptal veya planlaması tetiklenmiyor.
- [ ] Expo Go Android'de toggle işlemi çökmeden tamamlanıyor.
- [ ] `npx tsc --noEmit` yeni hata üretmiyor.

---

## QW-006
**Owner:** Frontend
**Title:** TypeScript kontrolü ve geliştirici doğrulaması
**Status:** todo
**Depends on:** QW-001, QW-002, QW-003, QW-004, QW-005

### Açıklama
QW-001 ile QW-005 tamamlandıktan sonra tüm değişikliklerin birlikte derleme hatası üretmediğini
doğrula; uygulamayı başlatarak temel akışların çalıştığını manuel kontrol et. Bu ticket
bir entegrasyon noktasıdır — herhangi bir hata bulunursa kaynak ticket numarasına referans
veren düzeltme notu bırak.

### Adımlar
1. `cd mobile && npx tsc --noEmit` çalıştır ve çıktıyı incele. Hata varsa hangi
   QW ticket'ından kaynaklandığını belirle ve o ticket'a geri bildir.
2. `npx expo start` ile uygulamayı başlat.
3. Yeni görev oluştur, `dueDate` seç, All-Day toggle'ı test et.
4. Var olan bir görevi tamamlandı olarak işaretle; bildirimin `notificationRegistry`'den
   silindiğini doğrula (registry dosyasını/AsyncStorage içeriğini incele).
5. Geçmiş tarih seçilerek `Alert`'in tetiklendiğini doğrula.
6. Tüm ekranlarda overdue vurgu davranışının değişmediğini doğrula.
7. Sorun bulunamazsa ticket'ı tamamlandı olarak işaretle.

### Değişen / Oluşturulan Dosyalar
Bu ticket yeni dosya oluşturmaz. Hata bulunursa ilgili QW ticket'ının dosyaları düzeltilir.

**Dokunulmaması gereken dosyalar:** Backend dizini, `mobile/src/navigation/`, `mobile/src/theme/`

### Kabul Kriterleri
- [ ] `npx tsc --noEmit` sıfır hata ile tamamlanıyor.
- [ ] Uygulama başarıyla başlıyor, runtime hatası yok.
- [ ] Tüm QW-001–QW-005 kabul kriterleri bu birleşik ortamda geçerlidir.
- [ ] Raporlanmamış yeni regresyon yok.

---

## QW-007
**Owner:** Tester
**Title:** Entegrasyon testi ve E2E senaryoları
**Status:** todo
**Depends on:** QW-006

### Açıklama
QW-006 geliştirici doğrulamasının ardından bağımsız QA doğrulaması yapılır. Her yeni özellik
için senaryo bazlı test edilir; regresyon kontrolü için mevcut akışlar da doğrulanır.
Playwright E2E test suiti varsa BL-001 ve BL-002 için yeni senaryo dosyaları eklenir.

### Adımlar
1. `npx expo start` ile uygulamayı başlat.
2. **BL-005 regresyon:** `TodoListScreen` ve `TaskDetailScreen`'de geçmiş tarihli görevlerin
   overdue vurgusunun v0.9.0 ile aynı olduğunu doğrula.
3. **BL-004 regresyon:** `TodoFormScreen`'de tarih seçilmediğinde `"Tarih seçilmedi"` metninin
   hâlâ göründüğünü doğrula.
4. **BL-001 — All-Day modu:**
   - Tarih seç, All-Day toggle'ı aç, kaydet; `dueDate` değerinin `T00:00:00.000Z` ile bittiğini doğrula.
   - iOS ve Android'de saat adımının atlandığını doğrula.
   - `dueDate` temizlendiğinde toggle'ın sıfırlandığını doğrula.
   - List ve detail ekranlarda sadece `DD.MM.YYYY` göründüğünü doğrula.
5. **BL-002 — Geçmiş tarih uyarısı:**
   - Gelecek tarih seç; alert çıkmamalı.
   - Geçmiş tarih seç; alert çıkmalı; alert'ten sonra kayıt yapılabilmeli.
   - Düzenleme modunda zaten geçmiş tarihli görev açılırken alert çıkmamalı.
6. **BL-003 — Toggle bildirimi:**
   - Reminder'lı görevi tamamlandı işaretle; bildirimin iptal edildiğini doğrula.
   - Aynı görevi tamamlanmadı işaretle; bildirimin yeniden planlandığını doğrula.
   - `dueDate` veya `reminderOffset` olmayan görevi toggle'la; `scheduleReminder`'ın çağrılmadığını doğrula.
7. Playwright E2E senaryosu varsa `mobile/e2e/quick-wins.spec.ts` dosyasına BL-001 ve BL-002
   için senaryo ekle.
8. Bulguları `docs/qa-011-quick-wins.md` olarak belgele.

### Değişen / Oluşturulan Dosyalar
| Dosya | İşlem |
|-------|-------|
| `mobile/e2e/quick-wins.spec.ts` | Yeni E2E senaryo dosyası (opsiyonel, Playwright kuruluysa) |
| `docs/qa-011-quick-wins.md` | QA bulgu raporu |

**Dokunulmaması gereken dosyalar:** `mobile/src/` kaynak dosyaları (sadece okunur), backend dizini

### Kabul Kriterleri
- [ ] BL-005: Her iki ekranda overdue vurgusu v0.9.0 ile aynı davranışı gösteriyor.
- [ ] BL-004: `"Tarih seçilmedi"` placeholder metni `TodoFormScreen`'de görünüyor.
- [ ] BL-001: All-Day mod iOS ve Android'de saat adımını atlatıyor.
- [ ] BL-001: All-Day kaydedilen görev `T00:00:00.000Z` dueDate ile saklanıyor.
- [ ] BL-001: Liste ve detay ekranlarında All-Day görev sadece tarih gösteriyor.
- [ ] BL-002: Geçmiş tarih seçilince alert tetikleniyor; görev yine kaydedilebiliyor.
- [ ] BL-002: Düzenleme formunda zaten geçmiş tarih varken alert tetiklenmiyor.
- [ ] BL-003: Tamamlandı toggle'ı bildirim iptali yapıyor.
- [ ] BL-003: Tamamlanmadı toggle'ı (gelecek dueDate + reminderOffset varsa) bildirim planlaması yapıyor.
- [ ] `docs/qa-011-quick-wins.md` oluşturulmuş ve tüm senaryo sonuçlarını içeriyor.

---

## Özet Tablo

| Ticket | Owner    | Başlık                                                    | Tahmini Süre | Bağımlılık          |
|--------|----------|-----------------------------------------------------------|--------------|---------------------|
| QW-001 | Frontend | `isOverdue` utility — shared modüle taşı                  | 1 saat       | —                   |
| QW-002 | Frontend | `DateTimePickerField` — `placeholder` prop ekle           | 1 saat       | —                   |
| QW-003 | Frontend | All-Day modu entegrasyonu                                 | 2 saat       | QW-002              |
| QW-004 | Frontend | Geçmiş tarih uyarısı (soft Alert)                         | 1 saat       | QW-001, QW-003      |
| QW-005 | Frontend | Toggle → bildirim iptali ve yeniden planlaması            | 1 saat       | —                   |
| QW-006 | Frontend | TypeScript kontrolü ve geliştirici doğrulaması            | 1 saat       | QW-001 … QW-005     |
| QW-007 | Tester   | Entegrasyon testi ve E2E senaryoları                      | 2 saat       | QW-006              |

**Toplam tahmini süre:** 9 saat

---

## Bağımlılık Diyagramı

```
QW-001 (isOverdue utility)  ──────────────────────────┐
                                                       ▼
QW-002 (placeholder prop)                           QW-004 (geçmiş tarih uyarısı)
    │                                                  ▲
    ▼                                                  │
QW-003 (All-Day modu)  ────────────────────────────────┘

QW-005 (toggle → bildirim)  (bağımsız)

QW-001, QW-002, QW-003, QW-004, QW-005
    │
    ▼
QW-006 (TypeScript kontrolü + geliştirici doğrulaması)
    │
    ▼
QW-007 (Entegrasyon testi + E2E)
```

**Paralel çalışabilecek gruplar:**
- Grup A (paralel): QW-001, QW-002, QW-005
- Grup B (QW-002 biter bitmez): QW-003
- Grup C (QW-001 ve QW-003 biter bitmez): QW-004
- Sıralı son adımlar: QW-006 → QW-007
