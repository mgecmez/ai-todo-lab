# Task List: 007 — Authentication (v0.6.0)

Source spec: `docs/auth-spec.md`
Architecture: `docs/auth-architecture.md`
Stack: .NET 8 / ASP.NET Core · EF Core + SQLite · Expo React Native · TypeScript · TanStack Query · expo-secure-store

---

## AUTH-001
**Owner:** Architect
**Title:** ITodoRepository ve ITodoService interface'lerini userId parametresi ile güncelle

### Description
`ITodoRepository` ve `ITodoService` interface'lerindeki tüm metod imzalarına `string userId` parametresi eklenir. Bu bir breaking change'dir (ADR-007). Sadece interface dosyaları güncellenir; implementasyon dosyaları bu ticket'ta değiştirilmez.

Mimarinin onayladığı yeni imzalar `docs/auth-architecture.md` Bölüm 1.6'da tanımlanmıştır.

### Steps
1. `backend/TodoApp.Api/Repositories/ITodoRepository.cs` dosyasını aç.
2. Aşağıdaki imzaları uygula:
   - `IReadOnlyList<Todo> GetAll(string userId)`
   - `Todo? GetById(Guid id, string userId)`
   - `Todo Add(Todo todo)` — imza değişmez, todo.UserId dolu gelecek
   - `Todo? Update(Guid id, string userId, Todo updated)`
   - `bool Delete(Guid id, string userId)`
   - `Todo? ToggleComplete(Guid id, string userId)`
   - `Todo? TogglePin(Guid id, string userId)`
3. `backend/TodoApp.Api/Services/ITodoService.cs` dosyasını aç.
4. Aşağıdaki imzaları uygula:
   - `IReadOnlyList<Todo> GetAll(string userId)`
   - `Todo? GetById(Guid id, string userId)`
   - `Todo Create(CreateTodoRequest request, string userId)`
   - `Todo? Update(Guid id, UpdateTodoRequest request, string userId)`
   - `bool Delete(Guid id, string userId)`
   - `Todo? ToggleComplete(Guid id, string userId)`
   - `Todo? TogglePin(Guid id, string userId)`
5. Dosyaları kaydet. Bu aşamada proje build edilemez — bu beklenen bir durumdur.

### Files Created
- (yok)

### Files Modified
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Services/ITodoService.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`
- `backend/TodoApp.Api/Repositories/InMemoryTodoRepository.cs`
- `backend/TodoApp.Api/Services/TodoService.cs`
- `backend/TodoApp.Api/Controllers/TodosController.cs`
- `backend/TodoApp.Api/Models/Todo.cs`

### Acceptance Criteria
- [ ] `ITodoRepository` dosyasındaki tüm metod imzaları `userId` parametresi içeriyor
- [ ] `ITodoService` dosyasındaki tüm metod imzaları `userId` parametresi içeriyor
- [ ] Interface dışında herhangi bir .cs dosyası değiştirilmemiş
- [ ] `docs/auth-architecture.md` Bölüm 1.6 ile imzalar birebir uyuşuyor

### Depends On
- `tasks/006-service-layer.md` tamamlanmış olmalı (ITodoService mevcut olmalı)

---

## AUTH-002
**Owner:** Architect
**Title:** IUserRepository ve IUserService interface contract'larını tanımla

### Description
`IUserRepository` ve `IUserService` interface dosyaları oluşturulur. `IUserService`, `RegisterRequest` ve `LoginRequest` DTO'ları alır; `AuthResponse` döner. Bu ticket sadece interface ve DTO dosyalarını içerir; implementasyon dosyaları AUTH-004 ve AUTH-005'te yazılacaktır.

### Steps
1. `backend/TodoApp.Api/DTOs/Auth/` klasörünü oluştur.
2. `RegisterRequest.cs` dosyasını oluştur — `Email`, `Password` alanları, `[Required]`, `[EmailAddress]`, `[MaxLength(256)]`, `[MinLength(8)]`, `[MaxLength(100)]` attribute'ları.
3. `LoginRequest.cs` dosyasını oluştur — `Email`, `Password` alanları, `[Required]`, `[EmailAddress]` attribute'ları.
4. `AuthResponse.cs` dosyasını oluştur — `Token`, `UserId`, `Email` string alanları.
5. `backend/TodoApp.Api/Repositories/IUserRepository.cs` dosyasını oluştur:
   - `Task<User?> GetByEmailAsync(string email)`
   - `Task<User> AddAsync(User user)`
6. `backend/TodoApp.Api/Services/IUserService.cs` dosyasını oluştur:
   - `Task<AuthResponse> RegisterAsync(RegisterRequest request)` — email çakışmasında `UserAlreadyExistsException` fırlatır
   - `Task<AuthResponse?> LoginAsync(LoginRequest request)` — başarısızlıkta `null` döner
7. `backend/TodoApp.Api/Exceptions/` klasörünü oluştur ve `UserAlreadyExistsException.cs` ekle.

### Files Created
- `backend/TodoApp.Api/DTOs/Auth/RegisterRequest.cs`
- `backend/TodoApp.Api/DTOs/Auth/LoginRequest.cs`
- `backend/TodoApp.Api/DTOs/Auth/AuthResponse.cs`
- `backend/TodoApp.Api/Repositories/IUserRepository.cs`
- `backend/TodoApp.Api/Services/IUserService.cs`
- `backend/TodoApp.Api/Exceptions/UserAlreadyExistsException.cs`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Services/ITodoService.cs`
- `backend/TodoApp.Api/DTOs/CreateTodoRequest.cs`
- `backend/TodoApp.Api/DTOs/UpdateTodoRequest.cs`

