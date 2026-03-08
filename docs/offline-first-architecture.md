# Offline-First Mimari

**Sprint:** Step 2 — Offline-First Architecture
**Yazar:** Architect Agent
**Tarih:** 2026-03-08
**Durum:** Taslak

---

## 1. Offline-First Neden Gerekli?

### Mevcut Sorun

Uygulama şu anda tamamen ağa bağımlı ("online-only") çalışıyor. `getTodos()`, `createTodo()` ve diğer tüm fonksiyonlar doğrudan `fetch()` çağrısı yapıyor. Sunucu yanıt vermezse veya ağ yoksa kullanıcı hiçbir şey yapamaz:

| Durum | Mevcut davranış |
|-------|----------------|
| Sunucu kapalı | Liste ekranı boş kalır veya hata gösterir |
| Uçak modu | `fetch()` exception fırlatır, ekran donabilir |
| Zayıf sinyal | İstek zaman aşımına uğrar, kullanıcı bekler |
| İlk açılış (yavaş sunucu) | Kullanıcı yükleme spinner'ını izler |

### Neden Önemli?

Todo uygulamaları günlük kullanım araçlarıdır. Kullanıcı metro'da, uçakta ya da sinyal olmayan bir ortamda görevlerini görmek veya eklemek isteyebilir. "Veri yüklenemedi" hatası yerine **son bilinen durumu göstermek** çok daha iyi bir deneyimdir.

### Kapsam (Faz 1)

Bu sprint, basit ve öğrenme odaklı bir çözüm hedefler:

- Listeyi önbellekte sakla → offline'da göster
- Yazma işlemlerini (create/update/delete/toggle) online gerektir; offline'da hata mesajı ver
- Conflict resolution, arka plan senkronizasyonu ve pending queue **Faz 2'ye bırakılır**

---

## 2. Mevcut Mobil Veri Akışı

```
Kullanıcı ekranı açar
        │
        ▼
TodoListScreen (useFocusEffect)
        │
        ▼
getTodos()          ← her zaman ağ çağrısı
        │
        ├─ Başarılı → setTodos(data) → ekranı render et
        │
        └─ Hata     → setError(message) → hata ekranı göster
                              ↑
                       Kullanıcı hiçbir veri göremez
```

**Yazma işlemleri (Create / Update / Delete / Toggle):**

```
Kullanıcı işlem yapar
        │
        ▼
API çağrısı (fetch)
        │
        ├─ Başarılı → listeye dön / state güncelle
        │
        └─ Hata     → Alert.alert("Hata") + işlem başarısız
```

**Sorun:** Her iki akışta da ağ yoksa kullanıcı sıfır içerikle karşılaşır.

---

## 3. Yeni Önerilen Veri Akışı

### Genel İlke

> "Önce önbellekten göster, arka planda API'den güncelle."

**Okuma (Liste):**

```
Kullanıcı ekranı açar
        │
        ▼
Cache'i oku (AsyncStorage)
        │
        ├─ Cache varsa → setTodos(cachedData) → ekranı anında render et
        │                       │
        │                       ▼
        │               Arka planda API çağrısı yap
        │                       │
        │               ├─ Başarılı → setTodos(freshData) + cache güncelle
        │               └─ Başarısız → mevcut görünüm korunur (cache'deki veri)
        │
        └─ Cache yoksa → API çağrısı yap (mevcut davranış)
                              │
                      ├─ Başarılı → setTodos(data) + cache'e kaydet
                      └─ Başarısız → "Veri yüklenemedi" + "Tekrar dene"
```

**Yazma (Create / Update / Delete / Toggle) — Faz 1:**

```
Kullanıcı işlem yapar
        │
        ▼
API çağrısı dene
        │
        ├─ Başarılı → API yanıtıyla cache güncelle → listeye dön
        │
        └─ Başarısız → Hata mesajı göster (offline olduğunu belirt)
                       Cache'e DOKUNMA (tutarlılık için)
```

> **Faz 1 kısıtı:** Yazma işlemleri online gerektiriyor. Kullanıcıya "Bağlantı yok, lütfen tekrar deneyin" mesajı gösterilir.
> Faz 2'de pending queue ile offline yazma desteklenebilir.

---

## 4. AsyncStorage Neden Seçildi?

### Değerlendirilen Alternatifler

