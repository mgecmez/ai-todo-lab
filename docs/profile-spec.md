# Feature: Profil Yönetimi

Versiyon: 1.0
Tarih: 2026-03-17
Hazırlayan: Product Manager Agent
Durum: Taslak
Hedef Sürüm: v0.7.0

---

## Genel Bakış

v0.6.0 ile JWT tabanlı kimlik doğrulama sistemi hayata geçirildi. Kullanıcılar artık bireysel hesaplara sahip ve yalnızca kendi todo'larına erişiyor. Ancak bir kullanıcı, hesap oluşturulduktan sonra kimlik bilgilerini güncelleyememekte ya da hesabını silemektedir.

Bu feature, kullanıcıya kendi hesabı üzerinde kontrol sağlar:

- Mevcut email adresini görüntüleyebilir ve değiştirebilir.
- Şifresini güncelleyebilir.
- Hesabını ve tüm verilerini kalıcı olarak silebilir.
- Hesap yaşını (oluşturma tarihini) görüntüleyebilir.

Tüm hassas işlemler (email değişikliği, şifre değişikliği, hesap silme) mevcut şifre doğrulaması gerektirerek yetkisiz değişikliklere karşı korunur.

---

## Kullanıcı Hikayeleri

### US-1 — Profil Ekranı

Bir kullanıcı olarak, mevcut hesap bilgilerimi (email adresi ve hesap oluşturma tarihi) tek bir ekranda görmek istiyorum; böylece hangi hesaba giriş yaptığımı doğrulayabilirim.

### US-2 — Email Değiştirme

Kayıtlı bir kullanıcı olarak, email adresimi değiştirmek istiyorum; böylece eski veya erişemediğim bir email yerine güncel adresimle giriş yapabilirim.

### US-3 — Şifre Değiştirme

Kayıtlı bir kullanıcı olarak, şifremi değiştirmek istiyorum; böylece hesabımın güvenliğini periyodik olarak güncelleyebilirim.

### US-4 — Hesap Silme

Kayıtlı bir kullanıcı olarak, hesabımı ve tüm todo verilerimi kalıcı olarak silmek istiyorum; böylece uygulamadaki tüm verilerimi temizleyip platformdan ayrılabilirim.

---

## Fonksiyonel Gereksinimler

### Backend

#### FR-B1 — Email Değiştirme Endpoint'i

- `PUT /api/auth/email` endpoint'i oluşturulur.
- Request body: `{ currentPassword: string, newEmail: string }`
- Sunucu önce `currentPassword` ile mevcut şifreyi doğrular; eşleşmezse `401 Unauthorized` döner.
- `newEmail`, geçerli email format validasyonuna tabi tutulur; geçersizse `400 Bad Request` döner.
- `newEmail` sistemde başka bir kullanıcıya ait ise `409 Conflict` döner.
- `newEmail`, mevcut email ile aynıysa `400 Bad Request` döner.
- Başarılı güncellemede `200 OK` döner; response body: `{ userId: string, email: string }`.
- JWT token yeniden üretilmez; mevcut token süresi dolana kadar geçerli olmaya devam eder.
- Endpoint `[Authorize]` attribute ile korunur.

#### FR-B2 — Şifre Değiştirme Endpoint'i

- `PUT /api/auth/password` endpoint'i oluşturulur.
- Request body: `{ currentPassword: string, newPassword: string }`
- Sunucu önce `currentPassword` ile mevcut şifreyi doğrular; eşleşmezse `401 Unauthorized` döner.
- `newPassword` minimum 8 karakter zorunluluğuna tabidir; kısa ise `400 Bad Request` döner.
- `newPassword`, `currentPassword` ile aynıysa `400 Bad Request` döner.
- Başarılı güncellemede `200 OK` döner; body: `{ message: "Şifre başarıyla güncellendi." }`.
- Yeni şifre hash'lenerek saklanır; eski hash silinir.
- Endpoint `[Authorize]` attribute ile korunur.

#### FR-B3 — Hesap Silme Endpoint'i

- `DELETE /api/auth/account` endpoint'i oluşturulur.
- Request body: `{ currentPassword: string }`
- Sunucu `currentPassword` ile mevcut şifreyi doğrular; eşleşmezse `401 Unauthorized` döner.
- Doğrulama başarılı olursa:
  - Kullanıcıya ait tüm `Todo` kayıtları silinir.
  - `User` kaydı silinir.
- Başarılı silmede `204 No Content` döner.
- Endpoint `[Authorize]` attribute ile korunur.

#### FR-B4 — Profil Bilgisi Endpoint'i

- `GET /api/auth/me` endpoint'i oluşturulur.
- Başarılı yanıt: `200 OK`; body: `{ userId: string, email: string, createdAt: string (ISO 8601 UTC) }`.
- Endpoint `[Authorize]` attribute ile korunur.

### Frontend

#### FR-F1 — Profil Ekranı

- `ProfileScreen` oluşturulur.
- Gösterilen bilgiler:
  - Kullanıcının mevcut email adresi.
  - Hesap oluşturma tarihi (yerelleştirilmiş format; örn. "17 Mart 2026").
