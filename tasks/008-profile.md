# Task List: 008 — Profil Yönetimi (v0.7.0)

Source spec: `docs/profile-spec.md`
Architecture: `docs/profile-architecture.md`
Stack: .NET 8 / ASP.NET Core · EF Core + SQLite · Expo React Native · TypeScript · TanStack Query · expo-secure-store

---

## PROF-001
**Owner:** Architect
**Title:** IUserService ve IUserRepository interface'lerini profil metodlarıyla genişlet

### Description
`IUserService` ve `IUserRepository` interface dosyaları dört yeni metod imzası ile güncellenir. Bu ticket yalnızca interface'leri kapsar; implementasyon dosyaları değiştirilmez. Mimarinin onayladığı imzalar `docs/profile-architecture.md` Bölüm 3 ve 4'te tanımlanmıştır.

`IUserRepository`'ye eklenecek üç yeni metod:
- `Task<User?> GetByIdAsync(Guid userId)`
- `Task<User> UpdateAsync(User user)`
- `Task DeleteAsync(Guid userId)`

`IUserService`'e eklenecek dört yeni metod:
- `Task<UserProfileResponse?> GetProfileAsync(string userId)`
- `Task<UserProfileResponse> ChangeEmailAsync(string userId, ChangeEmailRequest request)`
- `Task ChangePasswordAsync(string userId, ChangePasswordRequest request)`
- `Task DeleteAccountAsync(string userId, DeleteAccountRequest request)`

### Steps
1. `backend/TodoApp.Api/Repositories/IUserRepository.cs` dosyasını aç.
2. Mevcut `GetByEmailAsync` ve `AddAsync` imzalarına dokunmadan üç yeni metodu ekle (`GetByIdAsync`, `UpdateAsync`, `DeleteAsync`).
3. `backend/TodoApp.Api/Services/IUserService.cs` dosyasını aç.
4. Mevcut `RegisterAsync` ve `LoginAsync` imzalarına dokunmadan dört yeni metodu ekle.
5. Dosyaları kaydet. Bu aşamada `EfUserRepository` ve `UserService` yeni interface üyelerini implemente etmediği için proje build edilemez — bu beklenen bir durumdur.

### Files Created
- (yok)

### Files Modified
- `backend/TodoApp.Api/Repositories/IUserRepository.cs`
- `backend/TodoApp.Api/Services/IUserService.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/EfUserRepository.cs`
- `backend/TodoApp.Api/Services/UserService.cs`
- `backend/TodoApp.Api/Controllers/AuthController.cs`
- `backend/TodoApp.Api/Models/User.cs`
- `backend/TodoApp.Api/Data/AppDbContext.cs`

### Acceptance Criteria
- [ ] `IUserRepository` yeni üç metodu tanımlıyor; mevcut iki metod değişmemiş
- [ ] `IUserService` yeni dört metodu tanımlıyor; mevcut iki metod değişmemiş
- [ ] `docs/profile-architecture.md` Bölüm 3 ve 4 ile imzalar birebir uyuşuyor
- [ ] Interface dışında herhangi bir .cs dosyası değiştirilmemiş

### Depends On
- `tasks/007-auth.md` tamamlanmış olmalı (`IUserRepository` ve `IUserService` mevcut olmalı)

---

## PROF-002
**Owner:** Architect
**Title:** Profil yönetimi DTO'ları ve yeni exception sınıfları

### Description
Dört yeni DTO dosyası `backend/TodoApp.Api/DTOs/Auth/` klasörüne eklenir. Üç yeni exception sınıfı `backend/TodoApp.Api/Exceptions/` klasörüne eklenir. Bu ticket yalnızca bu yeni dosyaları içerir; mevcut hiçbir dosyaya dokunulmaz. DTO tanımları `docs/profile-architecture.md` Bölüm 5'te, exception listesi Bölüm 3'te tanımlanmıştır.

Yeni DTO'lar:
- `UserProfileResponse.cs` — `UserId`, `Email`, `CreatedAt` (UTC)
- `ChangeEmailRequest.cs` — `[Required] CurrentPassword`, `[Required][EmailAddress][MaxLength(256)] NewEmail`
- `ChangePasswordRequest.cs` — `[Required] CurrentPassword`, `[Required][MinLength(8)][MaxLength(100)] NewPassword`
- `DeleteAccountRequest.cs` — `[Required] CurrentPassword`

Yeni exception'lar:
- `WrongPasswordException.cs`
- `SameEmailException.cs`
- `SamePasswordException.cs`

