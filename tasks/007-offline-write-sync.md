# Sprint 007 — Offline Write + Sync Queue

**Kaynak:** `docs/offline-write-sync-architecture.md`
**Hedef:** Create / Update / Delete / Toggle / Pin işlemlerini offline ortamda kuyruğa alıp bağlantı geldiğinde otomatik senkronize etmek.
**Kural:** Uygulama her ticket sonrasında çalışır durumda kalır. Kademeli geçiş; büyük bang yok.

---

## Ticket Listesi

| Ticket | Başlık | Owner | Durum |
|--------|--------|-------|-------|
| OWS-001 | TanStack Query paket kurulumu | Frontend Dev | Bekliyor |
| OWS-002 | QueryClient + queryKeys + NetworkSync altyapısı | Frontend Dev | Bekliyor |
| OWS-003 | AsyncStorage persister + PersistQueryClientProvider | Frontend Dev | Bekliyor |
| OWS-004 | useTodos query hook | Frontend Dev | Bekliyor |
| OWS-005 | TodoListScreen — okuma akışını useTodos'a taşı | Frontend Dev | Bekliyor |
| OWS-006 | localId utility + useCreateTodo mutation | Frontend Dev | Bekliyor |
| OWS-007 | useUpdateTodo mutation + TodoFormScreen güncelleme | Frontend Dev | Bekliyor |
| OWS-008 | useDeleteTodo + useToggleTodo + usePinTodo mutation'ları | Frontend Dev | Bekliyor |
| OWS-009 | Ekran yazma akışlarını mutation hook'larına taşı + eski cache servisini kaldır | Frontend Dev | Bekliyor |
| OWS-010 | Geçici todo UI koruması + sync bekleyen durum göstergesi | Frontend Dev | Bekliyor |
| OWS-011 | Test ve doğrulama | Tester / QA | Bekliyor |

---

## OWS-001 — TanStack Query Paket Kurulumu

**Owner:** Frontend Developer
**Amaç:** Offline write altyapısının gerektirdiği dört paketi projeye eklemek. Mevcut kod değişmez; yalnızca `package.json` ve `node_modules` güncellenir.

**Dokunulacak dosyalar:**
- `mobile/package.json` ← dört yeni bağımlılık
- `mobile/node_modules/` ← paket indirme sonucu

**Kurulacak paketler:**
- `@tanstack/react-query` — sorgu ve mutasyon yönetimi
- `@tanstack/react-query-persist-client` — PersistQueryClientProvider
- `@tanstack/query-async-storage-persister` — AsyncStorage adaptörü
- `@react-native-community/netinfo` — network durumu izleme

**Kabul kriterleri:**
- [ ] Dört paket `package.json` bağımlılıklarında görünüyor
- [ ] `npm install` (veya kullanılan paket yöneticisi) hatasız tamamlanıyor
- [ ] Mevcut uygulama build alınıyor; çalışma davranışı değişmiyor
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** Yok (ilk adım)

---

## OWS-002 — QueryClient + queryKeys + NetworkSync Altyapısı

**Owner:** Frontend Developer
**Amaç:** TanStack Query'nin merkezi yapılandırma dosyalarını oluşturmak. QueryClient örneği, sorgu/mutasyon varsayılanları, todos query key sabiti ve NetInfo → `onlineManager` köprüsü bu adımda hazırlanır. Henüz hiçbir ekran bu dosyaları kullanmaz.

**Dokunulacak dosyalar:**
- `mobile/src/lib/queryClient.ts` ← yeni dosya; QueryClient tanımı ve varsayılan seçenekler
- `mobile/src/lib/networkSync.ts` ← yeni dosya; NetInfo → onlineManager köprüsü
- `mobile/src/constants/queryKeys.ts` ← yeni dosya; `TODOS_QUERY_KEY` sabiti

**Yapılacaklar:**
- `queryClient.ts`: `networkMode: 'offlineFirst'` queries ve mutations için; `staleTime` 5 dakika; mutation retry 3
- `networkSync.ts`: `NetInfo.addEventListener` → `onlineManager.setEventListener` köprüsü; `setupNetInfoSync()` fonksiyonu export
- `queryKeys.ts`: `TODOS_QUERY_KEY = ['todos']` sabit export

