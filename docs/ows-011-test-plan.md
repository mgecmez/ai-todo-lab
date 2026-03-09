# OWS-011 — Test ve Doğrulama Raporu

**Sprint:** 007 — Offline Write + Sync Queue
**Owner:** QA / Test Engineer
**Tarih:** 2026-03-09
**Durum:** Otomatik doğrulama geçti; manuel senaryolar hazır

---

## Otomatik Doğrulama Sonuçları

| Kontrol | Komut | Sonuç |
|---------|-------|-------|
| Backend integration testleri | `dotnet test backend/TodoApp.Api.Tests` | ✅ 12/12 geçti |
| TypeScript tip kontrolü | `npx tsc --noEmit` | ✅ 0 hata |

### Backend Test Detayı (12 test)

| # | Test Adı | Kapsadığı Alan |
|---|----------|----------------|
| 1 | `Health_Returns200_WithStatusOk` | `/health` endpoint sağlık |
| 2 | `CreateTodo_ValidRequest_Returns201WithLocationAndBody` | Create akışı + Location header |
| 3 | `CreateTodo_EmptyTitle_Returns400ProblemDetails` | Validasyon — boş başlık |
| 4 | `GetAllTodos_CreatedTodoExists_InList` | Create → GET liste tutarlılığı |
| 5 | `ToggleTodo_ChangesIsCompleted` | Toggle çift yönlü (false→true→false) |
| 6 | `CreateTodo_WithNewFields_ReturnsPriorityDueDateAndTags` | TM-012: Yeni alan create |
| 7 | `CreateTodo_LegacyFormat_ReturnsDefaults` | TM-012: Geriye dönük uyumluluk |
| 8 | `PinTodo_TogglesIsPinned` | TM-012: Pin toggle çift yönlü |
| 9 | `PinTodo_UnknownId_Returns404` | TM-012: Bilinmeyen id → 404 |
| 10 | `UpdateTodo_WithNewFields_UpdatesCorrectly` | TM-012: Yeni alan update |
| 11 | `GetAllTodos_PinnedTodoAppearsBeforeUnpinned` | TM-012: Pin sıralama önceliği |
| 12 | `CreateTodo_InvalidPriority_Returns400` | TM-012: Priority validasyon |

---

## Manuel Test Senaryoları

> **Ön koşul:** Expo Go veya fiziksel cihaz; backend `http://localhost:5259`'da çalışıyor.
> **Ağ simülasyonu:** iOS Ayarlar → Geliştirici → Network Link Conditioner **veya** cihazda uçak modu.

---

### S-01 — Online Create: Optimistic → Backend ID

| Alan | Detay |
|------|-------|
| **Senaryo** | Online iken yeni todo oluştur |
| **Ön koşul** | Ağ bağlantısı aktif; backend çalışıyor |
| **Adımlar** | 1. Listedeki `+` butonuna bas → form açılır<br>2. Başlık gir, "Kaydet" e bas<br>3. Listeye dön |
| **Beklenen** | • Todo, form kapanır kapanmaz listenin başında görünür (`onMutate` optimistic ekleme)<br>• Birkaç saniye içinde `invalidateQueries` ile backend listesi gelir; geçici id yerini gerçek UUID'ye bırakır<br>• Pending spinner görünmez (online işlem anında API'ye gönderilir) |
| **Kontrol noktaları** | ☐ Todo listede hemen görünüyor<br>☐ Kart üzerinde spinner yok<br>☐ Aksiyon butonları (toggle/pin/edit/delete) aktif |
| **İlgili kod** | `useCreateTodo.ts` → `onMutate` + `onSettled` |

---

### S-02 — Offline Create: Pending UI Görünür

