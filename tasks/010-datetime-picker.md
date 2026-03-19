# Task List: 010 — Native DateTime Picker (v0.9.0)

Source spec: Mimari karar özeti (Native DateTime Picker)
Stack: Expo React Native · TypeScript · `@react-native-community/datetimepicker`

---

### DTPICK-001 — Paket kurulumu ve bağımlılık doğrulaması
**Owner:** Architect
**Depends on:** —
**Status:** todo

`@react-native-community/datetimepicker` paketini Expo managed workflow ile projeye ekle. Paketin hem iOS hem Android için native modülünü içerdiğini doğrula. Bu ticket tamamlanmadan bileşen yazımına (`DTPICK-003`) geçilemez; native modül olmadan import hata verir.

#### Adımlar
1. `mobile/` klasöründe aşağıdaki komutu çalıştır:
   ```
   npx expo install @react-native-community/datetimepicker
   ```
2. `mobile/package.json` dosyasında `@react-native-community/datetimepicker` girişinin eklendiğini doğrula.
3. Simulatörde `npx expo start` ile uygulamayı ayağa kaldır; mevcut ekranların hatasız açıldığını doğrula (regresyon kontrolü).
4. TypeScript tip tanımlarının yüklendiğini kontrol et:
   ```
   npx tsc --noEmit
   ```

#### Değişen / Oluşturulan Dosyalar
- Güncellenir: `mobile/package.json`
- Güncellenir: `mobile/package-lock.json` (veya `yarn.lock`)

#### Değiştirilmeyecek Dosyalar
- `mobile/src/` altındaki tüm kaynak dosyalar bu aşamada dokunulmaz

#### Kabul Kriterleri
- [ ] `package.json` içinde `@react-native-community/datetimepicker` bağımlılığı mevcut
- [ ] `npx expo start` uygulama hatasız başlıyor
- [ ] `npx tsc --noEmit` hatasız tamamlanıyor
- [ ] Mevcut hiçbir ekranda kırılma yok

---

### DTPICK-002 — `formatDate` utility oluşturma
**Owner:** Frontend
**Depends on:** DTPICK-001
**Status:** todo

`mobile/src/utils/formatDate.ts` dosyasını oluştur. Şu anda `TodoListScreen.tsx` (satır 28-31) ve `TaskDetailScreen.tsx` (satır 25-28) içinde birebir kopya olan `formatDate` fonksiyonu tek bir kaynakta birleştirilir. Ortak utility olmadan `DTPICK-004` ve `DTPICK-005` bağımlı ekranları güncelleyemez.

#### Adımlar
1. `mobile/src/utils/formatDate.ts` dosyasını oluştur.
2. `formatDate(iso: string): string` fonksiyonunu export et:
   - `new Date(iso)` ile parse et.
   - `toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })` formatını kullan.
   - Bu imza `TodoListScreen` ve `TaskDetailScreen`'deki mevcut inline fonksiyonlarla birebir aynıdır; davranış değişmemelidir.
3. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

#### Değişen / Oluşturulan Dosyalar
- Oluşturulur: `mobile/src/utils/formatDate.ts`

#### Değiştirilmeyecek Dosyalar
- `mobile/src/screens/TodoListScreen.tsx` (bu ticket'ta henüz güncellenmez; DTPICK-005'te güncellenir)
- `mobile/src/screens/TaskDetailScreen.tsx` (bu ticket'ta henüz güncellenmez; DTPICK-005'te güncellenir)

#### Kabul Kriterleri
- [ ] `mobile/src/utils/formatDate.ts` dosyası oluşturulmuş
- [ ] `formatDate` fonksiyonu named export olarak mevcut
- [ ] Fonksiyon `'tr-TR'` locale ile `DD.MM.YYYY` formatında tarih döndürüyor
- [ ] `npx tsc --noEmit` hatasız

---

### DTPICK-003 — `DateTimePickerField` bileşeni oluşturma
**Owner:** Frontend
**Depends on:** DTPICK-002
**Status:** todo

`mobile/src/components/DateTimePickerField.tsx` yeniden kullanılabilir bileşenini oluştur. Bileşen iOS'ta iki aşamalı (önce tarih seçici, sonra saat seçici) ve Android'de iki aşamalı (modal dialog — tarih → saat) picker akışını yönetir. Platform mantığını bileşen içinde kapsüller; dışarıya sadece `value: Date | null` ve `onChange: (date: Date | null) => void` prop'ları açar.

