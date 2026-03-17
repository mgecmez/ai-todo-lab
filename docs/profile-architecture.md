# Profil Yönetimi Mimarisi — v0.7.0

Versiyon: 1.0
Tarih: 2026-03-17
Hazırlayan: Architect Agent
Kapsam: Backend profil endpoint'leri + Frontend profil ekranları
Kaynak Spec: `docs/profile-spec.md`
Bağımlı Dokümanlar: `docs/auth-architecture.md`, `docs/service-layer-architecture.md`

---

## 1. Genel Yaklaşım

v0.6.0 ile kurulan JWT altyapısı bu feature'ın temelidir. Mevcut `AuthController`, `IUserService`, `UserService`, `IUserRepository` ve `AuthContext` genişletilerek profil yönetimi hayata geçirilir.

### Entegrasyon Stratejisi

Mevcut bileşenlerle etkileşim noktaları:

| Mevcut Bileşen | Bu Feature'daki Değişimi |
|----------------|--------------------------|
| `AuthController` | Dört yeni action eklenir (`GET /me`, `PUT /email`, `PUT /password`, `DELETE /account`) |
| `IUserService` | Dört yeni metod imzası eklenir |
| `UserService` | Yeni metodların implementasyonu |
| `IUserRepository` | Üç yeni metod imzası eklenir |
| `EfUserRepository` | Yeni metodların EF Core implementasyonu |
| `AuthContext` | `updateEmail()` fonksiyonu ve `AuthContextValue` interface'i genişletilir |
| `AppStackParamList` | `Profile`, `ChangeEmail`, `ChangePassword` route'ları eklenir |

Hesap silme operasyonu kullanıcıya ait tüm `Todo` kayıtlarını da siler. Bu operasyonun nasıl gerçekleştirileceği Bölüm 7'de kararlaştırılmıştır.

---

## 2. Backend API Contract

Tüm endpoint'ler `[Authorize]` attribute ile korunur. Token, `Authorization: Bearer <token>` header'ı ile iletilir. `userId`, token'daki `sub` claim'inden (`ClaimTypes.NameIdentifier`) okunur.

### Endpoint Tablosu

| Method | Path | Auth | Başarı | Olası Hatalar |
|--------|------|------|--------|---------------|
| `GET` | `/api/auth/me` | Bearer | `200 OK` | `401` token yok/geçersiz |
| `PUT` | `/api/auth/email` | Bearer | `200 OK` | `400` format/aynı email, `401` yanlış şifre, `409` email çakışması |
| `PUT` | `/api/auth/password` | Bearer | `200 OK` | `400` kısa/aynı şifre, `401` yanlış mevcut şifre |
| `DELETE` | `/api/auth/account` | Bearer | `204 No Content` | `401` yanlış şifre |

---

### GET /api/auth/me

**Amaç:** Giriş yapan kullanıcının profil bilgilerini döner.

**Request:** Body yok. Header'da geçerli Bearer token zorunlu.

**Response — 200 OK:**
```json
{
  "userId":    "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email":     "user@example.com",
  "createdAt": "2026-01-15T10:30:00Z"
}
```

**Response — 401 Unauthorized:** Token yok veya geçersiz — body yok (ASP.NET Core JWT middleware tarafından otomatik üretilir).

---

### PUT /api/auth/email

**Amaç:** Kullanıcının email adresini değiştirir.

**Request Body:**
```json
{
  "currentPassword": "mevcutSifre123",
  "newEmail":        "yeni@example.com"
}
```

**Validasyon sırası (sunucu tarafı, sıralı):**
1. `currentPassword` boş olamaz — `400`
2. `newEmail` geçerli email formatı — `400`
3. `currentPassword` ile mevcut şifre doğrulanır — `401`
4. `newEmail` mevcut email ile aynı mı — `400`
5. `newEmail` sistemde başka bir kullanıcıya ait mi — `409`

**Response — 200 OK:**
```json
{
  "userId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email":  "yeni@example.com"
}
```

**Response — 400 Bad Request (format/aynı email):**
```json
{
  "status":  400,
  "message": "Geçersiz istek.",
  "errors":  { "newEmail": ["Geçerli bir e-posta adresi girin."] }
}
```
ya da
```json
{
  "status":  400,
  "message": "Yeni e-posta adresiniz mevcut adresinizle aynı.",
  "errors":  {}
}
```