| Alan | Detay |
|------|-------|
| **Senaryo** | Ağ kesikken yeni todo oluştur; geçici id ile listelenir |
| **Ön koşul** | Uçak modu AÇIK |
| **Adımlar** | 1. Form aç → başlık gir → "Kaydet" e bas<br>2. Listeye dön |
| **Beklenen** | • Todo listenin başına eklenir (id = `local_<uuid>` formatında, kullanıcıya gösterilmez)<br>• Kart üzerinde priority badge yanında küçük `ActivityIndicator` (sync spinner) döner<br>• Aksiyon ikonları (pin / edit / delete) `opacity: 0.3` + `disabled`<br>• Checkbox (toggle) `disabled` |
| **Kontrol noktaları** | ☐ Kart görünüyor<br>☐ Pending spinner badge yanında görünüyor<br>☐ Pin / edit / delete ikonlarına tıklanmıyor<br>☐ Karta tıklanınca TaskDetail açılıyor ("Sunucuya kaydediliyor…" notu görünüyor)<br>☐ TaskDetail'daki 4 action butonu disabled |
| **İlgili kod** | `useCreateTodo.ts` → `onMutate`; `TodoListScreen` → `isLocalId`; `TaskDetailScreen` → `isPending` banner |

---

### S-03 — Offline Create → Uygulama Kapat → Yeniden Aç → Item Korunuyor

