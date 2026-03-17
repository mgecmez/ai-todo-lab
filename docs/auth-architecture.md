# Authentication Mimarisi — v0.6.0

Versiyon: 1.0
Tarih: 2026-03-13
Hazırlayan: Architect Agent
Kapsam: Backend JWT Auth + Frontend AuthContext + Navigation refactoring
Kaynak Spec: `docs/auth-spec.md`
Bağımlı Dokümanlar: `docs/service-layer-architecture.md`, `docs/architecture.md`

---

## Genel Bakış

Bu belge v0.6.0 için Authentication sisteminin teknik mimarisini tanımlar. Spec'te tanımlanan hedefler (G-1 ile G-8) doğrultusunda backend ve frontend katmanlarında yapılacak tüm değişiklikler, yeni dosya yapıları, breaking change kararları ve migration stratejisi bu belgede belgelenmiştir.

Mevcut `ITodoService` / `ITodoRepository` arayüzlerinin **imzaları değişecektir**. Bu bir **breaking change**'dir ve bu belgedeki Bölüm 3.1'de gerekçeleriyle onaylanmıştır.

---

## 1. Backend Mimarisi

### 1.1 Yeni Dosya Yapısı

Aşağıdaki tablo authentication feature için oluşturulacak ve değiştirilecek backend dosyalarını özetler.

```
backend/TodoApp.Api/
├── Controllers/
│   ├── AuthController.cs             ← YENİ — register / login endpoint'leri
│   └── TodosController.cs            ← GÜNCELLENİR — [Authorize] + userId çıkarma
├── Data/
│   └── AppDbContext.cs               ← GÜNCELLENİR — DbSet<User> eklenir
├── DTOs/
│   ├── Auth/
│   │   ├── RegisterRequest.cs        ← YENİ
│   │   ├── LoginRequest.cs           ← YENİ
│   │   └── AuthResponse.cs           ← YENİ
│   ├── CreateTodoRequest.cs          ← Değişmez
│   └── UpdateTodoRequest.cs          ← Değişmez
├── Models/
│   ├── User.cs                       ← YENİ
│   └── Todo.cs                       ← GÜNCELLENİR — UserId string? alanı eklenir
├── Repositories/
│   ├── IUserRepository.cs            ← YENİ
│   ├── EfUserRepository.cs           ← YENİ
│   ├── ITodoRepository.cs            ← GÜNCELLENİR — userId parametresi (breaking change)
│   ├── EfTodoRepository.cs           ← GÜNCELLENİR — userId filtresi
│   └── InMemoryTodoRepository.cs     ← GÜNCELLENİR — yeni imzalara uyum
├── Services/
│   ├── IUserService.cs               ← YENİ — kayıt, giriş, token üretimi
│   ├── UserService.cs                ← YENİ
│   ├── ITodoService.cs               ← GÜNCELLENİR — userId parametresi (breaking change)
│   └── TodoService.cs                ← GÜNCELLENİR — userId iletimi
├── Migrations/
│   ├── ...InitialCreate              ← Korunur
│   ├── ...AddTaskManagementFields    ← Korunur
│   ├── ..._AddUsersTable.cs          ← YENİ (Migration 3)
│   └── ..._AddTodoUserId.cs          ← YENİ (Migration 4)
├── Validation/
│   └── NotWhitespaceAttribute.cs     ← Değişmez
└── Program.cs                        ← GÜNCELLENİR — JWT + Auth middleware
```

---

### 1.2 User Entity ve Migration Stratejisi

#### User Modeli

Dosya: `Models/User.cs`

| Alan | Tür | Kısıt | Açıklama |
|------|-----|-------|---------|
| `Id` | `Guid` | PK, zorunlu | `Guid.NewGuid()` — UserService tarafından atanır |
| `Email` | `string` | zorunlu, max 256, unique index | Küçük harfe normalize edilir |
| `PasswordHash` | `string` | zorunlu | Hash değeri; düz metin asla saklanmaz |
| `CreatedAt` | `DateTime` | zorunlu, UTC | `DateTime.UtcNow` — UserService tarafından atanır |