**Response — 401 Unauthorized:**
```json
{
  "status":  401,
  "message": "Mevcut şifreniz hatalı.",
  "errors":  {}
}
```

**Response — 409 Conflict:**
```json
{
  "status":  409,
  "message": "Bu e-posta adresi zaten kullanımda.",
  "errors":  {}
}
```

**Not:** Email değişikliği sonrası yeni JWT token üretilmez. Mevcut token, `sub` (userId) claim'i üzerinden çalışmaya devam eder; `email` claim'i token yenilenene kadar eski değeri taşır. Bu bilinçli bir trade-off'tur (spec FR-B1 bunu açıkça kabul etmiştir).

---

### PUT /api/auth/password

**Amaç:** Kullanıcının şifresini değiştirir.

**Request Body:**
```json
{
  "currentPassword": "eskiSifrem123",
  "newPassword":     "yeniSifrem456"
}
```

**Validasyon sırası (sunucu tarafı, sıralı):**
1. `currentPassword` boş olamaz — `400`
2. `newPassword` minimum 8 karakter — `400`
3. `currentPassword` ile mevcut şifre doğrulanır — `401`
4. `newPassword` mevcut şifre ile aynı mı (hash karşılaştırma) — `400`

**Response — 200 OK:**
```json
{
  "message": "Şifre başarıyla güncellendi."
}
```

**Response — 400 Bad Request (kısa şifre):**
```json
{
  "status":  400,
  "message": "Geçersiz istek.",
  "errors":  { "newPassword": ["Şifre en az 8 karakter olmalıdır."] }
}
```

**Response — 400 Bad Request (aynı şifre):**
```json
{
  "status":  400,
  "message": "Yeni şifreniz mevcut şifrenizle aynı olamaz.",
  "errors":  {}
}
```

**Response — 401 Unauthorized:**
```json
{
  "status":  401,
  "message": "Mevcut şifreniz hatalı.",
  "errors":  {}
}
```

---

### DELETE /api/auth/account

**Amaç:** Kullanıcı hesabını ve tüm todo verilerini kalıcı olarak siler.

**Request Body:**
```json
{
  "currentPassword": "sifremi biliyorum"
}
```

**Validasyon:**
1. `currentPassword` boş olamaz — `400`
2. `currentPassword` ile mevcut şifre doğrulanır — `401`
3. Doğrulama başarılı — cascade silme uygulanır

**Response — 204 No Content:** Body yok.

**Response — 401 Unauthorized:**
```json
{
  "status":  401,
  "message": "Şifreniz hatalı.",
  "errors":  {}
}
```

---

## 3. IUserService Genişletmesi

`IUserService` arayüzüne aşağıdaki dört metod eklenir. Mevcut `RegisterAsync` ve `LoginAsync` imzaları değişmez (backward compat korunur).

```csharp
public interface IUserService
{
    // --- Mevcut metodlar (değişmez) ---
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse?> LoginAsync(LoginRequest request);

    // --- Yeni metodlar ---

    /// <summary>
    /// Kullanıcının profil bilgilerini döner.
    /// Kullanıcı bulunamazsa null döner (Controller → 404 — pratikte token geçerliyse olmaz).
    /// </summary>
    Task<UserProfileResponse?> GetProfileAsync(string userId);

    /// <summary>
    /// Kullanıcının email adresini değiştirir.
    /// Yanlış şifre → WrongPasswordException
    /// Aynı email → SameEmailException
    /// Email çakışması → UserAlreadyExistsException
    /// </summary>
    Task<UserProfileResponse> ChangeEmailAsync(string userId, ChangeEmailRequest request);

    /// <summary>
    /// Kullanıcının şifresini değiştirir.
    /// Yanlış şifre → WrongPasswordException
    /// Aynı şifre → SamePasswordException
    /// </summary>
    Task ChangePasswordAsync(string userId, ChangePasswordRequest request);

    /// <summary>
    /// Kullanıcı hesabını ve tüm todo verilerini siler.
    /// Yanlış şifre → WrongPasswordException
    /// </summary>
    Task DeleteAccountAsync(string userId, DeleteAccountRequest request);
}
```