#### Adımlar
1. `mobile/src/components/DateTimePickerField.tsx` dosyasını oluştur.
2. Prop interface'ini tanımla:
   ```typescript
   interface DateTimePickerFieldProps {
     label: string;
     value: Date | null;
     onChange: (date: Date | null) => void;
     disabled?: boolean;
   }
   ```
3. iOS akışını uygula:
   - Butona basınca `mode="date"` picker'ı göster.
   - Tarih seçilince `mode="time"` picker'a geç.
   - Saat seçilince `onChange` callback'ini `Date` ile çağır.
   - "Tarih Seç" placeholder metni, seçilmiş tarih varsa `formatDate` utility ile formatlı metin göster.
4. Android akışını uygula:
   - Butona basınca `DateTimePickerAndroid.open({ mode: 'date', ... })` çağır.
   - Tarih confirm edilince `DateTimePickerAndroid.open({ mode: 'time', ... })` çağır.
   - Saat confirm edilince `onChange` callback'ini çağır.
   - Herhangi bir adımda dismiss edilirse akışı iptal et; mevcut değer korunur.
5. Temizle (clear) butonu: `value` dolu iken "Tarihi Temizle" TouchableOpacity göster; basınca `onChange(null)` çağır.
6. `disabled` prop true iken hem picker butonu hem temizle butonu pasif olsun.
7. Tüm renkler ve spacing değerleri `theme/tokens.ts` token'larından alınsın; hardcode değer kullanılmasın.
8. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

#### Değişen / Oluşturulan Dosyalar
- Oluşturulur: `mobile/src/components/DateTimePickerField.tsx`

#### Değiştirilmeyecek Dosyalar
- `mobile/src/theme/tokens.ts`
- `mobile/src/utils/formatDate.ts`
- `mobile/src/screens/TodoFormScreen.tsx` (bu ticket'ta henüz güncellenmez; DTPICK-004'te güncellenir)

#### Kabul Kriterleri
- [ ] `DateTimePickerField` bileşeni oluşturulmuş ve export edilmiş
- [ ] `value: Date | null` ve `onChange: (date: Date | null) => void` prop'ları tanımlı
- [ ] iOS'ta iki aşamalı (date → time) picker akışı çalışıyor
- [ ] Android'de iki aşamalı modal dialog akışı çalışıyor
- [ ] Seçili tarih `formatDate` ile formatlı olarak gösteriliyor
- [ ] Temizle butonu yalnızca `value` dolu iken görünüyor; basınca `onChange(null)` çağrılıyor
- [ ] `disabled` prop true iken picker ve temizle butonu etkileşimsiz
- [ ] Hardcode renk veya spacing yok — token'lar kullanılıyor
- [ ] `npx tsc --noEmit` hatasız

---

### DTPICK-004 — `TodoFormScreen` entegrasyonu
**Owner:** Frontend
**Depends on:** DTPICK-003
**Status:** todo

`TodoFormScreen.tsx` dosyasındaki manuel metin tabanlı tarih giriş mekanizmasını `DateTimePickerField` bileşeni ile değiştir. `dueDateText: string` state'i kaldırılır; `dueDate` state tipi `Date | null` olarak güncellenir. `handleSave`'de `.toISOString()` ile ISO string'e dönüşüm yapılır. `handleDueDateChange` ve `handleClearDueDate` fonksiyonları kaldırılır; bileşen bu sorumluluğu üstlenir.

#### Adımlar
1. `mobile/src/screens/TodoFormScreen.tsx` dosyasını aç.
2. `dueDateText` state'ini (`useState<string>`) kaldır.
3. `dueDate` state tipini `Date | null` olarak güncelle:
   - Edit modunda: `editTodo?.dueDate ? new Date(editTodo.dueDate) : null` ile başlat.
   - Create modunda: `null`.