`AppDbContext.OnModelCreating()` içinde:
- `entity.HasIndex(u => u.Email).IsUnique()` — email benzersizliği DB seviyesinde de garanti altına alınır.
- `Email` max 256 karakter.
- `PasswordHash` max uzunluk kısıtı uygulanmaz (hash formatı değişebilir).

#### Todo.UserId Alanı

`Todo.cs` modeline şu alan eklenir:

```csharp
public string? UserId { get; set; }
```

**Nullable string? seçiminin gerekçesi:**
- Migration 4 uygulandığında mevcut tüm kayıtlar `NULL` olarak kalır — veri kaybı yoktur.
- Auth devreye girene kadar eski kayıtlar sistemde çalışmaya devam edebilir.
- Spec FR-B6 gereği mevcut todo kayıtları bozulmaz.

`AppDbContext` konfigürasyonu:

```csharp
entity.Property(t => t.UserId)
      .HasMaxLength(36);   // GUID string temsili: 36 karakter
```

`UserId` üzerine indeks eklenir; `GetAll(userId)` sorguları bu kolonu filtreler:

```csharp
entity.HasIndex(t => t.UserId);
```

#### Migration Sırası

| Sıra | Migration Adı | İçerik |
|------|--------------|--------|
| 1 | `InitialCreate` | Mevcut — dokunulmaz |
| 2 | `AddTaskManagementFields` | Mevcut — dokunulmaz |
| 3 | `AddUsersTable` | `Users` tablosu oluşturulur |
| 4 | `AddTodoUserId` | `Todos.UserId` nullable string alanı eklenir, index oluşturulur |

Migration 3 ve 4 ayrı tutulmuştur. Böylece `Users` tablosu oluşturulmadan `UserId` alanı eklenmez; rollback durumunda sadece `AddTodoUserId` geri alınabilir.

---

### 1.3 Password Hashing — Karar

**Karar: `PasswordHasher<User>` (Microsoft.AspNetCore.Identity.Core)**

Spec'te hem `PasswordHasher<User>` hem `BCrypt.Net-Next` seçeneği sunulmuştur. Değerlendirme:

| Kriter | `PasswordHasher<User>` | `BCrypt.Net-Next` |
|--------|-----------------------|--------------------|
| Ek NuGet paketi | Hayır — `Microsoft.AspNetCore.Identity.Core` ASP.NET Core 8 ile zaten gelir | Evet — harici paket |
| Algoritma | PBKDF2-SHA512, 100 000 iterasyon (v3 format) | bcrypt, work factor 12 |
| Identity framework kurulumu | Gerekmez — sadece `PasswordHasher<T>` sınıfı kullanılır | — |
| Bağımlılık riski | Çok düşük — Microsoft paket, aktif olarak güncellenir | Harici topluluk paketi |
| Yeterlilik | v0.6.0 güvenlik gereksinimleri için yeterli | Fazla güçlü, gereksiz bağımlılık |

**Gerekçe:** `Microsoft.AspNetCore.Identity.Core` paketi pratikte .NET 8 Web API projelerinde zaten bağımlılık zincirinde bulunur. PBKDF2-SHA512 endüstri standardına uygundur. BCrypt tek başına üstün değildir; aksine harici bir bağımlılık riski taşır. Identity framework'ün `UserManager`, `RoleManager` gibi ağır bileşenlerine ihtiyaç yoktur — sadece `PasswordHasher<User>` singleton olarak DI'a kaydedilir.

DI kaydı:

```csharp
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
```

---

### 1.4 JWT Üretimi ve Doğrulaması

#### NuGet Paketi

`Microsoft.AspNetCore.Authentication.JwtBearer` — .NET 8 için uygun sürüm.

#### appsettings.json Konfigürasyon Yapısı

```json
{
  "Jwt": {
    "Secret": "REPLACE_WITH_MIN_32_CHAR_SECRET_KEY",
    "Issuer": "TodoApp.Api",
    "Audience": "TodoApp.Mobile",
    "ExpiryDays": 7
  }
}
```

Üretim ortamında `Jwt__Secret` environment variable olarak sağlanır; `appsettings.json` içindeki değer placeholder olarak kalır ve kaynak koduna commit edilmez (bkz. Bölüm 5 — Güvenlik Checklist).