### Exception Sınıfları

Bu metodlar iş kuralı ihlali durumlarında exception fırlatır; Controller bu exception'ları yakalar ve uygun HTTP durum kodlarına çevirir. Mevcut `UserAlreadyExistsException` pattern'ı korunur.

| Exception | Controller Yanıtı |
|-----------|-------------------|
| `WrongPasswordException` | `401 Unauthorized` |
| `SameEmailException` | `400 Bad Request` |
| `SamePasswordException` | `400 Bad Request` |
| `UserAlreadyExistsException` | `409 Conflict` (mevcut) |

Exception dosyaları: `backend/TodoApp.Api/Exceptions/` klasörüne eklenir.

---

## 4. IUserRepository Genişletmesi

`IUserRepository` arayüzüne üç yeni metod eklenir. Mevcut `GetByEmailAsync` ve `AddAsync` imzaları değişmez.

```csharp
public interface IUserRepository
{
    // --- Mevcut metodlar (değişmez) ---
    Task<User?> GetByEmailAsync(string email);
    Task<User> AddAsync(User user);

    // --- Yeni metodlar ---

    /// <summary>
    /// Kullanıcıyı ID ile getirir. Bulunamazsa null döner.
    /// </summary>
    Task<User?> GetByIdAsync(Guid userId);

    /// <summary>
    /// Kullanıcı bilgilerini günceller (email ve/veya PasswordHash).
    /// Güncellenmiş User entity'sini döner.
    /// </summary>
    Task<User> UpdateAsync(User user);

    /// <summary>
    /// Kullanıcıyı ve sahip olduğu tüm Todo kayıtlarını siler.
    /// Bölüm 7'deki cascade strateji kararına göre implementasyon yapılır.
    /// </summary>
    Task DeleteAsync(Guid userId);
}
```

`GetByIdAsync` hem `ChangeEmailAsync` hem `ChangePasswordAsync` hem de `DeleteAccountAsync` akışlarında kullanılır. UserService, token'dan gelen `userId` string'ini `Guid.Parse()` ile çevirir.

---

## 5. DTO'lar

Tüm yeni DTO'lar `backend/TodoApp.Api/DTOs/Auth/` klasörüne yerleştirilir. Mevcut `RegisterRequest`, `LoginRequest`, `AuthResponse` dosyaları değişmez.

### UserProfileResponse.cs

```csharp
namespace TodoApp.Api.DTOs.Auth;

public class UserProfileResponse
{
    public string   UserId    { get; set; } = string.Empty;
    public string   Email     { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }   // UTC
}
```

### ChangeEmailRequest.cs

```csharp
using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs.Auth;

public class ChangeEmailRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string NewEmail { get; set; } = string.Empty;
}
```

**Not:** `[EmailAddress]` attribute ModelState validasyonunu tetikler; format hataları Controller'a ulaşmadan `400` döner. Dolayısıyla UserService içinde format validasyonu tekrarlanmaz.

### ChangePasswordRequest.cs

```csharp
using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs.Auth;

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;
}
```

**Not:** `[MinLength(8)]` ModelState tarafından yakalanır; UserService'e gelen request'te `NewPassword` zaten en az 8 karakterdir.

### DeleteAccountRequest.cs

```csharp
using System.ComponentModel.DataAnnotations;

namespace TodoApp.Api.DTOs.Auth;

public class DeleteAccountRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
}
```

---

## 6. AuthController Genişletmesi — Karar ve Gerekçe

### Karar: Yeni Action'lar AuthController'a Eklenir (Ayrı ProfileController Açılmaz)

Yeni dört endpoint (`GET /me`, `PUT /email`, `PUT /password`, `DELETE /account`) mevcut `AuthController`'a eklenir.

**Gerekçe:**

| Kriter | AuthController'a Ekle | Ayrı ProfileController |
|--------|-----------------------|------------------------|
| Route tutarlılığı | Tüm endpoint'ler `/api/auth/` prefix'i altında kalır; spec bu path'leri böyle tanımlamıştır | Spec'e aykırı path değişikliği gerekir |
| Bağımlılık | Tüm metodlar `IUserService`'e bağımlı; mevcut DI kaydı yeterli | Aynı servis için ikinci controller, DI duplikasyonu |
| Kapsam | Kullanıcı kimliğiyle doğrudan ilgili işlemler (email, şifre, hesap) auth bağlamına aittir | Profil fotoğrafı, display name gibi alanlar ayrı controller'ı haklı kılar; bu özellikler kapsam dışıdır |
| Büyüklük | AuthController toplamda 6 action içerecek — yönetilebilir | Bu sprint için gereksiz bölünme |