**Kabul kriterleri:**
- [ ] `src/lib/queryClient.ts` oluşturulmuş; `QueryClient` instance export ediliyor
- [ ] `networkMode: 'offlineFirst'` hem queries hem mutations için ayarlı
- [ ] `src/lib/networkSync.ts` oluşturulmuş; `setupNetInfoSync()` export ediliyor
- [ ] `src/constants/queryKeys.ts` oluşturulmuş; `TODOS_QUERY_KEY` export ediliyor
- [ ] Mevcut hiçbir dosya değiştirilmemiş; uygulama Phase 1 davranışıyla çalışmaya devam ediyor
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-001

---

## OWS-003 — AsyncStorage Persister + PersistQueryClientProvider

**Owner:** Frontend Developer
**Amaç:** Query cache'ini AsyncStorage'a yazan persister'ı oluşturmak ve `App.tsx`'te `QueryClientProvider`'ı `PersistQueryClientProvider` ile değiştirmek. Bu adımdan itibaren uygulama kapanıp açılsa bile query cache korunur.

**Dokunulacak dosyalar:**
- `mobile/src/lib/persister.ts` ← yeni dosya; `asyncStoragePersister` tanımı
- `mobile/App.tsx` ← `PersistQueryClientProvider` ile sarılır; `setupNetInfoSync()` çağrısı eklenir

**Yapılacaklar:**
- `persister.ts`: `createAsyncStoragePersister` ile persister oluştur; key `'RQ_TODOS_CACHE'`; throttle 1000 ms
- `App.tsx`: En dışa `PersistQueryClientProvider` ekle; `client={queryClient}`, `persistOptions={{ persister: asyncStoragePersister }}`; uygulama başlangıcında `setupNetInfoSync()` çağır

**Kabul kriterleri:**
- [ ] `src/lib/persister.ts` oluşturulmuş; `asyncStoragePersister` export ediliyor
- [ ] `App.tsx` `PersistQueryClientProvider` ile sarılmış; `queryClient` ve `persister` bağlı
- [ ] `setupNetInfoSync()` uygulama başlarken çalışıyor
- [ ] Uygulama kapatılıp açıldığında AsyncStorage'da `RQ_TODOS_CACHE` anahtarı oluşuyor (manuel doğrulama)
- [ ] Mevcut navigasyon ve ekranlar değişmeden çalışıyor
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-002

---

## OWS-004 — useTodos Query Hook

**Owner:** Frontend Developer
**Amaç:** Todos listesini `useQuery` üzerinden okuyan `useTodos` hook'unu oluşturmak. Bu adımda hiçbir ekran henüz bu hook'u kullanmaz; hook izole olarak test edilebilir durumda olur.

**Dokunulacak dosyalar:**
- `mobile/src/hooks/useTodos.ts` ← yeni dosya

**Yapılacaklar:**
- `useQuery` ile `TODOS_QUERY_KEY` ve `getTodos` bağlanır
- `staleTime: 5 * 60 * 1000` ayarlı
- Hook `{ data, isLoading, isError, error, refetch }` döndürür

**Kabul kriterleri:**
- [ ] `src/hooks/useTodos.ts` oluşturulmuş; `useTodos()` export ediliyor
- [ ] `queryFn: getTodos` ve `queryKey: TODOS_QUERY_KEY` bağlı
- [ ] Hook imzası ekranların mevcut `loading`, `error`, `todos` state yapısıyla uyumlu çıktı sağlıyor
- [ ] Mevcut hiçbir ekrana dokunulmamış
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-003

---

## OWS-005 — TodoListScreen: Okuma Akışını useTodos'a Taşı