| Alan | Detay |
|------|-------|
| **Senaryo** | Offline create sonrası uygulamayı kapat, tekrar aç; todo ve kuyruk korunmuş olmalı |
| **Ön koşul** | Uçak modu AÇIK |
| **Adımlar** | 1. Offline iken bir todo oluştur (S-02'yi uygula)<br>2. Uygulamayı tamamen kapat (görev geçmişinden de kaldır)<br>3. Uygulamayı tekrar aç |
| **Beklenen** | • `PersistQueryClientProvider` + `AsyncStoragePersister` sayesinde query cache (`RQ_TODOS_CACHE` anahtarı) AsyncStorage'dan restore edilir<br>• Geçici todo listenin başında, pending UI ile görünür<br>• Paused mutasyon kuyruğu da restore edilmiştir; uçak modu kapanır kapanmaz otomatik gönderilir |
| **Kontrol noktaları** | ☐ Uygulama açılışında liste boş gelmiyor; cache restore çalışıyor<br>☐ Geçici todo hâlâ listede ve pending durumunda<br>☐ Uçak modunu kapat → todo gerçek id alıyor (S-04 akışı devam eder) |
| **İlgili kod** | `query/persister.ts`; `App.tsx` `PersistQueryClientProvider` |

---

### S-04 — Offline Create → Reconnect → Mutation Resume → Gerçek ID

| Alan | Detay |
|------|-------|
| **Senaryo** | Offline create sonrası ağ geri gelir; mutasyon otomatik gönderilir, gerçek id alınır |
| **Ön koşul** | S-02 tamamlandı (geçici todo listede, uçak modu hâlâ AÇIK) |
| **Adımlar** | 1. Uçak modunu KAPAT<br>2. Birkaç saniye bekle |
| **Beklenen** | • `onlineManager` → `resumePausedMutations` otomatik tetiklenir<br>• `createTodo` API çağrısı gönderilir<br>• `onSettled` → `invalidateQueries` → backend listesi gelir<br>• Geçici `local_<uuid>` kaybolur; gerçek backend UUID'li todo alır yerini<br>• Pending spinner ve kısıtlamalar kalkar; aksiyon butonları aktifleşir |
| **Kontrol noktaları** | ☐ Uçak modu kapatıldıktan kısa süre sonra todo güncellendi<br>☐ Pending spinner kalktı<br>☐ Pin / edit / delete butonları artık çalışıyor<br>☐ TaskDetail'da "Sunucuya kaydediliyor…" notu kayboldu |
| **İlgili kod** | `query/networkSync.ts` → `onlineManager`; `useCreateTodo.ts` → `onSettled` |

---

### S-05 — Offline Update → Pending State → Reconnect Sync

| Alan | Detay |
|------|-------|
| **Senaryo** | Var olan (gerçek id'li) bir todo'yu offline iken güncelle |
| **Ön koşul** | Listede en az bir gerçek id'li todo var; uçak modu AÇIK |
| **Adımlar** | 1. Bir todo'nun edit ikonuna bas → form açılır<br>2. Başlığı değiştir → "Güncelle" ye bas<br>3. Listeye dön |
| **Beklenen** | • `useUpdateTodo.onMutate` cache'i anında günceller; yeni başlık listede görünür<br>• Mutasyon `paused` kuyruğuna alınır; form kapanır (offline'da `mutate` ile `onMutate` anında çalışır)<br>• Kart pending spinner göstermez (update, geçici id oluşturmaz; `isLocalId` false kalır)<br>• Uçak modu kapatılınca mutasyon gönderilir; `onSettled` backend listesini çeker |
| **Kontrol noktaları** | ☐ Form kaydedilince listedeki başlık anında değişiyor<br>☐ Reconnect sonrası değişiklik backend'de kalıcı<br>☐ Kart pending UI göstermiyor (gerçek id korunuyor) |
| **İlgili kod** | `useUpdateTodo.ts`; `TodoFormScreen.tsx` `updateMutation` |
| **Not** | `isPending` (local id koruması) yalnızca `useCreateTodo` tarafından eklenen geçici id'lerde devreye girer. Update, mevcut gerçek id'yi korur; dolayısıyla S-05'te pending UI beklenmez. |

---

### S-06 — Offline Delete → Optimistic Silme → Reconnect Sync

| Alan | Detay |
|------|-------|
| **Senaryo** | Offline iken todo silinir; liste anında güncellenir, reconnect sonrası backend senkronize olur |
| **Ön koşul** | Listede gerçek id'li todo var; uçak modu AÇIK |
| **Adımlar** | 1. Çöp kutusu ikonuna bas → "Sil" onayla<br>2. İnterneti aç |
| **Beklenen** | • `useDeleteTodo.onMutate` → `filter(t.id !== id)` → todo anında listeden kalkar<br>• Mutasyon `paused` kuyruğuna alınır<br>• Reconnect → `DELETE /api/todos/{id}` gönderilir → `onSettled` invalidateQueries<br>• Todo backend'de de silinmiş durumda; liste tutarlı |
| **Kontrol noktaları** | ☐ Todo delete basılınca anında kayboluyor<br>☐ Bağlantı yokken list tutarlı (eski halini göstermiyor)<br>☐ Reconnect sonrası todo backend listesinde de yok |
| **İlgili kod** | `useDeleteTodo.ts` |

---

### S-07 — Offline Toggle → Optimistic Değişim → Reconnect Doğrulanır

| Alan | Detay |
|------|-------|
| **Senaryo** | Offline iken todo checkbox'ı toggle edilir; anlık güncellenir |
| **Ön koşul** | Listede tamamlanmamış bir todo var; uçak modu AÇIK |
| **Adımlar** | 1. Todo kartındaki checkbox'a bas<br>2. İnterneti aç |
| **Beklenen** | • `useToggleTodo.onMutate` → `isCompleted: !t.isCompleted` → checkbox anında işaretli görünür<br>• Başlıkta üstü çizili stili tetiklenir<br>• Mutasyon `paused` kuyruğuna alınır<br>• Reconnect → PATCH gönderilir → backend doğrular → `onSettled` invalidateQueries |
| **Kontrol noktaları** | ☐ Checkbox tıklandığında anında toggle görünüyor<br>☐ Reconnect sonrası backend listesiyle uyumlu |
| **İlgili kod** | `useToggleTodo.ts` |

---

### S-08 — Offline Pin → Optimistic Değişim → Reconnect Sıralaması Doğru

| Alan | Detay |
|------|-------|
| **Senaryo** | Offline iken todo pinlenir; reconnect sonrası backend sıralama (pinned üstte) sağlanır |
| **Ön koşul** | Listede pin'siz en az bir todo var; uçak modu AÇIK |
| **Adımlar** | 1. Pin ikonuna bas<br>2. İnterneti aç |
| **Beklenen** | • `usePinTodo.onMutate` → `isPinned: !t.isPinned` → pin ikonu anında dolu görünür; kart sol kenarlığı `colors.pin` rengini alır<br>• Mutasyon `paused`; reconnect → PATCH `/pin` gönderilir<br>• `onSettled` → `invalidateQueries` → backend IsPinned DESC sıralı liste gelir; todo listenin başına taşınır |
| **Kontrol noktaları** | ☐ Pin ikonu anında dolu görünüyor<br>☐ Reconnect sonrası todo listenin üst sıralarına çıkıyor<br>☐ Kart sol kenarlığı pin rengi |
| **İlgili kod** | `usePinTodo.ts` |

---

### S-09 — Persister Restore: Uygulama Açılışında Liste Hazır

| Alan | Detay |
|------|-------|
| **Senaryo** | Uygulamayı kapat + aç; liste sıfırdan fetch etmeden anında görünür |
| **Ön koşul** | Uygulama daha önce en az bir kez açılmış; listede todo var |
| **Adımlar** | 1. Birkaç todo oluştur<br>2. Uygulamayı tamamen kapat (görev geçmişinden kaldır)<br>3. **Ağ bağlantısını kes** (opsiyonel; restore'un cache'ten geldiğini görmek için)<br>4. Uygulamayı tekrar aç |
| **Beklenen** | • `PersistQueryClientProvider` + `AsyncStoragePersister` `RQ_TODOS_CACHE` anahtarından query cache'i restore eder<br>• Liste açılış spinner'ı olmadan (veya çok kısa) anında görünür<br>• Ağ varsa arka planda `staleTime` dolmuşsa taze liste çekilir; UI birleştirilir<br>• Ağ yoksa cache'ten gelen liste gösterilir; hata ekranı açılmaz |
| **Kontrol noktaları** | ☐ Liste, bağlantı olmadan da açılışta görünüyor<br>☐ Boş liste ekranı değil, cache restore veya loading gösteriyor<br>☐ Bağlantı gelince liste güncelleniyor |
| **İlgili kod** | `query/persister.ts`; `App.tsx`; `queryClient.ts` `gcTime: 24h` |

---

### S-10 — Backend Error → Rollback Doğru Çalışır

| Alan | Detay |
|------|-------|
| **Senaryo** | API 4xx/5xx döndürdüğünde optimistic güncelleme geri alınır |
| **Ön koşul** | Backend çalışıyor; ağ bağlantısı var |
| **Adımlar — Create rollback** | 1. Backend'i durdur (veya başlık alanını silip boş form gönder → 400)<br>2. Todo formunu göster, geçersiz bir başlık gir (backend'i durdurarak) → kaydet<br>3. Sonucu gözlemle |
| **Adımlar — Delete rollback** | 1. Gerçek bir todo'yu sil (backend çalışırken)<br>2. Ağı kısa süre kes ve `DELETE` isteğinin başarısız olmasını simüle et (ya da backend'i durdur)<br>3. Reconnect → `onError` rollback tetiklenmeli |
| **Beklenen** | • `onMutate` optimistic değişiklik uygulandı (todo geçici olarak listeden kalktı veya eklendi)<br>• `onError` rollback → `setQueryData(context.previous)` ile liste snapshot'a döner<br>• Alert ile Türkçe hata mesajı gösterilir (`friendlyErrorMessage`)<br>• `retry: 3` (mutation config) → geçici hatalar 3 kez yeniden denenebilir; kalıcı 4xx hemen rollback |
| **Kontrol noktaları** | ☐ Hata durumunda liste eski haline döndü<br>☐ Hata alert'i görünüyor<br>☐ Listedeki veri tutarlı; hayalet item kalmadı |
| **İlgili kod** | `useCreateTodo.ts`, `useDeleteTodo.ts` vb. → `onError` snapshot rollback |