| Seçenek | Artılar | Eksiler |
|---------|---------|---------|
| **AsyncStorage** | Expo ekosistemi uyumlu, sıfır yapılandırma, key-value, basit API | Karmaşık sorgular için uygun değil |
| SQLite (expo-sqlite) | Tam SQL desteği, ilişkisel veri | Fazla karmaşık (Todo için aşırı mühendislik) |
| MMKV | Çok hızlı, senkron API | Native modül gerektirir; Expo Go'da sınırlı |
| Zustand + persist | State + kalıcılık birleşik | Ekstra bağımlılık; Todo için overkill |
| React Query | Cache + senkronizasyon hazır | Mevcut fetch yapısını değiştirir; büyük geçiş |

### AsyncStorage Seçim Gerekçesi

1. **Expo uyumluluğu:** `@react-native-async-storage/async-storage` Expo tarafından resmi olarak desteklenir; `npx expo install` ile sorunsuz kurulur.
2. **Basit API:** `getItem` / `setItem` / `removeItem` — öğrenmesi kolay, okunması net.
3. **Todo projesi için yeterli:** Veriler düz JSON liste olarak saklanır; SQL sorgusu gerekmez.
4. **Düşük risk:** Mevcut `todosApi.ts` yapısını korur; sadece bir cache katmanı eklenir.
5. **Platform desteği:** iOS, Android ve (sınırlı) Web'de çalışır.

### Sınırları

- **Senkron değil:** Her çağrı `await` gerektirir (ancak React Native zaten async pattern kullanır).
- **Şifreleme yok:** Hassas veriler için uygun değil (Todo içeriği için sorun yok).
- **Büyük veri seti:** 50 MB üzeri veriler için uygun değil (Todo listesi için sorun yok).

---

## 5. Cache Stratejisi

### Strateji: Stale-While-Revalidate (Basitleştirilmiş)

Cache'teki veriyi hemen göster, arka planda taze veriyi çek. Taze veri gelince güncelle.

```
Cache durumu    → Kullanıcı deneyimi
───────────────────────────────────────────
Cache var       → Anında göster + sessizce güncelle
Cache yok + online  → Spinner + API'den yükle + cache'e kaydet
Cache yok + offline → "Veri yüklenemedi" hata ekranı
Cache var + offline → Cache'deki veriyi göster (eski veri bildirimi isteğe bağlı)
```

### Cache Anahtarı

```
AsyncStorage Key: "todos_cache"
Value: JSON string → Todo[] dizisi
```

Tek bir key yeterlidir; tüm todo listesi tek seferde yazılır ve okunur.

### Cache Geçerlilik Süresi (TTL)

Faz 1'de TTL uygulanmaz. Cache her başarılı API yanıtında üzerine yazılır ("write-through"). Kullanıcı her zaman en son başarılı API yanıtını görür.

Faz 2'de isteğe bağlı olarak `cached_at` timestamp'i eklenip eski cache uyarısı gösterilebilir.

### Cache Güncelleme Kuralları

| İşlem | Cache Davranışı |
|-------|----------------|
| `getTodos()` başarılı | Cache'e tüm listeyi yaz |
| `createTodo()` başarılı | API yanıtını cache'e ekle |
| `updateTodo()` başarılı | Cache'teki ilgili öğeyi güncelle |
| `deleteTodo()` başarılı | Cache'ten ilgili öğeyi kaldır |
| `toggleTodo()` başarılı | Cache'teki ilgili öğenin `isCompleted`'ını güncelle |
| Herhangi bir API hatası | Cache'e dokunma |

---

## 6. Uygulama Açılış Akışı

```
┌─────────────────────────────────────────────────────┐
│                  Uygulama açılır                    │
└─────────────────────────────────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────┐
          │  AsyncStorage'dan oku    │
          │  Key: "todos_cache"      │
          └──────────────────────────┘
                  │           │
            Var mı?          Yok
                  │           │
                  ▼           ▼
       ┌─────────────┐   ┌──────────────────────────┐
       │ Listeyi     │   │  Spinner göster           │
       │ anında      │   │  API çağrısı yap          │
       │ göster      │   │                           │
       └─────────────┘   │  Başarılı → Listeyi göster│
              │          │             + Cache'e yaz  │
              │          │  Başarısız → Hata ekranı   │
              │          └──────────────────────────┘
              │
              ▼
   Arka planda API çağrısı yap
   (Spinner gösterme, kullanıcı listeyi görüyor)
              │
    ┌─────────┴──────────┐
    │ Başarılı           │ Başarısız
    ▼                    ▼
 Listeyi güncelle    Sessizce devam et
 Cache'i güncelle    (eski cache görünür)
```