### Acceptance Criteria
- [ ] `DTOs/Auth/` klasörü altında üç DTO dosyası mevcut
- [ ] `RegisterRequest.cs` tüm validation attribute'larını içeriyor
- [ ] `IUserRepository.cs` `GetByEmailAsync` ve `AddAsync` metodlarını tanımlıyor
- [ ] `IUserService.cs` `RegisterAsync` ve `LoginAsync` metodlarını tanımlıyor
- [ ] `UserAlreadyExistsException` mevcut
- [ ] `docs/auth-architecture.md` Bölüm 1.5 ve 1.6 ile uyumlu
- [ ] `dotnet build` derlenebilir (interface'ler implementasyon gerektirmez)

### Depends On
- AUTH-001

---

## AUTH-003
**Owner:** Backend Developer
**Title:** User entity, AppDbContext güncellemesi ve EF Core migration'ları

### Description
`User` modeli oluşturulur, `Todo.cs`'e `UserId` alanı eklenir, `AppDbContext`'e `DbSet<User>` ve ilgili konfigürasyonlar eklenir. Ardından Migration 3 (`AddUsersTable`) ve Migration 4 (`AddTodoUserId`) üretilir. Mevcut migration geçmişi bozulmaz.

### Steps
1. `backend/TodoApp.Api/Models/User.cs` dosyasını oluştur: `Id` (Guid), `Email` (string), `PasswordHash` (string), `CreatedAt` (DateTime) alanları.
2. `backend/TodoApp.Api/Models/Todo.cs` dosyasını aç, `public string? UserId { get; set; }` alanını ekle.
3. `backend/TodoApp.Api/Data/AppDbContext.cs` dosyasını aç:
   - `DbSet<User> Users` ekle
   - `OnModelCreating`'e User konfigürasyonları ekle: email unique index (`IX_Users_Email`), `Email` max 256 karakter
   - Todo konfigürasyonuna `UserId` max 36 karakter ve `IX_Todos_UserId` index ekle
4. Migration 3'ü üret: `dotnet ef migrations add AddUsersTable`
5. Migration 4'ü üret: `dotnet ef migrations add AddTodoUserId`
6. `dotnet build` ve `dotnet run` ile migration'ların hatasız çalıştığını doğrula.

### Files Created
- `backend/TodoApp.Api/Models/User.cs`
- `backend/TodoApp.Api/Migrations/..._AddUsersTable.cs`
- `backend/TodoApp.Api/Migrations/..._AddTodoUserId.cs`

### Files Modified
- `backend/TodoApp.Api/Models/Todo.cs`
- `backend/TodoApp.Api/Data/AppDbContext.cs`

### Files Must NOT Be Modified
- Mevcut migration dosyaları (`InitialCreate`, `AddTaskManagementFields`)
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Services/ITodoService.cs`

### Acceptance Criteria
- [ ] `User.cs` modeli `docs/auth-architecture.md` Bölüm 1.2 ile uyumlu
- [ ] `Todo.cs` içinde `public string? UserId { get; set; }` mevcut
- [ ] `AppDbContext` içinde `DbSet<User> Users` tanımlı
- [ ] `IX_Users_Email` unique index migration'da mevcut
- [ ] `IX_Todos_UserId` index migration'da mevcut
- [ ] Mevcut iki migration dosyası değiştirilmemiş
- [ ] `dotnet run` sonrasında `Users` ve güncellenmiş `Todos` tabloları SQLite'ta oluşuyor
- [ ] Mevcut todo kayıtları bozulmamış, `UserId` kolonu `NULL` değer içeriyor

### Depends On
- AUTH-002

---

## AUTH-004
**Owner:** Backend Developer
**Title:** EfUserRepository implementasyonu

### Description
`IUserRepository` interface'inin EF Core implementasyonu yazılır. Email'e göre kullanıcı sorgulama ve yeni kullanıcı ekleme işlemleri `AppDbContext` üzerinden yapılır.

### Steps
1. `backend/TodoApp.Api/Repositories/EfUserRepository.cs` dosyasını oluştur.
2. `IUserRepository` interface'ini implemente et:
   - `GetByEmailAsync(string email)`: `email.ToLowerInvariant()` ile normalize edilmiş email ile sorgula
   - `AddAsync(User user)`: `Users.AddAsync` + `SaveChangesAsync`
3. `AppDbContext` constructor injection yap.
4. `dotnet build` ile derleme hatasız geçmeli.

### Files Created
- `backend/TodoApp.Api/Repositories/EfUserRepository.cs`

### Files Modified
- (yok — DI kaydı AUTH-009'da yapılacak)

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/IUserRepository.cs`
- `backend/TodoApp.Api/Data/AppDbContext.cs`
- `backend/TodoApp.Api/Models/User.cs`

### Acceptance Criteria
- [ ] `EfUserRepository`, `IUserRepository` interface'ini implemente ediyor
- [ ] `GetByEmailAsync` email'i normalize ederek (lowercase) sorguluyor
- [ ] `AddAsync` kullanıcıyı kaydedip dönüyor
- [ ] `dotnet build` hatasız

### Depends On
- AUTH-003

---

## AUTH-005
**Owner:** Backend Developer
**Title:** UserService implementasyonu (JWT üretimi dahil)

### Description
`IUserService` interface'inin implementasyonu yazılır. `RegisterAsync` email normalize, şifre hash ve JWT üretimini içerir. `LoginAsync` hash doğrulama ve JWT üretimini içerir. JWT üretiminde `Microsoft.AspNetCore.Authentication.JwtBearer` NuGet paketi kullanılır. Şifre hash için `PasswordHasher<User>` kullanılır (harici paket yok).

### Steps
1. `Microsoft.AspNetCore.Authentication.JwtBearer` NuGet paketini projeye ekle: `dotnet add package Microsoft.AspNetCore.Authentication.JwtBearer`
2. `backend/TodoApp.Api/appsettings.json` dosyasına `Jwt` bölümünü ekle: `Secret` (placeholder), `Issuer`, `Audience`, `ExpiryDays: 7`
3. `backend/TodoApp.Api/Services/UserService.cs` dosyasını oluştur:
   - Constructor: `IUserRepository`, `IPasswordHasher<User>`, `IConfiguration` injection
   - `RegisterAsync`: email normalize → `GetByEmailAsync` ile çakışma kontrolü → `UserAlreadyExistsException` → `HashPassword` → `User` oluştur → `AddAsync` → JWT üret → `AuthResponse` döndür
   - `LoginAsync`: email normalize → kullanıcı bul → `VerifyHashedPassword` → `PasswordVerificationResult.Failed` ise `null` → JWT üret → `AuthResponse` döndür
   - Private `GenerateJwt(User user)` metodu: `sub`, `email`, `jti`, `exp` claim'leri, HS256, 7 gün geçerlilik
4. `dotnet build` ile derleme hatasız geçmeli.

### Files Created
- `backend/TodoApp.Api/Services/UserService.cs`

### Files Modified
- `backend/TodoApp.Api/appsettings.json`
- `backend/TodoApp.Api/TodoApp.Api.csproj` (NuGet ekleme)

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Services/IUserService.cs`
- `backend/TodoApp.Api/Repositories/EfUserRepository.cs`
- `backend/TodoApp.Api/Models/User.cs`

### Acceptance Criteria
- [ ] `UserService`, `IUserService` interface'ini implemente ediyor
- [ ] `RegisterAsync` email normalize ediyor (`.ToLowerInvariant()`)
- [ ] Duplicate email durumunda `UserAlreadyExistsException` fırlatıyor
- [ ] `RegisterAsync` şifreyi `PasswordHasher<User>` ile hash'liyor; düz metin DB'ye yazılmıyor
- [ ] `LoginAsync` `VerifyHashedPassword` ile doğrulama yapıyor
- [ ] JWT token `sub`, `email`, `jti`, `exp` claim'lerini içeriyor
- [ ] Token 7 gün geçerli
- [ ] `appsettings.json`'da `Jwt` bölümü mevcut, `Secret` placeholder
- [ ] `dotnet build` hatasız

### Depends On
- AUTH-004

---

## AUTH-006
**Owner:** Backend Developer
**Title:** AuthController (register + login endpoint'leri)

### Description
`POST /api/auth/register` ve `POST /api/auth/login` endpoint'lerini içeren `AuthController` yazılır. Controller `IUserService`'i kullanır; iş mantığı içermez. Her iki endpoint de anonymous erişime açıktır.

### Steps
1. `backend/TodoApp.Api/Controllers/AuthController.cs` dosyasını oluştur.
2. `[ApiController]`, `[Route("api/auth")]` attribute'larını ekle.
3. `IUserService` constructor injection yap.
4. `Register` action'ı:
   - `[HttpPost("register")]`, anonymous (attribute yok)
   - `UserAlreadyExistsException` → `Conflict(new { message = "..." })`
   - Başarı → `CreatedAtAction` ile `201 Created` + `AuthResponse`
5. `Login` action'ı:
   - `[HttpPost("login")]`, anonymous
   - `null` dönüşü → `Unauthorized()`
   - Başarı → `Ok(authResponse)`
6. `dotnet build` ile derleme hatasız geçmeli.
7. Swagger UI üzerinden manuel test yap: geçerli kayıt → `201`, tekrar aynı email → `409`, giriş → `200`, yanlış şifre → `401`.

### Files Created
- `backend/TodoApp.Api/Controllers/AuthController.cs`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Controllers/TodosController.cs`
- `backend/TodoApp.Api/Services/UserService.cs`
- `backend/TodoApp.Api/Services/IUserService.cs`

### Acceptance Criteria
- [ ] `POST /api/auth/register` geçerli input → `201 Created` + `{ token, userId, email }`
- [ ] `POST /api/auth/register` mevcut email → `409 Conflict`
- [ ] `POST /api/auth/register` geçersiz email formatı → `400 Bad Request`
- [ ] `POST /api/auth/register` 7 karakterlik şifre → `400 Bad Request`
- [ ] `POST /api/auth/login` doğru kimlik → `200 OK` + `{ token, userId, email }`
- [ ] `POST /api/auth/login` yanlış şifre → `401 Unauthorized`
- [ ] Endpoint'ler `[Authorize]` attribute'u olmadan erişilebilir
- [ ] `dotnet build` hatasız

### Depends On
- AUTH-005

---

## AUTH-007
**Owner:** Backend Developer
**Title:** Program.cs JWT middleware ve DI kayıtları

### Description
`Program.cs`'e JWT authentication middleware, `IPasswordHasher<User>` singleton kaydı ve User altyapısı DI kayıtları eklenir. Middleware sıralaması kritik: `UseAuthentication()` mutlaka `UseAuthorization()`'dan önce gelmelidir.

### Steps
1. `backend/TodoApp.Api/Program.cs` dosyasını aç.
2. `builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(...)` bloğunu ekle: `ValidateIssuer`, `ValidateAudience`, `ValidateLifetime`, `ValidateIssuerSigningKey`, `IssuerSigningKey` konfigürasyonlarıyla.
3. `builder.Services.AddAuthorization()` satırını ekle.
4. `builder.Services.AddScoped<IUserRepository, EfUserRepository>()` ekle.
5. `builder.Services.AddScoped<IUserService, UserService>()` ekle.
6. `builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>()` ekle.
7. Middleware pipeline'da `app.UseCors()` → `app.UseAuthentication()` → `app.UseAuthorization()` → `app.MapControllers()` sırasını koru.
8. `HealthController` veya health endpoint'inin `[AllowAnonymous]` attribute'una sahip olduğunu doğrula.
9. `dotnet run` ile uygulamanın başladığını, `GET /health`'in token gerektirmediğini, `GET /api/todos`'un token olmadan `401` döndüğünü doğrula.

### Files Modified
- `backend/TodoApp.Api/Program.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Controllers/AuthController.cs`
- `backend/TodoApp.Api/Controllers/TodosController.cs`
- `backend/TodoApp.Api/Services/UserService.cs`

### Acceptance Criteria
- [ ] `UseAuthentication()` middleware pipeline'da `UseAuthorization()`'dan önce yer alıyor
- [ ] `IUserRepository`, `IUserService`, `IPasswordHasher<User>` DI'a kayıtlı
- [ ] `GET /api/todos` token olmadan `401 Unauthorized` döndürüyor
- [ ] `GET /health` token gerektirmeden `200 OK` döndürüyor
- [ ] `POST /api/auth/register` ve `POST /api/auth/login` token gerektirmeden çalışıyor
- [ ] `dotnet build` hatasız

### Depends On
- AUTH-006

---

## AUTH-008
**Owner:** Backend Developer
**Title:** EfTodoRepository userId filtresi ve TodoService userId iletimi

### Description
`EfTodoRepository` tüm metodlara eklenen `userId` parametresini kullanarak filtreleme yapar. `TodoService` ise Controller'dan gelen `userId`'yi repository'ye iletir. Her iki dosya da AUTH-001'de güncellenen interface'lere uyum sağlar.

### Steps
1. `backend/TodoApp.Api/Repositories/EfTodoRepository.cs` dosyasını aç:
   - `GetAll(string userId)`: `WHERE UserId == userId` filtresi ekle
   - `GetById(Guid id, string userId)`: `id == id && UserId == userId` koşulu
   - `Update(Guid id, string userId, Todo updated)`: çift koşul ile bul, yoksa `null`
   - `Delete(Guid id, string userId)`: çift koşul ile bul, yoksa `false`
   - `ToggleComplete(Guid id, string userId)`: çift koşul
   - `TogglePin(Guid id, string userId)`: çift koşul
   - `Add(Todo todo)`: değişmez — `todo.UserId` dolu gelecek
2. `backend/TodoApp.Api/Services/TodoService.cs` dosyasını aç:
   - Tüm metodlara `userId` parametresi ekle
   - Repository çağrılarına `userId` ilet
   - `Create` metodunda `todo.UserId = userId` atamasını yap
3. `dotnet build` ile derleme hatasız geçmeli.

### Files Modified
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`
- `backend/TodoApp.Api/Services/TodoService.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Services/ITodoService.cs`
- `backend/TodoApp.Api/Controllers/TodosController.cs`
- `backend/TodoApp.Api/Data/AppDbContext.cs`

### Acceptance Criteria
- [ ] `EfTodoRepository` `GetAll` yalnızca `userId` eşleşen todo'ları döndürüyor
- [ ] `EfTodoRepository` `GetById`, `Update`, `Delete`, `ToggleComplete`, `TogglePin` hem `id` hem `userId` ile sorguluyor
- [ ] Eşleşme yoksa `null` / `false` dönüyor (404 kararı Controller'a bırakılıyor)
- [ ] `TodoService` her metodda `userId`'yi repository'ye iletiyor
- [ ] `TodoService.Create` içinde `todo.UserId = userId` ataması mevcut
- [ ] `dotnet build` hatasız

### Depends On
- AUTH-007

---

## AUTH-009
**Owner:** Backend Developer
**Title:** TodosController [Authorize] + userId injection ve InMemoryTodoRepository uyumu

### Description
`TodosController`'a `[Authorize]` attribute eklenir ve her action `CurrentUserId` property'si üzerinden `ClaimTypes.NameIdentifier` değerini okuyarak service çağrılarına iletir. `InMemoryTodoRepository` ise yeni interface imzalarına uyarlanır (test stub'ı).

### Steps
1. `backend/TodoApp.Api/Controllers/TodosController.cs` dosyasını aç:
   - Sınıf seviyesine `[Authorize]` attribute ekle
   - `private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;` property'si ekle
   - Tüm action metodlarında service çağrılarına `CurrentUserId` parametre olarak geç
2. `backend/TodoApp.Api/Repositories/InMemoryTodoRepository.cs` dosyasını aç:
   - Tüm metodlara `userId` parametresi ekle
   - `GetAll(userId)`: `_todos.Where(t => t.UserId == userId)`
   - `GetById(id, userId)`: `t.Id == id && t.UserId == userId`
   - `Update`, `Delete`, `ToggleComplete`, `TogglePin`: aynı çift koşul
3. `dotnet build` ile derleme hatasız geçmeli.
4. `dotnet test` ile mevcut tüm testlerin geçtiğini doğrula; gerekiyorsa test yardımcı metodlarına `userId` parametresi ekle.

### Files Modified
- `backend/TodoApp.Api/Controllers/TodosController.cs`
- `backend/TodoApp.Api/Repositories/InMemoryTodoRepository.cs`
- `backend/TodoApp.Api.Tests/` (gerekirse test adaptasyonu)

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Services/ITodoService.cs`
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`
- `backend/TodoApp.Api/Services/TodoService.cs`

### Acceptance Criteria
- [ ] `TodosController` sınıf seviyesinde `[Authorize]` attribute'a sahip
- [ ] `CurrentUserId` property `ClaimTypes.NameIdentifier` claim'ini okuyor
- [ ] Tüm action metodları `CurrentUserId`'yi service'e iletiyor
- [ ] `InMemoryTodoRepository` `ITodoRepository` interface'ini hatasız implemente ediyor
- [ ] `dotnet test` tüm testler geçiyor
- [ ] `GET /api/todos` geçerli JWT ile sadece o kullanıcının todo'larını döndürüyor
- [ ] Kullanıcı A tokeni ile kullanıcı B'nin todo'su için `PUT` → `404 Not Found`

### Depends On
- AUTH-008

---

## AUTH-010
**Owner:** Frontend Developer
**Title:** AuthContext ve useAuth hook

### Description
`src/context/AuthContext.tsx` dosyası oluşturulur. `AuthState` (`token`, `userId`, `email`, `isLoading`), `AuthContextValue` (`login`, `logout`) ve `useAuth()` hook tanımlanır. Token `expo-secure-store` ile saklanır.

### Steps
1. `expo-secure-store` paketini ekle: `npx expo install expo-secure-store`
2. `mobile/src/context/` klasörünü oluştur.
3. `mobile/src/context/AuthContext.tsx` dosyasını oluştur:
   - `AuthState` ve `AuthContextValue` interface'lerini tanımla (mimari Bölüm 2.2'ye göre)
   - `AuthProvider` component: mount'ta `SecureStore.getItemAsync("auth_token")`, `"auth_userId"`, `"auth_email")` ile state'i restore et; `isLoading: true`'dan başla
   - `login(token, userId, email)`: SecureStore'a üç anahtarı yaz, state güncelle
   - `logout()`: SecureStore'dan üç anahtarı sil, `queryClient.clear()`, AsyncStorage cache temizle, state'i sıfırla
   - `useAuth()` hook: `AuthContext`'i döndürür; context dışında çağrılırsa `Error` fırlatır
4. `mobile/App.tsx` dosyasında `AuthProvider`'ı `PersistQueryClientProvider`'ın dışına, en üste sar.
5. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/context/AuthContext.tsx`

