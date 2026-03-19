# Feature: Native DateTime Picker

Versiyon: 1.0
Tarih: 2026-03-19
Hazırlayan: Product Manager Agent
Durum: Taslak
Hedef Sürüm: v0.9.0

---

## Genel Bakış

`TodoFormScreen` üzerindeki "Son Tarih" alanı şu an serbest metin girişi (`TextInput`) ile doldurulmaktadır. Kullanıcı `YYYY-AA-GG` formatını elle yazmak zorundadır; bu hem hata prone hem de mobil deneyime uygun değildir. Ayrıca saat bilgisi hiç alınmamakta, `dueDate` her zaman 00:00 UTC olarak kaydedilmektedir.

Bu feature ile metin kutusu kaldırılacak, yerine platforma özgü native picker bileşeni getirilecektir. Kullanıcı hem tarih hem saat seçebilecek; seçilen değer ISO 8601 UTC formatında backend'e iletilecektir.

---

## Kullanıcı Hikayeleri

### US-1 — Native Tarih + Saat Seçimi

Bir kullanıcı olarak, görev oluştururken veya düzenlerken "Son Tarih" alanına dokunduğumda native bir tarih/saat seçici açılsın istiyorum; böylece klavye ile format ezberlemek yerine hızlıca seçim yapabileyim.

### US-2 — Boş Bırakma (Nullable)

Bir kullanıcı olarak, son tarihi seçmeden görevi kaydedebilmek istiyorum; böylece tarihsiz görevler oluşturmak için zorunlu bir adım eklenmemiş olur.

### US-3 — Saat Bilgisinin Gösterimi

Bir kullanıcı olarak, seçtiğim son tarih ve saat bilgisini görev listesinde ve detay ekranında "GG.AA.YYYY HH:mm" formatında görmek istiyorum; böylece sadece tarihi değil saati de takip edebileyim.

### US-4 — Düzenleme Modunda Mevcut Değeri Yükleme

Bir kullanıcı olarak, mevcut son tarihi olan bir görevi düzenlemeye açtığımda picker'ın o tarih/saat değeriyle önceden dolu gelmesini istiyorum; böylece her seferinde sıfırdan seçmek zorunda kalmayayım.

### US-5 — Tarihi Temizleme

Bir kullanıcı olarak, seçili son tarihi tek tuşla temizleyebilmek istiyorum; böylece tarih ekleyip vazgeçtiğimde formu yeniden açmak zorunda kalmayayım.

---

## Fonksiyonel Gereksinimler

### FR-1 — Paket Seçimi

- Expo managed workflow kısıtı nedeniyle yalnızca Expo uyumlu paketler kullanılır.
- `@react-native-community/datetimepicker` Expo managed workflow'da kullanılabilir; Architect Agent tarafından onaylanır.

### FR-2 — Platform Davranışı

| Platform | Tarih Seçimi | Saat Seçimi |
|----------|--------------|-------------|
| iOS | Spinner veya inline picker | Tarih sonrası ayrı adımda |
| Android | Modal dialog | Tarih sonrası otomatik açılır |

### FR-3 — Picker Tetikleyicisi

- Mevcut `TextInput` kaldırılır.
- Yerine: dokunulabilir satır (ikon + değer / placeholder) + sağda "Temizle" (×) ikonu eklenir.

### FR-4 — Veri Akışı

- Seçilen tarih ve saat birleştirilerek `.toISOString()` ile UTC ISO 8601 string'e çevrilir.
- Backend API sözleşmesi (`dueDate: string | null`) değişmez.

### FR-5 — Reminder Bağımlılığı Korunur

- `dueDate` temizlendiğinde `reminderOffset` otomatik null sıfırlanır.
- `dueDate` seçilmediği sürece Hatırlatıcı seçici pasif kalır.

### FR-6 — Görev Listesi Tarih Formatı

- Saat bilgisi mevcutsa (00:00 UTC'den farklıysa): `"GG.AA.YYYY HH:mm"`
- Saat bilgisi yoksa: `"GG.AA.YYYY"`

### FR-7 — Detay Ekranı Tarih Formatı

- FR-6 ile aynı kural `TaskDetailScreen` için de geçerlidir.

---

## Kabul Kriterleri

### Picker Açma / Kapama

- [ ] "Son Tarih" satırına dokunulduğunda native platform picker'ı açılır.
- [ ] Picker iptal edildiğinde `dueDate` değişmez.
- [ ] Picker onaylandığında seçilen tarih ve saat `dueDate` state'ine yazılır.
- [ ] Kaydetme sırasında (`saving === true`) picker tetikleyicisine dokunulamaz.

### Değer Gösterimi

- [ ] `dueDate` null iken tetikleyicide placeholder metni gösterilir.
- [ ] `dueDate` seçildiğinde `"GG.AA.YYYY HH:mm"` formatında değer görünür.
- [ ] Seçim sonrası "Temizle" ikonu görünür.

### Temizleme

- [ ] "Temizle" ikonuna basıldığında `dueDate` null olur.
- [ ] `dueDate` temizlendiğinde `reminderOffset` da null olur.
- [ ] `dueDate` temizlendiğinde Hatırlatıcı seçici pasif hale gelir.

### Düzenleme Modu

- [ ] Mevcut `dueDate` olan görev düzenlemeye açıldığında picker tetikleyicisinde o değer gösterilir.
- [ ] Picker ilk açılışta mevcut tarih/saate konumlanır.

### Platform Uyumu

- [ ] iOS Simulator'da hem tarih hem saat seçimi yapılıp kaydedilebilir.
- [ ] Android Emulator'da hem tarih hem saat seçimi yapılıp kaydedilebilir.
- [ ] Her iki platformda picker'dan vazgeçildiğinde form verisi bozulmaz.

### Tarih/Saat Gösterimi

- [ ] Liste ekranında saat bilgisi içeren dueDate'ler `"GG.AA.YYYY HH:mm"` olarak gösterilir.
- [ ] Detay ekranında aynı format kuralı uygulanır.
- [ ] Overdue renk vurgusu saat bilgisi eklenmesinden sonra da doğru çalışır.

### Teknik

- [ ] `npx tsc --noEmit` hatasız tamamlanır.
- [ ] `TextInput` tabanlı eski tarih girişi kaldırılmıştır.

---

## Kapsam Dışı

| Özellik | Gerekçe |
|---------|---------|
| Backend API değişikliği | `dueDate` zaten `DateTime?` ISO 8601 UTC |
| Tekrarlayan görevler | Bağımsız özellik |
| "Tüm gün" modu | Sonraki sprint |
| Geçmiş tarih engeli | Ayrı feature |
| Timezone dönüşümü | Standart `Date` API yeterli |

---

## Bağımlılıklar

- **Etkilenen ekranlar:** `TodoFormScreen`, `TodoListScreen`, `TaskDetailScreen`
- **Etkilenen bileşenler:** `TodoItem` (formatDate fonksiyonu)
- **Paket:** Expo managed workflow uyumlu native datetime picker — Architect onaylayacak
- **Korunan davranış:** `reminderOffset` / `dueDate` bağımlılığı (`notifications-architecture.md`)