---

## Davranış Özeti Tablosu

| Senaryo | Optimistic UI | Pending Spinner | Aksiyon Kısıtı | Rollback | Reconnect Auto-Sync |
|---------|:---:|:---:|:---:|:---:|:---:|
| S-01 Online create | ✅ | ✗ | ✗ | N/A | N/A |
| S-02 Offline create | ✅ | ✅ | ✅ | — | ✅ |
| S-03 Kapanma + açılma | ✅ cache restore | ✅ korunuyor | ✅ korunuyor | — | ✅ |
| S-04 Reconnect → gerçek id | ✅ → gerçek id | ✅ → kalkar | ✅ → kalkar | — | ✅ |
| S-05 Offline update | ✅ | ✗ | ✗ | — | ✅ |
| S-06 Offline delete | ✅ | ✗ | ✗ | ✅ (hata varsa) | ✅ |
| S-07 Offline toggle | ✅ | ✗ | ✗ | ✅ (hata varsa) | ✅ |
| S-08 Offline pin | ✅ | ✗ | ✗ | ✅ (hata varsa) | ✅ |
| S-09 Persister restore | ✅ | ✗ | `isLocalId` var ise | — | ✅ |
| S-10 Backend error | ✅ → geri alınır | ✗ | ✗ | ✅ | N/A |

