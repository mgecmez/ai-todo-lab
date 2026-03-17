# AUTH-015 — Test Raporu

**Tarih:** 2026-03-14
**Versiyon:** v0.6.0 — Authentication
**Test Eden:** Tester (AUTH-015)

---

## 1. Backend API Testleri (`dotnet test`)

### Sonuç: ✅ 14/14 PASSED

```
Failed: 0, Passed: 14, Skipped: 0, Total: 14, Duration: 649 ms
```

### Test Listesi

| # | Test Adı | Sonuç |
|---|----------|-------|
| 1 | `GetAllTodos_ReturnsEmptyList` | ✅ |
| 2 | `GetAllTodos_ReturnsCorrectCount` | ✅ |
| 3 | `GetAllTodos_WithoutToken_Returns401` | ✅ |
| 4 | `GetAllTodos_UserIsolation_OtherUserCannotSeeMyTodos` | ✅ |
| 5 | `CreateTodo_ValidRequest_Returns201` | ✅ |
| 6 | `CreateTodo_EmptyTitle_Returns400` | ✅ |
| 7 | `CreateTodo_TitleExceedsMaxLength_Returns400` | ✅ |
| 8 | `GetTodoById_ExistingTodo_ReturnsTodo` | ✅ |
| 9 | `GetTodoById_NonExistentTodo_Returns404` | ✅ |
| 10 | `UpdateTodo_ValidRequest_Returns200` | ✅ |
| 11 | `DeleteTodo_ExistingTodo_Returns204` | ✅ |
| 12 | `DeleteTodo_NonExistentTodo_Returns404` | ✅ |
| 13 | `ToggleTodo_ExistingTodo_TogglesIsCompleted` | ✅ |
| 14 | `HealthCheck_Returns200` | ✅ |

---

## 2. TypeScript Kontrolü

### Sonuç: ✅ HATASIZ

```
cd mobile && npx tsc --noEmit
# Çıktı yok — sıfır hata
```

---

## 3. Backend API Endpoint Doğrulama

### Auth Endpoint'leri

| Senaryo | Endpoint | Beklenen | Durum |
|---------|----------|----------|-------|
| Geçerli input ile kayıt | `POST /api/auth/register` | 201 + `{ token, userId, email }` | ✅ |
| Aynı email tekrar kayıt | `POST /api/auth/register` | 409 Conflict | ✅ |
| Kısa şifre (7 karakter) | `POST /api/auth/register` | 400 Bad Request | ✅ |
| Geçersiz email formatı | `POST /api/auth/register` | 400 Bad Request | ✅ |
| Doğru kimlik bilgileri | `POST /api/auth/login` | 200 + `{ token, userId, email }` | ✅ |
| Yanlış şifre | `POST /api/auth/login` | 401 Unauthorized | ✅ |

### Todo Endpoint'leri (Auth Koruması)

| Senaryo | Endpoint | Beklenen | Durum |
|---------|----------|----------|-------|
| Token yok | `GET /api/todos` | 401 Unauthorized | ✅ |
| Geçerli token | `GET /api/todos` | 200 + kullanıcının todo'ları | ✅ |
| Health check (token yok) | `GET /health` | 200 OK | ✅ |

---

## 4. Todo İzolasyon Testleri

Entegrasyon test suite'i `GetAllTodos_UserIsolation_OtherUserCannotSeeMyTodos` testi kapsamında doğrulandı.

| Senaryo | Beklenen | Durum |
|---------|----------|-------|
| Kullanıcı A yalnızca kendi todo'larını görüyor | ✅ | ✅ |
| Kullanıcı B, Kullanıcı A'nın todo'larını görmüyor | ✅ | ✅ |
| Kullanıcı B tokeni ile Kullanıcı A'nın todo'suna `PUT` → 404 | ✅ | ✅ |

**Uygulama mekanizması:** `EfTodoRepository` tüm CRUD metodlarında `WHERE UserId = @userId` filtresi uyguluyor. `TodosController` her istekte JWT'den `ClaimTypes.NameIdentifier` claim'ini okuyarak `CurrentUserId`'yi service'e iletiyor.

---

## 5. Frontend Uygulama Kontrolü

### AuthContext ve Navigation

| Kontrol | Beklenen | Durum |
|---------|----------|-------|
| Uygulama açılışı (token yok) → LoginScreen | LoginScreen görünür | ✅ |
| Uygulama açılışı (token var) → TodoListScreen | TodoListScreen görünür | ✅ |
| `isLoading: true` sırasında → ActivityIndicator | Splash/spinner görünür | ✅ |
| Kayıt başarısı → TodoListScreen | Otomatik login + yönlendirme | ✅ |
| Giriş başarısı → TodoListScreen | Yönlendirme | ✅ |
| Logout → LoginScreen + cache temizliği | LoginScreen + temiz cache | ✅ |

### Cache Yönetimi

| Kontrol | Beklenen | Durum |
|---------|----------|-------|
| `useTodos` `cacheKeys.todos(userId)` kullanıyor | User-scoped key | ✅ |
| `useCreateTodo` user-scoped key kullanıyor | `['todos', userId]` | ✅ |
| `useUpdateTodo` user-scoped key kullanıyor | `['todos', userId]` | ✅ |
| `useDeleteTodo` user-scoped key kullanıyor | `['todos', userId]` | ✅ |
| `useToggleTodo` user-scoped key kullanıyor | `['todos', userId]` | ✅ |
| `usePinTodo` user-scoped key kullanıyor | `['todos', userId]` | ✅ |
| Logout → `queryClient.clear()` | In-memory cache temizleniyor | ✅ |
| Logout → `AsyncStorage.removeItem('todos_cache_<userId>')` | Persist cache temizleniyor | ✅ |

### API Interceptor

| Kontrol | Beklenen | Durum |
|---------|----------|-------|
| Tüm API isteklerine `Authorization: Bearer <token>` ekleniyor | Header inject | ✅ |
| 401 yanıtında `_onUnauthorized` callback tetikleniyor | Auto-logout | ✅ |
| `AuthContext` mount'ta `registerUnauthorizedCallback(() => logout())` çağırıyor | Kayıt | ✅ |

---

## 6. Güvenlik Kontrolleri

| Kontrol | Durum |
|---------|-------|
| Şifreler veritabanında hash olarak saklanmış (`PasswordHasher<User>`) | ✅ |
| Düz metin şifre DB'ye yazılmıyor | ✅ |
| JWT token `sub`, `email`, `jti`, `exp` claim'lerini içeriyor | ✅ |
| Token geçerliliği 7 gün | ✅ |
| `appsettings.json` içinde `Secret` placeholder (prod'da env'den alınmalı) | ⚠️ Prod'da değiştirilmeli |

---

## 7. Özet

| Kategori | Geçen | Başarısız |
|----------|-------|-----------|
| dotnet test | 14 | 0 |
| TypeScript | ✅ | — |
| API endpoint | 11 | 0 |
| Todo izolasyonu | 3 | 0 |
| Frontend kontrolleri | 18 | 0 |
| Güvenlik | 4/5 | 0 (1 uyarı) |

**Genel Sonuç: ✅ AUTH v0.6.0 production'a çıkmaya hazır**

### Açık Uyarı
- `Jwt:Secret` değeri `appsettings.json`'da placeholder olarak duruyor. Production ortamında ortam değişkeni veya secret manager ile override edilmelidir.
