# Offline Write + Sync Queue Architecture

**Sprint:** Step 2 Phase 2
**Hazırlayan:** Architect Agent
**Kaynak:** `docs/offline-first-architecture.md` (Phase 1)
**Hedef:** Create / Update / Delete / Toggle / Pin işlemlerini offline ortamda kuyruğa alıp bağlantı geldiğinde otomatik senkronize etmek.

---

## 1. Phase 1 ile Phase 2 Farkı

### Phase 1 — Ne Yaptık

Phase 1, "okuma odaklı" offline-first mimarisini kurdu:

| Yetenek | Phase 1 |
|---------|---------|
| Offline liste görüntüleme | ✓ (AsyncStorage cache) |
| Arka planda API'den taze veri çekme (SWR) | ✓ |
| Offline iken yazma (create/update/delete) | ✗ — hata verir |
| Yazmaların otomatik senkronizasyonu | ✗ |
| Bağlantı kesilince kullanıcıya uyarı | ✗ |

Kullanıcı offline iken herhangi bir yazma işlemi yaparsa `fetch` başarısız olur ve `friendlyErrorMessage` bir hata mesajı gösterir. İşlem kaybolur.

### Phase 2 — Ne Ekleyeceğiz

Phase 2, "yazma odaklı" offline-first katmanını ekler:

| Yetenek | Phase 2 |
|---------|---------|
| Offline iken create/update/delete/toggle/pin | ✓ — mutasyonlar kuyruğa alınır |
| Optimistic UI güncellemesi | ✓ — kullanıcı anlık geri bildirim alır |
| Bağlantı geldiğinde otomatik sync | ✓ — `resumePausedMutations` |
| Temporary id yönetimi (local create) | ✓ — UUID ile çözülür |
| Conflict resolution | ✗ — Faz 2 kapsam dışı; son yazma kazanır |
| Query cache'in AsyncStorage'a yazılması | ✓ — `PersistQueryClientProvider` |

### Geçiş Stratejisi

Phase 1'in SWR akışı (`getCachedTodos` / `setCachedTodos`) Phase 2'de TanStack Query'nin cache sistemi ile değiştirilir. Mevcut `todosCacheService.ts` ve `CACHE_KEY` sabiti kaldırılır; onların sorumluluğunu `QueryClient` + `AsyncStoragePersister` üstlenir.

---

## 2. TanStack Query Neden Seçildi

### Alternatiflerin Karşılaştırması

| Seçenek | Avantajı | Dezavantajı |
|---------|---------|-------------|
| **El yazımı SWR + mutation queue** | Bağımlılık yok | Yeniden keşfetme maliyeti yüksek; edge case yönetimi zor |
| **Redux + RTK Query** | Olgun ekosistem | Boilerplate çok; öğrenme maliyeti yüksek |
| **Zustand + manuel fetch** | Basit | Offline queue için ek iş gerekir |
| **TanStack Query + Persister** | Hazır offline desteği, React Native uyumlu, minimal boilerplate | Ekstra paket boyutu (~15 KB gzipped) |

### TanStack Query'nin Sağladığı Hazır Özellikler

- **`paused` mutasyon kuyruğu:** Offline iken gönderilemeyen mutasyonlar otomatik `paused` durumuna geçer.
- **`resumePausedMutations`:** Bağlantı geri geldiğinde tek satırda kuyruğu boşaltır.
- **`@tanstack/query-async-storage-persister`:** Query cache'i AsyncStorage'a yazar; uygulama yeniden açıldığında cache geri yüklenir.
- **`onlineManager`:** Network durumunu izler; React Native için NetInfo entegrasyonu hazır.
- **Optimistic update API:** `onMutate` / `onError` / `onSettled` döngüsü ile rollback destekli optimistic update ilk sınıf özellik.

### Öğrenme Dostu Olma Sebebi

TanStack Query, her adımı ayrı kavrama eşleyen açık bir zihinsel model sunar: **Query = okuma**, **Mutation = yazma**, **Persister = kalıcılık**. Bu, dokümantasyonu ve hata ayıklamayı kolaylaştırır.

---

## 3. Query Cache + AsyncStorage Persister İlişkisi