### Steps
1. `backend/TodoApp.Api/DTOs/Auth/UserProfileResponse.cs` dosyasını oluştur.
2. `backend/TodoApp.Api/DTOs/Auth/ChangeEmailRequest.cs` dosyasını oluştur; `[EmailAddress]` ve `[MaxLength(256)]` attribute'larını dahil et.
3. `backend/TodoApp.Api/DTOs/Auth/ChangePasswordRequest.cs` dosyasını oluştur; `[MinLength(8)]` ve `[MaxLength(100)]` attribute'larını dahil et.
4. `backend/TodoApp.Api/DTOs/Auth/DeleteAccountRequest.cs` dosyasını oluştur.
5. `backend/TodoApp.Api/Exceptions/WrongPasswordException.cs` dosyasını oluştur (`Exception`'dan türet).
6. `backend/TodoApp.Api/Exceptions/SameEmailException.cs` dosyasını oluştur.
7. `backend/TodoApp.Api/Exceptions/SamePasswordException.cs` dosyasını oluştur.
8. `dotnet build` ile derleme hatasız geçtiğini doğrula.

### Files Created
- `backend/TodoApp.Api/DTOs/Auth/UserProfileResponse.cs`
- `backend/TodoApp.Api/DTOs/Auth/ChangeEmailRequest.cs`
- `backend/TodoApp.Api/DTOs/Auth/ChangePasswordRequest.cs`
- `backend/TodoApp.Api/DTOs/Auth/DeleteAccountRequest.cs`
- `backend/TodoApp.Api/Exceptions/WrongPasswordException.cs`
- `backend/TodoApp.Api/Exceptions/SameEmailException.cs`
- `backend/TodoApp.Api/Exceptions/SamePasswordException.cs`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `backend/TodoApp.Api/DTOs/Auth/RegisterRequest.cs`
- `backend/TodoApp.Api/DTOs/Auth/LoginRequest.cs`
- `backend/TodoApp.Api/DTOs/Auth/AuthResponse.cs`
- `backend/TodoApp.Api/Exceptions/UserAlreadyExistsException.cs`

### Acceptance Criteria
- [ ] `UserProfileResponse.cs` `UserId`, `Email`, `CreatedAt` alanlarını içeriyor
- [ ] `ChangeEmailRequest.cs` `[Required]`, `[EmailAddress]`, `[MaxLength(256)]` attribute'larını içeriyor
- [ ] `ChangePasswordRequest.cs` `[Required]`, `[MinLength(8)]`, `[MaxLength(100)]` attribute'larını içeriyor
- [ ] `DeleteAccountRequest.cs` `[Required] CurrentPassword` alanını içeriyor
- [ ] Üç yeni exception sınıfı `Exception`'dan türüyor
- [ ] Mevcut DTO ve exception dosyaları değiştirilmemiş
- [ ] `dotnet build` hatasız

### Depends On
- PROF-001

---

## PROF-003
**Owner:** Backend Developer
**Title:** EfUserRepository — GetByIdAsync, UpdateAsync, DeleteAsync implementasyonu

### Description
`EfUserRepository` sınıfı PROF-001'de arayüze eklenen üç yeni metodu implemente eder. `DeleteAsync` metodu DB transaction içinde kullanıcıya ait tüm `Todo` kayıtlarını ve ardından `User` kaydını siler. Bu cascade stratejisi `docs/profile-architecture.md` Bölüm 7'de kararlaştırılmıştır: EF Core cascade FK yerine explicit sıralı silme tercih edilmiştir; migration gerekmez.

### Steps
1. `backend/TodoApp.Api/Repositories/EfUserRepository.cs` dosyasını aç.
2. `GetByIdAsync(Guid userId)` metodunu ekle: `_context.Users.FindAsync(userId)` veya `FirstOrDefaultAsync` ile sorgula.
3. `UpdateAsync(User user)` metodunu ekle: `_context.Users.Update(user)` + `SaveChangesAsync`; güncellenmiş entity'yi döndür.
4. `DeleteAsync(Guid userId)` metodunu ekle:
   - `await _context.Database.BeginTransactionAsync()` ile transaction başlat.
   - `await _context.Todos.Where(t => t.UserId == userId.ToString()).ExecuteDeleteAsync()` ile ilgili todo'ları sil.
   - `await _context.Users.Where(u => u.Id == userId).ExecuteDeleteAsync()` ile kullanıcıyı sil.
   - `await transaction.CommitAsync()` ile commit et; hata halinde rollback.
5. `dotnet build` ile derleme hatasız geçmeli.

### Files Created
- (yok)

### Files Modified
- `backend/TodoApp.Api/Repositories/EfUserRepository.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/IUserRepository.cs`
- `backend/TodoApp.Api/Data/AppDbContext.cs`
- `backend/TodoApp.Api/Models/User.cs`
- `backend/TodoApp.Api/Models/Todo.cs`

### Acceptance Criteria
- [ ] `GetByIdAsync` kullanıcıyı ID ile getiriyor; bulunamazsa `null` döndürüyor
- [ ] `UpdateAsync` entity'yi güncelleyip kaydedip döndürüyor
- [ ] `DeleteAsync` DB transaction içinde çalışıyor
- [ ] `DeleteAsync` önce `Todos` sonra `Users` kaydını siliyor
- [ ] Transaction hata halinde rollback yapıyor
- [ ] Migration eklenmemiş — mevcut schema yeterli
- [ ] `dotnet build` hatasız

### Depends On
- PROF-002

---

## PROF-004
**Owner:** Backend Developer
**Title:** UserService — GetProfileAsync, ChangeEmailAsync, ChangePasswordAsync, DeleteAccountAsync implementasyonu

### Description
`UserService` sınıfı PROF-001'de arayüze eklenen dört yeni metodu implemente eder. Her metod `IUserRepository.GetByIdAsync` ile kullanıcıyı çeker, iş kuralı ihlali halinde PROF-002'de tanımlanan exception'ları fırlatır. `ChangeEmailAsync` ve `ChangePasswordAsync` şifre doğrulamasında `IPasswordHasher<User>.VerifyHashedPassword` kullanır. Validasyon sırası `docs/profile-architecture.md` Bölüm 2'deki endpoint tablolarına göre uygulanır.

### Steps
1. `backend/TodoApp.Api/Services/UserService.cs` dosyasını aç.
2. `GetProfileAsync(string userId)` metodunu ekle:
   - `Guid.Parse(userId)` ile dönüştür.
   - `GetByIdAsync` ile kullanıcıyı çek; `null` ise `null` döndür.
   - `UserProfileResponse` oluştur ve döndür.
3. `ChangeEmailAsync(string userId, ChangeEmailRequest request)` metodunu ekle:
   - Şifreyi doğrula → `VerifyHashedPassword` başarısızsa `WrongPasswordException`.
   - Yeni email mevcut email ile aynıysa `SameEmailException`.
   - `GetByEmailAsync(request.NewEmail)` ile çakışma kontrol et → varsa `UserAlreadyExistsException`.
   - Kullanıcı email'ini normalize et, `UpdateAsync` ile kaydet.
   - Güncel `UserProfileResponse` döndür.
4. `ChangePasswordAsync(string userId, ChangePasswordRequest request)` metodunu ekle:
   - Mevcut şifreyi doğrula → başarısızsa `WrongPasswordException`.
   - Yeni şifre ile mevcut şifreyi karşılaştır → aynıysa `SamePasswordException`.
   - `HashPassword` ile yeni şifreyi hash'le, `UpdateAsync` ile kaydet.
5. `DeleteAccountAsync(string userId, DeleteAccountRequest request)` metodunu ekle:
   - Şifreyi doğrula → başarısızsa `WrongPasswordException`.
   - `DeleteAsync(userId)` çağır.
6. `dotnet build` ile derleme hatasız geçmeli.

### Files Created
- (yok)

### Files Modified
- `backend/TodoApp.Api/Services/UserService.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Services/IUserService.cs`
- `backend/TodoApp.Api/Repositories/EfUserRepository.cs`
- `backend/TodoApp.Api/Repositories/IUserRepository.cs`
- `backend/TodoApp.Api/Models/User.cs`

### Acceptance Criteria
- [ ] `GetProfileAsync` kullanıcı bulunamazsa `null` döndürüyor
- [ ] `ChangeEmailAsync` yanlış şifrede `WrongPasswordException` fırlatıyor
- [ ] `ChangeEmailAsync` aynı emailde `SameEmailException` fırlatıyor
- [ ] `ChangeEmailAsync` email çakışmasında `UserAlreadyExistsException` fırlatıyor
- [ ] `ChangePasswordAsync` yanlış şifrede `WrongPasswordException` fırlatıyor
- [ ] `ChangePasswordAsync` aynı şifrede `SamePasswordException` fırlatıyor
- [ ] `ChangePasswordAsync` yeni şifreyi hash'leyerek kaydediyor; düz metin DB'ye yazılmıyor
- [ ] `DeleteAccountAsync` yanlış şifrede `WrongPasswordException` fırlatıyor
- [ ] `DeleteAccountAsync` başarıda `DeleteAsync` çağırıyor
- [ ] `dotnet build` hatasız

### Depends On
- PROF-003

---

## PROF-005
**Owner:** Backend Developer
**Title:** AuthController — GET /me, PUT /email, PUT /password, DELETE /account action'ları

### Description
`AuthController`'a dört yeni `[Authorize]` action eklenir. Controller iş mantığı içermez; exception'ları yakalayıp HTTP durum kodlarına çevirir. `userId` her action'da `User.FindFirstValue(ClaimTypes.NameIdentifier)!` ile okunur. Karar ve gerekçe `docs/profile-architecture.md` Bölüm 6'da belgelenmiştir.

### Steps
1. `backend/TodoApp.Api/Controllers/AuthController.cs` dosyasını aç.
2. `private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier)!;` property'sini ekle.
3. `GetProfile()` action'ı ekle (`[Authorize][HttpGet("me")]`):
   - `GetProfileAsync(CurrentUserId)` çağır.
   - `null` → `NotFound()`.
   - Başarı → `Ok(profile)`.
4. `ChangeEmail(ChangeEmailRequest request)` action'ı ekle (`[Authorize][HttpPut("email")]`):
   - `ModelState` geçersizse `BadRequest(...)` döndür.
   - `WrongPasswordException` → `Unauthorized(new { status = 401, message = "Mevcut şifreniz hatalı.", errors = new {} })`.
   - `SameEmailException` → `BadRequest(new { status = 400, message = "Yeni e-posta adresiniz mevcut adresinizle aynı.", errors = new {} })`.
   - `UserAlreadyExistsException` → `Conflict(new { status = 409, message = "Bu e-posta adresi zaten kullanımda.", errors = new {} })`.
   - Başarı → `Ok(updatedProfile)`.
5. `ChangePassword(ChangePasswordRequest request)` action'ı ekle (`[Authorize][HttpPut("password")]`):
   - `ModelState` geçersizse `BadRequest(...)` döndür.
   - `WrongPasswordException` → `Unauthorized(new { status = 401, message = "Mevcut şifreniz hatalı.", errors = new {} })`.
   - `SamePasswordException` → `BadRequest(new { status = 400, message = "Yeni şifreniz mevcut şifrenizle aynı olamaz.", errors = new {} })`.
   - Başarı → `Ok(new { message = "Şifre başarıyla güncellendi." })`.
6. `DeleteAccount(DeleteAccountRequest request)` action'ı ekle (`[Authorize][HttpDelete("account")]`):
   - `WrongPasswordException` → `Unauthorized(new { status = 401, message = "Şifreniz hatalı.", errors = new {} })`.
   - Başarı → `NoContent()`.
7. Swagger UI üzerinden manuel test yap: geçerli token ile `GET /api/auth/me` → `200`.
8. `dotnet build` hatasız geçmeli.

### Files Created
- (yok)

### Files Modified
- `backend/TodoApp.Api/Controllers/AuthController.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Services/UserService.cs`
- `backend/TodoApp.Api/Services/IUserService.cs`
- `backend/TodoApp.Api/Controllers/TodosController.cs`
- `backend/TodoApp.Api/Program.cs`

### Acceptance Criteria
- [ ] `GET /api/auth/me` geçerli token → `200 OK` + `{ userId, email, createdAt }`
- [ ] `GET /api/auth/me` token yok → `401`
- [ ] `PUT /api/auth/email` doğru şifre + geçerli yeni email → `200 OK` + `{ userId, email }`
- [ ] `PUT /api/auth/email` yanlış şifre → `401` + Türkçe mesaj
- [ ] `PUT /api/auth/email` geçersiz email formatı → `400` (ModelState)
- [ ] `PUT /api/auth/email` mevcut email ile aynı → `400` + Türkçe mesaj
- [ ] `PUT /api/auth/email` email çakışması → `409` + Türkçe mesaj
- [ ] `PUT /api/auth/password` doğru şifre + geçerli yeni şifre → `200 OK`
- [ ] `PUT /api/auth/password` yanlış şifre → `401` + Türkçe mesaj
- [ ] `PUT /api/auth/password` 7 karakterlik yeni şifre → `400` (ModelState)
- [ ] `PUT /api/auth/password` mevcut şifre ile aynı → `400` + Türkçe mesaj
- [ ] `DELETE /api/auth/account` doğru şifre → `204 No Content`
- [ ] `DELETE /api/auth/account` yanlış şifre → `401` + Türkçe mesaj
- [ ] `dotnet build` hatasız

### Depends On
- PROF-004

---

## PROF-006
**Owner:** Backend Developer
**Title:** Integration testleri güncelleme — profil endpoint'leri test coverage

### Description
Mevcut `backend/TodoApp.Api.Tests/` test projesi profil yönetimi endpoint'lerini kapsayacak şekilde genişletilir. `WebApplicationFactory` ile entegrasyon testleri yazılır. Her endpoint için başarı ve hata senaryoları test edilir. Mevcut auth testleri bozulmadan korunur.

### Steps
1. `backend/TodoApp.Api.Tests/` klasörüne `AuthController_ProfileTests.cs` (veya mevcut test sınıfına ilgili metodlar) ekle.
2. `GET /api/auth/me` testleri:
   - Geçerli token → `200 OK` + `userId`, `email`, `createdAt` alanları dolu.
   - Token yok → `401`.
3. `PUT /api/auth/email` testleri:
   - Doğru şifre + yeni geçerli email → `200 OK`, response'da yeni email var.
   - Yanlış şifre → `401`.
   - Geçersiz email formatı → `400`.
   - Mevcut email ile aynı → `400`.
   - Başka kullanıcıya ait email → `409`.
4. `PUT /api/auth/password` testleri:
   - Doğru şifre + geçerli yeni şifre → `200 OK`.
   - Yanlış şifre → `401`.
   - 7 karakterlik yeni şifre → `400`.
   - Mevcut şifre ile aynı → `400`.
   - Yeni şifre hash'lenerek kaydedilmiş (DB'de düz metin yok).