**Owner:** Frontend Developer
**Amaç:** `TodoListScreen`'in okuma (read) akışını `useTodos` hook'una geçirmek. `useState(todos)`, `setLoading`, `setRefreshing`, `getCachedTodos` çağrıları kaldırılır; yerini `useQuery`'den gelen `data`, `isLoading`, `isFetching` alır. Yazma akışları (toggle, delete, pin) bu adımda değişmez; API doğrudan çağrılmaya devam eder, fakat `setCachedTodos` yerine `queryClient.invalidateQueries` kullanılır.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TodoListScreen.tsx`

**Yapılacaklar:**
- `useTodos()` hook'u ile todo listesi oku; `isLoading` ve `isFetching` ile spinner/RefreshControl yönet
- `handleToggle`, `handlePin`, `handleDeleteConfirm`: başarı sonrasında `setCachedTodos` yerine `queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY })` çağır
- `getCachedTodos` ve `setCachedTodos` import'ları bu dosyadan kaldırılır
- `useFocusEffect` + `load` fonksiyonu kaldırılır; `useQuery` yeniden odaklanmayı zaten yönetir (`refetchOnWindowFocus`)

**Kabul kriterleri:**
- [ ] `getCachedTodos` / `setCachedTodos` / `load` fonksiyonu `TodoListScreen.tsx`'ten tamamen kaldırılmış
- [ ] Liste açıldığında `useTodos()` ile veri geliyor; loading spinner çalışıyor
- [ ] Pull-to-refresh `refetch()` çağırıyor
- [ ] Toggle, delete, pin işlemleri hâlâ çalışıyor; sonrasında `invalidateQueries` tetikleniyor ve liste güncelleniyor
- [ ] Search bar filtreleme bozulmamış
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-004

---

## OWS-006 — localId Utility + useCreateTodo Mutation

**Owner:** Frontend Developer
**Amaç:** Offline create için geçici id üretecini oluşturmak ve `useCreateTodo` optimistic mutation hook'unu yazmak. `onMutate` → optimistic ekleme, `onError` → rollback, `onSettled` → invalidateQueries döngüsü kurulur.

**Dokunulacak dosyalar:**
- `mobile/src/utils/localId.ts` ← yeni dosya; `generateLocalId()` ve `isLocalId()` fonksiyonları
- `mobile/src/hooks/mutations/useCreateTodo.ts` ← yeni dosya

**Yapılacaklar:**
- `localId.ts`: `'local_'` prefix'li UUID üretir; `isLocalId(id)` prefix kontrolü yapar. UUID için `Math.random()` tabanlı basit bir üretici veya `expo-crypto` kullanılabilir; harici bağımlılık minimumda tutulur
- `useCreateTodo.ts`: `onMutate` → `cancelQueries` → snapshot → geçici todo cache'e eklenir (başına); `onError` → snapshot'a rollback; `onSettled` → `invalidateQueries`

**Kabul kriterleri:**
- [ ] `src/utils/localId.ts` oluşturulmuş; `generateLocalId()` ve `isLocalId()` export ediliyor
- [ ] `src/hooks/mutations/useCreateTodo.ts` oluşturulmuş; `useCreateTodo()` export ediliyor
- [ ] `onMutate` çalıştığında liste hemen geçici todo ile güncelleniyor (optimistic)
- [ ] Online başarı: `onSettled` ile liste backend'den yenileniyor; geçici id yerini gerçek id'ye bırakıyor
- [ ] Online hata: `onError` ile liste rollback'e dönüyor
- [ ] Offline: mutasyon `paused` kuyruğuna alınıyor; bağlantı gelince otomatik gönderiliyor (manuel doğrulama)
- [ ] Hiçbir ekran henüz bu hook'u kullanmıyor; yalnızca dosya oluşturuldu
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-005

---

## OWS-007 — useUpdateTodo Mutation + TodoFormScreen Güncelleme

**Owner:** Frontend Developer
**Amaç:** `useUpdateTodo` optimistic mutation hook'unu oluşturmak ve `TodoFormScreen`'i hem create hem update için yeni hook'larla güncellemek. Bu adımdan itibaren form işlemleri offline kuyruğa alınabilir hale gelir.

**Dokunulacak dosyalar:**
- `mobile/src/hooks/mutations/useUpdateTodo.ts` ← yeni dosya
- `mobile/src/screens/TodoFormScreen.tsx` ← `useCreateTodo` ve `useUpdateTodo` hook'larına geçiş

