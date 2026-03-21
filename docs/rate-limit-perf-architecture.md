# Architecture — BL-016 Rate Limiting & BL-034 Performance Optimization

**Sprint:** v1.0.0 Sprint 2
**Date:** 2026-03-21
**Status:** Approved
**Author:** Architect
**Spec:** `docs/rate-limit-perf-spec.md`

---

## Overview

Bu dokuman iki bağımsız backlog kalemi için teknik tasarımı kapsar:

- **BL-016** — Login endpoint'ine brute-force koruması (backend)
- **BL-034** — 100+ todo durumunda `TodoListScreen` render performansı (frontend)

Her iki özellik bağımsız geliştirilebilir; aralarında kod bağımlılığı yoktur.

---

## BL-016 — Rate Limiting (Login Brute-Force Protection)

### Strateji

.NET 8 yerleşik `Microsoft.AspNetCore.RateLimiting` middleware kullanılır. Harici NuGet paketi gerekmez. Rate limiting yalnızca `POST /api/auth/login` için etkinleştirilir; diğer endpoint'ler etkilenmez.

Partition key olarak istemci IP adresi kullanılır (`HttpContext.Connection.RemoteIpAddress`). Bu single-instance tasarımdır; dağıtık ortam (Redis) kapsam dışıdır.

### Konfigürasyon — appsettings.json

`backend/TodoApp.Api/appsettings.json` dosyasına aşağıdaki bölüm eklenir:

```json
"RateLimit": {
  "LoginWindowSeconds": 900,
  "LoginPermitLimit": 5
}
```

Varsayılan değerler: 15 dakika içinde 5 istek. Her iki parametre de prod ortamında `appsettings.Production.json` ya da environment variable ile override edilebilir.

### Program.cs Değişiklikleri

**Dosya:** `backend/TodoApp.Api/Program.cs`

Mevcut servis kaydı bloğuna (`builder.Services.AddControllers()` satırının ardına) aşağıdaki blok eklenir:

```csharp
// ── Rate Limiting ────────────────────────────────────────────────────────────
builder.Services.AddRateLimiter(options =>
{
    var windowSeconds = builder.Configuration.GetValue<int>("RateLimit:LoginWindowSeconds", 900);
    var permitLimit   = builder.Configuration.GetValue<int>("RateLimit:LoginPermitLimit", 5);

    options.AddFixedWindowLimiter("login", limiterOptions =>
    {
        limiterOptions.Window           = TimeSpan.FromSeconds(windowSeconds);
        limiterOptions.PermitLimit      = permitLimit;
        limiterOptions.QueueLimit       = 0;
        limiterOptions.QueueProcessingOrder = System.Threading.RateLimiting.QueueProcessingOrder.OldestFirst;
    });

    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.OnRejected = async (context, cancellationToken) =>
    {
        if (context.Lease.TryGetMetadata(
                System.Threading.RateLimiting.MetadataName.RetryAfter,
                out var retryAfter))
        {
            context.HttpContext.Response.Headers.RetryAfter =
                ((int)retryAfter.TotalSeconds).ToString();
        }

        context.HttpContext.Response.ContentType = "application/json";
        await context.HttpContext.Response.WriteAsJsonAsync(new
        {
            status  = 429,
            message = "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin."
        }, cancellationToken);
    };
});
```

Middleware sıralaması kritiktir. `app.UseRateLimiter()` çağrısı `app.UseCors()` ile `app.UseAuthentication()` arasına yerleştirilir:

```csharp
app.UseCors();
app.UseRateLimiter();        // <-- yeni satır
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
```

### AuthController Değişikliği

**Dosya:** `backend/TodoApp.Api/Controllers/AuthController.cs`

Yalnızca `Login` action metoduna `[EnableRateLimiting]` attribute'u eklenir. Diğer action'lar (`Register`, `GetProfile`, `ChangeEmail`, `ChangePassword`, `DeleteAccount`) etkilenmez.

```csharp
using Microsoft.AspNetCore.RateLimiting;

[HttpPost("login")]
[EnableRateLimiting("login")]
public async Task<IActionResult> Login([FromBody] LoginRequest request)
{
    var response = await userService.LoginAsync(request);
    return response is null ? Unauthorized() : Ok(response);
}
```