### Files Modified
- `mobile/App.tsx`
- `mobile/package.json` (expo-secure-store)

### Files Must NOT Be Modified
- `mobile/src/services/cache/todosCacheService.ts`
- `mobile/src/services/notifications/notificationService.ts`
- `mobile/src/services/notifications/notificationRegistry.ts`
- `mobile/src/mutations/` (tüm mutation dosyaları)

### Acceptance Criteria
- [ ] `AuthProvider` `isLoading: true` ile başlıyor; SecureStore okuma tamamlanınca `isLoading: false`
- [ ] `login()` üç SecureStore anahtarını yazıyor
- [ ] `logout()` üç SecureStore anahtarını siliyor ve queryClient'ı temizliyor
- [ ] `useAuth()` context dışında çağrılırsa `Error` fırlatıyor
- [ ] `App.tsx`'te `AuthProvider` en dışta
- [ ] `expo-secure-store` paketi kurulu
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- AUTH-007 (backend JWT hazır olmalı — frontend ile integration test için)

---

## AUTH-011
**Owner:** Frontend Developer
**Title:** authService.ts (register, login fonksiyonları)

### Description
`mobile/src/services/auth/authService.ts` dosyası oluşturulur. `register` ve `login` fonksiyonları `apiFetch` üzerinden backend'e istek atar. Hata durumlarında Türkçe mesaj ile `Error` fırlatır.