### Yükleme Durumları

| Durum | Kullanıcı görür |
|-------|----------------|
| Cache var, API henüz yanıtlamadı | Önce cache → sonra taze veri gelince güncellenir |
| Cache var, API başarısız | Cache'deki liste (sessiz hata; isteğe bağlı toast) |
| Cache yok, API başarılı | Spinner → Liste |
| Cache yok, API başarısız | Hata ekranı + "Tekrar Dene" butonu |

---

## 7. API Senkronizasyon Akışı

### Yeni Servis Katmanı Tasarımı

Mevcut `todosApi.ts` değiştirilmez. Üstüne bir **cache servisi** (`todosCacheService.ts`) eklenir. Ekranlar bu yeni servisi kullanır.

```
┌─────────────────────────────────┐
│       TodoListScreen            │  ← Değişir (yeni servisi çağırır)
│       TodoFormScreen            │
│       TaskDetailScreen          │
└─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────┐
│     todosCacheService.ts        │  ← YENİ KATMAN
│  (cache okuma/yazma + API sync) │
└─────────────────────────────────┘
        │                │
        ▼                ▼
┌──────────────┐  ┌─────────────────┐
│ todosApi.ts  │  │  AsyncStorage   │
│ (değişmez)   │  │  (cache)        │
└──────────────┘  └─────────────────┘
        │
        ▼
┌──────────────┐
│  Backend API │
│  (değişmez)  │
└──────────────┘
```

### `todosCacheService.ts` Sorumlulukları

```
getTodosWithCache()
  1. Cache'den oku → varsa hemen döndür
  2. API'den çek (arka planda veya ilk yükleme)
  3. API başarılıysa cache güncelle → yeni veriyi döndür
  4. API başarısızsa cache varsa cache'i döndür, yoksa hata fırlat

createTodoWithCache(request)
  1. API çağrısı yap
  2. Başarılıysa → cache'e yeni todo'yu ekle → döndür
  3. Başarısızsa → hata fırlat (cache değişmez)

updateTodoWithCache(id, request)
  1. API çağrısı yap
  2. Başarılıysa → cache'teki öğeyi güncelle → döndür
  3. Başarısızsa → hata fırlat

deleteTodoWithCache(id)
  1. API çağrısı yap
  2. Başarılıysa → cache'ten öğeyi kaldır
  3. Başarısızsa → hata fırlat

toggleTodoWithCache(id)
  1. Önce cache'te anlık güncelle (optimistic — mevcut davranış korunur)
  2. API çağrısı yap
  3. Başarılıysa → API yanıtıyla cache'i doğrula
  4. Başarısızsa → cache'i geri al + hata fırlat

clearCache()
  1. AsyncStorage'dan "todos_cache" key'ini sil
  (geliştirici aracı / debug için)
```

### Toggle'da Optimistik Güncelleme + Cache

Mevcut `TodoListScreen`'deki optimistic update davranışı korunur. Fark: state güncellemesine ek olarak cache de anında güncellenir. API başarısız olursa hem state hem cache geri alınır.

```
Kullanıcı toggle tıklar
        │
        ▼
1. setTodos (optimistic)    → ekran anında değişir
2. Cache güncelle (optimistic)
        │
        ▼
3. API çağrısı
        │
   ┌────┴────┐
Başarılı    Başarısız
   │            │
   ▼            ▼
4a. API yanıtıyla   4b. State geri al
    cache doğrula       Cache geri al
                        Hata mesajı
```

---

## 8. Hata ve Fallback Davranışları

### Okuma Hataları

| Senaryo | Davranış |
|---------|---------|
| İlk açılış, cache yok, API down | Hata ekranı + "Tekrar Dene" butonu |
| Cache var, API down | Cache'deki veriyi göster; hata gösterme |
| AsyncStorage okuma hatası | API'den yükle; cache yokmuş gibi davran |
| AsyncStorage yazma hatası | Sessizce logla; kullanıcıya gösterme (kritik değil) |

### Yazma Hataları (Faz 1)

| Senaryo | Davranış |
|---------|---------|
| Create, API down | Hata mesajı: "Bağlantı yok, lütfen tekrar deneyin" |
| Update, API down | Hata mesajı + form açık kalır |
| Delete, API down | Hata mesajı; öğe listede kalır |
| Toggle, API down | Optimistic geri alınır; hata mesajı |

### Hata Mesajları (Kullanıcı Arayüzü)

Teknik hata mesajları (`fetch failed`, `Network request failed`) kullanıcıya gösterilmez. Bunların yerine:

