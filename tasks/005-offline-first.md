# Sprint 005 — Offline-First: AsyncStorage Cache Katmanı

**Kaynak:** `docs/offline-first-architecture.md`
**Hedef:** Todo listesini AsyncStorage'a önbelleğe alarak ağ bağlantısı olmadan da görüntülenebilir hale getirmek.
**Kural:** `todosApi.ts` ve backend API sözleşmesi değişmez. Frontend UI davranışı bozulmaz. Faz 1 kapsamında conflict resolution, pending queue ve NetInfo eklenmez.

---

## Ticket Listesi

| Ticket | Başlık | Owner | Durum |
|--------|--------|-------|-------|
| OFFLINE-001 | Cache anahtar sabitleri | Frontend Dev | Bekliyor |
| OFFLINE-002 | AsyncStorage paketi kurulumu | Frontend Dev | Bekliyor |
| OFFLINE-003 | todosCacheService — okuma (read) | Frontend Dev | Bekliyor |
| OFFLINE-004 | TodoListScreen — Stale-While-Revalidate akışı | Frontend Dev | Bekliyor |
| OFFLINE-005 | todosCacheService — yazma (write-through) | Frontend Dev | Bekliyor |
| OFFLINE-006 | TodoFormScreen ve TaskDetailScreen — cache geçişi | Frontend Dev | Bekliyor |
| OFFLINE-007 | Hata ve fallback davranışları | Frontend Dev | Bekliyor |
| OFFLINE-008 | Manuel uçtan uca doğrulama | Tester | Bekliyor |

---

## OFFLINE-001 — Cache Anahtar Sabitleri

**Owner:** Frontend Developer
**Amaç:** AsyncStorage'da kullanılacak anahtar string'lerini tek bir dosyada tanımlamak. Dağınık string literal kullanımını önlemek; bir anahtar değişirse tek yerden düzeltmek.

**Dokunulacak dosyalar:**
- `mobile/src/services/cache/cacheKeys.ts` ← yeni dosya, yeni klasör

**Yapılacaklar:**
- `mobile/src/services/cache/` klasörü oluştur
- `cacheKeys.ts` içinde aşağıdaki sabiti dışa aktar:
  ```
  TODOS_CACHE_KEY = "todos_cache"
  ```
- Başka dosyaya dokunma

**Kabul kriterleri:**
- [ ] `mobile/src/services/cache/cacheKeys.ts` dosyası oluşturulmuş
- [ ] `TODOS_CACHE_KEY` adında bir sabit dışa aktarılmış
- [ ] Değeri `"todos_cache"` olan bir `string` sabiti
- [ ] `npx tsc --noEmit` (veya `expo` build) hatasız geçiyor
- [ ] `todosApi.ts` dosyasına dokunulmamış

**Bağımlılıklar:** Yok (ilk adım)

---

## OFFLINE-002 — AsyncStorage Paketi Kurulumu

**Owner:** Frontend Developer
**Amaç:** `@react-native-async-storage/async-storage` paketini Expo uyumlu şekilde projeye eklemek. Paketi doğrulayarak import edilebilir hale getirmek.

**Dokunulacak dosyalar:**
- `mobile/package.json` ← paket eklenir
- `mobile/package-lock.json` veya `mobile/yarn.lock` ← araç tarafından güncellenir

**Yapılacaklar:**
- `mobile/` dizininde şu komutla paketi kur:
  ```
  npx expo install @react-native-async-storage/async-storage
  ```
- `npx expo install` tercih edilir; Expo'nun uyumlu sürümü otomatik seçmesi sağlanır
- Kurulum sonrası `import AsyncStorage from '@react-native-async-storage/async-storage'` satırı TypeScript hatasız çalışmalı

**Kabul kriterleri:**
- [ ] `mobile/package.json` içinde `@react-native-async-storage/async-storage` bağımlılığı görünüyor
- [ ] `node_modules/@react-native-async-storage/` klasörü mevcut
- [ ] `import AsyncStorage from '@react-native-async-storage/async-storage'` satırı TypeScript hatasız
- [ ] `npx expo start` komutu hatasız başlıyor
- [ ] `todosApi.ts` ve mevcut ekranlar değişmemiş