`appsettings.Development.json` test amaçlı secret içerebilir ancak `.gitignore`'a eklenmesi önerilir.

#### Token Claims

| Claim | Değer | Amaç |
|-------|-------|------|
| `sub` | `user.Id.ToString()` | UserId — `ClaimTypes.NameIdentifier` olarak erişilir |
| `email` | `user.Email` | Kullanıcı gösterimi |
| `jti` | `Guid.NewGuid().ToString()` | Token benzersizliği (gelecekteki revocation için hazırlık) |
| `exp` | `DateTime.UtcNow + ExpiryDays` | Token geçerlilik süresi |

#### Program.cs Middleware Kayıt Sırası

Mevcut `app.UseCors()` ve `app.UseAuthorization()` satırları değiştirilir. Doğru sıra:

```csharp
// Program.cs — builder konfigürasyonu (app.Build()'dan önce)
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = builder.Configuration["Jwt:Issuer"],
            ValidAudience            = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey         = new SymmetricSecurityKey(
                                           Encoding.UTF8.GetBytes(
                                               builder.Configuration["Jwt:Secret"]!))
        };
    });

builder.Services.AddAuthorization();

// Program.cs — middleware pipeline (app.Build()'dan sonra)
app.UseCors();
app.UseAuthentication();   // ← ÖNCE Authentication
app.UseAuthorization();    // ← SONRA Authorization
app.MapControllers();
```

**Kritik sıralama notu:** `UseAuthentication()` mevcut `UseAuthorization()`'dan önce eklenmezse `[Authorize]` attribute'ları çalışmaz. Mevcut `Program.cs`'te `UseAuthentication()` satırı yoktur; bu satır eklenmeden JWT doğrulaması gerçekleşmez.

---

### 1.5 AuthController API Kontratı

#### Endpoint Tablosu

| Method | Path | Auth | Başarı | Hata |
|--------|------|------|--------|------|
| `POST` | `/api/auth/register` | Anonymous | `201 Created` | `400` validation, `409` email çakışması |
| `POST` | `/api/auth/login` | Anonymous | `200 OK` | `401 Unauthorized` |

#### Request DTO'ları

**`RegisterRequest`** — `DTOs/Auth/RegisterRequest.cs`

```csharp
public class RegisterRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}
```

**`LoginRequest`** — `DTOs/Auth/LoginRequest.cs`

```csharp
public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}
```

#### Response DTO

**`AuthResponse`** — `DTOs/Auth/AuthResponse.cs`

```csharp
public class AuthResponse
{
    public string Token   { get; set; } = string.Empty;
    public string UserId  { get; set; } = string.Empty;
    public string Email   { get; set; } = string.Empty;
}
```

#### AuthController İmzaları

```csharp
[ApiController]
[Route("api/auth")]
public class AuthController(IUserService userService) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request);
    //  → 201 Created + AuthResponse
    //  → 400 Bad Request (validation)
    //  → 409 Conflict (email zaten kayıtlı)

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request);
    //  → 200 OK + AuthResponse
    //  → 401 Unauthorized (email bulunamadı veya şifre yanlış — tek mesaj)
}
```

`IUserService` ve `UserService` implementasyon detayları Bölüm 1.6'da açıklanmaktadır.

#### TodosController Değişiklikleri

```csharp
[ApiController]
[Route("api/todos")]
[Authorize]                           // ← TÜM ENDPOINT'LERE [Authorize]
public class TodosController(ITodoService service) : ControllerBase
{
    private string CurrentUserId =>
        User.FindFirstValue(ClaimTypes.NameIdentifier)!;
    // ... her metod UserId'yi bu property üzerinden alır
}
```

`HealthController` değişmez; `[AllowAnonymous]` veya `[Authorize]` attribute'u bulunmayan durum korunur (middleware sırası gereği auth bypass yapılır — health endpoint zaten korumasız). Tercihen `[AllowAnonymous]` attribute'u eksplisit eklenir.

---

### 1.6 IUserService ve ITodoService — Breaking Change

#### ADR-007 Onayı: ITodoRepository ve ITodoService İmza Değişikliği

Bu bir **breaking change**'dir. Architect olarak bu değişikliği onaylıyorum.

