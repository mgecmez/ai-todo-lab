# Offline-First Manuel Doğrulama Checklist'i

**Sprint:** Step 2 — Offline-First Architecture
**Yazar:** Tester / QA Agent
**Tarih:** 2026-03-08
**Kapsam:** OFFLINE-001 → OFFLINE-007 arası ticket'ların kullanıcı tarafı doğrulaması

---

## Hazırlık

### Ortam

- Backend: `dotnet run` ile ayağa kaldırılmış (`http://localhost:5100`)
- Mobile: `npx expo start` ile çalışıyor (iOS Simülatör veya fiziksel cihaz)
- Backend URL'si `mobile/src/services/api/config.ts` içinde doğru ayarlı

### Cache Temizleme

AsyncStorage test arasında temizlenmezse senaryolar birbirini etkileyebilir.
Cache'i temizlemek için iki yöntem:

**Yöntem A — Simülatör:** Uygulamayı simülatörden tamamen sil (App Store'dan silinir gibi) ve yeniden yükle.

**Yöntem B — Geliştirici aracı (önerilen):**
Geçici olarak uygulamanın başlangıcına `clearTodosCache()` çağrısı ekle, çalıştır, sonra geri al.

**Yöntem C — Expo DevTools:**
Metro Bundler terminalinde `r` tuşu ile reload yapıldıktan sonra cache bellekte temizlenmez;
AsyncStorage kalıcıdır. Fiziksel cache temizliği için Yöntem A veya B gereklidir.

### Senaryo Başlatma Notasyonu

Her senaryo başında şu durum belirtilir:

```
[Cache: YOK / VAR]   [API: AÇIK / KAPALI]
```

API'yi kapatmak için backend terminaline `Ctrl+C`.
API'yi açmak için: `dotnet run` (backend dizininden).

---

## SENARYO 1 — İlk Açılış: Cache Yok, API Açık

```
[Cache: YOK]   [API: AÇIK]
```

### Adımlar

1. Cache'i temizle (bkz. Hazırlık).
2. Uygulamayı aç.
3. Liste ekranına bak.

### Beklenen Davranış

- [ ] Kısa bir yükleme spinner'ı görünür ("Yükleniyor…").
- [ ] API yanıtı gelince todo listesi ekranda belirir.
- [ ] Spinner kaybolur; liste render edilir.
- [ ] Listede beklenmedik hata mesajı, boş ekran yoktur (API'de veri varsa).

### Doğrulama Notu

Bu, cache yokken tek doğru yol olan "API'den yükle" akışını test eder.
Backend'de hiç todo yoksa liste boş görünür ve "Henüz görev yok." yazısı çıkmalıdır — bu de beklenen davranıştır.

---

## SENARYO 2 — Tekrar Açılış: Cache Var, API Açık (SWR)

```
[Cache: VAR]   [API: AÇIK]
```

### Ön Koşul

SENARYO 1 başarıyla tamamlanmış; en az bir todo oluşturulmuş olmalı.

### Adımlar

1. Uygulamayı kapat (tamamen arka plandan kaldır).
2. Uygulamayı yeniden aç.
3. Liste ekranına bak.
4. API'nin taze veri döndürdüğünü doğrulamak için arka planda başka bir istemciyle yeni bir todo ekle ve listenin güncellenip güncellenmediğini gözlemle.

### Beklenen Davranış

- [ ] Uygulama açılır açılmaz **spinner görünmez**; cache'ten gelen liste anında görünür.
- [ ] Liste kısa süre sonra (API yanıtı gelince) yeniden render edilir.
- [ ] Eğer dışarıdan yeni todo eklendiyse yenilenen listede görünür.
- [ ] Kullanıcı işlem yapamazken beklediği bir ekran yoktur.

### Doğrulama Notu

Bu, "Stale-While-Revalidate" akışının temel testidir. Cache varken hiçbir zaman spinner çıkmamalıdır.

---

## SENARYO 3 — Offline Liste Görüntüleme: Cache Var, API Kapalı

```
[Cache: VAR]   [API: KAPALI]
```

### Ön Koşul

Uygulama daha önce en az bir kez başarıyla yüklenmiş (cache dolu).

### Adımlar

1. Backend'i kapat (`Ctrl+C`).
2. Uygulamayı kapat ve yeniden aç.
3. Liste ekranına bak.

### Beklenen Davranış

- [ ] Spinner görünmez.
- [ ] Cache'teki todo listesi anında ekranda belirir.
- [ ] **Hata mesajı veya hata ekranı görünmez** ("⚠ …" yazısı çıkmamalıdır).
- [ ] Listede arama, kaydırma, todo kartına tıklama gibi işlemler çalışmaya devam eder.
- [ ] Pull-to-refresh yapıldığında RefreshControl döner, ardından durur; liste değişmez; hata çıkmaz.

### Doğrulama Notu

Bu, offline-first'in en kritik testidir. Kullanıcı internet olmadan hâlâ veri görebilmeli.

---

## SENARYO 4 — Tam Offline: Cache Yok, API Kapalı

```
[Cache: YOK]   [API: KAPALI]
```

### Adımlar

1. Cache'i temizle.
2. Backend'i kapat.
3. Uygulamayı aç.
4. Liste ekranına bak.

### Beklenen Davranış

- [ ] Spinner kısa süre görünür (API deneniyor).
- [ ] Spinner kaybolur; **hata ekranı** gösterilir.
- [ ] Hata mesajı teknik string içermez: "Network request failed" veya "fetch failed" gösterilmez.
- [ ] Bunun yerine şuna benzer bir mesaj görünür: "İnternet bağlantısı yok. Lütfen tekrar deneyin."
- [ ] **"Tekrar Dene"** butonu görünür.
- [ ] "Tekrar Dene" butonuna basıldığında yeniden API denenir (API hâlâ kapalıysa hata tekrar çıkar).

### Doğrulama Notu

Bu senaryo, fallback'in son sınırını test eder: ne cache ne API yoksa hata ekranı zorunludur. Hata mesajının anlaşılır olması kritiktir.

---

## SENARYO 5 — Todo Oluşturma: API Açık

```
[Cache: VAR]   [API: AÇIK]
```

### Adımlar

1. Liste ekranında FAB'e (sağ alt köşe) bas.
2. Başlık gir: "Offline Test Todo".
3. "Kaydet" butonuna bas.
4. Listeye dön.

### Beklenen Davranış

- [ ] Liste ekranına dönünce yeni todo görünür (spinner olmadan — cache'ten gelir).
- [ ] Uygulamayı kapat ve yeniden aç.
- [ ] Yeni todo hâlâ listede görünür (cache'e kaydedildi).

### Cache Doğrulaması

Uygulamayı kapatıp açtıktan sonra "Offline Test Todo" hâlâ görünüyorsa cache yazma başarılıdır.

---

## SENARYO 6 — Todo Oluşturma: API Kapalı

```
[Cache: VAR]   [API: KAPALI]
```

### Adımlar

1. Backend'i kapat.
2. Liste ekranında FAB'e bas.
3. Başlık gir: "Offline Create".
4. "Kaydet" butonuna bas.

### Beklenen Davranış

- [ ] Form ekranında hata mesajı görünür (form kapanmaz, kullanıcı formda kalır).
- [ ] Hata mesajı: "İnternet bağlantısı yok. Lütfen tekrar deneyin." veya benzeri — teknik string değil.
- [ ] Listeye geri dönünce "Offline Create" listemde **görünmez** (cache bozulmamış).
- [ ] Mevcut cache'teki todo'lar sağlam durmaktadır.

---

## SENARYO 7 — Todo Güncelleme: API Açık

```
[Cache: VAR]   [API: AÇIK]
```

### Adımlar

1. Bir todo'nun kart üzerindeki kalem ikonuna bas → Form ekranı açılır.
2. Başlığı değiştir: "Güncellenmiş Başlık".
3. "Güncelle" butonuna bas.
4. Listeye dön.

### Beklenen Davranış

- [ ] Listede todo güncellenmiş başlıkla görünür.
- [ ] Uygulamayı kapat ve yeniden aç.
- [ ] Güncellenmiş başlık hâlâ görünür (cache güncellenmiş).

---

## SENARYO 8 — Todo Güncelleme: API Kapalı

```
[Cache: VAR]   [API: KAPALI]
```

### Adımlar

1. Backend'i kapat.
2. Bir todo'nun kalem ikonuna bas.
3. Başlığı değiştir.
4. "Güncelle" butonuna bas.

### Beklenen Davranış

- [ ] Form ekranında hata mesajı görünür; form açık kalır.
- [ ] Hata mesajı anlaşılır (teknik string yok).
- [ ] Listeye dönünce eski başlık korunur (cache bozulmamış).

---

## SENARYO 9 — Toggle: API Açık (Optimistik Güncelleme)

```
[Cache: VAR]   [API: AÇIK]
```

### Adımlar

1. Listede tamamlanmamış bir todo'nun checkbox'ına bas.
2. Ardından TaskDetail ekranından "Tamamla" butonuna bas (ayrı bir todo için).

### Beklenen Davranış

**Liste ekranı toggle:**
- [ ] Checkbox **anında** değişir (optimistik).
- [ ] API yanıtı gelince değer yerinde kalır (sunucu de aynı değeri döndürür).

**TaskDetail toggle:**
- [ ] "Tamamla" → "Geri Al" olur; durum metni "Tamamlandı" olur.
- [ ] Uygulamayı kapat ve yeniden aç.
- [ ] Todo'nun tamamlanma durumu cache'te korunmuş; liste doğru durumu gösterir.

---

## SENARYO 10 — Toggle: API Kapalı (Geri Alma)

```
[Cache: VAR]   [API: KAPALI]
```

### Adımlar

1. Backend'i kapat.
2. Listede herhangi bir todo'nun checkbox'ına bas.

### Beklenen Davranış

- [ ] Checkbox **anında** değişir (optimistik).
- [ ] Kısa bir süre sonra checkbox **eski haline döner** (API başarısız oldu, geri alındı).
- [ ] Hata Alert'i görünür: "İnternet bağlantısı yok. Lütfen tekrar deneyin."
- [ ] Cache doğrulanması: uygulamayı kapat ve aç; todo eski tamamlanma durumuyla görünür.

---

## SENARYO 11 — Delete: API Açık

```
[Cache: VAR]   [API: AÇIK]
```

### Adımlar

1. Liste ekranında bir todo'nun çöp kutusu ikonuna bas.
2. Onay dialogunda "Sil" butonuna bas.

### Beklenen Davranış

- [ ] Todo listeden **anında** kaybolur (API başarılıysa doğrudan state+cache güncellenir).
- [ ] Sayfanın yeniden yüklenmesi (pull-to-refresh) gerekmez.
- [ ] Uygulamayı kapat ve yeniden aç; silinen todo hâlâ görünmez (cache'ten kaldırıldı).

---

## SENARYO 12 — Delete: API Kapalı

```
[Cache: VAR]   [API: KAPALI]
```

### Adımlar

1. Backend'i kapat.
2. Liste ekranında bir todo'nun çöp kutusu ikonuna bas.
3. Onay dialogunda "Sil" butonuna bas.

### Beklenen Davranış

- [ ] Hata Alert'i görünür: "İnternet bağlantısı yok. Lütfen tekrar deneyin."
- [ ] Todo listede **kalmaya devam eder** (cache bozulmamış).
- [ ] Uygulamayı kapat ve aç; todo hâlâ listede görünür (cache sağlam).

---

## SENARYO 13 — TaskDetail Delete: API Açık

```
[Cache: VAR]   [API: AÇIK]
```

### Adımlar

1. Bir todo'nun üzerine bas → TaskDetail ekranına git.
2. "Sil" butonuna bas.
3. Onay dialogunda "Sil" butonuna bas.

### Beklenen Davranış

- [ ] Liste ekranına dönülür.
- [ ] Silinen todo listede **görünmez** (cache'ten de kaldırıldı; liste yeniden yüklenmez).
- [ ] Uygulamayı kapat ve aç; todo hâlâ yoktur.

---

## SENARYO 14 — TaskDetail Delete: API Kapalı

```
[Cache: VAR]   [API: KAPALI]
```

### Adımlar

1. Bir todo'nun üzerine bas → TaskDetail'e git.
2. Backend'i kapat.
3. "Sil" butonuna bas → onaylayın.

### Beklenen Davranış

- [ ] Ekranda hata mesajı görünür (ekran içi kırmızı metin + Alert).
- [ ] Liste ekranına **otomatik geçiş olmaz**; TaskDetail açık kalır.
- [ ] Listeye manuel olarak geri dönünce todo hâlâ oradadır.
- [ ] Cache bozulmamıştır.

---

## SENARYO 15 — Uygulama Yeniden Başlatma: Cache Kalıcılığı

```
[Cache: VAR]   [API: İKİ DURUMDA DA]
```

### Adımlar

1. API açıkken birkaç todo oluştur (create).
2. Bir todo'yu tamamla (toggle).
3. Bir todo'yu sil (delete).
4. Uygulamayı tamamen kapat (arka plandan kaldır).
5. **API'yi kapat.**
6. Uygulamayı yeniden aç.

### Beklenen Davranış

- [ ] Spinner çıkmaz; cache'ten liste anında yüklenir.
- [ ] Oluşturulan todo'lar listede görünür.
- [ ] Tamamlanan todo checkbox'ı işaretli görünür.
- [ ] Silinen todo **listede yoktur**.
- [ ] Hata mesajı veya hata ekranı görünmez.

### Doğrulama Notu

Bu senaryo, beş ayrı cache yazma işleminin (create, toggle, delete) doğru çalıştığını tek bir akışta doğrular. Tüm adımlar başarılıysa cache katmanı production'a hazırdır.

---

## Özet Tablo

| # | Senaryo | Cache | API | Kritik Beklenti |
|---|---------|-------|-----|----------------|
| 1 | İlk açılış | YOK | AÇIK | Spinner → Liste |
| 2 | SWR tekrar açılış | VAR | AÇIK | Anında liste; arka planda güncelleme |
| 3 | Offline liste | VAR | KAPALI | Hata yok; liste görünür |
| 4 | Tam offline | YOK | KAPALI | Hata ekranı + Türkçe mesaj |
| 5 | Create başarılı | VAR | AÇIK | Yeni todo cache'e yazıldı |
| 6 | Create başarısız | VAR | KAPALI | Form açık kalır; cache bozulmaz |
| 7 | Update başarılı | VAR | AÇIK | Güncelleme cache'e yazıldı |
| 8 | Update başarısız | VAR | KAPALI | Form açık kalır; cache bozulmaz |
| 9 | Toggle başarılı | VAR | AÇIK | Optimistik + cache doğrulandı |
| 10 | Toggle başarısız | VAR | KAPALI | Geri alındı; cache bozulmaz |
| 11 | Delete başarılı (Liste) | VAR | AÇIK | Anında silindi; cache'ten kalktı |
| 12 | Delete başarısız (Liste) | VAR | KAPALI | Todo kaldı; cache bozulmaz |
| 13 | Delete başarılı (Detail) | VAR | AÇIK | Listeye döndü; todo yok |
| 14 | Delete başarısız (Detail) | VAR | KAPALI | Ekran kalır; cache bozulmaz |
| 15 | Yeniden başlatma | VAR | KAPALI | Tüm son değişiklikler korundu |

---

## Genel Hata Mesajı Kontrolü

Tüm senaryolarda şu kontrol yapılmalıdır:

- [ ] Kullanıcıya gösterilen hiçbir hata mesajı `"Network request failed"` içermez.
- [ ] Kullanıcıya gösterilen hiçbir hata mesajı `"fetch failed"` içermez.
- [ ] Kullanıcıya gösterilen hiçbir hata mesajı `"HTTP 5xx"` gibi ham teknik string içermez.
- [ ] Tüm hata mesajları Türkçe ve anlaşılır bir formattadır.

---

## Faz 1 Kapsam Dışı (Doğrulanmayacaklar)

Aşağıdaki davranışlar Faz 1'de tasarım gereği desteklenmez ve test edilmez:

| Konu | Durum |
|------|-------|
| Offline create/update/delete kuyruğa alınıp sonra senkronize edilir | Faz 2 |
| Çok cihaz arasında senkronizasyon | Faz 2 |
| Offline olduğunda görsel bildirim bandı ("Çevrimdışısınız") | Faz 2 |
| Cache'in son güncelleme zamanı gösterimi | Faz 2 |