> **Pending Spinner / Aksiyon Kısıtı neden yalnızca create?**
> `isPending` koruması `isLocalId(todo.id)` ile çalışır. Yalnızca `useCreateTodo`'nun `onMutate`'i `local_<uuid>` id üretir. Update / delete / toggle / pin işlemleri mevcut gerçek id'yi değiştirmez; dolayısıyla bu işlemlerde kısıtlama tetiklenmez.

---

## localId Davranışı — Detaylı Kontrol

| Test | Beklenen Davranış |
|------|-------------------|
| `isLocalId('local_f47ac...')` | `true` → pending koruması aktif |
| `isLocalId('3fa85f64-...')` | `false` → aksiyon butonları serbest |
| Offline create → `todo.id` | `local_` önekli UUID; `generateLocalId()` tarafından üretildi |
| Reconnect sonrası aynı todo | `invalidateQueries` ile backend listesi gelir; `local_` id artık cache'te yok |
| Uygulama yeniden açıldıktan sonra geçici todo | AsyncStorage restore → `local_` id hâlâ pending; reconnect sonra temizlenir |

---

## Paused Mutation Queue Kontrolü

| Durum | Beklenen |
|-------|---------|
| Offline iken `mutate()` çağrısı | `mutationFn` çalıştırılmaz; mutasyon `paused` durumuna geçer |
| `onMutate` offline durumda | Her zaman çalışır (optimistic update sağlar) |
| Ağ geri gelince | `onlineManager` tetiklenir → `resumePausedMutations` → kuyruktaki mutasyonlar sırayla gönderilir |
| Uygulama kapatılıp açılınca kuyruk | `PersistQueryClientProvider` mutasyon kuyruğunu da restore eder; paused mutasyonlar kaybolmaz |
| Aynı todo için birden fazla offline işlem | FIFO sırası; ilk mutasyon tamamlanmadan ikincisi başlamaz |

---

## invalidateQueries Sonrası Liste Güncellemesi

Her mutation hook'unun `onSettled` callback'i `queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY })` çağırır.