4. `handleDueDateChange(text: string)` fonksiyonunu kaldır.
5. `handleClearDueDate()` fonksiyonunu kaldır; temizleme sorumluluğu `DateTimePickerField` bileşenindedir.
6. JSX'teki manuel `FormField` (Son Tarih) ve "Tarihi Temizle" `TouchableOpacity`'yi kaldır.
7. Yerine `DateTimePickerField` bileşenini ekle:
   ```tsx
   <DateTimePickerField
     label="Son Tarih"
     value={dueDate}
     onChange={(date) => {
       setDueDate(date);
       if (!date) setReminderOffset(null);
     }}
     disabled={saving}
   />
   ```
8. `handleSave` fonksiyonunda `dueDate` kullanılan yerleri güncelle:
   - `dueDate` `null` değilse `.toISOString()` ile string'e çevir.
   - `dueDate` `null` ise `null` / `undefined` ilet (mevcut mantıkla uyumlu).
9. Reminder seçici için `dueDate` null kontrolü değişmez (`!dueDate` koşulu hâlâ çalışır, tip `Date | null` olduğundan).
10. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

#### Değişen / Oluşturulan Dosyalar
- Güncellenir: `mobile/src/screens/TodoFormScreen.tsx`

#### Değiştirilmeyecek Dosyalar
- `mobile/src/components/DateTimePickerField.tsx`
- `mobile/src/mutations/useCreateTodo.ts`
- `mobile/src/mutations/useUpdateTodo.ts`
- `mobile/src/types/todo.ts`
- `mobile/src/theme/tokens.ts`

#### Kabul Kriterleri
- [ ] `dueDateText` state'i kaldırılmış; artık `string` tabanlı tarih state'i yok
- [ ] `dueDate` state tipi `Date | null`
- [ ] `handleDueDateChange` ve `handleClearDueDate` fonksiyonları kaldırılmış
- [ ] `DateTimePickerField` bileşeni form içinde render ediliyor
- [ ] Edit modunda mevcut `dueDate` bileşene `Date` nesnesi olarak aktarılıyor
- [ ] `handleSave` içinde `.toISOString()` dönüşümü uygulanıyor
- [ ] `dueDate === null` iken `reminderOffset` sıfırlanıyor
- [ ] `npx tsc --noEmit` hatasız

---

### DTPICK-005 — `TodoListScreen` ve `TaskDetailScreen` formatDate güncellemesi
**Owner:** Frontend
**Depends on:** DTPICK-002
**Status:** todo

`TodoListScreen.tsx` ve `TaskDetailScreen.tsx` içindeki inline `formatDate` fonksiyonlarını kaldır; her ikisinde de `mobile/src/utils/formatDate.ts` utility'sini import et. Bu, DTPICK-002'de oluşturulan utility'nin tek kaynak haline gelmesini sağlar. Davranış değişmemelidir — yalnızca kod tekrarı giderilir.

#### Adımlar
1. `mobile/src/screens/TodoListScreen.tsx` dosyasını aç.
   - Satır 28-31 arasındaki inline `formatDate` fonksiyon tanımını kaldır.
   - Dosya başına import ekle: `import { formatDate } from '../utils/formatDate';`
   - Dosyadaki `formatDate` çağrıları (satır 87, 88) değişmeden çalışmaya devam etmeli.
2. `mobile/src/screens/TaskDetailScreen.tsx` dosyasını aç.
   - Satır 25-28 arasındaki inline `formatDate` fonksiyon tanımını kaldır.
   - Dosya başına import ekle: `import { formatDate } from '../utils/formatDate';`
   - Dosyadaki `formatDate` çağrıları (satır 171, 203) değişmeden çalışmaya devam etmeli.
3. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.
4. Simulatörde her iki ekranı açarak tarih gösteriminin aynı şekilde çalıştığını doğrula.

#### Değişen / Oluşturulan Dosyalar
- Güncellenir: `mobile/src/screens/TodoListScreen.tsx`
- Güncellenir: `mobile/src/screens/TaskDetailScreen.tsx`

#### Değiştirilmeyecek Dosyalar
- `mobile/src/utils/formatDate.ts`
- `mobile/src/components/` altındaki tüm bileşenler
- `mobile/src/mutations/` altındaki tüm dosyalar

#### Kabul Kriterleri
- [ ] `TodoListScreen.tsx` içindeki inline `formatDate` tanımı kaldırılmış
- [ ] `TaskDetailScreen.tsx` içindeki inline `formatDate` tanımı kaldırılmış
- [ ] Her iki dosyada da `'../utils/formatDate'` import satırı mevcut
- [ ] Tarih gösterimi her iki ekranda da değişmemiş (davranış regresyonu yok)
- [ ] `npx tsc --noEmit` hatasız