### Steps
1. `mobile/src/services/auth/` klasörünü oluştur.
2. `mobile/src/services/auth/authService.ts` dosyasını oluştur:
   - `AuthServiceResponse` interface: `token`, `userId`, `email`
   - `register(email, password)`: `POST /api/auth/register` — `409` → `"Bu e-posta adresi zaten kullanımda."`, `400` → `"Geçersiz giriş bilgileri."`, başarı → `AuthServiceResponse`
   - `login(email, password)`: `POST /api/auth/login` — `401` → `"E-posta veya şifre hatalı."`, başarı → `AuthServiceResponse`
3. Her iki fonksiyon `apiFetch` kullanır (`mobile/src/services/api/config.ts`'ten import).
4. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/services/auth/authService.ts`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `mobile/src/services/api/config.ts` (bu ticket'ta — AUTH-013'te güncellenecek)
- `mobile/src/services/cache/todosCacheService.ts`

### Acceptance Criteria
- [ ] `register` ve `login` fonksiyonları export edilmiş
- [ ] `409` yanıtında Türkçe hata mesajı fırlatılıyor
- [ ] `401` yanıtında Türkçe hata mesajı fırlatılıyor
- [ ] `400` yanıtında Türkçe hata mesajı fırlatılıyor
- [ ] Başarı durumunda `{ token, userId, email }` dönüyor
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- AUTH-010

---

## AUTH-012
**Owner:** Frontend Developer
**Title:** LoginScreen ve RegisterScreen

**Design Reference:** `docs/auth-design-spec.md` — Bu ticket implement edilmeden önce bu spec okunmalıdır. Token eklemeleri, component boyutları, layout ve hata mesajları bu spec'te tanımlanmıştır.

### Description
`mobile/src/screens/auth/LoginScreen.tsx` ve `mobile/src/screens/auth/RegisterScreen.tsx` ekranları oluşturulur. Her iki ekran da `authService` fonksiyonlarını ve `useAuth` hook'unu kullanır. Tasarım `docs/auth-design-spec.md` ve `mobile/src/theme/tokens.ts` token'larına göre yapılır. `tokens.ts`'e yeni auth token'ları (`authButtonBg`, `surfaceAuthInput` vb.) eklenmesi bu ticket kapsamındadır.

### Steps
1. `mobile/src/screens/auth/` klasörünü oluştur.
2. `LoginScreen.tsx` dosyasını oluştur:
   - Email ve Şifre text input alanları
   - "Giriş Yap" submit butonu
   - Yüklenme durumunda buton disabled
   - Hata durumunda Türkçe mesaj (kırmızı metin)
   - "Hesabın yok mu? Kayıt Ol" linki — `RegisterScreen`'e navigate et
   - Başarılı giriş → `useAuth().login(token, userId, email)` çağır
3. `RegisterScreen.tsx` dosyasını oluştur:
   - Email, Şifre, Şifre Tekrar text input alanları
   - Şifreler uyuşmuyorsa API'ye istek atmadan yerel hata mesajı göster
   - "Kayıt Ol" submit butonu
   - Başarılı kayıt → `useAuth().login(token, userId, email)` çağır (otomatik giriş)
   - "Zaten hesabın var mı? Giriş Yap" linki
4. Her iki ekranda `theme/tokens.ts` token'ları kullanılmalı; hardcode renk/spacing yok.
5. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/screens/auth/LoginScreen.tsx`
- `mobile/src/screens/auth/RegisterScreen.tsx`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `mobile/src/screens/TodoListScreen.tsx`
- `mobile/src/screens/TodoFormScreen.tsx`
- `mobile/src/screens/TaskDetailScreen.tsx`
- `mobile/src/theme/tokens.ts`

### Acceptance Criteria
- [ ] `LoginScreen` email + şifre alanları ve "Giriş Yap" butonu içeriyor
- [ ] `RegisterScreen` şifre uyuşmazlığında API çağrısı yapmadan yerel hata gösteriyor
- [ ] Başarılı giriş/kayıt → `useAuth().login(...)` çağrılıyor
- [ ] Hata mesajları Türkçe ve kullanıcı dostu
- [ ] Hardcode renk veya spacing yok — token'lar kullanılıyor
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- AUTH-011

---

## AUTH-013
**Owner:** Frontend Developer
**Title:** Navigation refactor (AuthNavigator, AppNavigator, RootNavigator) ve API interceptor

### Description
Navigation yapısı iki stack'e ayrılır: `AuthNavigator` (Login, Register) ve `AppNavigator` (TodoList, TodoForm, TaskDetail). `RootNavigator` `isAuthenticated` durumuna göre hangi stack'in gösterileceğine karar verir. `isLoading` durumunda splash gösterilir. `src/services/api/config.ts` dosyasına token interceptor ve 401 callback registry eklenir.

### Steps
1. `mobile/src/navigation/types.ts` dosyasını güncelle:
   - Mevcut `RootStackParamList`'i `AppStackParamList` olarak yeniden adlandır
   - `AuthStackParamList` ekle: `Login: undefined`, `Register: undefined`
2. `mobile/src/navigation/AppNavigator.tsx` dosyasını oluştur — mevcut `RootNavigator`'daki stack'i buraya taşı (TodoList, TodoForm, TaskDetail).
3. `mobile/src/navigation/AuthNavigator.tsx` dosyasını oluştur — Login ve Register screen'leri içerir.
4. `mobile/src/navigation/RootNavigator.tsx` dosyasını güncelle (veya `App.tsx`'teki mevcut navigator mantığını taşı):
   - `useAuth()` hook'undan `isLoading` ve `token` oku
   - `isLoading` → `ActivityIndicator` (veya null)
   - `token !== null` → `AppNavigator`
   - `token === null` → `AuthNavigator`
5. `mobile/src/services/api/config.ts` dosyasını güncelle:
   - `apiFetch(path, options)` wrapper fonksiyonu ekle: SecureStore'dan token oku, `Authorization` header ekle, fetch yap, `401` ise `_onUnauthorized` callback'i tetikle
   - `registerUnauthorizedCallback(fn)` fonksiyonu export et
   - `_onUnauthorized` module-level değişkeni
6. `AuthProvider` mount'ta `registerUnauthorizedCallback(() => logout())` çağır.
7. Mevcut `todosApi.ts` ve diğer API çağrılarını `apiFetch` kullanacak şekilde güncelle.
8. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/navigation/AppNavigator.tsx`
- `mobile/src/navigation/AuthNavigator.tsx`

### Files Modified
- `mobile/src/navigation/types.ts`
- `mobile/src/navigation/RootNavigator.tsx` (veya App.tsx içindeki navigator)
- `mobile/src/services/api/config.ts`
- `mobile/src/services/api/todosApi.ts`
- `mobile/src/context/AuthContext.tsx` (registerUnauthorizedCallback çağrısı)

### Files Must NOT Be Modified
- `mobile/src/screens/TodoListScreen.tsx`
- `mobile/src/screens/TodoFormScreen.tsx`
- `mobile/src/screens/TaskDetailScreen.tsx`
- `mobile/src/services/cache/todosCacheService.ts`
- `mobile/src/services/notifications/notificationService.ts`
- `mobile/src/services/notifications/notificationRegistry.ts`

### Acceptance Criteria
- [ ] Uygulama açılışında token yok → `LoginScreen` görünüyor
- [ ] Uygulama açılışında token var → `TodoListScreen` görünüyor
- [ ] `isLoading: true` sırasında hiçbir navigator gösterilmiyor (splash/indicator)
- [ ] `AppStackParamList` ve `AuthStackParamList` TypeScript tip güvenliği sağlıyor
- [ ] Tüm API isteklerine `Authorization: Bearer <token>` header'ı ekleniyor
- [ ] `401` yanıtında `_onUnauthorized` callback tetikleniyor → logout → LoginScreen
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- AUTH-012

---

## AUTH-014
**Owner:** Frontend Developer
**Title:** Cache key güncellemesi (cacheKeys.ts) ve logout cache temizliği

### Description
TanStack Query cache anahtarları kullanıcıya özel hale getirilir. `cacheKeys.ts` dosyası oluşturulur. `useTodos` hook ve mutation hook'ları güncellenir. Logout sırasında hem in-memory hem AsyncStorage cache temizlenir.

### Steps
1. `mobile/src/services/cache/cacheKeys.ts` dosyasını oluştur (mevcut değilse) veya güncelle:
   - `todos: (userId: string) => ['todos', userId] as const`
2. `mobile/src/mutations/useCreateTodo.ts`, `useUpdateTodo.ts`, `useDeleteTodo.ts`, `useToggleTodo.ts`, `usePinTodo.ts` dosyalarında cache anahtarı kullanımını `cacheKeys.todos(userId)` ile güncelle.
3. `useTodos` hook'unda query key'i `cacheKeys.todos(userId)` ile güncelle; `userId`'yi `useAuth().userId` üzerinden al.
4. `mobile/src/context/AuthContext.tsx` içindeki `logout` fonksiyonunu güncelle:
   - `await queryClient.clear()`
   - `await AsyncStorage.removeItem(\`todos_cache_${userId}\`)`
5. AsyncStorage persist cache anahtarını `todos_cache_<userId>` formatıyla güncelle.
6. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/services/cache/cacheKeys.ts` (yoksa oluştur)

### Files Modified
- `mobile/src/mutations/useCreateTodo.ts`
- `mobile/src/mutations/useUpdateTodo.ts`
- `mobile/src/mutations/useDeleteTodo.ts`
- `mobile/src/mutations/useToggleTodo.ts` (varsa)
- `mobile/src/mutations/usePinTodo.ts` (varsa)
- `mobile/src/context/AuthContext.tsx`

### Files Must NOT Be Modified
- `mobile/src/services/cache/todosCacheService.ts`
- `mobile/src/services/notifications/notificationService.ts`
- `mobile/src/services/notifications/notificationRegistry.ts`

### Acceptance Criteria
- [ ] `cacheKeys.todos(userId)` fonksiyonu `['todos', userId]` döndürüyor
- [ ] `useTodos` ve tüm mutation hook'ları güncellenmiş cache anahtarını kullanıyor
- [ ] Logout sonrası in-memory cache temizleniyor (`queryClient.clear()`)
- [ ] Logout sonrası AsyncStorage'dan `todos_cache_<userId>` siliniyor
- [ ] Farklı kullanıcı girişinde önceki kullanıcının cache'i görünmüyor
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- AUTH-013

---

## AUTH-015
**Owner:** Tester
**Title:** E2E doğrulama: register, login, todo izolasyonu ve offline davranış

### Description
Tüm authentication feature'ı uçtan uca test edilir. Backend API testleri ve frontend entegrasyon testleri kapsama alınır. İki farklı kullanıcının birbirinin verilerini göremediği doğrulanır. Mevcut `dotnet test` testlerinin geçtiği kontrol edilir.

### Steps
1. **Backend API Testleri** (manuel veya Playwright/curl ile):
   - `POST /api/auth/register` geçerli input → `201` + token
   - `POST /api/auth/register` aynı email tekrar → `409`
   - `POST /api/auth/register` kısa şifre → `400`
   - `POST /api/auth/login` doğru kimlik → `200` + token
   - `POST /api/auth/login` yanlış şifre → `401`
   - `GET /api/todos` token yok → `401`
   - `GET /health` token yok → `200`
2. **Todo İzolasyon Testleri:**
   - Kullanıcı A ile kayıt ol, todo oluştur
   - Kullanıcı B ile kayıt ol, todo oluştur
   - Her kullanıcı yalnızca kendi todo'larını görüyor mu doğrula
   - Kullanıcı B tokeni ile kullanıcı A'nın todo ID'sine `PUT` → `404`
3. **Frontend Uygulama Testleri:**
   - Uygulama açılışı: token yok → LoginScreen görünüyor
   - Kayıt ol → TodoListScreen'e yönlendiriliyor
   - Uygulamayı kapat, yeniden aç → token var → TodoListScreen görünüyor (SecureStore persist)
   - Logout → LoginScreen'e dönüyor, todo listesi temizleniyor
   - Offline'da cache'ten todo'lar görünüyor
4. **Mevcut Test Suite Kontrolü:** `dotnet test backend/` tüm testler geçiyor.
5. **TypeScript Kontrolü:** `npx tsc --noEmit` hatasız.
6. Tüm bulguları `docs/auth-test-report.md` dosyasına yaz.

### Files Created
- `docs/auth-test-report.md`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- (üretim kodu — tester sadece test yapar ve raporlar)

### Acceptance Criteria
- [ ] `POST /api/auth/register` geçerli input → `201 Created` + `{ token, userId, email }`
- [ ] `POST /api/auth/register` mevcut email → `409 Conflict`
- [ ] `POST /api/auth/login` doğru kimlik → `200 OK` + token
- [ ] `POST /api/auth/login` yanlış şifre → `401 Unauthorized`
- [ ] `GET /api/todos` token yok → `401 Unauthorized`
- [ ] `GET /health` token gerektirmiyor → `200 OK`
- [ ] Kullanıcı A yalnızca kendi todo'larını görüyor
- [ ] Kullanıcı B tokeni ile kullanıcı A'nın todo'suna `PUT` → `404 Not Found`
- [ ] Uygulama açılışı: token var → TodoListScreen, yok → LoginScreen
- [ ] Kayıt/giriş başarısı → TodoListScreen
- [ ] Logout → token siliniyor + cache temizleniyor + LoginScreen
- [ ] `dotnet test` tüm testler geçiyor
- [ ] `npx tsc --noEmit` hatasız
- [ ] Şifreler veritabanında hash olarak saklanmış (düz metin yok)
- [ ] `docs/auth-test-report.md` oluşturulmuş

### Depends On
- AUTH-014

---

## Summary Table

| Ticket | Owner | Title | Est. | Dependency |
|--------|-------|-------|------|------------|
| AUTH-001 | Architect | ITodoRepository ve ITodoService imzaları userId ile güncelle | 1h | 006-service-layer |
| AUTH-002 | Architect | IUserRepository ve IUserService interface contract'ları | 1h | AUTH-001 |
| AUTH-003 | Backend Developer | User entity, AppDbContext ve EF Core migration'ları | 1.5h | AUTH-002 |
| AUTH-004 | Backend Developer | EfUserRepository implementasyonu | 1h | AUTH-003 |
| AUTH-005 | Backend Developer | UserService implementasyonu (JWT üretimi dahil) | 2h | AUTH-004 |
| AUTH-006 | Backend Developer | AuthController (register + login) | 1h | AUTH-005 |
| AUTH-007 | Backend Developer | Program.cs JWT middleware ve DI kayıtları | 1h | AUTH-006 |
| AUTH-008 | Backend Developer | EfTodoRepository userId filtresi ve TodoService güncelleme | 1.5h | AUTH-007 |
| AUTH-009 | Backend Developer | TodosController [Authorize] + userId injection, InMemoryRepo uyumu | 1.5h | AUTH-008 |
| AUTH-010 | Frontend Developer | AuthContext ve useAuth hook | 1.5h | AUTH-007 |
| AUTH-011 | Frontend Developer | authService.ts (register, login) | 1h | AUTH-010 |
| AUTH-012 | Frontend Developer | LoginScreen ve RegisterScreen | 2h | AUTH-011 |
| AUTH-013 | Frontend Developer | Navigation refactor ve API interceptor | 2h | AUTH-012 |
| AUTH-014 | Frontend Developer | Cache key güncellemesi ve logout cache temizliği | 1h | AUTH-013 |
| AUTH-015 | Tester | E2E doğrulama: register, login, todo izolasyonu, offline | 2h | AUTH-014 |

**Toplam tahmini süre:** ~21 saat

---

## Dependency Order

```
AUTH-001 → AUTH-002 → AUTH-003 → AUTH-004 → AUTH-005 → AUTH-006 → AUTH-007
                                                                         ↓
                                                              AUTH-008 → AUTH-009 → AUTH-015
                                                                         ↑
                                                              AUTH-010 → AUTH-011 → AUTH-012 → AUTH-013 → AUTH-014 → AUTH-015
```

Backend ve Frontend geliştirme AUTH-007 tamamlandıktan sonra paralel ilerleyebilir.
