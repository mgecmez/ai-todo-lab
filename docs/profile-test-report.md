# PROF-013 — Test Raporu

**Tarih:** 2026-03-18
**Versiyon:** v0.7.0 — Profil Yönetimi
**Test Eden:** Tester (PROF-013)
**Yöntem:** Otomatik (dotnet test + tsc) + Statik Kod Analizi

---

## 1. Backend Testleri (`dotnet test`)

### Sonuç: 27/27 PASSED

```
Failed: 0, Passed: 27, Skipped: 0, Total: 27, Duration: 1 s
```

### Profil Test Sınıfı — AuthController_ProfileTests (13 test)

| # | Test Adı | Sonuç |
|---|----------|-------|
| 1 | `GetMe_WithValidToken_Returns200WithProfileFields` | PASS |
| 2 | `GetMe_WithoutToken_Returns401` | PASS |
| 3 | `ChangeEmail_ValidPasswordAndNewEmail_Returns200WithNewEmail` | PASS |
| 4 | `ChangeEmail_WrongPassword_Returns401` | PASS |
| 5 | `ChangeEmail_InvalidEmailFormat_Returns400` | PASS |
| 6 | `ChangeEmail_SameAsCurrentEmail_Returns400` | PASS |
| 7 | `ChangeEmail_EmailAlreadyUsedByAnotherUser_Returns409` | PASS |
| 8 | `ChangePassword_ValidCurrentPasswordAndNewPassword_Returns200` | PASS |
| 9 | `ChangePassword_WrongCurrentPassword_Returns401` | PASS |
| 10 | `ChangePassword_NewPasswordTooShort_Returns400` | PASS |
| 11 | `ChangePassword_SameAsCurrentPassword_Returns400` | PASS |
| 12 | `DeleteAccount_CorrectPassword_Returns204AndUserIsDeleted` | PASS |
| 13 | `DeleteAccount_WrongPassword_Returns401` | PASS |

### Regresyon — TodoApiIntegrationTests (14 test)

| # | Test Adı | Sonuç |
|---|----------|-------|
| 1 | `Health_Returns200_WithStatusOk` | PASS |
| 2 | `GetAllTodos_WithoutToken_Returns401` | PASS |
| 3 | `CreateTodo_ValidRequest_Returns201WithLocationAndBody` | PASS |
| 4 | `CreateTodo_EmptyTitle_Returns400ProblemDetails` | PASS |
| 5 | `GetAllTodos_CreatedTodoExists_InList` | PASS |
| 6 | `ToggleTodo_ChangesIsCompleted` | PASS |
| 7 | `CreateTodo_WithNewFields_ReturnsPriorityDueDateAndTags` | PASS |
| 8 | `CreateTodo_LegacyFormat_ReturnsDefaults` | PASS |
| 9 | `PinTodo_TogglesIsPinned` | PASS |
| 10 | `PinTodo_UnknownId_Returns404` | PASS |
| 11 | `UpdateTodo_WithNewFields_UpdatesCorrectly` | PASS |
| 12 | `GetAllTodos_PinnedTodoAppearsBeforeUnpinned` | PASS |
| 13 | `CreateTodo_InvalidPriority_Returns400` | PASS |
| 14 | `GetAllTodos_UserIsolation_OtherUserCannotSeeMyTodos` | PASS |

---

## 2. TypeScript Kontrolü

### Sonuç: HATASIZ

```
cd mobile && npx tsc --noEmit
# Çıktı yok — sıfır hata
```

---

## 3. Backend API Endpoint Doğrulama

### Profil Endpoint'leri — Statik Analiz (AuthController.cs)