```
┌─────────────────────────────────────┐
│           React Component           │
│   useQuery / useMutation            │
└───────────────┬─────────────────────┘
                │ okuma / yazma
                ▼
┌─────────────────────────────────────┐
│           QueryClient               │
│  • In-memory cache (Map)            │
│  • Mutation queue                   │
│  • Retry / backoff logic            │
└───────────────┬─────────────────────┘
                │ serialize / deserialize (otomatik)
                ▼
┌─────────────────────────────────────┐
│     AsyncStoragePersister           │
│  • AsyncStorage key: "RQ_TODOS"     │
│  • Throttle: 1000 ms               │
│  • Seri hale getirilmiş JSON       │
└───────────────┬─────────────────────┘
                │ read/write
                ▼
┌─────────────────────────────────────┐
│   @react-native-async-storage       │
│   /async-storage                    │
└─────────────────────────────────────┘
```

**Önemli davranışlar:**

- QueryClient cache değiştiğinde Persister throttle sonrasında AsyncStorage'a yazar (veri kayıp riski yoktur; in-memory anlık güncellenir).
- Uygulama yeniden açıldığında Persister, AsyncStorage'dan cache'i okur ve QueryClient'a yükler; böylece liste hemen görünür.
- Paused mutasyonlar da seri hale getirilir; uygulama kapanıp açılsa bile kuyruk korunur.

---

## 4. PersistQueryClientProvider Kurulumu

### Gerekli Paketler

```
@tanstack/react-query
@tanstack/query-async-storage-persister
@tanstack/react-query-persist-client
@react-native-community/netinfo   ← onlineManager için
```

> `@react-native-async-storage/async-storage` Phase 1'den zaten mevcut.

### QueryClient Konfigürasyonu

```typescript
// src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Uygulama focus'a döndüğünde yeniden çekme
      refetchOnWindowFocus: true,
      // Offline iken sorgu denemelerini durdur; bağlantı gelince devam et
      networkMode: 'offlineFirst',
      // Eski veri: 5 dakika geçene kadar "fresh" sayılır
      staleTime: 5 * 60 * 1000,
    },
    mutations: {
      // Offline iken mutasyonu durdur; bağlantı gelince otomatik gönder
      networkMode: 'offlineFirst',
      // Hata durumunda 3 deneme (exponential backoff)
      retry: 3,
    },
  },
});
```

### Persister Konfigürasyonu

```typescript
// src/lib/persister.ts

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

export const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'RQ_TODOS_CACHE',
  throttleTime: 1000, // ms — her 1 saniyede bir yaz
});
```

### App.tsx Entegrasyonu

```typescript
// App.tsx

import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryClient } from './src/lib/queryClient';
import { asyncStoragePersister } from './src/lib/persister';
import { setupNetInfoSync } from './src/lib/networkSync';

setupNetInfoSync(); // onlineManager ← NetInfo köprüsü

export default function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: asyncStoragePersister }}
    >
      <NavigationContainer>
        {/* ... */}
      </NavigationContainer>
    </PersistQueryClientProvider>
  );
}
```

### NetInfo → onlineManager Köprüsü

```typescript
// src/lib/networkSync.ts

import NetInfo from '@react-native-community/netinfo';
import { onlineManager } from '@tanstack/react-query';

export function setupNetInfoSync() {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => {
      setOnline(!!state.isConnected);
    })
  );
}
```

Bu köprü sayesinde TanStack Query, `onlineManager.isOnline()` ile anlık network durumunu bilir; offline olduğunda mutasyonları otomatik `paused` yapar.

---

## 5. Todos Query Tasarımı

### Query Key

```typescript
export const TODOS_QUERY_KEY = ['todos'] as const;
```

Tüm query / mutation invalidasyonları bu key üzerinden yapılır.

### useQuery Hook

```typescript
// src/hooks/useTodos.ts

import { useQuery } from '@tanstack/react-query';
import { getTodos } from '../services/api/todosApi';
import { TODOS_QUERY_KEY } from '../constants/queryKeys';

export function useTodos() {
  return useQuery({
    queryKey: TODOS_QUERY_KEY,
    queryFn: getTodos,
    // Persister'dan gelen stale cache anlık gösterilir;
    // arka planda API'den taze veri çekilir (SWR davranışı korunur)
    staleTime: 5 * 60 * 1000,
  });
}
```