Gelecekte display name, avatar gibi özellikler eklenirse o aşamada `ProfileController` açılması değerlendirilebilir. Bu karar `ProfileController` açılmasını kalıcı olarak engellemez.

### Güncellenmiş AuthController İmzaları

```csharp
[ApiController]
[Route("api/auth")]
public class AuthController(IUserService userService) : ControllerBase
{
    // --- Mevcut action'lar (değişmez) ---
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request);

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request);

    // --- Yeni action'lar ---

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetProfile();
    // → 200 OK + UserProfileResponse
    // → 401 (middleware)

    [Authorize]
    [HttpPut("email")]
    public async Task<IActionResult> ChangeEmail([FromBody] ChangeEmailRequest request);
    // → 200 OK + UserProfileResponse (güncel email ile)
    // → 400 (format/aynı email)
    // → 401 (yanlış şifre)
    // → 409 (email çakışması)

    [Authorize]
    [HttpPut("password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request);
    // → 200 OK + { message: "Şifre başarıyla güncellendi." }
    // → 400 (kısa/aynı şifre)
    // → 401 (yanlış şifre)

    [Authorize]
    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount([FromBody] DeleteAccountRequest request);
    // → 204 No Content
    // → 401 (yanlış şifre)
}
```

`userId` her yeni action'da şu pattern ile elde edilir:

```csharp
private string CurrentUserId =>
    User.FindFirstValue(ClaimTypes.NameIdentifier)!;
```

Bu pattern `TodosController`'da mevcut olup aynı yaklaşım AuthController'a taşınır.

---

## 7. Cascade Delete Stratejisi — Karar ve Gerekçe

### Karar: Servis Katmanında Explicit Silme (`IUserRepository.DeleteAsync` içinde)

Kullanıcı hesabı silinirken ilgili Todo kayıtları EF Core navigation property cascade ile değil, repository metodunun kendi implementasyonunda explicit sıralı silme ile temizlenir.

**Gerekçe:**

| Yaklaşım | Avantaj | Dezavantaj |
|----------|---------|------------|
| **EF Core Cascade Delete** (`OnDelete(Cascade)`) | Otomatik, migration sonrası DB seviyesinde çalışır | `User` - `Todo` arasında EF Core foreign key ilişkisi tanımlanmamıştır. `Todo.UserId` `string?` (nullable) olup `User.Id` (Guid) ile farklı tipte; explicit FK mapping olmadan cascade çalışmaz. Migration eklenmesi gerekir ve var olan nullable tasarımı değiştirir. |
| **Servis katmanı (Seçildi)** | Mevcut `Todo.UserId` tasarımı değişmez. `AppDbContext` konfigürasyonu dokunulmaz. Herhangi bir migration gerekmez. Test edilmesi daha kolay. | Silme iki adımlı (`DeleteTodosAsync` + `DeleteUserAsync`); DB transaction gerektirir. |

**Implementasyon Notu:**

`EfUserRepository.DeleteAsync(Guid userId)` implementasyonu DB transaction içinde çalışmalıdır:

```
BEGIN TRANSACTION
  DELETE FROM Todos WHERE UserId = userId.ToString()
  DELETE FROM Users WHERE Id = userId
COMMIT
```

EF Core `DbContext.SaveChangesAsync()` tek bir transaction'da birden fazla silme işlemini atomik olarak işler; `ExecuteDeleteAsync` ile doğrudan SQL da tercih edilebilir.

**Neden EF Core Cascade migration eklenmedi:**

`auth-architecture.md` Bölüm 1.2'de `Todo.UserId` alanı bilinçli olarak `string?` (nullable) tasarlanmıştır. Cascade FK eklemek bu kararı geri alır, mevcut NULL kayıtlarını bozabilir ve Migration 5 numaralı migration gerektirir. Bu sprint'in scope'u bu schema değişikliğini haklı kılmamaktadır.