**Yapılacaklar:**
- `useUpdateTodo.ts`: `onMutate` → mevcut listedeki todo'yu güncellenmiş versiyonla değiştir (optimistic); `onError` → rollback; `onSettled` → `invalidateQueries`
- `TodoFormScreen.tsx`: `handleSave` içindeki `createTodo(...)` + `getCachedTodos` + `setCachedTodos` akışı `useCreateTodo().mutateAsync(...)` ile; `updateTodo(...)` akışı `useUpdateTodo().mutateAsync(...)` ile değiştirilir. `saving` state, mutation'ın `isPending` değerinden okunur.

**Kabul kriterleri:**
- [ ] `useUpdateTodo.ts` oluşturulmuş; optimistic update döngüsü tam
- [ ] `TodoFormScreen.tsx`'te `getCachedTodos` / `setCachedTodos` kalmamış
- [ ] Create: form kaydedilince geçici todo liste başına ekleniyor; API başarılı olunca gerçek todo gelir
- [ ] Update: form kaydedilince liste anında güncelleniyor; API başarılı olunca doğrulanır
- [ ] Offline create/update: mutasyon kuyruğa alınıyor; bağlantı gelince senkronize oluyor (manuel doğrulama)
- [ ] `saving` göstergesi ve `navigation.goBack()` akışı bozulmamış
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-006

---

## OWS-008 — useDeleteTodo + useToggleTodo + usePinTodo Mutation'ları

**Owner:** Frontend Developer
**Amaç:** Kalan üç yazma işlemi için optimistic mutation hook'larını oluşturmak. Ekran geçişleri bir sonraki ticket'ta yapılır; bu adımda yalnızca hook dosyaları üretilir.

**Dokunulacak dosyalar:**
- `mobile/src/hooks/mutations/useDeleteTodo.ts` ← yeni dosya
- `mobile/src/hooks/mutations/useToggleTodo.ts` ← yeni dosya
- `mobile/src/hooks/mutations/usePinTodo.ts` ← yeni dosya

**Yapılacaklar:**
- `useDeleteTodo.ts`: `onMutate` → todo'yu listeden çıkar (optimistic); `onError` → rollback; `onSettled` → `invalidateQueries`
- `useToggleTodo.ts`: `onMutate` → `isCompleted` değerini tersine çevir (optimistic); `onError` → rollback; `onSettled` → `invalidateQueries`
- `usePinTodo.ts`: `onMutate` → `isPinned` değerini tersine çevir (optimistic); `onError` → rollback; `onSettled` → `invalidateQueries`

**Kabul kriterleri:**
- [ ] Üç hook dosyası oluşturulmuş; her biri export ediliyor
- [ ] Her hook'ta `onMutate` snapshot alıyor ve optimistic güncelleme yapıyor
- [ ] Her hook'ta `onError` rollback yapıyor
- [ ] Her hook'ta `onSettled` invalidateQueries çağırıyor
- [ ] Hiçbir ekran henüz bu hook'ları kullanmıyor
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-007

---

## OWS-009 — Ekran Yazma Akışlarını Mutation Hook'larına Taşı + Eski Cache Servisini Kaldır