- Ekranda üç aksiyon seçeneği yer alır:
  - "Email Değiştir" → `ChangeEmailScreen`'e yönlendirir.
  - "Şifre Değiştir" → `ChangePasswordScreen`'e yönlendirir.
  - "Hesabı Sil" → onay modalını tetikler.
- Ekran açılışında `GET /api/auth/me` çağrılır.

#### FR-F2 — Email Değiştirme Ekranı

- `ChangeEmailScreen` oluşturulur.
- Form alanları: Mevcut Şifre (gizlenmiş), Yeni Email.
- Başarı akışı: ekran kapanır, `AuthContext`'teki `email` güncellenir.
- Hata akışları:
  - `401`: "Mevcut şifreniz hatalı."
  - `409`: "Bu e-posta adresi zaten kullanımda."
  - `400` (format): "Geçerli bir e-posta adresi girin."
  - `400` (aynı email): "Yeni e-posta adresiniz mevcut adresinizle aynı."

#### FR-F3 — Şifre Değiştirme Ekranı

- `ChangePasswordScreen` oluşturulur.
- Form alanları: Mevcut Şifre, Yeni Şifre, Yeni Şifre Tekrar (hepsi gizlenmiş).
- Şifre uyuşmazlığı API çağrısı yapılmadan yerel validasyonla yakalanır.
- Başarı akışı: başarı mesajı, `ProfileScreen`'e dönüş.
- Hata akışları:
  - `401`: "Mevcut şifreniz hatalı."
  - `400` (kısa): "Şifre en az 8 karakter olmalıdır."
  - `400` (aynı): "Yeni şifreniz mevcut şifrenizle aynı olamaz."
  - Yerel: "Şifreler eşleşmiyor."

#### FR-F4 — Hesap Silme Akışı

- "Hesabı Sil" aksiyonunda onay modalı gösterilir.
- Modal: uyarı metni + şifre girişi + "Hesabı Sil" (kırmızı) + "Vazgeç" butonları.
- Başarı akışı: token silinir, AsyncStorage cache temizlenir, `LoginScreen`'e yönlendirilir.
- `401`: "Şifreniz hatalı."

#### FR-F5 — AuthContext Güncellemesi

- `AuthContext`'e `updateEmail(newEmail: string)` fonksiyonu eklenir.
- Email başarıyla değiştirildiğinde `email` state'i güncellenir.

---

## Kapsam Dışı

| Kapsam Dışı Özellik | Gerekçe |
|---------------------|---------|
| Profil fotoğrafı / avatar | Ek depolama altyapısı gerektirir |
| Display name / tam ad | User entity'sinde bu alan mevcut değil |
| Sosyal login bağlama | OAuth entegrasyonu ayrı bir feature |
| Two-factor authentication (2FA) | Bağımsız güvenlik feature'ı |
| Email doğrulama (onay linki) | SMTP altyapısı gerektirir |
| Şifre sıfırlama (Forgot Password) | Faz 2 kapsamı |
| Refresh token | Faz 2 kapsamı |

---

## Kabul Kriterleri

### Backend

- [ ] `GET /api/auth/me` → geçerli token: `200 OK` + `{ userId, email, createdAt }`
- [ ] `GET /api/auth/me` → token yok: `401`
- [ ] `PUT /api/auth/email` → doğru şifre + geçerli yeni email: `200 OK`
- [ ] `PUT /api/auth/email` → yanlış şifre: `401`
- [ ] `PUT /api/auth/email` → geçersiz format: `400`
- [ ] `PUT /api/auth/email` → başka kullanıcıya ait email: `409`
- [ ] `PUT /api/auth/email` → mevcut email ile aynı: `400`
- [ ] `PUT /api/auth/password` → doğru şifre + geçerli yeni şifre: `200 OK`
- [ ] `PUT /api/auth/password` → yanlış şifre: `401`
- [ ] `PUT /api/auth/password` → 8 karakterden kısa: `400`
- [ ] `PUT /api/auth/password` → mevcut şifreyle aynı: `400`
- [ ] `PUT /api/auth/password` → yeni şifre hash'lenerek kaydedilir
- [ ] `DELETE /api/auth/account` → doğru şifre: `204`, kullanıcı + tüm todo'lar silinir
- [ ] `DELETE /api/auth/account` → yanlış şifre: `401`
- [ ] `dotnet test` tüm testler geçer

### Frontend

- [ ] `ProfileScreen` email + createdAt görünür
- [ ] `ProfileScreen` üç aksiyon mevcuttur
- [ ] `ChangeEmailScreen` başarıda `AuthContext.email` güncellenir
- [ ] `ChangeEmailScreen` tüm hata senaryoları Türkçe mesaj gösterir
- [ ] `ChangePasswordScreen` şifre uyuşmazlığı API'ye gitmeden yakalanır
- [ ] `ChangePasswordScreen` başarıda `ProfileScreen`'e dönülür
- [ ] Hesap silme modalda şifre + uyarı + onay butonu var
- [ ] Hesap silme başarıda token + cache temizlenir, `LoginScreen`'e yönlendirilir
- [ ] Tüm ekranlarda yükleme sırasında buton `disabled` + `ActivityIndicator`
- [ ] `npx tsc --noEmit` hatasız