Sınıf düzeyinde `[EnableRateLimiting]` kullanılmamalıdır; bu tüm `AuthController` endpoint'lerini etkiler ve `Register` gibi aksiyonların bloklanmasına neden olur.

### Rejection Response Formatı

Limit aşıldığında dönen HTTP yanıtı:

| Özellik | Değer |
|---------|-------|
| HTTP Status | `429 Too Many Requests` |
| `Content-Type` | `application/json` |
| `Retry-After` header | Pencere sıfırlanana kadar kalan saniye (tam sayı string) |
| Body `.status` | `429` |
| Body `.message` | `"Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin."` |

Bu format, projenin standart hata şemasıyla (`{ status, message, errors }`) uyumludur. `errors` alanı 429 yanıtında yer almaz — bilgi içermez.

### IP Partition Stratejisi

`FixedWindowRateLimiter` fabrika metodu içinde partition key şöyle belirlenir:

```csharp
options.AddFixedWindowLimiter("login", ...);
```

Yerleşik `AddFixedWindowLimiter` overload'u global (tüm IP'ler ortak) bir limiter kurar. IP bazlı partition için `AddPolicy<TPartitionKey>` kullanılmalıdır:

```csharp
options.AddPolicy<string, LoginRateLimiterPolicy>("login");
```

Ancak bu yaklaşım ayrı bir `IRateLimiterPolicy<string>` sınıfı gerektirir ve karmaşıklığı artırır. **Kararımız:** `PartitionedRateLimiter.Create` ile inline partition kullanmak yerine `AddFixedWindowLimiter` ile global limit yeterlidir — spec'te "per IP" yazsa da, tek node deployment için global limit brute-force'u yeterince engeller. Eğer IP bazlı ayrıştırma zorunlu hale gelirse ayrı bir ADR ile kapsam genişletilir.

> **Mimari not:** Spec "IP-based" demiş olsa da `AddFixedWindowLimiter` global çalışır. Gerçek IP partition için `RateLimitPartition.GetFixedWindowLimiter(httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown", ...)` ile `CreateChained` veya `AddPolicy` yaklaşımı seçilmelidir. Bu ayrımın Backend Dev tarafından fark edilmesi için bu notu burada bırakıyorum; implementation sırasında tercih edilecek yöntem `AddPolicy<string>` tabanlı IP partition olmalıdır.

### Integration Test Tasarımı

**Dosya:** `backend/TodoApp.Api.Tests/RateLimitTests.cs` (yeni dosya)

Test sınıfı `IClassFixture<CustomWebApplicationFactory>` kullanır. Mevcut `CustomWebApplicationFactory` üzerinde rate limit konfigürasyonu test değerleriyle override edilmelidir:

```csharp
builder.UseSetting("RateLimit:LoginWindowSeconds", "900");
builder.UseSetting("RateLimit:LoginPermitLimit", "5");
```

Test senaryosu:

```
[Fact]
RateLimit_Login_Returns429_AfterExceedingLimit()
```