**Bağımlılıklar:** Yok (OFFLINE-001 ile paralel yapılabilir)

---

## OFFLINE-003 — todosCacheService: Okuma Fonksiyonu

**Owner:** Frontend Developer
**Amaç:** AsyncStorage üzerinde okuma sorumluluğunu üstlenen servis dosyasını oluşturmak. Sadece `getCachedTodos()` ve `saveTodosToCache()` fonksiyonlarını içerecek. Yazma (API mutasyon) entegrasyonu bir sonraki ticket'ta yapılacak.

**Dokunulacak dosyalar:**
- `mobile/src/services/cache/todosCacheService.ts` ← yeni dosya

**Yapılacaklar:**
- Aşağıdaki fonksiyonları implement et:

```
getCachedTodos() → Todo[] | null
  1. AsyncStorage.getItem(TODOS_CACHE_KEY) çağır
  2. Değer null ise null döndür
  3. JSON.parse ile Todo[] dizisine çevir
  4. Hata oluşursa null döndür (cache yokmuş gibi davran)

saveTodosToCache(todos: Todo[]) → void
  1. JSON.stringify ile string'e çevir
  2. AsyncStorage.setItem(TODOS_CACHE_KEY, jsonStr) çağır
  3. Hata oluşursa sessizce logla (console.warn); yukarı fırlatma
```

- `todosApi.ts` bu dosyada import edilmez (sadece cache işlemleri)

**Kabul kriterleri:**
- [ ] `todosCacheService.ts` dosyası oluşturulmuş
- [ ] `getCachedTodos()` fonksiyonu: null veya `Todo[]` döndürüyor
- [ ] `saveTodosToCache()` fonksiyonu: cache yazma hatası uygulamayı crashlemiyor
- [ ] `TODOS_CACHE_KEY` sabiti `cacheKeys.ts`'ten import ediliyor (string literal değil)
- [ ] `todosApi.ts`'e herhangi bir import eklenmemiş
- [ ] TypeScript hata yok

**Bağımlılıklar:** OFFLINE-001, OFFLINE-002

---

## OFFLINE-004 — TodoListScreen: Stale-While-Revalidate Akışı