---

## 8. Frontend Navigasyon

### AppStackParamList Güncellemesi

`mobile/src/navigation/types.ts` dosyasındaki `AppStackParamList` genişletilir:

```typescript
export type AppStackParamList = {
  // --- Mevcut route'lar (değişmez) ---
  TodoList:   undefined;
  TodoForm:   { mode: 'create' } | { mode: 'edit'; todo: Todo };
  TaskDetail: { todo: Todo };

  // --- Yeni route'lar ---
  Profile:        undefined;
  ChangeEmail:    undefined;
  ChangePassword: undefined;
};

// Yeni screen props type alias'ları
export type ProfileScreenProps       = NativeStackScreenProps<AppStackParamList, 'Profile'>;
export type ChangeEmailScreenProps   = NativeStackScreenProps<AppStackParamList, 'ChangeEmail'>;
export type ChangePasswordScreenProps = NativeStackScreenProps<AppStackParamList, 'ChangePassword'>;
```

`RootStackParamList` alias'ı geriye dönük uyumluluk için korunur, değişmez.

### Modal Stratejisi

Üç yeni ekran için navigasyon tipi kararı:

| Ekran | Navigasyon Tipi | Gerekçe |
|-------|-----------------|---------|
| `ProfileScreen` | `push` (standart stack) | Todo listesinden ulaşılan bağımsız bir ekrandır; back button doğal geri dönüşü sağlar |
| `ChangeEmailScreen` | `push` (standart stack) | Form ekranı; ProfileScreen'den ileriye yönlendirme, başarıda pop ile dönüş |
| `ChangePasswordScreen` | `push` (standart stack) | Form ekranı; aynı pattern |
| Hesap Silme | Modal (inline, `ProfileScreen` içinde) | Spec FR-F4'te açıkça modal olarak tanımlanmıştır; ayrı bir route açmak gerekmez — React Native `Modal` komponenti ProfileScreen içinde render edilir |

**Hesap Silme Modal:** Ayrı bir stack route açılmaz. `ProfileScreen` içinde `useState<boolean>` ile kontrol edilen bir `Modal` komponenti kullanılır. Modal, şifre input'u + uyarı metni + "Hesabı Sil" + "Vazgeç" butonlarını içerir.

### TodoList'ten Profile'a Erişim

`TodoListScreen` header'ına bir ikon butonu (sağ üst köşe, profil/hesap ikonu) eklenir. Bu buton `navigation.navigate('Profile')` çağırır. Tasarım detayı UI Designer'a bırakılır.

### Navigasyon Akışları

```
TodoList → [profil ikonu] → Profile
  Profile → [Email Değiştir butonu] → ChangeEmail
    ChangeEmail → [başarı] → pop() → Profile (email güncellendi)
    ChangeEmail → [iptal/back] → pop() → Profile

  Profile → [Şifre Değiştir butonu] → ChangePassword
    ChangePassword → [başarı] → pop() → Profile (başarı toast)
    ChangePassword → [iptal/back] → pop() → Profile

  Profile → [Hesabı Sil butonu] → Modal açılır (aynı ekran)
    Modal → [Hesabı Sil, başarı] → logout() → AuthNavigator → LoginScreen
    Modal → [Vazgeç] → Modal kapanır
```

---

## 9. AuthContext Güncellemesi

`AuthContext` arayüzüne `updateEmail` fonksiyonu eklenir. Mevcut `login` ve `logout` imzaları değişmez.

### Güncellenmiş AuthContextValue Interface

```typescript
interface AuthContextValue extends AuthState {
  login:       (token: string, userId: string, email: string) => Promise<void>;
  logout:      () => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;  // YENİ
}
```

### updateEmail Fonksiyon Davranışı

```typescript
const updateEmail = useCallback(async (newEmail: string) => {
  // 1. SecureStore'daki email değerini güncelle
  await SecureStore.setItemAsync(KEY_EMAIL, newEmail);
  // 2. React state'i güncelle (re-render tetiklenir)
  setState(prev => ({ ...prev, email: newEmail }));
}, []);
```

