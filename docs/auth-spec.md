# Feature: Kullanıcı Kimlik Doğrulama (Authentication) Sistemi

Versiyon: 1.0
Tarih: 2026-03-12
Hazırlayan: Product Manager Agent
Durum: Taslak
Hedef Sürüm: v0.6.0

---

## Overview & Goals

### Genel Bakış

Mevcut uygulamada tüm todo'lar paylaşılan, kimlik doğrulaması gerektirmeyen bir API üzerinden erişilebilir durumdadır. Bu durum iki temel soruna yol açmaktadır:

1. **Veri izolasyonu yok:** Tüm kullanıcılar birbirinin todo'larını görebilir, değiştirebilir veya silebilir.
2. **Kişiselleştirme imkânsız:** Todo'lar belirli bir kullanıcıya ait olmadığı için kullanıcıya özgü deneyim sunulamaz.

Bu feature, `email + password` tabanlı bir kimlik doğrulama sistemi ekleyerek her kullanıcının yalnızca kendi todo'larına erişmesini sağlar.

### Hedefler

| # | Hedef |
|---|-------|
| G-1 | Kullanıcılar email ve şifre ile kayıt olabilir |
| G-2 | Kayıtlı kullanıcılar giriş yaparak JWT token alabilir |
| G-3 | Todo endpoint'leri yalnızca authenticated kullanıcılara açık olur |
| G-4 | Her todo bir kullanıcıya ait olur; kullanıcı yalnızca kendi todo'larını görür |
| G-5 | Mobile uygulama token'ı güvenli depolarda saklar ve tüm API isteklerine ekler |
| G-6 | Giriş yapmamış kullanıcı otomatik olarak auth ekranına yönlendirilir |
| G-7 | Mevcut offline-first mimarisi ve reminder sistemi bozulmaz |
| G-8 | Mevcut migration geçmişi ve todo verileri korunur |

---

## User Stories

### US-1 — Kayıt Olma

As a new user, I want to register with my email and password, so that I can create a personal account and start managing my todos.

### US-2 — Giriş Yapma

As a registered user, I want to log in with my email and password, so that I can access my personal todos.

### US-3 — Oturumu Kapatma

As a logged-in user, I want to log out, so that my account is protected on shared devices.

### US-4 — Kimlik Doğrulama Zorunluluğu

As a user, I want to be redirected to the login screen if I'm not authenticated, so that I don't see an empty or broken state.

### US-5 — Kendi Todo'larını Görme

As a logged-in user, I want to see only my own todos, so that my data is private and not mixed with other users' data.

---

## Functional Requirements

### Backend

#### FR-B1 — Register Endpoint

- `POST /api/auth/register` endpoint'i oluşturulur
- Request body: `{ email: string, password: string }`
- Email format validasyonu yapılır
- Şifre minimum 8 karakter olmalıdır
- Aynı email ile kayıt denenirse `409 Conflict` döner
- Başarılı kayıt `201 Created` döner; response body: `{ token: string, userId: string, email: string }`
- Şifre hash (bcrypt veya ASP.NET Core Identity password hasher) kullanılır

#### FR-B2 — Login Endpoint

- `POST /api/auth/login` endpoint'i oluşturulur
- Request body: `{ email: string, password: string }`
- Geçersiz email veya şifrede `401 Unauthorized` döner (hangi alanın yanlış olduğu belirtilmez)
- Başarılı girişte `200 OK` döner; response body: `{ token: string, userId: string, email: string }`

#### FR-B3 — JWT Token Üretimi

- Başarılı register ve login işlemlerinde JWT access token üretilir
- Token payload: `userId`, `email`, `exp` (expiration) alanlarını içerir
- Token geçerlilik süresi: 7 gün
- Token imzalama algoritması: HS256 (symmetric key)
- Secret key uygulama konfigürasyonundan (`appsettings.json` / environment variable) okunur

#### FR-B4 — Auth Middleware

- Mevcut tüm todo endpoint'leri `[Authorize]` attribute ile korunur
- `Authorization: Bearer <token>` header'ı eksik veya geçersizse `401 Unauthorized` döner
- `GET /health`, `POST /api/auth/register`, `POST /api/auth/login` anonymous kalır

#### FR-B5 — UserId ile Todo İzolasyonu

- `Todo` entity'sine `UserId` (string) alanı eklenir
- `GET /api/todos`: Yalnızca `UserId == currentUser.Id` olan todo'lar döner
- `POST /api/todos`: Oluşturulan todo'ya `UserId` otomatik atanır
- `PUT`, `DELETE`, `PATCH /toggle`, `PATCH /pin`: Başka kullanıcının todo'suna erişim `404 Not Found` döner

#### FR-B6 — Migration Uyumluluğu

- Yeni `UserId` alanı migration ile eklenir; nullable (`string?`) olarak tanımlanır
- Mevcut todo kayıtları bozulmaz

#### FR-B7 — User Entity

- `User` entity'si: `Id` (GUID), `Email` (unique), `PasswordHash`, `CreatedAt`
- EF Core ile SQLite'a `Users` tablosu olarak yazılır

### Frontend

#### FR-F1 — Login Ekranı

- `LoginScreen` oluşturulur: Email + Şifre alanları, "Giriş Yap" butonu
- "Hesabın yok mu? Kayıt Ol" linki `RegisterScreen`'e yönlendirir
- Hata durumunda kullanıcı dostu Türkçe mesaj gösterilir

#### FR-F2 — Register Ekranı