`data`, `isLoading`, `isError`, `refetch` alanları ekranlar tarafından tüketilir. Phase 1'deki `getCachedTodos` + `setTodos` + `setLoading` + `setRefreshing` state yönetimi bu hook ile değiştirilir.

---

## 6. Offline Mutation Yaklaşımı

Her yazma işlemi (`createTodo`, `updateTodo`, `deleteTodo`, `toggleTodo`, `pinTodo`) için ayrı bir `useMutation` hook'u tanımlanır. `networkMode: 'offlineFirst'` sayesinde:

- **Online iken:** Mutasyon anında çalışır; başarılı olursa cache invalidate edilir.
- **Offline iken:** Mutasyon `paused` kuyruğuna alınır. Bağlantı geldiğinde `resumePausedMutations` otomatik çalışır.

### Örnek — useMutationCreateTodo

```typescript
// src/hooks/mutations/useCreateTodo.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo } from '../../services/api/todosApi';
import type { CreateTodoRequest, Todo } from '../../types/todo';
import { TODOS_QUERY_KEY } from '../../constants/queryKeys';
import { generateLocalId } from '../../utils/localId';

export function useCreateTodo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTodoRequest) => createTodo(request),

    onMutate: async (request) => {
      // 1) Yarışan refetch'leri iptal et
      await queryClient.cancelQueries({ queryKey: TODOS_QUERY_KEY });

      // 2) Mevcut listeyi snapshot al (rollback için)
      const previous = queryClient.getQueryData<Todo[]>(TODOS_QUERY_KEY);

      // 3) Geçici todo ile cache'i güncelle (optimistic)
      const tempTodo: Todo = {
        id: generateLocalId(),           // "local_<uuid>" formatı
        title: request.title,
        description: request.description ?? null,
        isCompleted: false,
        priority: request.priority ?? 1, // Normal
        dueDate: request.dueDate ?? null,
        isPinned: request.isPinned ?? false,
        tags: request.tags ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<Todo[]>(TODOS_QUERY_KEY, (old) =>
        old ? [tempTodo, ...old] : [tempTodo]
      );

      return { previous, tempId: tempTodo.id };
    },

    onError: (_error, _request, context) => {
      // Rollback: snapshot'a dön
      if (context?.previous !== undefined) {
        queryClient.setQueryData(TODOS_QUERY_KEY, context.previous);
      }
    },

    onSettled: () => {
      // Başarılı ya da hatalı; API'den taze listeyi çek
      queryClient.invalidateQueries({ queryKey: TODOS_QUERY_KEY });
    },
  });
}
```

Diğer mutasyonlar (`useUpdateTodo`, `useDeleteTodo`, `useToggleTodo`, `usePinTodo`) aynı `onMutate → onError → onSettled` kalıbını izler; yalnızca `mutationFn` ve optimistic güncelleme detayları değişir.

---

## 7. Optimistic Update Stratejisi

Her mutasyon üç aşamalı döngüyü takip eder:

```
onMutate (hemen)
  │
  ├─ cancelQueries          → yarışan fetch yok
  ├─ snapshot (previous)    → rollback verisi
  └─ setQueryData           → ekranda anlık güncelleme

     ┌──────────────────────────────┐
     │   Network isteği (async)     │
     │   Online  → hemen gönderilir │
     │   Offline → paused kuyruğa  │
     └──────────────────────────────┘

onError → setQueryData(previous)   → rollback
onSettled → invalidateQueries      → API'den taze veri
```

**Offline senaryosu:**
`onMutate` her zaman çalışır (network beklenmez). Cache güncellenir, kullanıcı değişikliği anında görür. Mutasyon `paused` olarak kuyruğa girer. Bağlantı geldiğinde `resumePausedMutations` mutasyonu gönderir; `onSettled` ile cache yenilenir.

---

## 8. Local Temporary ID Stratejisi

Offline iken oluşturulan todo'ların henüz backend id'si yoktur. Geçici id stratejisi:

```typescript
// src/utils/localId.ts

import { v4 as uuidv4 } from 'uuid'; // expo-crypto veya uuid paketi

const LOCAL_PREFIX = 'local_';

export function generateLocalId(): string {
  return `${LOCAL_PREFIX}${uuidv4()}`;
}

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_PREFIX);
}
```

### Yaşam Döngüsü

```
Offline create
  → tempTodo.id = "local_<uuid>"
  → cache'e eklenir; ekranda görünür

Bağlantı gelir → resumePausedMutations
  → createTodo API çağrısı başarılı
  → onSettled → invalidateQueries
  → API'den gelen gerçek todo (backend id ile) cache'i geçer
  → "local_<uuid>" artık cache'te yok; backend id ile değişti
```

### Edit / Delete Kısıtı

Geçici id'li todo'lar için `isLocalId(todo.id)` kontrolü ile update / delete / toggle / pin butonları devre dışı bırakılır. Kullanıcıya "Kaydediliyor…" durumu gösterilir.

```typescript
// Ekran katmanında kullanım:
const isTemp = isLocalId(todo.id);
<ActionButton disabled={isTemp || busy} ... />
```

---

## 9. Reconnect Sonrası resumePausedMutations Akışı

`onlineManager`, NetInfo değişikliğini algılar ve TanStack Query otomatik olarak `resumePausedMutations()` çağrısı yapar. Manuel tetikleme gerekmez.

```
NetInfo: isConnected = false
  → onlineManager.isOnline() = false
  → Yeni mutasyonlar "paused" kuyruğuna alınır

NetInfo: isConnected = true
  → onlineManager.isOnline() = true
  → queryClient.resumePausedMutations() otomatik çağrılır
  → Kuyrukta bekleyen mutasyonlar sırayla çalışır
  → Her başarılı mutasyon → invalidateQueries → cache yenilenir
```

### Kuyruk Sıralaması

TanStack Query, mutasyonları kuyruğa alındıkları sırayla (`FIFO`) gönderir. Aynı todo üzerinde sıralı işlemler (create → update → toggle) bu sırayla işlenir.

**Paralel vs. Sıralı Gönderim:**
Farklı todo'ların mutasyonları paralel gönderilebilir; aynı todo'ya ait mutasyonlar sıralı olmalıdır. Phase 2 Faz 1 kapsamında her mutasyon bağımsız işlenir (tek mutation kuyruğu, tüm mutasyonlar sıralı). Bu basit ve güvenli bir yaklaşımdır.

---

## 10. Rollback / Hata Yaklaşımı

### Online Hata Senaryosu

Mutasyon başarısız olursa `onError` çalışır ve `previous` snapshot ile cache eski haline döner. Kullanıcıya `Alert` ile hata mesajı gösterilir.

### Offline Mutasyon Hatası (Sonunda Başarısız)

Bağlantı geldikten sonra `resumePausedMutations` çalışır; mutasyon 3 deneme (retry) sonrasında hâlâ başarısız olursa:

```
onError tetiklenir
  → setQueryData(previous snapshot) — rollback
  → Alert.alert("Senkronizasyon hatası", ...)
```

**Snapshot geçerliliği problemi:** Offline kuyruktaki mutasyonun `previous` snapshot'ı, kuyruk boyunca sabit tutulmaz; `onSettled` → `invalidateQueries` döngüsü ile cache güncellendiğinden rollback hedefi değişebilir. Bu Phase 2 Faz 1'deki kabul edilebilir kısıtlamadır. Faz 2'de `mutationMeta` ile daha sağlam rollback eklenebilir.

### Conflict Resolution

Phase 2 Faz 1'de conflict resolution yoktur: **son yazma kazanır.** Aynı todo'yu iki farklı cihazdan offline düzenleyip sync edersek, son gelen PUT kazanır. Bu sadelik bilinçli bir tercihtir.

---

## 11. Mevcut Kod Tabanına Etkisi

### Kaldırılacaklar