```
Bağlantı sorunu:
  "İnternet bağlantısı yok. Değişiklikler kaydedilemedi."

Genel API hatası:
  "İşlem gerçekleştirilemedi. Lütfen tekrar deneyin."

Offline liste görüntüleme:
  (isteğe bağlı, mevcut önbellek gösteriliyorken)
  Küçük bilgi çubuğu: "Çevrimdışısınız — son güncelleme gösteriliyor"
```

### Bağlantı Algılama

Faz 1'de özel bir bağlantı algılama (`NetInfo`) mekanizması eklenmez. Fallback mantığı yalnızca `fetch()` hatasından türetilir:

- `fetch()` başarısız → offline veya API down varsayılır
- Faz 2'de `@react-native-community/netinfo` ile proaktif offline algılama eklenebilir

---

## 9. Riskler ve Dikkat Edilmesi Gerekenler

### 9.1 Stale (Eski) Cache

**Risk:** Kullanıcı başka bir cihazdan veri değiştirirse mobil uygulama eski veriyi gösterebilir.

**Faz 1 tutumu:** Kabul edilebilir risk. Uygulama her ekrana geçişte (`useFocusEffect`) API'den taze veri çekmeye çalışır. Online olduğu sürece cache sürekli güncellenir.

**Faz 2:** Multi-device senkronizasyon için `updatedAt` karşılaştırması veya server-sent events değerlendirilebilir.

---

### 9.2 Cache Tutarsızlığı

**Risk:** API başarılı yanıt verdi ama cache yazımı başarısız oldu → state ile cache uyumsuz.

**Çözüm:** Cache yazma hatası sessizce loglanır; uygulama devam eder. Ekran bir sonraki açılışında API'den taze veri çekerek cache'i yeniler. Kalıcı tutarsızlık oluşmaz.

---

### 9.3 AsyncStorage Boyut Limiti

**Risk:** Bazı platformlarda AsyncStorage boyut kısıtı vardır (iOS'ta ~6 MB varsayılan).

**Faz 1 tutumu:** Todo verisi metin tabanlı ve küçük. Binlerce todo olmadıkça sorun çıkmaz. İzleme eklenmeyecek.

---

### 9.4 İlk Yükleme Yanıp Sönmesi (Flash)

**Risk:** Cache'ten gelen veri ekranda hızlıca görünüp API yanıtıyla değişirse kullanıcı görsel titreme yaşayabilir.

**Çözüm:** API yanıtı cache'le aynıysa state güncellemesi yapılmaz (`JSON.stringify` karşılaştırması). Farklıysa liste güncellenir — bu bir UX iyileştirmesi olarak kabul edilir, sorun değil.

---

### 9.5 Faz 2 İçin Bırakılan Konular

Bu dokümanda bilinçli olarak ele alınmayan konular:

| Konu | Neden Faz 2? |
|------|-------------|
| Offline yazma kuyruğu (pending queue) | Karmaşık senkronizasyon mantığı gerektirir |
| Conflict resolution | Sunucu otoritesi mi, istemci mi? Karar gerektiriyor |
| `NetInfo` ile proaktif offline algılama | İsteğe bağlı UX iyileştirmesi |
| Cache şifreleme | Todo için gerekli değil |
| Cache TTL / geçerlilik süresi | Ek karmaşıklık; önce olmadan test et |
| Multi-device senkronizasyon | Backend değişikliği gerektirir |

---

## Özet: Değişim Haritası

```
DEĞİŞMEZ                          YENİ / GÜNCELLENIR
───────────────────────────────   ───────────────────────────────────────
Backend API sözleşmesi            mobile/src/services/cache/
todosApi.ts                         todosCacheService.ts       (yeni)
Todo tipi                           cacheKeys.ts               (yeni)
Navigation yapısı
TodoFormScreen (çoğunlukla)       TodoListScreen.tsx           (güncellenir)
TaskDetailScreen (çoğunlukla)     TodoFormScreen.tsx           (küçük güncelleme)
                                  TaskDetailScreen.tsx         (küçük güncelleme)
                                  package.json                 (yeni paket)
```

**Yeni paket:** `@react-native-async-storage/async-storage`
**Backend değişikliği:** Sıfır
**Yeni dosya sayısı:** 2 (`todosCacheService.ts`, `cacheKeys.ts`)
**Güncellenen ekran sayısı:** 3 (servis katmanı değişir; UI mantığı büyük ölçüde korunur)