**Owner:** Frontend Developer
**Amaç:** `TodoListScreen`'deki `load()` fonksiyonunu Stale-While-Revalidate akışına geçirmek. Cache varsa anında göster, arka planda API'den taze veri çek. UI davranışı (spinner, hata ekranı, refresh control) korunur.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TodoListScreen.tsx`

**Yapılacaklar:**

Mevcut `load()` fonksiyonu şu mantıkla güncellenir:

```
load(isRefresh):
  1. Cache'i oku (getCachedTodos)
  2. Cache varsa:
     a. setTodos(cachedData) → ekran anında render edilir
     b. setLoading(false) → spinner kaldırılır
     c. Arka planda API çağrısı yap (await getTodos())
        - Başarılı: setTodos(fresh) + saveTodosToCache(fresh)
        - Başarısız: sessizce devam et (cache'deki veri görünür kalır)
  3. Cache yoksa:
     a. Spinner göster (setLoading(true)) — mevcut davranış
     b. API çağrısı yap
        - Başarılı: setTodos(data) + saveTodosToCache(data) + setLoading(false)
        - Başarısız: setError(mesaj) + setLoading(false)
```

- `isRefresh = true` ile `RefreshControl` tetiklenirse: önce cache göster (hızlı yanıt), sonra arka planda yenile
- `handleToggle` içindeki optimistik güncelleme değişmez
- Import listesine `getCachedTodos` ve `saveTodosToCache` eklenir; `getTodos` import'u korunur

**Kabul kriterleri:**
- [ ] Cache varken `TodoListScreen` açılır açılmaz spinner göstermeden listeyi gösteriyor
- [ ] Cache varken API başarısız olursa liste ekranı hata göstermiyor (cache korunuyor)
- [ ] Cache yokken API başarısız olursa hata ekranı + "Tekrar Dene" görünüyor (mevcut davranış)
- [ ] Başarılı API yanıtı cache'e kaydediliyor (sonraki açılışta görünür)
- [ ] Toggle, delete, arama, RefreshControl davranışları değişmemiş
- [ ] TypeScript hata yok

**Bağımlılıklar:** OFFLINE-003

---

## OFFLINE-005 — todosCacheService: Yazma Fonksiyonları

**Owner:** Frontend Developer
**Amaç:** Create, update, delete ve toggle işlemlerinde cache'i API yanıtıyla güncel tutacak yardımcı fonksiyonları eklemek. Yazma işlemleri API önce; cache yalnızca API başarılıysa güncellenir.

**Dokunulacak dosyalar:**
- `mobile/src/services/cache/todosCacheService.ts`

**Yapılacaklar:**

Aşağıdaki fonksiyonları mevcut dosyaya ekle:

```
addTodoToCache(newTodo: Todo) → void
  1. getCachedTodos() → mevcut listeyi oku
  2. Null ise erken çık (cache yoksa listeye ekleme; bir sonraki getTodos cache'i dolduracak)
  3. Yeni todo'yu listenin başına ekle (createTodo API'si en güncel todo'yu döndürür)
  4. saveTodosToCache(güncellenmiş liste)

updateTodoInCache(updatedTodo: Todo) → void
  1. getCachedTodos() → mevcut listeyi oku
  2. Null ise erken çık
  3. İlgili öğeyi updatedTodo ile değiştir (id eşleşmesine göre)
  4. saveTodosToCache(güncellenmiş liste)

removeTodoFromCache(id: string) → void
  1. getCachedTodos() → mevcut listeyi oku
  2. Null ise erken çık
  3. id'si eşleşen öğeyi filtrele
  4. saveTodosToCache(kalan liste)
```

- Toggle için ayrı fonksiyon gerekmiyor: API yanıtı (`Todo`) gelince `updateTodoInCache` kullanılır
- Bu fonksiyonlar `todosApi.ts` çağrısı yapmaz; sadece cache üzerinde çalışır

**Kabul kriterleri:**
- [ ] `addTodoToCache`, `updateTodoInCache`, `removeTodoFromCache` fonksiyonları `todosCacheService.ts`'e eklenmiş
- [ ] Her fonksiyon cache yoksa (null) erken çıkıyor ve hata fırlatmıyor
- [ ] Her fonksiyon iç hata için `saveTodosToCache` hatalarını sessizce logluyor
- [ ] `todosApi.ts` bu dosyadan import edilmiyor
- [ ] TypeScript hata yok

**Bağımlılıklar:** OFFLINE-003

---

## OFFLINE-006 — TodoFormScreen ve TaskDetailScreen: Cache Geçişi

**Owner:** Frontend Developer
**Amaç:** Create/Update/Delete işlemlerini yapan ekranların başarılı API yanıtında cache'i de güncellemesini sağlamak. UI akışı değişmez; sadece servis çağrılarına cache güncelleme adımı eklenir.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TodoFormScreen.tsx`
- `mobile/src/screens/TaskDetailScreen.tsx`

**Yapılacaklar:**

**TodoFormScreen:**
- `handleSubmit` içinde:
  - `createTodo(...)` başarılıysa → `addTodoToCache(yeniTodo)` çağır; sonra navigate
  - `updateTodo(...)` başarılıysa → `updateTodoInCache(güncelTodo)` çağır; sonra navigate
  - API hatası: mevcut davranış (Alert.alert) değişmez; cache'e dokunma

**TaskDetailScreen:**
- Delete işlemi başarılıysa → `removeTodoFromCache(id)` çağır; sonra navigate
- Toggle işlemi başarılıysa → `updateTodoInCache(güncelTodo)` çağır; state güncelleme mevcut kalır
- API hatası: mevcut davranış değişmez; cache'e dokunma

**Önemli:** Her iki ekranda da hata durumunda cache mutlaka dokunulmadan bırakılır.

**Kabul kriterleri:**
- [ ] `TodoFormScreen` — create başarılıysa yeni todo cache'e ekleniyor
- [ ] `TodoFormScreen` — update başarılıysa cache'teki öğe güncelleniyor
- [ ] `TaskDetailScreen` — delete başarılıysa cache'ten öğe kaldırılıyor
- [ ] `TaskDetailScreen` — toggle başarılıysa cache'teki öğe güncelleniyor
- [ ] API hataları mevcut Alert.alert davranışıyla işleniyor; cache değişmiyor
- [ ] Form navigasyonu (back, save) değişmemiş
- [ ] TypeScript hata yok

**Bağımlılıklar:** OFFLINE-004, OFFLINE-005

---

## OFFLINE-007 — Hata ve Fallback Davranışları

**Owner:** Frontend Developer
**Amaç:** Kullanıcıya gösterilen hata mesajlarını teknik detaylardan soyutlamak. Ağ hatalarını anlaşılır Türkçe mesajlara dönüştürmek. Cache varken API başarısız olduğunda sessiz fallback davranışını doğrulamak.

**Dokunulacak dosyalar:**
- `mobile/src/services/cache/todosCacheService.ts` (isteğe bağlı: hata mesaj yardımcısı)
- `mobile/src/screens/TodoListScreen.tsx`
- `mobile/src/screens/TodoFormScreen.tsx`
- `mobile/src/screens/TaskDetailScreen.tsx`

**Yapılacaklar:**

**Hata mesajı dönüşümü:**

Mevcut ekranlarda `e instanceof Error ? e.message : 'Bilinmeyen hata'` pattern'i kullanılıyor. Ağ hatalarında `e.message` genellikle `"Network request failed"` veya `"fetch failed"` gibi teknik string döndürür. Bu mesajı kullanıcı dostu hale getir:

```
"Network request failed" veya "fetch failed" →
  "İnternet bağlantısı yok. Değişiklikler kaydedilemedi."

Diğer API hataları →
  Mevcut mesaj korunur (API'den gelen başlık/detay zaten Türkçe olabilir)
```

Yardımcı bir `friendlyErrorMessage(e: unknown): string` fonksiyonu `todosCacheService.ts`'e veya ayrı bir util'e eklenebilir; tercih geliştiriciye bırakılmıştır.

**Sessiz fallback kontrolü:**
- `TodoListScreen`'de `load()` içindeki arka plan API hatası (`catch`) kullanıcıya hiçbir şey göstermemeli (cache varsa)
- Cache yoksa API hatası mevcut hata ekranını göstermeli

**Kabul kriterleri:**
- [ ] Ağ bağlantısı yokken liste açılırsa (cache var) hata mesajı görünmüyor; liste gösteriliyor
- [ ] Ağ bağlantısı yokken liste açılırsa (cache yok) "İnternet bağlantısı yok" veya benzeri mesaj görünüyor
- [ ] Create/Update/Delete işlemi ağ yokken başarısız olursa anlaşılır Türkçe hata mesajı gösteriliyor
- [ ] `"Network request failed"`, `"fetch failed"` gibi teknik string'ler kullanıcıya ulaşmıyor
- [ ] Hata durumunda cache tutarsız kalmıyor (dokunulmamış)
- [ ] TypeScript hata yok

**Bağımlılıklar:** OFFLINE-006

---

## OFFLINE-008 — Manuel Uçtan Uca Doğrulama

**Owner:** Tester / QA
**Amaç:** Offline-first davranışını gerçek cihaz/simülatör ortamında uçtan uca doğrulamak. Sprint kapanış kriteri.

**Dokunulacak dosyalar:**
- Yok (sadece test ve gözlem)

**Hazırlık:**
- Backend API çalışır durumda olmalı (`dotnet run`)
- Mobile uygulama simülatörde veya fiziksel cihazda çalışıyor (`npx expo start`)

**Manuel test senaryoları:**

**Senaryo 1 — İlk açılış (cache yok, API up):**
1. Uygulamayı ilk kez aç (veya AsyncStorage'u temizle)
2. Liste ekranı spinner göstermeli → API'den yüklenmeli → liste görünmeli
3. Uygulamayı kapat ve yeniden aç
4. Liste spinner olmadan anında görünmeli (cache'ten)

**Senaryo 2 — Offline liste görüntüleme (cache var, API down):**
1. API'yi durdur (`Ctrl+C`)
2. Uygulamayı aç (veya liste ekranına geç)
3. Önceki yüklemeden kalan todo'lar görünmeli
4. Hata mesajı veya spinner görünmemeli

**Senaryo 3 — Offline yazma (create, API down):**
1. API kapalıyken "Yeni Görev" ekranını aç
2. Başlık gir → Kaydet
3. Hata mesajı görünmeli: "İnternet bağlantısı yok" veya benzeri
4. Liste ekranına dönünce oluşturulmayan todo listede yok

**Senaryo 4 — Online yazma cache güncellemesi:**
1. API'yi başlat
2. Yeni todo oluştur
3. Liste ekranına dön — yeni todo görünüyor
4. API'yi durdur, uygulamayı yeniden başlat
5. Liste açıldığında oluşturulan todo hâlâ görünmeli (cache'ten)

**Senaryo 5 — Toggle offline:**
1. API kapalıyken toggle butonuna bas
2. Optimistik güncelleme anlık gerçekleşmeli
3. Hata mesajı gelmeli; todo eski durumuna dönmeli

**Senaryo 6 — RefreshControl:**
1. API açıkken liste ekranında aşağı çek (pull-to-refresh)
2. Taze veri yüklenmeli ve cache güncellenmeli
3. API kapalıyken aşağı çek
4. Geri döndüren herhangi bir hata mesajı olmaksızın mevcut liste korunmalı

**Otomatik kabul kriterleri:**
- [ ] `npx tsc --noEmit` (mobile dizininde) sıfır TypeScript hatası
- [ ] `npx expo start` hatasız başlıyor

**Manuel kabul kriterleri:**
- [ ] Senaryo 1: İkinci açılışta cache'ten anında yükleme görülüyor
- [ ] Senaryo 2: API down + cache var → liste görünüyor, hata yok
- [ ] Senaryo 3: API down + create → anlaşılır hata mesajı, cache bozulmuyor
- [ ] Senaryo 4: Create sonrası API down + restart → todo hâlâ görünüyor
- [ ] Senaryo 5: Toggle offline → optimistik geri alınıyor, hata mesajı geliyor
- [ ] Senaryo 6: RefreshControl — API down'da liste korunuyor
- [ ] `todosApi.ts` dosyasına hiç dokunulmamış
- [ ] Backend API sözleşmesi değişmemiş

**Bağımlılıklar:** OFFLINE-001 → OFFLINE-007 (tüm ticket'lar tamamlanmış olmalı)

---

## Bağımlılık Grafiği

```
OFFLINE-001 (Cache Keys)    OFFLINE-002 (AsyncStorage Paketi)
        │                              │
        └──────────────┬───────────────┘
                       │
                OFFLINE-003 (Cache Okuma)
                       │
               ┌───────┴────────┐
               │                │
        OFFLINE-004          OFFLINE-005
    (TodoListScreen SWR)  (Cache Yazma Fonk.)
               │                │
               └───────┬────────┘
                       │
                OFFLINE-006 (Form + Detail)
                       │
                OFFLINE-007 (Hata Mesajları)
                       │
                OFFLINE-008 (Doğrulama)
```

---

## Değişmeyecek Dosyalar (Garanti)

Aşağıdaki dosyalara bu sprint boyunca hiç dokunulmaz:

| Dosya | Neden |
|-------|-------|
| `mobile/src/services/api/todosApi.ts` | Cache katmanı altında; API çağrıları aynen korunur |
| `mobile/src/services/api/config.ts` | API base URL değişmiyor |
| `mobile/src/types/todo.ts` | Veri modeli değişmiyor |
| `mobile/src/navigation/` | Route yapısı değişmiyor |
| `mobile/src/components/` | UI bileşenleri değişmiyor |
| `mobile/src/theme/` | Tema değişmiyor |
| `backend/` (tüm backend) | Cache sadece mobil taraf; backend API sözleşmesi değişmez |

---

## Faz 2'ye Ertelenen Konular

Bu sprint bilinçli olarak şu konuları kapsamaz:

| Konu | Neden ertelendi |
|------|----------------|
| Offline yazma kuyruğu (pending queue) | Karmaşık senkronizasyon; çakışma riski |
| Conflict resolution | Sunucu otoritesi vs. istemci kararı belirsiz |
| `@react-native-community/netinfo` entegrasyonu | İsteğe bağlı UX; `fetch` hatasından türetme yeterli |
| Cache TTL / `cached_at` timestamp | Ek karmaşıklık; önce olmadan test et |
| Cache şifreleme | Todo verisi için gerekli değil |
| Multi-device senkronizasyon | Backend değişikliği gerektirir |