**Neden SecureStore da güncelleniyor:** Uygulama kapatılıp açıldığında `restoreSession()` SecureStore'dan email okur. SecureStore güncellenmezse kullanıcı eski email ile restore edilir ve `ProfileScreen`'de eski email görünür. Token'daki `email` claim eski kalacağından (spec tasarım kararı) SecureStore tek kaynak olacaktır.

**Çağrı noktası:** `ChangeEmailScreen` içinde API çağrısı başarılı dönünce:

```typescript
await profileService.changeEmail(currentPassword, newEmail);
updateEmail(newEmail);   // AuthContext güncellenir
navigation.goBack();
```

---

## 10. profileService.ts

Dosya: `mobile/src/services/profile/profileService.ts`

`authService.ts` pattern'ı aynen korunur: `apiFetch` kullanılır, hata durumlarında Türkçe mesaj ile `Error` fırlatılır.

### Tipler

```typescript
// Dosya içinde tanımlanır; gerekirse types/ altına taşınabilir
export interface UserProfile {
  userId:    string;
  email:     string;
  createdAt: string;   // ISO 8601 UTC string — UI katmanında Date'e çevrilir
}
```

### Fonksiyon İmzaları

```typescript
/**
 * GET /api/auth/me
 * Mevcut kullanıcının profil bilgilerini getirir.
 */
export async function getProfile(): Promise<UserProfile>

/**
 * PUT /api/auth/email
 * Email adresini değiştirir.
 * Hata durumları:
 *   401 → Error("Mevcut şifreniz hatalı.")
 *   409 → Error("Bu e-posta adresi zaten kullanımda.")
 *   400 (format) → Error("Geçerli bir e-posta adresi girin.")
 *   400 (aynı)   → Error("Yeni e-posta adresiniz mevcut adresinizle aynı.")
 */
export async function changeEmail(
  currentPassword: string,
  newEmail: string,
): Promise<{ userId: string; email: string }>

/**
 * PUT /api/auth/password
 * Şifreyi değiştirir.
 * Hata durumları:
 *   401 → Error("Mevcut şifreniz hatalı.")
 *   400 (kısa)  → Error("Şifre en az 8 karakter olmalıdır.")
 *   400 (aynı)  → Error("Yeni şifreniz mevcut şifrenizle aynı olamaz.")
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<void>

/**
 * DELETE /api/auth/account
 * Hesabı ve tüm todo'ları siler.
 * Hata durumları:
 *   401 → Error("Şifreniz hatalı.")
 */
export async function deleteAccount(
  currentPassword: string,
): Promise<void>
```

### Dosya Yapısı

```
mobile/src/services/
├── auth/
│   └── authService.ts        ← Mevcut, değişmez
├── profile/
│   └── profileService.ts     ← YENİ (bu sprint)
├── api/
│   └── config.ts             ← Mevcut, değişmez
└── ...
```

### TanStack Query Kullanım Notu

`ProfileScreen`'de `getProfile()` çağrısı `useQuery` ile sarılır. Mutasyon fonksiyonları (`changeEmail`, `changePassword`, `deleteAccount`) `useMutation` ile kullanılır ancak bu mutation hook'ları profil ekranına özgüdür; genel `mutations/` klasörüne değil, `screens/profile/` altına inline tanımlanabilir ya da `src/mutations/` altına ayrı dosyalar olarak eklenebilir — Frontend Developer kararına bırakılır.

---

## 11. Bağımlılıklar ve Riskler

### Backend Bağımlılıklar

| Bağımlılık | Durum | Not |
|------------|-------|-----|
| `IUserRepository.GetByIdAsync` | Yeni — bu sprint'te eklenir | Tüm profil metodlarının ön koşulu |
| `AppDbContext` / EF Core transaction | Mevcut, yeterli | `DeleteAsync` transaction wrapper gerektirir |
| `PasswordHasher<User>` | Mevcut DI kaydı yeterli | `UserService` constructor'da hazır |
| Yeni Exception sınıfları | Yeni — bu sprint'te eklenir | `WrongPasswordException`, `SameEmailException`, `SamePasswordException` |
| Migration | **GEREKMİYOR** | `Todo.UserId` ve `Users` tablosu zaten mevcut; cascade FK eklenmediği için yeni migration yok |

### Frontend Bağımlılıklar