**Owner:** Frontend Developer
**Amaç:** `TodoListScreen` ve `TaskDetailScreen`'deki doğrudan API çağrılarını ve `getCachedTodos` / `setCachedTodos` kullanımlarını ilgili mutation hook'larıyla değiştirmek. Tüm ekranlar güncellendikten sonra `todosCacheService.ts` ve `cacheKeys.ts` kaldırılır.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TodoListScreen.tsx` ← `handleToggle`, `handlePin`, `handleDeleteConfirm` → mutation hook'larına geçiş
- `mobile/src/screens/TaskDetailScreen.tsx` ← `handleToggle`, `handlePin`, `handleDeleteConfirm` → mutation hook'larına geçiş
- `mobile/src/services/cache/todosCacheService.ts` ← siliniyor
- `mobile/src/services/cache/cacheKeys.ts` ← siliniyor
- `mobile/src/services/cache/storage.ts` ← siliniyor (hiçbir referans kalmazsa)

**Yapılacaklar:**
- `TodoListScreen.tsx`: `handleToggle` → `useToggleTodo`, `handlePin` → `usePinTodo`, `handleDeleteConfirm` → `useDeleteTodo`; busy state → mutation'ların `isPending` değerinden okunur; `getBusyIds` / `setBusy` kaldırılır
- `TaskDetailScreen.tsx`: `handleToggle` → `useToggleTodo`, `handlePin` → `usePinTodo`, `handleDeleteConfirm` → `useDeleteTodo`; `toggling` / `pinning` / `deleting` state'ler kaldırılır
- `todosCacheService.ts`, `cacheKeys.ts`, `storage.ts` dosyalarına artık hiçbir import kalmayınca silinir
- `friendlyErrorMessage` fonksiyonu `todosCacheService.ts`'ten ayrı bir utility dosyasına taşınır (ya da TanStack Query'nin hata nesneleri direkt kullanılır)

**Kabul kriterleri:**
- [ ] `getCachedTodos` / `setCachedTodos` hiçbir ekranda ve hook'ta kalmamış
- [ ] `todosCacheService.ts`, `cacheKeys.ts`, `storage.ts` dosyaları kaldırılmış (veya `storage.ts` başka bir yerde kullanılıyorsa korunuyor)
- [ ] Toggle, delete, pin işlemleri her üç ekranda da çalışıyor
- [ ] Offline senaryoda toggle / delete / pin paused kuyruğa alınıyor; bağlantı gelince sync oluyor (manuel doğrulama)
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-008

---

## OWS-010 — Geçici Todo UI Koruması + Sync Bekleyen Durum Göstergesi

**Owner:** Frontend Developer
**Amaç:** `isLocalId()` ile geçici id taşıyan todo'ların liste kartında edit / delete / toggle / pin butonlarını devre dışı bırakmak. Kart üzerinde "kaydediliyor" durumunu görsel olarak belirtmek.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TodoListScreen.tsx` ← `isLocalId` kontrolü; kart görünümünde pending göstergesi
- `mobile/src/screens/TaskDetailScreen.tsx` ← `isLocalId` kontrolü; aksiyon butonları devre dışı

**Yapılacaklar:**
- `TodoItem` bileşenine `isPending` prop'u ekle: `isLocalId(todo.id)` ise true
- `isPending` true iken toggle / pin / edit / delete butonları `disabled`
- Kart veya buton bölgesinde küçük bir görsel işaret: spinner veya soluk renk yeterli
- `TaskDetailScreen`'de `isLocalId(todo.id)` ise tüm aksiyon butonları `disabled`; başlık altında "Sunucuya kaydediliyor…" notu

**Kabul kriterleri:**
- [ ] Geçici id'li todo'da liste kartındaki aksiyon butonları devre dışı
- [ ] Geçici id'li todo'nun detay ekranındaki aksiyon butonları devre dışı
- [ ] Pending görsel göstergesi kart üzerinde görünüyor
- [ ] Bağlantı gelip sync tamamlandıktan sonra todo gerçek id ile güncelleniyor; butonlar otomatik etkinleşiyor
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** OWS-009

---

## OWS-011 — Test ve Doğrulama