5. `DELETE /api/auth/account` testleri:
   - Doğru şifre → `204 No Content`, kullanıcı DB'den siliniyor, todo'lar siliniyor.
   - Yanlış şifre → `401`.
6. `dotnet test` tüm testlerin geçtiğini doğrula.

### Files Created
- `backend/TodoApp.Api.Tests/AuthController_ProfileTests.cs` (veya mevcut dosya genişletilir)

### Files Modified
- `backend/TodoApp.Api.Tests/` (ilgili test dosyaları)

### Files Must NOT Be Modified
- `backend/TodoApp.Api/` altındaki üretim kodu (sadece test dosyaları değişir)

### Acceptance Criteria
- [ ] `GET /api/auth/me` için en az iki test senaryosu mevcut (başarı + `401`)
- [ ] `PUT /api/auth/email` için beş hata + başarı senaryosu test edilmiş
- [ ] `PUT /api/auth/password` için dört hata + başarı senaryosu test edilmiş
- [ ] `DELETE /api/auth/account` için hem başarı (kullanıcı + todo'lar silindi) hem `401` test edilmiş
- [ ] Mevcut auth testleri hâlâ geçiyor
- [ ] `dotnet test` sıfır hata ile tamamlanıyor

### Depends On
- PROF-005

---

## PROF-007
**Owner:** Frontend Developer
**Title:** profileService.ts — getProfile, changeEmail, changePassword, deleteAccount

### Description
`mobile/src/services/profile/profileService.ts` dosyası oluşturulur. `authService.ts` pattern'ı korunur: tüm istekler `apiFetch` üzerinden yapılır, hata durumlarında Türkçe mesajlı `Error` fırlatılır. Fonksiyon imzaları ve hata mesajları `docs/profile-architecture.md` Bölüm 10'da tanımlanmıştır.

`UserProfile` interface'i aynı dosyada tanımlanır:
```typescript
export interface UserProfile { userId: string; email: string; createdAt: string; }
```

Dört fonksiyon export edilir: `getProfile()`, `changeEmail(currentPassword, newEmail)`, `changePassword(currentPassword, newPassword)`, `deleteAccount(currentPassword)`.

### Steps
1. `mobile/src/services/profile/` klasörünü oluştur.
2. `mobile/src/services/profile/profileService.ts` dosyasını oluştur.
3. `UserProfile` interface'ini tanımla.
4. `getProfile()` fonksiyonunu yaz: `GET /api/auth/me` çağrısı; başarıda `UserProfile` döndür.
5. `changeEmail(currentPassword, newEmail)` fonksiyonunu yaz:
   - `PUT /api/auth/email` çağrısı.
   - `401` → `Error("Mevcut şifreniz hatalı.")`.
   - `409` → `Error("Bu e-posta adresi zaten kullanımda.")`.
   - `400` + errors.newEmail içeriyor → `Error("Geçerli bir e-posta adresi girin.")`.
   - `400` + errors yok → `Error("Yeni e-posta adresiniz mevcut adresinizle aynı.")`.
6. `changePassword(currentPassword, newPassword)` fonksiyonunu yaz:
   - `PUT /api/auth/password` çağrısı.
   - `401` → `Error("Mevcut şifreniz hatalı.")`.
   - `400` + errors.newPassword → `Error("Şifre en az 8 karakter olmalıdır.")`.
   - `400` + errors yok → `Error("Yeni şifreniz mevcut şifrenizle aynı olamaz.")`.
7. `deleteAccount(currentPassword)` fonksiyonunu yaz:
   - `DELETE /api/auth/account` çağrısı.
   - `401` → `Error("Şifreniz hatalı.")`.
8. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/services/profile/profileService.ts`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `mobile/src/services/auth/authService.ts`
- `mobile/src/services/api/config.ts`
- `mobile/src/services/cache/todosCacheService.ts`

### Acceptance Criteria
- [ ] `UserProfile` interface export edilmiş
- [ ] `getProfile` fonksiyonu `UserProfile` döndürüyor
- [ ] `changeEmail` tüm hata senaryolarında doğru Türkçe mesaj fırlatıyor
- [ ] `changePassword` tüm hata senaryolarında doğru Türkçe mesaj fırlatıyor
- [ ] `deleteAccount` `401` durumunda Türkçe mesaj fırlatıyor
- [ ] Tüm fonksiyonlar `apiFetch` kullanıyor
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- PROF-006 (backend endpoint'leri hazır olmalı — entegrasyon için)

---

## PROF-008
**Owner:** Frontend Developer
**Title:** AuthContext'e updateEmail() fonksiyonu ekle

### Description
`mobile/src/context/AuthContext.tsx` dosyasına `updateEmail(newEmail: string)` fonksiyonu ve `AuthContextValue` interface'i genişletilir. Mevcut `login` ve `logout` imzaları değişmez. Davranış `docs/profile-architecture.md` Bölüm 9'da tanımlanmıştır: hem `SecureStore`'daki email güncellenir hem de React state güncellenir.

### Steps
1. `mobile/src/context/AuthContext.tsx` dosyasını aç.
2. `AuthContextValue` interface'ine `updateEmail: (newEmail: string) => Promise<void>` satırını ekle.
3. `AuthProvider` içinde `updateEmail` fonksiyonunu `useCallback` ile yaz:
   - `await SecureStore.setItemAsync(KEY_EMAIL, newEmail)` ile SecureStore'u güncelle.
   - `setState(prev => ({ ...prev, email: newEmail }))` ile React state'i güncelle.
4. `updateEmail`'i context value'ya ekle.
5. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- (yok)

### Files Modified
- `mobile/src/context/AuthContext.tsx`

### Files Must NOT Be Modified
- `mobile/src/services/auth/authService.ts`
- `mobile/src/services/api/config.ts`
- `mobile/src/mutations/` (tüm mutation dosyaları)

### Acceptance Criteria
- [ ] `AuthContextValue` interface'inde `updateEmail` metodu tanımlı
- [ ] `updateEmail` SecureStore'daki email değerini güncelliyor
- [ ] `updateEmail` React state'i güncelliyor
- [ ] Mevcut `login` ve `logout` imzaları değişmemiş
- [ ] `useAuth()` ile `updateEmail`'e erişilebilir
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- PROF-007

---

## PROF-009
**Owner:** Frontend Developer
**Title:** ProfileScreen — profil bilgileri, aksiyon listesi ve hesap silme modal'ı

### Description
`mobile/src/screens/profile/ProfileScreen.tsx` dosyası oluşturulur. Ekran `GET /api/auth/me` çağrısını `useQuery` ile yapar. Email ve hesap oluşturma tarihi (yerelleştirilmiş format) gösterilir. Üç aksiyon butonu: "Email Değiştir", "Şifre Değiştir", "Hesabı Sil". Hesap silme aksiyonu React Native `Modal` bileşeni içinde şifre girişi + uyarı + onay butonu içerir. Modal başarı akışında `logout()` çağrılır ve `LoginScreen`'e yönlendirilir. Tasarım detayı UI Designer spesifikasyonuna göre uygulanır; tüm renkler ve spacing değerleri `theme/tokens.ts` token'larından alınır.

### Steps
1. `mobile/src/screens/profile/` klasörünü oluştur.
2. `mobile/src/screens/profile/ProfileScreen.tsx` dosyasını oluştur.
3. `useQuery` ile `profileService.getProfile()` çağrısı ekle; yüklenme ve hata durumları gösterilsin.
4. Email ve `createdAt` değerini (yerelleştirilmiş Türkçe format: "17 Mart 2026") ekrana yazdır.
5. "Email Değiştir" butonuna `navigation.navigate('ChangeEmail')` bağla.
6. "Şifre Değiştir" butonuna `navigation.navigate('ChangePassword')` bağla.
7. "Hesabı Sil" butonuna modal açma state'ini (`useState<boolean>`) bağla.
8. Modal bileşenini oluştur:
   - Uyarı metni (geri alınamaz işlem).
   - `currentPassword` metin girişi (gizlenmiş).
   - "Hesabı Sil" butonu (kırmızı, yüklenme sırasında `disabled` + `ActivityIndicator`).
   - "Vazgeç" butonu (modal'ı kapatır).
9. Modal "Hesabı Sil" butonuna `profileService.deleteAccount` + başarıda `logout()` bağla.
10. Hata durumunda `"Şifreniz hatalı."` mesajını modal içinde göster.
11. Tüm renkler ve spacing `tokens.ts` token'larından alınsın.
12. `npx tsc --noEmit` hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/screens/profile/ProfileScreen.tsx`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `mobile/src/screens/TodoListScreen.tsx`
- `mobile/src/screens/TodoFormScreen.tsx`
- `mobile/src/screens/TaskDetailScreen.tsx`
- `mobile/src/theme/tokens.ts`
- `mobile/src/context/AuthContext.tsx`

### Acceptance Criteria
- [ ] Email ve `createdAt` Türkçe format ile ekranda görünüyor
- [ ] "Email Değiştir" butonu `ChangeEmailScreen`'e yönlendiriyor
- [ ] "Şifre Değiştir" butonu `ChangePasswordScreen`'e yönlendiriyor
- [ ] "Hesabı Sil" butonu modal'ı açıyor
- [ ] Modal uyarı metni, şifre girişi, "Hesabı Sil" ve "Vazgeç" butonlarını içeriyor
- [ ] Hesap silme başarısında `logout()` çağrılıyor
- [ ] `401` hatasında modal içinde `"Şifreniz hatalı."` mesajı görünüyor
- [ ] Yükleme sırasında butonlar `disabled` + `ActivityIndicator`
- [ ] Hardcode renk veya spacing yok — token'lar kullanılıyor
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- PROF-008

---

## PROF-010
**Owner:** Frontend Developer
**Title:** ChangeEmailScreen — email değiştirme formu

### Description
`mobile/src/screens/profile/ChangeEmailScreen.tsx` dosyası oluşturulur. Form alanları: "Mevcut Şifre" (gizlenmiş) ve "Yeni Email". Başarı akışında `updateEmail(newEmail)` çağrılır ve `navigation.goBack()` ile `ProfileScreen`'e dönülür. Hata mesajları spec FR-F2'ye göre Türkçe gösterilir. Tüm renkler ve spacing `tokens.ts` token'larından alınır.

### Steps
1. `mobile/src/screens/profile/ChangeEmailScreen.tsx` dosyasını oluştur.
2. `currentPassword` ve `newEmail` form state'lerini `useState` ile tanımla.
3. "Kaydet" butonu submit handler'ı:
   - `profileService.changeEmail(currentPassword, newEmail)` çağır.
   - Başarıda: `updateEmail(newEmail)` çağır → `navigation.goBack()`.
   - Hata durumlarında mesajı state'e yaz ve ekranda göster:
     - `"Mevcut şifreniz hatalı."` (401)
     - `"Bu e-posta adresi zaten kullanımda."` (409)
     - `"Geçerli bir e-posta adresi girin."` (400 format)
     - `"Yeni e-posta adresiniz mevcut adresinizle aynı."` (400 aynı)
4. Yükleme sırasında "Kaydet" butonu `disabled` + `ActivityIndicator`.
5. `npx tsc --noEmit` hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/screens/profile/ChangeEmailScreen.tsx`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `mobile/src/context/AuthContext.tsx`
- `mobile/src/services/profile/profileService.ts`
- `mobile/src/theme/tokens.ts`

### Acceptance Criteria
- [ ] "Mevcut Şifre" alanı gizlenmiş (`secureTextEntry`)
- [ ] Başarıda `updateEmail(newEmail)` çağrılıyor
- [ ] Başarıda `navigation.goBack()` ile `ProfileScreen`'e dönülüyor
- [ ] Dört hata senaryosunun tamamı Türkçe mesaj ile gösteriliyor
- [ ] Yükleme sırasında buton `disabled` + `ActivityIndicator`
- [ ] Hardcode renk veya spacing yok
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- PROF-009

---

## PROF-011
**Owner:** Frontend Developer
**Title:** ChangePasswordScreen — şifre değiştirme formu

### Description
`mobile/src/screens/profile/ChangePasswordScreen.tsx` dosyası oluşturulur. Form alanları: "Mevcut Şifre", "Yeni Şifre", "Yeni Şifre Tekrar" (üçü de gizlenmiş). "Yeni Şifre" ile "Yeni Şifre Tekrar" uyuşmuyorsa API çağrısı yapılmadan yerel validasyon hatası gösterilir. Başarı akışında başarı mesajı gösterilir ve `navigation.goBack()` ile `ProfileScreen`'e dönülür.

### Steps
1. `mobile/src/screens/profile/ChangePasswordScreen.tsx` dosyasını oluştur.
2. `currentPassword`, `newPassword`, `confirmPassword` form state'lerini `useState` ile tanımla.
3. Submit handler'a yerel validasyon ekle: `newPassword !== confirmPassword` ise `"Şifreler eşleşmiyor."` hatasını göster; API'ye gitme.
4. `profileService.changePassword(currentPassword, newPassword)` çağrısı ekle.
5. Başarıda başarı toast/mesajı göster; `navigation.goBack()` çağır.
6. Hata durumlarında mesajı state'e yaz:
   - `"Mevcut şifreniz hatalı."` (401)
   - `"Şifre en az 8 karakter olmalıdır."` (400 kısa)
   - `"Yeni şifreniz mevcut şifrenizle aynı olamaz."` (400 aynı)
7. Yükleme sırasında "Kaydet" butonu `disabled` + `ActivityIndicator`.
8. `npx tsc --noEmit` hatasız geçtiğini doğrula.

### Files Created
- `mobile/src/screens/profile/ChangePasswordScreen.tsx`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- `mobile/src/context/AuthContext.tsx`
- `mobile/src/services/profile/profileService.ts`
- `mobile/src/theme/tokens.ts`

### Acceptance Criteria
- [ ] Üç şifre alanı da gizlenmiş (`secureTextEntry`)
- [ ] Şifre uyuşmazlığı API çağrısı yapılmadan yerel olarak yakalanıyor
- [ ] Başarıda `navigation.goBack()` ile `ProfileScreen`'e dönülüyor
- [ ] Üç API hata senaryosu Türkçe mesaj ile gösteriliyor
- [ ] Yükleme sırasında buton `disabled` + `ActivityIndicator`
- [ ] Hardcode renk veya spacing yok
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- PROF-009

---

## PROF-012
**Owner:** Frontend Developer
**Title:** AppNavigator ve TodoListScreen header güncellemesi — profil navigasyonu

### Description
`mobile/src/navigation/types.ts` dosyasına üç yeni route eklenir. `mobile/src/navigation/AppNavigator.tsx` dosyasına üç yeni screen register edilir. `mobile/src/screens/TodoListScreen.tsx` header'ına sağ üst köşeye profil ikonu eklenerek `navigation.navigate('Profile')` çağrısı bağlanır. Mimari kararlar `docs/profile-architecture.md` Bölüm 8'de belgelenmiştir.

### Steps
1. `mobile/src/navigation/types.ts` dosyasını aç:
   - `AppStackParamList`'e `Profile: undefined`, `ChangeEmail: undefined`, `ChangePassword: undefined` ekle.
   - `ProfileScreenProps`, `ChangeEmailScreenProps`, `ChangePasswordScreenProps` type alias'larını ekle.
   - `RootStackParamList` alias'ına dokunma.
2. `mobile/src/navigation/AppNavigator.tsx` dosyasını aç:
   - `ProfileScreen`, `ChangeEmailScreen`, `ChangePasswordScreen` import et.
   - Stack'e üç yeni `Screen` ekle.
3. `mobile/src/screens/TodoListScreen.tsx` dosyasını aç:
   - Header'ın sağ üst köşesine profil ikonu butonu ekle.
   - Butona `navigation.navigate('Profile')` çağrısını bağla.
4. `npx tsc --noEmit` ile TypeScript hatasız geçtiğini doğrula.

### Files Created
- (yok)

### Files Modified
- `mobile/src/navigation/types.ts`
- `mobile/src/navigation/AppNavigator.tsx`
- `mobile/src/screens/TodoListScreen.tsx`

### Files Must NOT Be Modified
- `mobile/src/navigation/AuthNavigator.tsx`
- `mobile/src/navigation/RootNavigator.tsx`
- `mobile/src/context/AuthContext.tsx`
- `mobile/src/screens/TodoFormScreen.tsx`
- `mobile/src/screens/TaskDetailScreen.tsx`

### Acceptance Criteria
- [ ] `AppStackParamList`'te `Profile`, `ChangeEmail`, `ChangePassword` route'ları mevcut
- [ ] Üç yeni screen props type alias'ı tanımlı
- [ ] `AppNavigator` üç yeni screen'i içeriyor
- [ ] `TodoListScreen` header'ında sağ üst köşede profil ikonu butonu var
- [ ] Profil ikonuna tıklamak `ProfileScreen`'e yönlendiriyor
- [ ] Mevcut `RootStackParamList` alias'ı değişmemiş
- [ ] `npx tsc --noEmit` hatasız

### Depends On
- PROF-010
- PROF-011

---

## PROF-013
**Owner:** Tester
**Title:** E2E doğrulama ve test raporu — profil yönetimi

### Description
Tüm profil yönetimi feature'ı uçtan uca test edilir. Backend API testleri (curl/Swagger), frontend ekran akışları ve edge case senaryoları kapsama alınır. Mevcut `dotnet test` ve `npx tsc --noEmit` çalıştırılarak regresyon olmadığı doğrulanır. Tüm bulgular `docs/profile-test-report.md` dosyasına yazılır.

### Steps
1. **Backend API Testleri** (curl veya Swagger UI ile):
   - Geçerli token ile `GET /api/auth/me` → `200 OK` + doğru alanlar.
   - Token olmadan `GET /api/auth/me` → `401`.
   - `PUT /api/auth/email` başarı senaryosu.
   - `PUT /api/auth/email` yanlış şifre → `401`.
   - `PUT /api/auth/email` geçersiz format → `400`.
   - `PUT /api/auth/email` mevcut email ile aynı → `400`.
   - `PUT /api/auth/email` başka kullanıcıya ait email → `409`.
   - `PUT /api/auth/password` başarı senaryosu; DB'de şifre hash olarak saklandığını doğrula.
   - `PUT /api/auth/password` yanlış şifre → `401`.
   - `PUT /api/auth/password` 7 karakterlik şifre → `400`.
   - `PUT /api/auth/password` mevcut şifre ile aynı → `400`.
   - `DELETE /api/auth/account` başarı; kullanıcı ve todo'ların DB'den silindiğini doğrula.
   - `DELETE /api/auth/account` yanlış şifre → `401`.
2. **Frontend Uygulama Testleri:**
   - `ProfileScreen`'in email ve createdAt gösterdiğini doğrula.
   - "Email Değiştir" akışını uçtan uca çalıştır; `AuthContext.email`'in güncellendiğini doğrula.
   - "Şifre Değiştir" akışında uyuşmayan şifrelerde API'nin çağrılmadığını doğrula.
   - Hesap silme modal'ının içeriğini doğrula.
   - Hesap silme başarısında token temizlendiğini ve `LoginScreen`'e yönlendirildiğini doğrula.
3. **Regresyon Kontrolleri:**
   - `dotnet test backend/` — sıfır hata.
   - `npx tsc --noEmit` — sıfır hata.
   - v0.6.0 auth flow'larının (register, login, logout) hâlâ çalıştığını doğrula.
   - Mevcut todo CRUD işlemlerinin etkilenmediğini doğrula.
4. Tüm bulguları `docs/profile-test-report.md` dosyasına yaz.

### Files Created
- `docs/profile-test-report.md`

### Files Modified
- (yok)

### Files Must NOT Be Modified
- (üretim kodu — Tester yalnızca test yapar ve raporlar)

### Acceptance Criteria
- [ ] `GET /api/auth/me` geçerli token → `200 OK` + `{ userId, email, createdAt }`
- [ ] `GET /api/auth/me` token yok → `401`
- [ ] `PUT /api/auth/email` doğru şifre + yeni geçerli email → `200 OK`
- [ ] `PUT /api/auth/email` yanlış şifre → `401`
- [ ] `PUT /api/auth/email` geçersiz format → `400`
- [ ] `PUT /api/auth/email` mevcut email ile aynı → `400`
- [ ] `PUT /api/auth/email` email çakışması → `409`
- [ ] `PUT /api/auth/password` doğru şifre + yeni geçerli şifre → `200 OK`
- [ ] `PUT /api/auth/password` yanlış şifre → `401`
- [ ] `PUT /api/auth/password` 7 karakterlik şifre → `400`
- [ ] `PUT /api/auth/password` mevcut şifre ile aynı → `400`
- [ ] Yeni şifre DB'de hash olarak saklanmış
- [ ] `DELETE /api/auth/account` doğru şifre → `204`, kullanıcı + todo'lar silindi
- [ ] `DELETE /api/auth/account` yanlış şifre → `401`
- [ ] `ProfileScreen` email + createdAt gösteriyor; üç aksiyon mevcut
- [ ] Email değişikliği sonrası `AuthContext.email` güncelleniyor
- [ ] Şifre uyuşmazlığı API çağrısı yapılmadan yakalanıyor
- [ ] Hesap silme başarısında token + cache temizleniyor, `LoginScreen`'e yönlendirildi
- [ ] `dotnet test` sıfır hata
- [ ] `npx tsc --noEmit` sıfır hata
- [ ] `docs/profile-test-report.md` oluşturulmuş

### Depends On
- PROF-012

---

## Summary Table

| Ticket | Owner | Title | Est. | Dependency |
|--------|-------|-------|------|------------|
| PROF-001 | Architect | IUserService ve IUserRepository interface genişletmesi | 1h | 007-auth tamamlanmış |
| PROF-002 | Architect | Profil DTO'ları ve yeni exception sınıfları | 1h | PROF-001 |
| PROF-003 | Backend Developer | EfUserRepository — GetByIdAsync, UpdateAsync, DeleteAsync | 1.5h | PROF-002 |
| PROF-004 | Backend Developer | UserService — GetProfileAsync, ChangeEmailAsync, ChangePasswordAsync, DeleteAccountAsync | 2h | PROF-003 |
| PROF-005 | Backend Developer | AuthController — GET /me, PUT /email, PUT /password, DELETE /account | 1.5h | PROF-004 |
| PROF-006 | Backend Developer | Integration testleri güncelleme | 1.5h | PROF-005 |
| PROF-007 | Frontend Developer | profileService.ts — dört API fonksiyonu | 1h | PROF-006 |
| PROF-008 | Frontend Developer | AuthContext'e updateEmail() ekleme | 0.5h | PROF-007 |
| PROF-009 | Frontend Developer | ProfileScreen (profil bilgileri + aksiyon listesi + silme modal'ı) | 2h | PROF-008 |
| PROF-010 | Frontend Developer | ChangeEmailScreen | 1h | PROF-009 |
| PROF-011 | Frontend Developer | ChangePasswordScreen | 1h | PROF-009 |
| PROF-012 | Frontend Developer | AppNavigator ve TodoListScreen header güncellemesi | 1h | PROF-010, PROF-011 |
| PROF-013 | Tester | E2E doğrulama ve test raporu | 2h | PROF-012 |

**Toplam tahmini süre:** ~17 saat

---

## Dependency Order

```
PROF-001 → PROF-002 → PROF-003 → PROF-004 → PROF-005 → PROF-006
                                                               ↓
                                                          PROF-007 → PROF-008 → PROF-009
                                                                                    ↓
                                                                          PROF-010 ──┤
                                                                          PROF-011 ──┤
                                                                                     ↓
                                                                               PROF-012 → PROF-013
```

Backend ve Frontend geliştirme PROF-006 tamamlandıktan sonra paralel ilerleyebilir (PROF-007 başladığında backend hazırdır). PROF-010 ve PROF-011 birbirinden bağımsız olarak paralel geliştirilebilir; ikisi de PROF-009'a bağımlıdır.