| Durum | Ne Olur? |
|-------|---------|
| Online, başarılı mutation | `invalidateQueries` → aktif sorgu refetch olur → taze liste gelir |
| Online, başarısız mutation | `onError` rollback → ardından `onSettled` yine invalidate eder (snapshot'a rollback + taze sorgu) |
| Offline, mutation paused | `onSettled` çalışmaz; bağlantı gelip mutasyon tamamlanınca çalışır |
| `staleTime` (5 dk) | Aynı sorgu 5 dk içinde yeniden açılırsa arka planda refetch gitmez; `invalidateQueries` bu cache'i `stale` işaretler ve force-refetch tetikler |

---

## Pending UI Doğruluğu Kontrol Listesi

| Durum | TodoListScreen | TaskDetailScreen |
|-------|----------------|------------------|
| `isLocalId = true` (offline create) | Badge yanında spinner + action zone `opacity 0.3` | "Sunucuya kaydediliyor…" banner + 4 buton disabled |
| `isLocalId = false` (gerçek id) | Normal görünüm | Normal görünüm |
| Sync tamamlandı (gerçek id geldi) | Spinner ve kısıtlama otomatik kalkar (re-render) | Banner kaybolur; butonlar aktifleşir |
| `busy = true` (aktif mutation) | Spinner action zone'u tamamen değiştirir | 4 buton `actionsDisabled = true` |

---

## Potansiyel Edge Case'ler

| Edge Case | Risk | Mevcut Davranış | Öneri |
|-----------|------|-----------------|-------|
| **Çift create basma** | Kullanıcı "Kaydet" butonuna iki kez basar | `saving = createMutation.isPending` → buton `disabled`; ikinci tıklama engellenir | ✅ Güvenli |
| **Geçici todo'ya ulaşılan detail ekranında reconnect olur** | Detail `todo.id` hâlâ `local_`; ancak `invalidateQueries` liste güncelledi | Detail ekranı eski `todo` state'ini tutar; banner doğru çalışır. Bir sonraki `useFocusEffect` refetch tetikler. | Phase 3: `useQueryClient().getQueryData` ile detail'i canlı tutmak düşünülebilir |
| **Birden fazla offline create birden gelir** | N todo aynı anda `paused` kuyruğunda | TanStack Query FIFO sırası; mutasyonlar sırayla işlenir | ✅ Güvenli — FIFO bozulmaz |
| **Offline sırasında `invalidateQueries` tetiklenir** | Ekran odağa gelince `useFocusEffect` → `refetch()` | `networkMode: 'offlineFirst'` → fetch çalışır ama başarısız olur; `isError=true` ama cache veri varsa `todos.length>0` → liste gizlenmez | ✅ Tasarım gereği kabul edilebilir |
| **Aynı todo hem offline delete hem offline update kuyruğunda** | Önce update sonra delete gönderilir | Update başarılı → delete 404 döner → `onError` rollback → liste tutarsız olabilir | Phase 3 concern; mevcut sprint kapsamı dışında |
| **`gcTime: 24h` dolunca cache temizlenir** | Uzun süre uygulama açık ama arka planda kalır | Sayfa ön plana gelince `useFocusEffect` refetch; liste yenilenir | ✅ Normal SWR davranışı |
| **Büyük liste + sık invalidate** | Her mutasyon sonrası tam liste tekrar fetch edilir | `staleTime: 5dk` kısmen hafifletir; aynı sorgu sık aralıkta tekrar çekilmez | Phase 3: Sayfalama veya partial update düşünülebilir |
| **Geçersiz `dueDate` formatı (YYYY-AA-GG olmayan giriş)** | `handleDueDateChange` `new Date()` parse eder; NaN → `setDueDate(null)` | Form backend'e `null` gönderir; dueDate kaybolur | ✅ Güvenli; kullanıcı uyarısı için placeholder yeterli |
| **`tags` alanı > 500 karakter** | Backend `MaxLength(500)` validasyonu | 400 döner → `onError` → hata mesajı gösterilir; rollback çalışır | ✅ Güvenli |

---

## Sprint 007 Kabul Kriterleri Özeti

| Kriter | Durum |
|--------|-------|
| `dotnet test` → 12 geçen test | ✅ |
| `npx tsc --noEmit` → 0 hata | ✅ |
| S-01: Online create | Manuel doğrulama gerekli |
| S-02: Offline create + pending UI | Manuel doğrulama gerekli |
| S-03: Kapanma/açılma + cache restore | Manuel doğrulama gerekli |
| S-04: Reconnect + gerçek id | Manuel doğrulama gerekli |
| S-05: Offline update + sync | Manuel doğrulama gerekli |
| S-06: Offline delete + rollback | Manuel doğrulama gerekli |
| S-07: Offline toggle + sync | Manuel doğrulama gerekli |
| S-08: Offline pin + sıralama | Manuel doğrulama gerekli |
| S-09: Persister restore | Manuel doğrulama gerekli |
| S-10: Backend error + rollback | Manuel doğrulama gerekli |
| Phase 1 CRUD akışı bozulmamış | Manuel doğrulama gerekli |