---

### DTPICK-006 — TypeScript kontrolü ve geliştirici doğrulaması
**Owner:** Frontend
**Depends on:** DTPICK-004, DTPICK-005
**Status:** todo

Tüm değişiklikler tamamlandıktan sonra TypeScript kontrolü yapılır, uygulama simulatörde el ile çalıştırılır ve temel akışlar manuel olarak doğrulanır. Herhangi bir tip hatası, import hatası veya runtime hatası bu aşamada yakalanır.

#### Adımlar
1. `mobile/` klasöründe TypeScript kontrolü çalıştır:
   ```
   npx tsc --noEmit
   ```
2. Uyarı veya hata varsa kaynak ticket'ı (DTPICK-002, DTPICK-003, DTPICK-004, DTPICK-005) belirleyerek düzelt.
3. `npx expo start` ile uygulamayı başlat; iOS veya Android simulatörde aç.
4. Şu kontrolleri yap:
   - `TodoListScreen`: tarihler DD.MM.YYYY formatında görünüyor.
   - `TaskDetailScreen`: tarihler DD.MM.YYYY formatında görünüyor.
   - `TodoFormScreen`'de "+" ile yeni görev ekle: `DateTimePickerField` alanı render ediliyor, butona basınca picker açılıyor.
   - Picker'dan tarih + saat seç: alan seçilen tarihi gösteriyor.
   - "Tarihi Temizle" butonuna bas: alan temizleniyor, hatırlatıcı seçici devre dışı kalıyor.
   - Formu kaydet: görev listede `dueDate` ile görünüyor.
5. Edit modunu kontrol et: mevcut `dueDate`'i olan bir görevi düzenle — picker mevcut değeri yüklüyor.
6. Herhangi bir sorun varsa kaynak ticket'ı not et; aksi hâlde DTPICK-007'ye geç.

#### Değişen / Oluşturulan Dosyalar
- (yok — bu ticket yalnızca doğrulama amaçlıdır)

#### Değiştirilmeyecek Dosyalar
- Tüm kaynak dosyalar bu aşamada dondurulmuş kabul edilir

#### Kabul Kriterleri
- [ ] `npx tsc --noEmit` sıfır hata ile tamamlanıyor
- [ ] `DateTimePickerField` iOS simulatörde iki aşamalı picker akışı çalışıyor
- [ ] `DateTimePickerField` Android simulatörde iki aşamalı modal dialog akışı çalışıyor
- [ ] Seçilen tarih form alanında formatlı gösteriliyor
- [ ] Temizle butonu picker değerini sıfırlıyor
- [ ] Edit modunda mevcut `dueDate` picker'a yükleniyor
- [ ] `TodoListScreen` ve `TaskDetailScreen` tarih gösterimi değişmemiş (regresyon yok)

---

### DTPICK-007 — Entegrasyon testi ve E2E senaryoları
**Owner:** Tester
**Depends on:** DTPICK-006
**Status:** todo

Native DateTime Picker özelliğinin uçtan uca doğrulamasını yap. Başarı ve hata akışlarını hem iOS hem Android üzerinde test et. Regresyon kontrolü olarak mevcut todo CRUD işlemlerinin etkilenmediğini doğrula.

#### Adımlar
1. **Ortamı hazırla:**
   - Backend API'nin çalıştığından emin ol: `cd backend/TodoApp.Api && dotnet run --urls "http://localhost:5100"`
   - Mobil uygulamayı başlat: `cd mobile && npx expo start`
2. **DateTimePickerField — Yeni Görev Akışı:**
   - "+" butonuna bas, `TodoFormScreen`'i aç.
   - "Son Tarih" alanına bas — picker açılmalı.
   - iOS: tarih seçici → saat seçici iki aşamalı akışı doğrula.
   - Android: tarih modal → saat modal iki aşamalı akışı doğrula.
   - Geçerli tarih + saat seç: form alanı formatlı tarihi göstermeli.
   - "Tarihi Temizle" butonuna bas: alan temizlenmeli, hatırlatıcı seçici "Son tarih belirlenmeden hatırlatıcı eklenemez" mesajı ile devre dışı kalmalı.
   - Formu başlık ile doldur ve kaydet: görev `dueDate` bilgisiyle listede görünmeli.