| Dosya / Kod | Neden |
|-------------|-------|
| `src/services/cache/todosCacheService.ts` | QueryClient + Persister üstlenir |
| `src/services/cache/cacheKeys.ts` | `TODOS_QUERY_KEY` sabiti ile değiştirilir |
| `TodoListScreen.tsx` — `useState(todos)`, `setLoading`, `setRefreshing`, `getCachedTodos` çağrıları | `useTodos()` hook'u ile değiştirilir |
| `TodoFormScreen.tsx` — `getCachedTodos` / `setCachedTodos` çağrıları | `useCreateTodo()` / `useUpdateTodo()` hook'ları ile değiştirilir |
| `TaskDetailScreen.tsx` — `getCachedTodos` / `setCachedTodos` çağrıları | `useToggleTodo()` / `usePinTodo()` / `useDeleteTodo()` hook'ları ile değiştirilir |

### Korunacaklar

| Dosya | Durum |
|-------|-------|
| `src/services/api/todosApi.ts` | Değişmez; tüm mutasyon hook'ları bu fonksiyonları çağırır |
| `src/types/todo.ts` | Değişmez |
| `src/navigation/` | Değişmez |
| `src/components/` | Değişmez |
| `src/theme/tokens.ts` | Değişmez |
| `src/screens/*.tsx` (yapı) | UI değişmez; state kaynağı değişir |

### Değişecekler

| Dosya | Değişim |
|-------|---------|
| `App.tsx` | `QueryClientProvider` → `PersistQueryClientProvider` ile sarılır |
| `TodoListScreen.tsx` | `useTodos()` hook'u; `handlePin` / `handleToggle` → `usePinTodo` / `useToggleTodo` |
| `TodoFormScreen.tsx` | `useCreateTodo()` / `useUpdateTodo()` hook'ları |
| `TaskDetailScreen.tsx` | `useToggleTodo()` / `usePinTodo()` / `useDeleteTodo()` hook'ları |

---

## 12. Faz 2 Kapsamı ve Kapsam Dışı Konular

### Faz 2 Kapsamı (Bu Sprint)

- [ ] TanStack Query + Persister altyapısı kurulumu (`App.tsx`, `queryClient.ts`, `persister.ts`)
- [ ] NetInfo → `onlineManager` köprüsü
- [ ] `useTodos` query hook'u
- [ ] `useCreateTodo`, `useUpdateTodo`, `useDeleteTodo`, `useToggleTodo`, `usePinTodo` mutation hook'ları
- [ ] Optimistic update + rollback tüm mutasyonlarda
- [ ] Local temporary id stratejisi + `isLocalId` koruma kontrolü
- [ ] `PersistQueryClientProvider` ile uygulama yeniden açılışında cache geri yükleme
- [ ] Ekranların yeni hook'larla güncellenmesi; eski cache servisinin kaldırılması
- [ ] `resumePausedMutations` doğrulaması (manuel test)

### Kapsam Dışı (Gelecek Sprint / Faz 3)

| Konu | Gerekçe |
|------|---------|
| Conflict resolution (multi-device sync) | Sunucu taraflı versiyon / timestamp gerektirir |
| Background sync (uygulama arka planda iken) | Expo Background Fetch / Task altyapısı gerektirir |
| Offline gösterge UI (banner / snackbar) | UX iyileştirmesi; NetInfo ayrı ticket |
| Mutasyon kuyruğu görselleştirmesi ("X işlem bekliyor") | UX iyileştirmesi |
| Optimistic sıralama (create sonrası doğru konuma ekleme) | Faz 1'de listenin başına ekleme yeterli |
| Server-sent events / WebSocket | Farklı altyapı gerektirir |
| End-to-end şifreleme | Güvenlik sprint'i |

---

## Özet

Phase 2, TanStack Query'nin hazır offline altyapısını (`networkMode: 'offlineFirst'`, `resumePausedMutations`, `AsyncStoragePersister`) kullanarak Phase 1'in salt-okunur offline deneyimini tam-yazma offline deneyimine yükseltir. Mevcut backend API sözleşmesi ve UI tasarımı değişmez; yalnızca state yönetimi katmanı yeniden yazılır.

```
Phase 1:  AsyncStorage cache  →  SWR okuma  →  Online yazma
Phase 2:  QueryClient cache   →  Persister  →  Offline yazma + otomatik sync
```