| Kabul Kriteri | Endpoint | Uygulama | Sonuç |
|---------------|----------|----------|-------|
| `GET /api/auth/me` geçerli token → 200 + `{ userId, email, createdAt }` | `[HttpGet("me")]` | `GetProfileAsync` → `UserProfileResponse { UserId, Email, CreatedAt }` döner | PASS |
| `GET /api/auth/me` token yok → 401 | `[Authorize]` attribute | ASP.NET Core JWT middleware devreye girer | PASS |
| `PUT /api/auth/email` başarı → 200 | `[HttpPut("email")]` | `ChangeEmailAsync` → `UserProfileResponse` döner, `Ok(updated)` | PASS |
| `PUT /api/auth/email` yanlış şifre → 401 | `catch (WrongPasswordException)` | `Unauthorized(...)` + Türkçe mesaj: "Mevcut şifreniz hatalı." | PASS |
| `PUT /api/auth/email` geçersiz format → 400 | `[EmailAddress]` + `ModelState.IsValid` | `BadRequest(ModelState)` | PASS |
| `PUT /api/auth/email` aynı email → 400 | `catch (SameEmailException)` | `BadRequest(...)` + "Yeni e-posta adresiniz mevcut adresinizle aynı." | PASS |
| `PUT /api/auth/email` çakışma → 409 | `catch (UserAlreadyExistsException)` | `Conflict(...)` + "Bu e-posta adresi zaten kullanımda." | PASS |
| `PUT /api/auth/password` başarı → 200 | `[HttpPut("password")]` | `Ok(new { message = "Şifre başarıyla güncellendi." })` | PASS |
| `PUT /api/auth/password` yanlış şifre → 401 | `catch (WrongPasswordException)` | `Unauthorized(...)` + Türkçe mesaj | PASS |
| `PUT /api/auth/password` kısa şifre → 400 | `[MinLength(8)]` + `ModelState.IsValid` | `BadRequest(ModelState)` | PASS |
| `PUT /api/auth/password` aynı şifre → 400 | `catch (SamePasswordException)` | `BadRequest(...)` + "Yeni şifreniz mevcut şifrenizle aynı olamaz." | PASS |
| `DELETE /api/auth/account` başarı → 204 | `[HttpDelete("account")]` | `NoContent()` | PASS |
| `DELETE /api/auth/account` yanlış şifre → 401 | `catch (WrongPasswordException)` | `Unauthorized(...)` + "Şifreniz hatalı." | PASS |

### DTO Kontrolleri

| DTO | Alan | Validasyon | Sonuç |
|-----|------|------------|-------|
| `UserProfileResponse` | `userId`, `email`, `createdAt` | — | PASS |
| `ChangeEmailRequest` | `CurrentPassword` (Required), `NewEmail` (Required + EmailAddress + MaxLength 256) | DataAnnotations | PASS |
| `ChangePasswordRequest` | `CurrentPassword` (Required), `NewPassword` (Required + MinLength 8 + MaxLength 100) | DataAnnotations | PASS |
| `DeleteAccountRequest` | `CurrentPassword` (Required) | DataAnnotations | PASS |

### Exception Sınıfları

| Exception | Kullanım Yeri | Sonuç |
|-----------|--------------|-------|
| `WrongPasswordException` | ChangeEmail, ChangePassword, DeleteAccount → 401 | PASS |
| `SameEmailException` | ChangeEmail → 400 | PASS |
| `SamePasswordException` | ChangePassword → 400 | PASS |
| `UserAlreadyExistsException` | Register, ChangeEmail → 409 | PASS |

### IUserService Arayüzü

| Metod | İmza | Sonuç |
|-------|------|-------|
| `GetProfileAsync` | `Task<UserProfileResponse?> GetProfileAsync(string userId)` | PASS |
| `ChangeEmailAsync` | `Task<UserProfileResponse> ChangeEmailAsync(string userId, ChangeEmailRequest request)` | PASS |
| `ChangePasswordAsync` | `Task ChangePasswordAsync(string userId, ChangePasswordRequest request)` | PASS |
| `DeleteAccountAsync` | `Task DeleteAccountAsync(string userId, DeleteAccountRequest request)` | PASS |

---

## 4. Frontend Doğrulama

### profileService.ts