- `RegisterScreen` oluşturulur: Email, Şifre, Şifre Tekrar alanları
- Şifre uyuşmazlığında yerel validasyon (API çağrısı yapılmadan)
- Başarılı kayıt → otomatik giriş → `TodoListScreen`

#### FR-F3 — Token Yönetimi

- JWT token `expo-secure-store` ile saklanır (`AsyncStorage` yerine)
- `SecureStore.setItemAsync("auth_token", token)` / `deleteItemAsync`

#### FR-F4 — Authorization Header

- Her API isteğine `Authorization: Bearer <token>` header'ı otomatik eklenir
- Token yoksa header eklenmez; kullanıcı auth ekranına yönlendirilir

#### FR-F5 — Auth Navigation

- Uygulama açılışında `SecureStore`'dan token okunur
- Token var → `TodoListScreen`, Token yok → `LoginScreen`
- API'den `401` gelirse token silinir, `LoginScreen`'e yönlendirilir

#### FR-F6 — Çıkış Yapma

- Token silinir, AsyncStorage cache temizlenir, `LoginScreen`'e yönlendirilir

#### FR-F7 — Offline-First ve Reminder Uyumluluğu

- `todosCacheService.ts` ve TanStack Query mutation queue değişmez
- `notificationService.ts`, `notificationRegistry.ts` değişmez
- AsyncStorage cache anahtarları kullanıcıya özel: `todos_cache_<userId>`

---

## Non-Functional Requirements

### Güvenlik

| # | Gereksinim |
|---|-----------|
| NFR-S1 | Şifreler hash olarak saklanır; düz metin yok |
| NFR-S2 | JWT secret key kaynak koduna hardcode edilmez |
| NFR-S3 | Token cihazda `expo-secure-store` ile saklanır |
| NFR-S4 | Başarısız login'de hangi alanın yanlış olduğu belirtilmez |
| NFR-S5 | Başka kullanıcının todo'suna erişimde `404 Not Found` döner |

### Performans

| # | Gereksinim |
|---|-----------|
| NFR-P1 | Login/register endpoint'leri 500 ms altında yanıt verir |
| NFR-P2 | JWT middleware token doğrulaması 50 ms altında |
| NFR-P3 | Uygulama açılışında token kontrolü 300 ms altında |

### Uyumluluk

| # | Gereksinim |
|---|-----------|
| NFR-C1 | Mevcut API kontratı değişmez; yalnızca `[Authorize]` eklenir |
| NFR-C2 | `ITodoRepository` ve `ITodoService` arayüzleri değişmez |
| NFR-C3 | Mevcut EF Core migration geçmişi korunur |
| NFR-C4 | `expo-secure-store` Expo managed workflow ile uyumludur |

---

## Out of Scope (Faz 2)

- Refresh token
- Şifre sıfırlama
- Email doğrulama
- Profil ekranı
- Sosyal giriş (Google, Apple)
- Rate limiting / brute-force koruması
- Token revocation

---

## Dependencies

| Bağımlılık | Açıklama |
|-----------|---------|
| `docs/service-layer-spec.md` | `ITodoService` / `TodoService` yapısı devreye alınmış olmalı |
| `expo-secure-store` | Yeni npm bağımlılığı |
| `Microsoft.AspNetCore.Authentication.JwtBearer` | Yeni NuGet bağımlılığı |

---

## Acceptance Criteria

### Backend

- [ ] `POST /api/auth/register` — geçerli input → `201 Created` + JWT token
- [ ] `POST /api/auth/register` — mevcut email → `409 Conflict`
- [ ] `POST /api/auth/register` — geçersiz email → `400 Bad Request`
- [ ] `POST /api/auth/login` — doğru kimlik → `200 OK` + JWT token
- [ ] `POST /api/auth/login` — yanlış şifre → `401 Unauthorized`
- [ ] `GET /api/todos` — token yok → `401 Unauthorized`
- [ ] `GET /api/todos` — geçerli token → yalnızca o kullanıcının todo'ları
- [ ] Kullanıcı A'nın todo'su, Kullanıcı B tokeni ile `PUT` → `404 Not Found`
- [ ] Şifreler veritabanında hash olarak saklanır
- [ ] `GET /health` token gerektirmez
- [ ] `dotnet test` mevcut tüm testler geçer

### Frontend

- [ ] `LoginScreen` — email + şifre alanları + "Giriş Yap" butonu
- [ ] `RegisterScreen` — şifre uyuşmazlığında yerel hata mesajı
- [ ] Başarılı giriş/kayıt → `TodoListScreen`
- [ ] JWT token `SecureStore`'a kaydedilir
- [ ] Uygulama açılışı: token var → `TodoListScreen`, yok → `LoginScreen`
- [ ] `401` yanıtı → token silinir + `LoginScreen`
- [ ] Çıkış → token silinir + cache temizlenir + `LoginScreen`
- [ ] Tüm API isteklerine `Authorization: Bearer <token>` header'ı
- [ ] Cache anahtarı: `todos_cache_<userId>`
- [ ] `npx tsc --noEmit` hatasız

---

## Success Metrics

| Metrik | Hedef |
|--------|-------|
| Register (geçerli input) başarı oranı | %100 |
| Login (doğru kimlik) başarı oranı | %100 |
| Yetkisiz erişim engelleme | %100 — her zaman `401` |
| Mevcut testlerin geçme oranı | %100 |
| Token saklama yöntemi | `SecureStore` — `AsyncStorage`'da token yok |
| Offline-first davranış | Giriş yapmış kullanıcı offline'da cache'ten todo görebilir |
| TypeScript hata sayısı | 0 |