**Gerekçe:** Todo izolasyonu (FR-B5) için her repository ve service metodunun `userId` parametresi alması zorunludur. Alternatif yaklaşım (`IHttpContextAccessor` ile userId'yi service içinden okuma) Controller testlerini zorlaştırır ve Service'i HTTP bağlamına bağımlı kılar — bu katman tasarımını bozar. Parametrik geçme, açık bağımlılık kuralını korur.

**Etki alanı:** `InMemoryTodoRepository` entegrasyon testlerde artık kullanılmamaktadır (EF Core InMemory provider kullanan `EfTodoRepository` kullanılıyor). `InMemoryTodoRepository` yeni imzalara uyarlanacak ve test stub'ı olarak çalışmaya devam edecektir.

#### Yeni ITodoRepository İmzaları

```csharp
public interface ITodoRepository
{
    IReadOnlyList<Todo> GetAll(string userId);
    Todo? GetById(Guid id, string userId);
    Todo Add(Todo todo);                         // userId, todo.UserId içinde gelir
    Todo? Update(Guid id, string userId, Todo updated);
    bool Delete(Guid id, string userId);
    Todo? ToggleComplete(Guid id, string userId);
    Todo? TogglePin(Guid id, string userId);
}
```

**Sahiplik kontrol kuralı:** `GetById`, `Update`, `Delete`, `ToggleComplete`, `TogglePin` metodları hem `id` hem `userId` ile sorgular. Todo bulunmazsa veya `UserId` eşleşmezse `null` / `false` döner. Controller bu durumda `404 Not Found` döner (spec NFR-S5 gereği `403 Forbidden` değil).

#### Yeni ITodoService İmzaları

```csharp
public interface ITodoService
{
    IReadOnlyList<Todo> GetAll(string userId);
    Todo? GetById(Guid id, string userId);
    Todo Create(CreateTodoRequest request, string userId);
    Todo? Update(Guid id, UpdateTodoRequest request, string userId);
    bool Delete(Guid id, string userId);
    Todo? ToggleComplete(Guid id, string userId);
    Todo? TogglePin(Guid id, string userId);
}
```

#### IUserService

```csharp
public interface IUserService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    // → email normalize + hash + User kaydı + JWT üret
    // → email çakışmasında UserAlreadyExistsException (Controller → 409)

    Task<AuthResponse?> LoginAsync(LoginRequest request);
    // → email ile kullanıcı bul + hash doğrula + JWT üret
    // → başarısız → null (Controller → 401)
}
```

#### DI Kayıtları (Program.cs Eklentileri)

```csharp
// User altyapısı
builder.Services.AddScoped<IUserRepository, EfUserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
```

---

### 1.7 InMemoryTodoRepository Test Uyumu

`InMemoryTodoRepository` yeni imzalara uyarlanır. Her metodun `userId` parametresi alacak hali:

- `GetAll(userId)` — `_todos.Where(t => t.UserId == userId)` filtresi uygular.
- `GetById(id, userId)` — `t.Id == id && t.UserId == userId` koşulu ile arar.
- `Update`, `Delete`, `ToggleComplete`, `TogglePin` — aynı çift koşul.
- `Add(todo)` — değişmez; `todo.UserId` Service tarafından atanmış gelir.

**Test ortamı notu:** Mevcut entegrasyon testleri `CustomWebApplicationFactory` üzerinden `EfTodoRepository` (EF Core InMemory provider) kullanmaktadır. Bu testler `userId` parametresini sağlamalı ve test kullanıcısı oluşturma yardımcı metodu gerektirebilir. Backend Developer bu test adaptasyonunu yapacaktır. Test stratejisi `tasks/006-service-layer.md` referansıyla ilerletilmelidir.

---

## 2. Frontend Mimarisi

### 2.1 Yeni Dosya Yapısı

```
mobile/src/
├── screens/
│   ├── auth/
│   │   ├── LoginScreen.tsx           ← YENİ
│   │   └── RegisterScreen.tsx        ← YENİ
│   ├── TodoListScreen.tsx            ← Değişmez (AuthContext'ten userId alır)
│   ├── TodoFormScreen.tsx            ← Değişmez
│   └── TaskDetailScreen.tsx          ← Değişmez
├── services/
│   ├── auth/
│   │   └── authService.ts            ← YENİ — register / login / logout fonksiyonları
│   ├── api/
│   │   └── config.ts                 ← GÜNCELLENİR — token interceptor eklenir
│   └── notifications/                ← Değişmez
├── context/
│   └── AuthContext.tsx               ← YENİ — token, userId, email state yönetimi
├── navigation/
│   ├── types.ts                      ← GÜNCELLENİR — Auth stack route'ları eklenir
│   ├── AppNavigator.tsx              ← YENİ — authenticated stack (TodoList, TodoForm, TaskDetail)
│   ├── AuthNavigator.tsx             ← YENİ — unauthenticated stack (Login, Register)
│   └── RootNavigator.tsx             ← GÜNCELLENİR — isAuthenticated'e göre koşullu render
├── mutations/                        ← Değişmez
└── theme/                            ← Değişmez
```

**`src/context/`** klasörü yeni oluşturulacaktır.
**`src/services/auth/`** klasörü yeni oluşturulacaktır.

---

### 2.2 Auth State Yönetimi

#### AuthContext

Dosya: `src/context/AuthContext.tsx`

```typescript
interface AuthState {
  token:    string | null;
  userId:   string | null;
  email:    string | null;
  isLoading: boolean;   // SecureStore okuma tamamlanana kadar true
}

interface AuthContextValue extends AuthState {
  login:   (token: string, userId: string, email: string) => Promise<void>;
  logout:  () => Promise<void>;
}
```

**Başlangıç durumu:** `isLoading: true` — uygulama açılışında `SecureStore`'dan token restore edilene kadar herhangi bir navigator gösterilmez (splash/loading state).

**Persist stratejisi:**
- `SecureStore.setItemAsync("auth_token", token)`
- `SecureStore.setItemAsync("auth_userId", userId)`
- `SecureStore.setItemAsync("auth_email", email)`
- Logout: `SecureStore.deleteItemAsync` her anahtar için ayrı çağrılır.

#### useAuth Hook

```typescript
// src/context/AuthContext.tsx içinde export edilir
export function useAuth(): AuthContextValue
```

`useAuth()` — `AuthContext`'i sarmalar; context dışında çağrılırsa `Error` fırlatır.

#### App.tsx Değişikliği

`AuthProvider` en dışa sarılır:

```typescript
export default function App() {
  return (
    <AuthProvider>
      <PersistQueryClientProvider ...>
        <NavigationContainer ...>
          <RootNavigator />
          <StatusBar style="light" />
        </NavigationContainer>
      </PersistQueryClientProvider>
    </AuthProvider>
  );
}
```

`AuthProvider`, `PersistQueryClientProvider`'ın dışında olmalıdır. Böylece `queryClient` temizleme işlemleri AuthContext içinden güvenle çağrılabilir.

---

### 2.3 Navigation Yapısı

#### İki Stack Ayrımı

```
RootNavigator
├── isLoading → SplashScreen (veya null/ActivityIndicator)
├── isAuthenticated === false → AuthNavigator
│   ├── Login    (initialRoute)
│   └── Register
└── isAuthenticated === true  → AppNavigator
    ├── TodoList (initialRoute)
    ├── TodoForm
    └── TaskDetail
```

#### Yeni RootStackParamList Yapısı

`src/navigation/types.ts` dosyası genişletilir. Mevcut `RootStackParamList` artık `AppStackParamList` olarak yeniden adlandırılır:

```typescript
// Mevcut route'lar — AppStack'e taşınır
export type AppStackParamList = {
  TodoList:   undefined;
  TodoForm:   { mode: 'create' } | { mode: 'edit'; todo: Todo };
  TaskDetail: { todo: Todo };
};

// Yeni Auth stack
export type AuthStackParamList = {
  Login:    undefined;
  Register: undefined;
};
```

`RootNavigator.tsx` mevcut implementasyonu `AppNavigator.tsx`'e taşınır. `RootNavigator` artık sadece `isAuthenticated` durumunu okur ve iki stack arasında geçiş yapar.

**Geçiş animasyonu notu:** React Navigation `NavigationContainer` içinde stack değişimi otomatik olarak smooth geçiş yapacaktır. `isAuthenticated` değiştiğinde navigator yeniden render edilir.

---

### 2.4 API Interceptor

#### Mevcut config.ts Sorunları

Mevcut `config.ts` yalnızca `API_BASE_URL` export etmektedir. Token header ekleme ve 401 yönetimi için bu dosya genişletilmeli ya da `apiClient` singleton objesi oluşturulmalıdır.

#### Tasarım Kararı: Axios yerine Native Fetch Wrapper

Spec, axios zorunluluğu belirtmemiştir. Mevcut codebase `fetch` kullandığı varsayımıyla `fetch` üzerine ince bir wrapper tercih edilir. Bu yaklaşım yeni bağımlılık eklemez.

**`src/services/api/config.ts` güncelleme stratejisi:**

```typescript
// Mevcut export korunur (backward compat)
export const API_BASE_URL = `http://${HOST}:${PORT}`;

// Yeni: token-aware fetch wrapper
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> { ... }
```

`apiFetch` içindeki mantık:
1. `SecureStore.getItemAsync("auth_token")` ile token okunur.
2. Token varsa `Authorization: Bearer <token>` header'ı eklenir.
3. `fetch` çağrısı yapılır.
4. Response `401` ise `AuthContext.logout()` tetiklenir ve `LoginScreen`'e yönlendirilir.

**401 interceptor için navigation sorunu:** `apiFetch` bir servis dosyasındadır; React context'e doğrudan erişimi yoktur. Çözüm olarak şu yaklaşım seçilmiştir:

```typescript
// src/services/api/config.ts
type LogoutCallback = () => void;
let _onUnauthorized: LogoutCallback | null = null;

export function registerUnauthorizedCallback(fn: LogoutCallback): void {
  _onUnauthorized = fn;
}
```

`AuthProvider` mount'ta `registerUnauthorizedCallback(() => logout())` çağırır. Bu pattern, servisi context'e bağımlı kılmadan 401 tepkisi verir.

---

### 2.5 Cache Key Stratejisi

#### Mevcut Durum

TanStack Query cache anahtarları `['todos']` gibi kullanıcıdan bağımsız anahtarlar kullanmaktadır.

#### Yeni Strateji

Cache anahtarları userId içerecek şekilde güncellenir:

```typescript
// src/services/cache/cacheKeys.ts (oluşturulacak)
export const cacheKeys = {
  todos: (userId: string) => ['todos', userId] as const,
};
```

**AsyncStorage persist cache anahtarı:**

AsyncStorage'da cache `todos_cache_<userId>` anahtarıyla saklanır. Spec FR-F7 gereği bu strateji offline-first davranışı korur.

**Kullanıcı değişiminde cache temizliği:**

`AuthContext.logout()` içinde:
```typescript
await queryClient.clear();                                      // in-memory cache temizle
await AsyncStorage.removeItem(`todos_cache_${userId}`);         // persist cache temizle
```

Farklı bir kullanıcı giriş yaptığında önceki kullanıcının cache'i bellekte veya AsyncStorage'da kalmaz.

---

### 2.6 authService.ts

Dosya: `src/services/auth/authService.ts`

```typescript
interface AuthServiceResponse {
  token:  string;
  userId: string;
  email:  string;
}

export async function register(
  email: string,
  password: string
): Promise<AuthServiceResponse>

export async function login(
  email: string,
  password: string
): Promise<AuthServiceResponse>
```

Her iki fonksiyon da `apiFetch` kullanır. Hata durumlarında Türkçe kullanıcı mesajı ile `Error` fırlatır:
- `409` → `"Bu e-posta adresi zaten kullanımda."`
- `401` → `"E-posta veya şifre hatalı."`
- `400` → `"Geçersiz giriş bilgileri. Lütfen kontrol ediniz."`

---

## 3. Karar Günlüğü

### ADR-007 — ITodoRepository ve ITodoService İmzalarının Genişletilmesi (Breaking Change)

| Alan | Değer |
|------|-------|
| Tarih | 2026-03-13 |
| Durum | Kabul Edildi — Architect tarafından onaylandı |
| Karar Veren | Architect Agent |

**Bağlam:** Todo izolasyonu için her repository ve service metodunun `userId` parametresi alması gerekir. Bu mevcut imzaları değiştiren bir breaking change'dir.

**Seçenekler:**

| Seçenek | Açıklama | Sorun |
|---------|---------|-------|
| A — Parametre geçme (Seçildi) | Her metoda `string userId` eklenir | Interface değişir, mevcut implementasyonlar güncellenir |
| B — IHttpContextAccessor enjeksiyonu | Service HttpContext'ten userId okur | Service'i HTTP katmanına bağlar, unit test zorlaşır |
| C — Ayrı IUserScopedTodoService | Ayrı interface yazar, mevcut interface korunur | İki paralel interface, karmaşıklık artar |

**Karar:** Seçenek A. Temiz katman sınırları ve test edilebilirlik önceliklidir. Mevcut testler zaten entegrasyon seviyesinde çalışmakta olup adapte edilebilir.

---

### ADR-008 — Password Hasher Seçimi

| Alan | Değer |
|------|-------|
| Tarih | 2026-03-13 |
| Durum | Kabul Edildi |
| Karar | `PasswordHasher<User>` — harici NuGet paketi yok |

Detay: Bölüm 1.3'te açıklanmıştır.

---

### ADR-009 — Frontend 401 Interceptor Pattern

| Alan | Değer |
|------|-------|
| Tarih | 2026-03-13 |
| Durum | Kabul Edildi |
| Karar | Callback registry pattern (`registerUnauthorizedCallback`) |

**Gerekçe:** Service dosyaları React context'e bağımlı olamaz. Axios interceptor alternatifi yeni bağımlılık gerektirir. Callback registry yaklaşımı sıfır bağımlılıkla sorunu çözer ve test edilebilirdir.

---

### ADR-010 — AuthStack / AppStack Ayrımı

| Alan | Değer |
|------|-------|
| Tarih | 2026-03-13 |
| Durum | Kabul Edildi |
| Karar | İki ayrı navigator: `AuthNavigator` ve `AppNavigator` |

**Gerekçe:** `RootNavigator` içinde `isAuthenticated`'e göre conditional screen render yerine ayrı navigator'lar daha temiz bir yapı sunar. React Navigation'ın deep link ve type-safety mekanizmaları her stack için ayrı `ParamList` tanımını zorunlu kılar.

---

## 4. Migration Stratejisi

### Sıra ve Adlar

```
Migration 3: AddUsersTable
  - Oluşturur: Users tablosu (Id, Email, PasswordHash, CreatedAt)
  - Index: IX_Users_Email (unique)

Migration 4: AddTodoUserId
  - Ekler: Todos.UserId (string?, max 36)
  - Index: IX_Todos_UserId
  - Mevcut kayıtlar: UserId = NULL (veri kaybı yok)
```

### Komutlar

```bash
# Migration 3
dotnet ef migrations add AddUsersTable \
    --project backend/TodoApp.Api \
    --startup-project backend/TodoApp.Api

# Migration 4
dotnet ef migrations add AddTodoUserId \
    --project backend/TodoApp.Api \
    --startup-project backend/TodoApp.Api
```

Migration'lar otomatik olarak uygulama başlangıcında çalışır (`Program.cs` içindeki `dbContext.Database.Migrate()` bloğu korunur).

### Rollback Riski Analizi

| Senaryo | Risk | Önlem |
|---------|------|-------|
| Migration 4 rollback (`AddTodoUserId`) | Düşük — sadece nullable kolon siliniyor | Rollback öncesi veri yedeklenir |
| Migration 3 rollback (`AddUsersTable`) | Orta — Migration 4 uygulanmışsa önce 4 geri alınmalı | Migration sırası bağımlılığı belgelenmiştir |
| Mevcut todo kayıtları (Migration 1-2) | Sıfır — nullable UserId mevcut satırları etkilemez | Nullable tasarım kararı bu riski ortadan kaldırır |
| Production SQLite yedeksiz güncelleme | Yüksek | Deploy öncesi `todos.db` dosyası yedeklenir |

---

## 5. Güvenlik Checklist

### Secret Key Yönetimi

- [ ] `Jwt:Secret` minimum 32 karakter uzunluğunda olmalıdır (HS256 için 256-bit)
- [ ] `appsettings.json` içindeki `Secret` değeri placeholder; gerçek secret environment variable olarak sağlanır
- [ ] `appsettings.Development.json` `.gitignore`'a eklenir veya içine gerçek secret yazılmaz
- [ ] Production deploy'da `Jwt__Secret` environment variable set edilir

### Şifre Hash Doğrulaması

- [ ] `PasswordHasher<User>.HashPassword()` register sırasında çağrılır — düz metin DB'ye yazılmaz
- [ ] `PasswordHasher<User>.VerifyHashedPassword()` login sırasında kullanılır
- [ ] `VerifyHashedPassword` sonucu `PasswordVerificationResult.Failed` ise `401` döner (mesajda hangi alanın yanlış olduğu belirtilmez)
- [ ] Email normalize edilir (`.ToLowerInvariant()`) hem kayıt hem giriş sırasında

### JWT Expiry

- [ ] Token geçerlilik süresi 7 gün — `ExpiryDays: 7`
- [ ] `ValidateLifetime = true` — süresi dolmuş token reddedilir
- [ ] `exp` claim UTC olarak set edilir

### CORS Ayarları

- [ ] Mevcut `AllowAnyOrigin()` yapısı development için korunur
- [ ] Production için `AllowAnyOrigin()` kısıtlanmalıdır (v0.6.0 scope dışı — out of scope not olarak belgelenir)
- [ ] `Authorization` header'ı `AllowAnyHeader()` kapsamında zaten izinli

### Frontend Güvenlik

- [ ] JWT token `AsyncStorage` yerine `expo-secure-store` ile saklanır (cihaz güvenli depolama)
- [ ] Token `SecureStore.deleteItemAsync` ile logout'ta silinir
- [ ] AsyncStorage cache'e token yazılmaz
- [ ] `expo-secure-store` key'leri: `auth_token`, `auth_userId`, `auth_email`

---

## 6. Etkilenen Mevcut Özellikler

### Offline-First ve Sync Queue (v0.4.0)

`todosCacheService.ts` ve TanStack Query mutation queue değişmez. Ancak cache anahtarları kullanıcıya özel hale getirilir (Bölüm 2.5). Frontend Developer bu değişikliği mevcut `useTodos` hook ve mutation hook'larına yansıtacaktır.

### Local Reminders (v0.5.0)

`notificationService.ts` ve `notificationRegistry.ts` değişmez. Bildirim `todoId` ile eşleştirildiğinden kullanıcı değişiminde reminder'lar temizlenebilir. Bu edge case v0.6.0 kapsamında değil; out of scope olarak belgelenmiştir.

---

## 7. Teslim Edilecekler

Bu mimari belge tamamlandıktan sonra aşağıdaki görevler ilgili rollere aktarılır:

| Görev | Alıcı | Öncelik |
|-------|-------|---------|
| Migration 3 ve 4 oluşturma | Backend Developer | Yüksek |
| `User.cs`, `IUserRepository`, `EfUserRepository` | Backend Developer | Yüksek |
| `IUserService`, `UserService` (JWT üretimi dahil) | Backend Developer | Yüksek |
| `AuthController` (register + login) | Backend Developer | Yüksek |
| `ITodoRepository`, `ITodoService` imza güncellemesi | Backend Developer | Yüksek |
| `TodosController` `[Authorize]` + userId çıkarma | Backend Developer | Yüksek |
| `Program.cs` JWT middleware ekleme | Backend Developer | Yüksek |
| Entegrasyon testleri adaptasyonu | Backend Developer | Orta |
| `AuthContext.tsx`, `useAuth` hook | Frontend Developer | Yüksek |
| `LoginScreen.tsx`, `RegisterScreen.tsx` | Frontend Developer | Yüksek |
| `authService.ts` | Frontend Developer | Yüksek |
| `config.ts` interceptor güncelleme | Frontend Developer | Yüksek |
| `RootNavigator`, `AppNavigator`, `AuthNavigator` | Frontend Developer | Yüksek |
| Cache key stratejisi (`cacheKeys.ts`) | Frontend Developer | Orta |
| `LoginScreen` / `RegisterScreen` design spec | UI Designer | Orta |