| İşlev | Endpoint | Hata Senaryoları | Türkçe Mesajlar | Sonuç |
|-------|----------|-----------------|-----------------|-------|
| `getProfile()` | `GET /api/auth/me` | response.ok olmadığında fırlatır | "Profil bilgileri alınırken bir hata oluştu." | PASS |
| `changeEmail()` | `PUT /api/auth/email` | 401, 409, 400 (format), 400 (aynı email) | "Mevcut şifreniz hatalı." / "Bu e-posta adresi zaten kullanımda." / "Geçerli bir e-posta adresi girin." / "Yeni e-posta adresiniz mevcut adresinizle aynı." | PASS |
| `changePassword()` | `PUT /api/auth/password` | 401, 400 (kısa), 400 (aynı) | "Mevcut şifreniz hatalı." / "Şifre en az 8 karakter olmalıdır." / "Yeni şifreniz mevcut şifrenizle aynı olamaz." | PASS |
| `deleteAccount()` | `DELETE /api/auth/account` | 401 | "Şifreniz hatalı." | PASS |

### AuthContext.tsx

| Kontrol | Beklenen | Sonuç |
|---------|----------|-------|
| `updateEmail` fonksiyonu tanımlı | `AuthContextValue` arayüzünde tanımlı | PASS |
| `updateEmail` → SecureStore günceller | `SecureStore.setItemAsync(KEY_EMAIL, newEmail)` çağrısı var | PASS |
| `updateEmail` → React state günceller | `setState(prev => ({ ...prev, email: newEmail }))` | PASS |
| `updateEmail` → `useCallback` ile memoize edilmiş | `useCallback` wrap'i mevcut | PASS |

### ProfileScreen.tsx

| Kontrol | Beklenen | Sonuç |
|---------|----------|-------|
| `profile.email` görüntüleniyor | `<Text>{profile.email}</Text>` | PASS |
| `profile.createdAt` Türkçe formatlanmış | `formatDateTR(profile.createdAt)` ile `toLocaleDateString('tr-TR')` | PASS |
| "Email Değiştir" aksiyonu mevcut | `navigation.navigate('ChangeEmail')` | PASS |
| "Şifre Değiştir" aksiyonu mevcut | `navigation.navigate('ChangePassword')` | PASS |
| "Hesabı Sil" aksiyonu mevcut | `setModalVisible(true)` ile modal açılır | PASS |
| "Çıkış Yap" butonu mevcut | `logout()` çağrısı | PASS |
| Modal'da şifre girişi var | `TextInput` `secureTextEntry` ile | PASS |
| Modal'da uyarı mesajı var | "Bu işlem geri alınamaz. Tüm verileriniz silinecektir." | PASS |
| Modal'da "Hesabı Sil" butonu var | `handleDeleteAccount` çağrısı | PASS |
| Modal'da "Vazgeç" butonu var | `handleCloseModal` çağrısı | PASS |
| Hata mesajı Türkçe gösteriliyor | `deleteError` state'i render'da | PASS |

### ChangeEmailScreen.tsx

| Kontrol | Beklenen | Sonuç |
|---------|----------|-------|
| Mevcut şifre alanı | `secureTextEntry TextInput` | PASS |
| Yeni email alanı | `keyboardType="email-address" TextInput` | PASS |
| Hata mesajı alanı | `{error !== null && <Text>{error}</Text>}` | PASS |
| Başarıda `updateEmail` + `goBack()` çağrısı | `changeEmail()` → `updateEmail(newEmail)` → `navigation.goBack()` | PASS |
| 4 hata senaryosu (401, 409, 400-format, 400-aynı) | `profileService.ts` hata fırlatır, screen `err.message` gösterir | PASS |
| Türkçe hata mesajları | `profileService.ts` içinde tanımlı | PASS |

### ChangePasswordScreen.tsx

| Kontrol | Beklenen | Sonuç |
|---------|----------|-------|
| Mevcut şifre alanı | `secureTextEntry TextInput` | PASS |
| Yeni şifre alanı | `secureTextEntry TextInput` | PASS |
| Şifre tekrar alanı | `secureTextEntry TextInput` (confirmPassword) | PASS |
| Şifre uyuşmazlığı API'ye gitmeden yakalanıyor | `if (newPassword !== confirmPassword) { setError(...); return; }` | PASS |
| Hata mesajı: "Şifreler eşleşmiyor." | Yerel kontrol, API çağrısı yapılmaz | PASS |
| Başarı mesajı gösteriliyor | `setSuccessMessage('Şifreniz başarıyla güncellendi.')` | PASS |
| Başarıda otomatik `goBack()` | `setTimeout(() => navigation.goBack(), 1200)` | PASS |