3. **DateTimePickerField — Düzenleme Akışı:**
   - `dueDate` olan bir görevi listeden seç, düzenle.
   - `DateTimePickerField` mevcut tarihi yüklenmiş olarak göstermeli.
   - Tarihi değiştir ve kaydet: liste ve detay ekranında yeni tarih görünmeli.
4. **formatDate Regresyon Kontrolü:**
   - `TodoListScreen`'de görevler listeleniyor: `createdAt` ve `dueDate` DD.MM.YYYY formatında görünüyor.
   - `TaskDetailScreen`'de aynı formatın korunduğunu doğrula.
5. **Genel Regresyon Kontrolleri:**
   - `dueDate` olmayan görev oluştur: başarıyla oluşturuluyor.
   - Mevcut `dueDate`'siz görevi düzenle: form açılıyor, `DateTimePickerField` boş.
   - Toggle (tamamla/geri al) çalışıyor.
   - Silme akışı çalışıyor.
6. **TypeScript ve Build Kontrolü:**
   - `npx tsc --noEmit` hatasız.

#### Değişen / Oluşturulan Dosyalar
- (yok — Tester yalnızca test eder ve raporlar)

#### Değiştirilmeyecek Dosyalar
- Tüm kaynak dosyalar — Tester üretim koduna dokunmaz

#### Kabul Kriterleri
- [ ] iOS'ta iki aşamalı date → time picker akışı çalışıyor
- [ ] Android'de iki aşamalı modal dialog akışı çalışıyor
- [ ] Seçilen tarih + saat form alanında `formatDate` formatıyla gösteriliyor
- [ ] "Tarihi Temizle" picker değerini sıfırlıyor; hatırlatıcı devre dışı kalıyor
- [ ] Yeni görev `dueDate` ile oluşturuluyor ve listede görünüyor
- [ ] Düzenleme modunda mevcut `dueDate` picker'a yükleniyor
- [ ] Güncellenen `dueDate` liste ve detay ekranında yansıyor
- [ ] `dueDate` olmayan görevler etkilenmiyor (regresyon yok)
- [ ] `TodoListScreen` ve `TaskDetailScreen` tarih formatı değişmemiş
- [ ] Toggle, silme, oluşturma akışları çalışıyor (genel regresyon yok)
- [ ] `npx tsc --noEmit` sıfır hata

---

## Özet Tablosu

| Ticket     | Owner    | Başlık                                                        | Tahmini Süre | Bağımlılık              |
|------------|----------|---------------------------------------------------------------|--------------|-------------------------|
| DTPICK-001 | Architect | Paket kurulumu ve bağımlılık doğrulaması                     | 0.5 saat     | —                       |
| DTPICK-002 | Frontend | `formatDate` utility oluşturma                               | 0.5 saat     | DTPICK-001              |
| DTPICK-003 | Frontend | `DateTimePickerField` bileşeni (iOS + Android platform mantığı) | 2 saat    | DTPICK-002              |
| DTPICK-004 | Frontend | `TodoFormScreen` entegrasyonu                                | 1.5 saat     | DTPICK-003              |
| DTPICK-005 | Frontend | `TodoListScreen` + `TaskDetailScreen` formatDate güncellemesi | 0.5 saat    | DTPICK-002              |
| DTPICK-006 | Frontend | TypeScript kontrolü ve geliştirici doğrulaması               | 1 saat       | DTPICK-004, DTPICK-005  |
| DTPICK-007 | Tester   | Entegrasyon testi ve E2E senaryoları                         | 1.5 saat     | DTPICK-006              |

**Toplam tahmini süre:** ~7.5 saat

---

## Bağımlılık Sırası

```
DTPICK-001 → DTPICK-002 → DTPICK-003 → DTPICK-004 ──┐
                       → DTPICK-005 ─────────────────┼──→ DTPICK-006 → DTPICK-007
```

DTPICK-003 ve DTPICK-005 birbirinden bağımsızdır; DTPICK-002 tamamlandıktan sonra paralel geliştirilebilir. Her ikisi de DTPICK-006'ya bağımlıdır.