**Owner:** Tester / QA
**Amaç:** Sprint kapanışında tüm offline-write senaryolarını doğrulamak. Mevcut backend entegrasyon testleri geçmeye devam etmeli. Mobile taraf manuel senaryo listesi ile doğrulanır.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api.Tests/TodoApiIntegrationTests.cs` ← yalnızca gerekirse; Phase 2 backend değişikliği yok
- `mobile/` ← kod değişikliği yok; manuel test

**Manuel test senaryoları:**

1. **Online create:** Form doldurup kaydet → todo liste başına ekleniyor; gerçek id ile geliyor
2. **Offline create:** Uçak modu → form doldurup kaydet → geçici todo listede görünüyor; butonlar disabled; uçak modu kapat → otomatik sync → gerçek id geliyor; butonlar aktifleşiyor
3. **Offline update:** Uçak modu → var olan todo'yu düzenle → ekranda güncelleme görünüyor; uçak modu kapat → sync
4. **Offline delete:** Uçak modu → todo sil → listeden kalktı; uçak modu kapat → sync
5. **Offline toggle:** Uçak modu → toggle → ekranda anlık değişiyor; uçak modu kapat → sync
6. **Offline pin:** Uçak modu → pin → ekranda anlık değişiyor; uçak modu kapat → sync
7. **Birden fazla offline işlem:** Uçak modu → 3 farklı todo oluştur → bağlantı ver → hepsi sırayla sync oluyor
8. **Uygulama kapanıp açılma (offline):** Uçak modunda birkaç işlem yap → uygulamayı kapat → aç → cache restore; paused mutasyonlar hâlâ kuyruğumda → bağlantı ver → sync
9. **Rollback (hata):** Geçersiz bir işlemi simüle et (sunucu 400 döndürsün) → optimistic güncelleme geri alınıyor; liste eski haline döndü; hata mesajı görünüyor
10. **Mevcut CRUD akışı:** Phase 1 senaryoları (create, update, delete, toggle, pin, search) hepsi hâlâ çalışıyor

**Otomatik doğrulama:**
- `dotnet test backend/TodoApp.Api.Tests` → 12 test geçiyor (backend değişikliği yok)
- `npx tsc --noEmit` → sıfır hata

**Kabul kriterleri özeti:**
- [ ] 10 manuel senaryo başarıyla tamamlandı
- [ ] `dotnet test` → 12 geçen test
- [ ] `npx tsc --noEmit` → sıfır hata
- [ ] Phase 1'den gelen hiçbir işlevsellik kaybolmadı

**Bağımlılıklar:** OWS-001 → OWS-010 (tüm ticket'lar tamamlanmış olmalı)

---

## Bağımlılık Grafiği

```
OWS-001 (Paket kurulumu)
    │
    └─── OWS-002 (QueryClient + queryKeys + NetworkSync)
              │
              └─── OWS-003 (Persister + PersistQueryClientProvider)
                        │
                        └─── OWS-004 (useTodos hook)
                                  │
                                  └─── OWS-005 (TodoListScreen okuma)
                                            │
                                            └─── OWS-006 (localId + useCreateTodo)
                                                      │
                                                      └─── OWS-007 (useUpdateTodo + TodoFormScreen)
                                                                │
                                                                └─── OWS-008 (useDeleteTodo + useToggleTodo + usePinTodo)
                                                                          │
                                                                          └─── OWS-009 (Ekran geçişleri + cache servisi kaldır)
                                                                                    │
                                                                                    └─── OWS-010 (Pending UI)
                                                                                              │
                                                                                              └─── OWS-011 (Doğrulama)
```

---

## Değişmeyecek Dosyalar

| Dosya | Neden |
|-------|-------|
| `backend/` (tüm dosyalar) | Phase 2'de backend API değişmiyor |
| `mobile/src/services/api/todosApi.ts` | Mutation hook'ları bu fonksiyonları çağırır; API katmanı değişmez |
| `mobile/src/types/todo.ts` | Tip tanımları değişmez |
| `mobile/src/navigation/` | Route yapısı değişmez |
| `mobile/src/components/` | Mevcut bileşenler korunur |
| `mobile/src/theme/tokens.ts` | Token'lar değişmez |
| `mobile/src/screens/*.tsx` (UI yapısı) | Ekranların görsel düzeni korunur; yalnızca state kaynağı değişir |

---

## Phase 3'e Ertelenen Konular

| Konu | Gerekçe |
|------|---------|
| Conflict resolution | Sunucu taraflı versiyon / timestamp altyapısı gerektirir |
| Background sync | Expo Background Fetch ayrı sprint |
| Offline banner UI | UX iyileştirmesi; ayrı ticket |
| Mutasyon kuyruğu görselleştirmesi | UX iyileştirmesi |
| Multi-device sync | Farklı altyapı |