### Navigation — types.ts ve AppNavigator.tsx

| Kontrol | Beklenen | Sonuç |
|---------|----------|-------|
| `Profile` route tanımı | `AppStackParamList.Profile: undefined` | PASS |
| `ChangeEmail` route tanımı | `AppStackParamList.ChangeEmail: undefined` | PASS |
| `ChangePassword` route tanımı | `AppStackParamList.ChangePassword: undefined` | PASS |
| `ProfileScreenProps` type export | `NativeStackScreenProps<AppStackParamList, 'Profile'>` | PASS |
| `ChangeEmailScreenProps` type export | `NativeStackScreenProps<AppStackParamList, 'ChangeEmail'>` | PASS |
| `ChangePasswordScreenProps` type export | `NativeStackScreenProps<AppStackParamList, 'ChangePassword'>` | PASS |
| `AppNavigator` `Profile` screen kaydı | `<Stack.Screen name="Profile" component={ProfileScreen} />` | PASS |
| `AppNavigator` `ChangeEmail` screen kaydı | `<Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />` | PASS |
| `AppNavigator` `ChangePassword` screen kaydı | `<Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />` | PASS |

### TodoListScreen.tsx — Profil İkonu

| Kontrol | Beklenen | Sonuç |
|---------|----------|-------|
| Header'da profil butonu | `useLayoutEffect` → `navigation.setOptions({ headerRight: ... })` | PASS |
| Profil ikonuna tıklanınca `Profile` route'una gidiyor | `navigation.navigate('Profile')` | PASS |
| İkon: `Ionicons name="person-circle-outline"` | Mevcut | PASS |

---

## 5. Regresyon Kontrolleri

| Kontrol | Açıklama | Sonuç |
|---------|----------|-------|
| Todo CRUD testleri etkilenmemiş | `TodoApiIntegrationTests` — 14/14 PASS | PASS |
| `IUserService` mevcut metodları değişmemiş | `RegisterAsync`, `LoginAsync` imzaları korunmuş | PASS |
| `AuthContext` mevcut API'si değişmemiş | `login`, `logout`, `token`, `userId`, `email`, `isLoading` hepsi mevcut | PASS |
| `AppStackParamList` geriye dönük uyumlu | `RootStackParamList = AppStackParamList` alias korunmuş | PASS |
| `AuthController` register/login endpoint'leri değişmemiş | `POST /api/auth/register`, `POST /api/auth/login` bozulmamış | PASS |
| TypeScript build tüm dosyalar dahil hatasız | `npx tsc --noEmit` — sıfır hata | PASS |

---

## 6. Özet

| Kategori | Toplam | Geçen | Başarısız |
|----------|--------|-------|-----------|
| dotnet test (Profil) | 13 | 13 | 0 |
| dotnet test (Regresyon) | 14 | 14 | 0 |
| TypeScript build | — | HATASIZ | — |
| Backend API endpoint | 13 | 13 | 0 |
| DTO ve Exception | 8 | 8 | 0 |
| Frontend — profileService | 4 | 4 | 0 |
| Frontend — AuthContext | 4 | 4 | 0 |
| Frontend — ProfileScreen | 11 | 11 | 0 |
| Frontend — ChangeEmailScreen | 6 | 6 | 0 |
| Frontend — ChangePasswordScreen | 7 | 7 | 0 |
| Frontend — Navigation | 9 | 9 | 0 |
| Frontend — TodoListScreen | 3 | 3 | 0 |
| Regresyon (statik) | 6 | 6 | 0 |

**Genel Sonuç: v0.7.0 Profil Yönetimi tüm kabul kriterlerini karşılıyor — production'a çıkmaya hazır.**

### Acik Nokta Yok

Tüm kabul kriterleri doğrulandı. Açık nokta bulunmamaktadır.