| Bağımlılık | Durum | Not |
|------------|-------|-----|
| `apiFetch` (`config.ts`) | Mevcut — tüm profil servisi buna bağımlı | v0.6.0'da hayata geçirildi |
| `useAuth` hook | Mevcut — `updateEmail` eklenerek genişletilir | AuthProvider'ı sarmalaması korunur |
| `AppStackParamList` | Genişletilecek | Mevcut 3 screen props type'ı değişmez |
| `expo-secure-store` | Mevcut NuGet/npm bağımlılığı | `updateEmail` içinde yeniden kullanılır |

### Riskler

| Risk | Olasılık | Etki | Önlem |
|------|----------|------|-------|
| Email değişikliği sonrası token'daki `email` claim'inin stale kalması | Kesin (tasarım gereği) | Düşük — userId claim'i korunur, API çağrıları etkilenmez | Spec'te belgelenmiştir; kullanıcıya görünmez |
| `DeleteAsync` transaction failure — kısmi silme | Düşük | Yüksek — orphan User veya orphan Todo'lar oluşabilir | EF Core transaction ile atomic implementasyon zorunlu |
| `changeEmail` başarılı fakat `updateEmail(AuthContext)` çağrılmadan ekran kapanırsa UI stale | Düşük | Düşük — `ProfileScreen` yeniden açıldığında `GET /api/auth/me` taze veri getirir | `useQuery` stale-while-revalidate ile düzelir; ek önlem gerekmez |
| Hesap silme sonrası AsyncStorage cache temizlenmezse eski todo'lar görünür | Orta | Düşük — kullanıcı farklı hesapla giriş yaparsa sorun olmaz; aynı cihaz farklı hesap senaryosunda cache anahtarı userId içerdiğinden örtüşme olmaz | `logout()` mevcut cache temizleme mantığı yeterli |
| `ChangePasswordScreen`'de "Yeni Şifre Tekrar" alanı API'ye gönderilmez | Kesin (tasarım gereği) | Sıfır — istemci taraflı validasyon sorumluluğu | Frontend Developer `newPassword !== confirmPassword` kontrolü API çağrısından önce uygular |

---

## 12. Dosya Değişim Özeti

### Backend — Yeni Dosyalar

| Dosya | İçerik |
|-------|--------|
| `DTOs/Auth/UserProfileResponse.cs` | Profil response DTO |
| `DTOs/Auth/ChangeEmailRequest.cs` | Email değişikliği request DTO |
| `DTOs/Auth/ChangePasswordRequest.cs` | Şifre değişikliği request DTO |
| `DTOs/Auth/DeleteAccountRequest.cs` | Hesap silme request DTO |
| `Exceptions/WrongPasswordException.cs` | Yanlış şifre exception |
| `Exceptions/SameEmailException.cs` | Aynı email exception |
| `Exceptions/SamePasswordException.cs` | Aynı şifre exception |

### Backend — Güncellenen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `Repositories/IUserRepository.cs` | 3 yeni metod eklenir |
| `Repositories/EfUserRepository.cs` | 3 yeni metod implementasyonu |
| `Services/IUserService.cs` | 4 yeni metod eklenir |
| `Services/UserService.cs` | 4 yeni metod implementasyonu |
| `Controllers/AuthController.cs` | 4 yeni action eklenir |

### Frontend — Yeni Dosyalar

| Dosya | İçerik |
|-------|--------|
| `src/services/profile/profileService.ts` | Profil API çağrıları |
| `src/screens/profile/ProfileScreen.tsx` | Profil bilgileri + aksiyonlar + silme modal'ı |
| `src/screens/profile/ChangeEmailScreen.tsx` | Email değişikliği formu |
| `src/screens/profile/ChangePasswordScreen.tsx` | Şifre değişikliği formu |

### Frontend — Güncellenen Dosyalar

| Dosya | Değişiklik |
|-------|-----------|
| `src/navigation/types.ts` | `Profile`, `ChangeEmail`, `ChangePassword` route'ları + screen props type'ları |
| `src/context/AuthContext.tsx` | `updateEmail` fonksiyonu ve `AuthContextValue` interface genişletmesi |
| `src/screens/TodoListScreen.tsx` | Header'a profil ikonu + `navigation.navigate('Profile')` |