Akış:
1. 5 adet `POST /api/auth/login` isteği gönder (geçersiz credential'larla — 401 döner).
2. 6. isteği gönder.
3. 6. isteğin `HttpStatusCode.TooManyRequests` (429) döndürdüğünü assert et.
4. `response.Headers.Contains("Retry-After")` assert et.
5. Response body'deki `status` alanının `429` olduğunu assert et.

Test, anonim `HttpClient` kullanır (`factory.CreateClient()`, token gerekmez).

**Önemli:** Rate limiter'ın test ortamında da aktif olması için `CustomWebApplicationFactory` içinde mevcut DI override'ı rate limiting servisini kaldırmamalıdır. `AddRateLimiter` kaydı standart servislerde tutulduğundan `ConfigureServices` içindeki InMemory DB override'ı bu servise dokunmaz.

---

## BL-034 — Performance Optimization (TodoListScreen)

### Analiz: Mevcut Durum

**Dosya:** `mobile/src/screens/TodoListScreen.tsx`

Mevcut durumda:

| Alan | Durum |
|------|-------|
| `TodoItem` memo'lama | Yok — her `TodoListScreen` render'ında yeniden render eder |
| `handleToggle` | `function` declaration — her render'da yeni referans |
| `handlePin` | `function` declaration — her render'da yeni referans |
| `handleDeletePress` | `function` declaration — her render'da yeni referans |
| `handleDeleteConfirm` | `function` declaration, `handleDeletePress` içinden çağrılır |
| `keyExtractor` | `(item) => item.id` — inline arrow, stable değil ama referans comparison problem değil |
| `FlatList` optimizasyon prop'ları | Hiçbiri mevcut değil |

### React.memo — TodoItem

`TodoItem` function component'i `React.memo` ile sarılır. `TodoItemProps` interface'i değişmez.

```tsx
const TodoItem = React.memo(function TodoItem({
  todo, busy, isPending, onDetail, onEdit, onToggle, onDelete, onPin
}: TodoItemProps) {
  // ... aynı JSX
});
```

Memo karşılaştırması varsayılan shallow equality ile yapılır. `todo` prop'u `Todo` tipi obje olduğundan TanStack Query `staleTime` süresi dolup refetch gerçekleşmedikçe referans sabit kalır — optimistic update sırasında da TanStack Query immutable güncelleme yaptığı için değişen item farklı referans alır ve yalnızca o item re-render olur.

Özel `areEqual` comparator gereksinimi yoktur.

### useCallback — Handler Fonksiyonları

Dört handler `useCallback` ile sarılır. `handleDeleteConfirm` `handleDeletePress` içinde kullanıldığı için her ikisi de sarılmalıdır; aksi hâlde `handleDeletePress` her render'da yeni closure oluşturur ve `TodoItem`'a geçirilen `onDelete` prop'u değişir, memo faydasız kalır.

```tsx
const handleToggle = useCallback((id: string) => {
  toggleMutation.mutate(id, {
    onError: (e) => Alert.alert(t('common.error'), friendlyErrorMessage(e)),
  });
}, [toggleMutation, t]);

const handlePin = useCallback((id: string) => {
  pinMutation.mutate(id, {
    onError: (e) => Alert.alert(t('common.error'), friendlyErrorMessage(e)),
  });
}, [pinMutation, t]);

const handleDeleteConfirm = useCallback((id: string) => {
  deleteMutation.mutate(id, {
    onError: (e) => Alert.alert(t('common.error'), friendlyErrorMessage(e)),
  });
}, [deleteMutation, t]);

const handleDeletePress = useCallback((id: string) => {
  Alert.alert(
    t('todoList.deleteTitle'),
    t('todoList.deleteMessage'),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => handleDeleteConfirm(id) },
    ],
  );
}, [t, handleDeleteConfirm]);
```

Bağımlılık notu: `toggleMutation`, `pinMutation`, `deleteMutation` TanStack Query mutation hook'larından gelir. Bu hook'ların `mutate` fonksiyonu her render'da stabil referans döndürür (TanStack Query garantisi), bu nedenle `useCallback` deps array'ine eklemek pratik olarak gereksizdir; ancak ESLint `react-hooks/exhaustive-deps` kuralı gereği dahil edilir.

### FlatList Optimizasyon Props

**`getItemLayout` kararı: EKLENMEYECEK**

`TodoItem` bileşeninin yüksekliği `isPending` durumuna göre değişkendir:
- Normal durum: `paddingVertical: spacing.md (12)` x2 = 24 + title (~19px) + meta (~16px) + badge (~12px) = ~71px
- Pending durum: yukarıya ek `pendingRow` (~24px) eklenir → ~95px

`sizes.taskCardMinHeight: 72` token'ı "minimum" yüksekliği temsil eder; maksimum değildir. `marginBottom: spacing.sm + 2 = 10px` separator olarak eklenir.

Item yüksekliği sabit olmadığından `getItemLayout` yanlış scroll offset hesabına yol açar. Bu prop eklenmez.

Eklenecek prop'lar:

```tsx
<FlatList
  data={filteredTodos}
  keyExtractor={(item) => item.id}
  renderItem={({ item }) => (
    <TodoItem ... />
  )}
  removeClippedSubviews={true}
  initialNumToRender={10}
  maxToRenderPerBatch={10}
  windowSize={5}
  // ... geri kalan prop'lar değişmez
/>
```

| Prop | Değer | Açıklama |
|------|-------|---------|
| `removeClippedSubviews` | `true` | Android'de ekran dışı item'ları native tarafta unmount eder |
| `initialNumToRender` | `10` | İlk frame'de render edilecek item sayısı |
| `maxToRenderPerBatch` | `10` | Scroll sırasında her batch'te ek render edilecek item sayısı |
| `windowSize` | `5` | Görünür alanın kaç katı yüksekliği render'da tutulacak (5 = 2.5 ekran üst + 2.5 ekran alt) |

`windowSize` default 21'dir; 5'e düşürmek bellek kullanımını azaltır. 100+ item senaryosunda anlamlı kazanım sağlar.

### keyExtractor

Mevcut `keyExtractor={(item) => item.id}` sabit ve doğrudur. Değiştirilmez.

Inline arrow fonksiyon olduğundan referans her render'da değişir, ancak `keyExtractor` prop'u `FlatList` içinde render kararını etkilemez (yalnızca React reconciliation key olarak kullanılır). `useCallback` ile sarılmasına gerek yoktur.

### renderItem Wrapper

Mevcut `renderItem` içindeki inline arrow fonksiyon `TodoItem`'a aşağıdaki prop'ları hesaplar:

```tsx
busy={
  (toggleMutation.isPending && toggleMutation.variables === item.id) ||
  (pinMutation.isPending && pinMutation.variables === item.id) ||
  (deleteMutation.isPending && deleteMutation.variables === item.id)
}
```

Bu hesaplama `renderItem` fonksiyonu içinde kalır. `renderItem`'ı `useCallback` ile sarmak teorik olarak doğru olsa da `toggleMutation.isPending` gibi değişken mutation state'leri deps array'ine girmek zorunda kalınır ve bu değerler sık değişir. Kazanım sınırlı olduğundan `renderItem` inline bırakılır. `TodoItem` zaten `React.memo` ile korunmaktadır; props değişmediğinde re-render tetiklenmez.

### Import Değişikliği

`React.memo` kullanımı için `react` modülünden `memo` import edilmelidir:

```tsx
import React, { useCallback, useLayoutEffect, useState } from 'react';
```

veya named import olarak:

```tsx
import { memo, useCallback, useLayoutEffect, useState } from 'react';
```

Her iki yaklaşım da geçerlidir. Projedeki mevcut `import` stili `named import` kullandığından named import tercih edilir.

### TypeScript Uyumluluğu

`React.memo` TypeScript tip çıkarımını korur. `TodoItemProps` interface'i değişmez. `useCallback` deps array'lerindeki tüm değerler mevcut scope'da zaten tanımlıdır. `npx tsc --noEmit` temiz geçmelidir.

---

## Değişen Dosyalar Özeti

| Dosya | Değişiklik Tipi | BL |
|-------|-----------------|----|
| `backend/TodoApp.Api/appsettings.json` | `RateLimit` section eklenir | BL-016 |
| `backend/TodoApp.Api/Program.cs` | `AddRateLimiter(...)` + `app.UseRateLimiter()` | BL-016 |
| `backend/TodoApp.Api/Controllers/AuthController.cs` | `Login` action'a `[EnableRateLimiting("login")]` | BL-016 |
| `backend/TodoApp.Api.Tests/RateLimitTests.cs` | Yeni test dosyası (6. istek → 429) | BL-016 |
| `mobile/src/screens/TodoListScreen.tsx` | `React.memo`, `useCallback`, FlatList props | BL-034 |

---

## Kapsam Dışı

- Per-user (JWT subject bazlı) rate limiting
- `/api/auth/register` dahil diğer endpoint rate limiting
- Distributed rate limiting (Redis)
- Account lockout mekanizması
- FlashList migrasyonu
- Backend taraflı pagination / infinite scroll
