# AI Todo Lab — Backlog

Bu dosya projenin tüm planlanmış ve ertelenmiş işlerini versiyon bazlı öncelik sırasıyla içerir.
Versiyon planının tam açıklaması için: `docs/roadmap.md`
Roadmap durum analizi için: `docs/roadmap-status.md`

Güncelleme: 2026-03-21 (v0.10.0 tamamlandı; BL-044 v1.0.0'a taşındı; BL-050, BL-051 eklendi)

---

## v0.10.0 — Hızlı Kazanımlar

> Bağımlılığı olmayan, altyapı hazır, az iş gerektiren iyileştirmeler.

### BL-005 — `isOverdue` fonksiyonunu utility'ye taşı
**Alan:** Kod kalitesi

`TodoListScreen` ve `TaskDetailScreen`'de aynı `isOverdue(dueDate, isCompleted)` fonksiyonu
tekrarlanıyor. `src/utils/isOverdue.ts` dosyasına taşınacak; `formatDate` ile aynı pattern.

---

### BL-004 — `DateTimePickerField` bileşenine `placeholder` prop
**Alan:** DateTime Picker — Teknik iyileştirme

Bileşen şu an Türkçe "Tarih seçilmedi" sabit metni kullanıyor. Yeniden kullanılabilirlik
için `placeholder?: string` prop eklenecek; varsayılan değer mevcut sabit metin.

---

### BL-001 — "Tüm gün" (All-Day) modu
**Alan:** DateTime Picker

Görev oluştururken saat seçimini atlayabilme seçeneği. "Tüm gün" toggle'ı eklendiğinde
`dueDate` gece yarısı UTC olarak kaydedilir, liste ve detay ekranında "HH:mm" gösterilmez.
`DateTimePickerField` bileşenine `allDay?: boolean` prop'u eklenecek.

---

### BL-002 — Geçmiş tarih seçimine uyarı
**Alan:** DateTime Picker

Kullanıcı geçmişte bir tarih seçtiğinde picker kapandıktan sonra küçük bir uyarı
gösterilsin (engel değil, bilgilendirme). Mevcut `isOverdue` mantığından beslenir.

---

### BL-003 — Görev tamamlanınca bekleyen bildirimi iptal et
**Alan:** Bildirimler

Kullanıcı bir görevi tamamladığında (toggle → isCompleted=true) o göreve ait
yerel bildirim varsa otomatik iptal edilmeli. `notificationRegistry` zaten
görev ID → bildirim ID eşleşmesini tutuyor; `useToggleTodo` mutation'ına
`cancelNotification(todoId)` çağrısı eklenecek.

---

## v1.0.0 — MVP Release

> Uygulamanın canlıya (store'a) çıkabilmesi için gereken minimum özellik seti.

### BL-016 — Rate limiting (Brute-force koruması)
**Alan:** Auth — Güvenlik
**Kaynak:** `docs/auth-spec.md` § Kapsam Dışı — Faz 2

Login endpoint'ine aşırı istek koruması. ASP.NET Core `AspNetCoreRateLimit` veya
custom middleware ile IP/kullanıcı bazlı istek sınırlama. Özellikle `/api/auth/login`
için kritik.

---

### BL-012 — Refresh token
**Alan:** Auth
**Kaynak:** `docs/auth-spec.md` § Kapsam Dışı — Faz 2

Mevcut JWT'nin süresi kısa (60 dk). Refresh token ile uzun süreli oturum desteği.
Backend'de: `RefreshToken` entity, `/api/auth/refresh` endpoint. Frontend'de:
`apiFetch` interceptor'ına token yenileme mantığı. Mevcut `SecureStore` kullanımıyla uyumlu.

---

### BL-010 — Şifre sıfırlama (Forgot Password)
**Alan:** Auth
**Kaynak:** `docs/auth-spec.md` § Kapsam Dışı — Faz 2

Email üzerinden şifre sıfırlama akışı. Backend'de: SMTP entegrasyonu, reset token
üretimi ve doğrulama endpoint'i. Frontend'de: "Şifremi Unuttum" linki → email gir ekranı
→ confirm ekranı. Harici SMTP servisi (SendGrid vb.) veya .NET `SmtpClient` gerektirir.

---

### BL-011 — Email doğrulama (Email Verification)
**Alan:** Auth
**Kaynak:** `docs/auth-spec.md` § Kapsam Dışı — Faz 2
**Bağımlılık:** BL-010 (SMTP altyapısı)

Kayıt sonrası email adresine doğrulama linki gönderilmesi. Backend'de: `isVerified`
alanı User entity'sine eklenir, doğrulama token endpoint'i açılır. Frontend'de:
doğrulanmamış kullanıcı bazı özelliklere kısıtlı erişir.

---

### BL-030 — Onboarding / Hoş geldin ekranı
**Alan:** UX / İlk Açılış

İlk açılışta kullanıcıya uygulamayı tanıtan kısa bir akış. AsyncStorage'da
"onboarding tamamlandı" flag'i; bir kez gösterildikten sonra atlanır.

---

### BL-031 — App icon + splash screen
**Alan:** Store Hazırlığı

Store'a yüklemek için gerekli uygulama ikonu ve açılış ekranı. Expo `app.json`'da
`icon` ve `splash` konfigürasyonu; farklı çözünürlükler için varlık üretimi.

---

### BL-033 — Development build geçişi
**Alan:** Altyapı
**Not:** Push notification (BL-017) ve store çıkışı için zorunlu ön koşul.

Expo Go'dan EAS Build'e geçiş. `app.json` → `app.config.ts` dönüşümü, EAS projesi
konfigürasyonu, development build üretimi. Managed workflow devam edebilir.

---

### BL-032 — Hata izleme (Sentry)
**Alan:** Gözlemlenebilirlik
**Bağımlılık:** BL-033 (development build)

Canlıda oluşan hataları yakalamak ve raporlamak için Sentry entegrasyonu.
`@sentry/react-native` paketi, `expo-sentry` plugin, DSN konfigürasyonu.

---

### BL-034 — Performans optimizasyonu
**Alan:** Frontend — Kalite

Liste 100+ todo'da akıcı kalmalı; gereksiz re-render'lar temizlenmeli.
`React.memo`, `useCallback` kullanımı, FlatList `getItemLayout`,
`keyExtractor` optimizasyonu.

---

### BL-044 — Çoklu dil desteği (i18n)
**Alan:** Yerelleştirme
**Not:** Erken kurulmalı; sonraki tüm özellikler bu altyapı üzerine inşa edilmeli.

`react-i18next` (veya benzeri) ile çoklu dil altyapısı. Tüm kullanıcıya görünen metinler
(ekran başlıkları, buton label'ları, hata mesajları) çeviri dosyalarından okunacak.
İlk desteklenecek diller: Türkçe + İngilizce. Dil seçimi uygulama ayarlarından yapılabilmeli.
Mevcut Türkçe sabit string'ler çeviri anahtarlarına dönüştürülecek.

---

### BL-050 — Tablet / iPad responsive layout
**Alan:** UI — Platform
**Not:** Tüm ekranlar hem telefon hem tablet'te test edilmeli.

Mevcut UI yalnızca telefon boyutuna göre tasarlanmış. `useWindowDimensions` ile breakpoint
tabanlı layout eklenerek iPad ve Android tablet'lerde düzgün görüntüleme sağlanacak.
Tablet'te daha geniş kartlar, iki sütunlu liste seçeneği ve uygun spacing kullanılacak.

---

## v1.1.0 — Temel Üretkenlik

> Görev yönetimini derinleştiren, günlük kullanım için kritik özellikler.

### BL-026 — Display name (Görünen ad)
**Alan:** Profil
**Kaynak:** `docs/profile-spec.md` § Kapsam Dışı

User entity'sine `displayName` alanı eklenmesi, profil ekranında gösterilmesi,
düzenleme akışı. Email yerine görünen isim avatarda kullanılabilir.

---

### BL-009 — Görev kategorileri / listeleri
**Alan:** Görev Yönetimi — Veri Modeli
**Zorluk:** Orta

Görevleri "İş", "Kişisel", "Alışveriş" gibi kullanıcı tanımlı listelere ayırma.
Backend'de yeni `List` entity ve `Todo ↔ List` ilişkisi. Frontend'de liste seçici,
liste bazlı filtreleme. Mevcut tag sistemiyle çakışmaması için mimari karar gerektirir.

---

### BL-006 — Gelişmiş filtreleme ve sıralama
**Alan:** Görev Yönetimi — UI + Backend
**Zorluk:** Orta

Mevcut arama yalnızca frontend'de, tüm görevler belleğe yüklendikten sonra filtreliyor.
Backend'e `?q=`, `?priority=`, `?tag=`, `?completed=`, `?category=` gibi query param'ları
eklenmeli; frontend'de filtre paneli / chip'leri ile kullanıcı birden fazla kriteri
birleştirebilmeli.

---

### BL-015 — Restore / Undelete (Silinen görevi geri getir)
**Alan:** Soft Delete
**Kaynak:** `docs/soft-delete-spec.md` § Fazlar — Faz 2

Kullanıcı silinen bir görevi geri alabilsin. Backend'de: `PATCH /api/todos/{id}/restore`
endpoint, `IsDeleted=false`. Frontend'de: Silme sonrası kısa süreli "Geri Al" toast
(optimistic undo pattern). Kapsam büyük; ayrı sprint olarak planlanmalı.

---

### BL-027 — Otomatik purge (Fiziksel silme)
**Alan:** Soft Delete — Bakım
**Kaynak:** `docs/soft-delete-spec.md` § Fazlar — Faz 2

Belirli süre (ör. 30 gün) soft-deleted kalan kayıtları otomatik olarak fiziksel
silen arka plan job'ı. .NET `IHostedService` veya Hangfire ile yapılabilir.

---

### BL-035 — Alt görevler (Subtask)
**Alan:** Görev Yönetimi — Veri Modeli
**Bağımlılık:** BL-009 (kategori altyapısı faydalı)

Büyük görevleri küçük adımlara bölme. Backend'de `Todo` entity'sine self-referencing
`ParentId` ilişkisi. Frontend'de görev detayında alt görev listesi, tamamlanma ilerleme çubuğu.

---

### BL-019 — Tekrarlayan görevler
**Alan:** Görev Yönetimi
**Kaynak:** `docs/notifications-architecture.md` § 11.4 — Faz 2
**Not:** Cron expression mantığı; backend schedule altyapısı gerektirir.

Günlük / haftalık / aylık tekrar seçenekleri. `dueDate` üzerine recurrence rule eklenmesi,
backend'de otomatik yeni görev üretimi (cron job). `expo-notifications` `repeats`
ile yalnızca bildirim tarafı kısmen desteklenir; asıl iş backend'de.

---

### BL-013 — `reminderOffset` backend'e taşı
**Alan:** Bildirimler
**Kaynak:** `docs/notifications-architecture.md` § 11 — Faz 2, Edge Case A-05

Şu an `reminderOffset` cihaz lokalinde (todo payload'ında) tutuluyor. Cihaz
değiştiğinde hatırlatıcılar kayboluyor. `reminderOffset` backend'de saklanıp
login sonrası senkronize edildiğinde çoklu cihaz desteği mümkün olur.
Backend + frontend birlikte değişecek; önemli kapsam.

---

### BL-014 — Registry–OS senkronizasyon güçlendirmesi
**Alan:** Bildirimler
**Kaynak:** `docs/notifications-architecture.md` § 11 — Edge Case A-04

Cihaz restart'ında OS bildirim kuyruğu temizlenebilir ama `notificationRegistry`
AsyncStorage'da hâlâ eski kayıtları tutar. Uygulama açılışında registry ile OS'u
karşılaştıran bir "reconcile" adımı eklenecek.

---

## v1.2.0 — Planlama ve Zaman Yönetimi

### BL-008 — Görev istatistikleri ekranı
**Alan:** Görev Yönetimi — Yeni Ekran
**Zorluk:** Orta

Tamamlanan / bekleyen / geciken görev sayıları, öncelik dağılımı, haftalık tamamlanma
grafiği gibi özet veriler. Backend'de agregasyon endpoint'i (`GET /api/stats`) veya
mevcut liste üzerinden frontend hesaplama. Navigation'a yeni "İstatistikler" sekmesi eklenecek.

---

### BL-036 — Takvim görünümü
**Alan:** Görev Yönetimi — Yeni Ekran

Aylık ve haftalık takvimde tarihli görevleri görme. `react-native-calendars` veya
benzer kütüphane. `dueDate` olan görevler takvim üzerinde nokta/badge ile gösterilir.

---

### BL-037 — Pomodoro zamanlayıcı
**Alan:** Verimlilik — Yeni Özellik

Görev bazlı odaklanma timer'ı. 25dk çalışma + 5dk mola döngüsü. Tamamlanan pomodoro
sayısı görev detayında görünür. Arka planda çalışmak için `expo-background-fetch` veya
native timer gerekebilir.

---

### BL-038 — Widget desteği
**Alan:** Platform — iOS + Android
**Not:** BL-033 (development build) tamamlanmış olmalı.

Ana ekran widget'ı ile yaklaşan görevleri görme ve hızlı görev ekleme.
`expo-widgets` (EAS Build gerektirir) veya native module.

---

## v1.3.0 — İşbirliği ve Senkronizasyon

> **Bağımlılık:** BL-033 (development build) tamamlanmış olmalı.

### BL-017 — Push notifications (FCM/APNs)
**Alan:** Bildirimler
**Kaynak:** `docs/notifications-architecture.md` § 11 — Faz 2
**Not:** Expo development build gerektirir (managed workflow'dan çıkış veya EAS Build).

Sunucu tarafından tetiklenen push bildirimler. Backend'de: FCM/APNs token yönetimi,
bildirim gönderim servisi. Frontend'de: cihaz token'ı kayıt, `expo-notifications`
push kanal konfigürasyonu. Büyük altyapı değişikliği; ayrı sprint.

---

### BL-018 — Bildirime tıklayınca deep link
**Alan:** Bildirimler
**Kaynak:** `docs/notifications-architecture.md` § 11.3 — Faz 2
**Bağımlılık:** BL-017

Kullanıcı bildirimine tıkladığında doğrudan ilgili görev detay ekranına yönlendirilsin.
React Navigation deep link konfigürasyonu + `expo-notifications`
`addNotificationResponseReceivedListener` entegrasyonu gerektirir.

---

### BL-025 — Profil fotoğrafı / Avatar
**Alan:** Profil
**Kaynak:** `docs/profile-spec.md` § Kapsam Dışı
**Bağımlılık:** BL-021 (dosya upload altyapısı)

Kullanıcı profil fotoğrafı yükleme. BL-021 ile ortak altyapı kullanılabilir.
Depolama altyapısı (S3, Cloudflare R2 vb.) ve backend dosya upload endpoint'i gerektirir.

---

### BL-021 — Dosya / Resim eki
**Alan:** Görev Yönetimi
**Zorluk:** İleri

Göreve fotoğraf veya dosya ekleme. `expo-image-picker` ile medya seçimi, backend'de
multipart upload endpoint ve depolama altyapısı (S3, Cloudflare R2 vb.) gerektirir.

---

### BL-039 — Paylaşılan listeler
**Alan:** İşbirliği — Yeni Özellik
**Bağımlılık:** BL-009 (kategori/liste entity'si)

Başka kullanıcılarla ortak todo listesi oluşturma. Backend'de `ListMember` ilişki tablosu,
davet mekanizması. Frontend'de liste bazlı paylaşım ayarları.

---

### BL-040 — Görev atama
**Alan:** İşbirliği — Yeni Özellik
**Bağımlılık:** BL-039

Paylaşılan listede görevleri belirli kullanıcılara atama. `Todo.AssignedUserId` alanı;
frontend'de atama seçici, "Bana atananlar" filtresi.

---

### BL-020 — Gerçek zamanlı senkronizasyon
**Alan:** Offline / Sync
**Zorluk:** İleri

SignalR WebSocket hub ile sunucu → istemci anlık güncelleme. Çoklu cihazda veya
paylaşılan listeler senaryosunda bir cihazda yapılan değişiklik diğer cihazlara
push edilir. Backend'de SignalR hub, frontend'de `@microsoft/signalr` paketi.
TanStack Query cache ile entegrasyon tasarımı gerektirir.

---

### BL-051 — Huawei AppGallery desteği
**Alan:** Platform — Store
**Bağımlılık:** BL-033 (development build)

Huawei cihazlarda Google Play Services olmadığı için push notification için
Huawei Push Kit (HMS) entegrasyonu gerekiyor. Uygulama APK/AAB olarak zaten çalışır;
push altyapısı (HMS token yönetimi, backend'de Huawei push gönderimi) ve
AppGallery store submission süreci eklenecek.

---

## v1.4.0 — Akıllı Özellikler

### BL-007 — Dark / Light tema desteği
**Alan:** UI / Tema
**Zorluk:** Orta

Sistem teması (Appearance API) ile otomatik dark/light geçişi. `tokens.ts` içine dark
varyant renkler eklenmeli; bileşenler `useColorScheme()` hook'una bağlanacak. Mevcut
tasarım gradient tabanlı ve zaten koyu; light mod için ayrı palet tasarımı gerektirir.

---

### BL-023 — Sosyal giriş (OAuth)
**Alan:** Auth
**Kaynak:** `docs/auth-spec.md` § Kapsam Dışı — Faz 2

Google / Apple ile giriş. Expo'da `expo-auth-session` + `expo-web-browser` ile
OAuth flow. Backend'de provider token doğrulama. Büyük kapsam.

---

### BL-024 — İki faktörlü doğrulama (2FA)
**Alan:** Auth — Güvenlik
**Kaynak:** `docs/profile-spec.md` § Kapsam Dışı

TOTP (Google Authenticator vb.) veya SMS OTP. Backend + frontend birlikte kapsamlı değişiklik.

---

### BL-041 — AI görev asistanı
**Alan:** AI Entegrasyonu
**Not:** Claude API (Anthropic SDK) kullanılacak.

Kullanıcı büyük bir görev yazınca (ör: "Ev taşınması") AI otomatik olarak alt görevlere
böler. Claude API'ye başlık gönderilir, dönen alt görevler önizleme sonrası kaydedilir.
BL-035 (subtask altyapısı) tamamlanmış olmalı.

---

### BL-042 — Doğal dil ile görev ekleme
**Alan:** AI Entegrasyonu
**Bağımlılık:** BL-041 (AI altyapısı)

"Yarın saat 3'te Ali'yi ara" yazınca tarih + saat + başlık otomatik ayrıştırma.
Claude API ile NLP; ayrıştırılan değerler form alanlarını önceden doldurur.

---

### BL-043 — Akıllı öneriler
**Alan:** AI Entegrasyonu
**Bağımlılık:** BL-041

Geçmiş görev pattern'lerine göre öneri sunma. "Alışveriş listesi" yazan kullanıcıya
önceki alışveriş görevlerinden ilham alınarak öneriler.

---

## v2.0.0 — Platform Genişleme

### BL-045 — Web uygulaması
**Alan:** Platform

React ile tarayıcıdan erişim; mevcut backend API'yi kullanır. React Native Web veya
ayrı React projesi.

---

### BL-046 — Masaüstü uygulaması
**Alan:** Platform

Electron veya Tauri ile Windows + macOS desteği.

---

### BL-047 — Apple Watch / Wear OS
**Alan:** Platform

Bilekten hızlı görev görüntüleme ve ekleme.

---

### BL-048 — Public API
**Alan:** Ekosistem

Üçüncü parti entegrasyonlar için açık API; API key yönetimi, rate limiting,
OpenAPI dokümantasyonu.

---

### BL-049 — Habit tracker (Alışkanlık takibi)
**Alan:** Yeni Ürün Özelliği

Günlük alışkanlık tanımlama ve takip etme; streak görünümü. Todo'dan ayrı
`Habit` entity'si veya tekrarlayan görev altyapısı (BL-019) üzerine inşa edilebilir.

---

## Meta — Geliştirici Araçları

### BL-022 — CI/CD pipeline
**Alan:** Altyapı / DevOps
**Zorluk:** İleri

GitHub Actions ile otomatik build ve test. Backend için `dotnet test`, frontend için
`tsc --noEmit` + Playwright E2E. EAS Build entegrasyonu ile iOS/Android binary üretimi.
PR'larda otomatik çalışacak şekilde konfigüre edilecek.

---

### BL-028 — Code review agent
**Alan:** Agent / Otomasyon
**Bağımlılık:** BL-022

PR açıldığında otomatik çalışan Claude Code agent'ı. Kod kalitesi, güvenlik açıkları,
mimari uyumsuzlukları ve test eksikliklerini raporlar. GitHub Actions + MCP entegrasyonu.

---

### BL-029 — Documentation agent (Otomatik CHANGELOG)
**Alan:** Agent / Otomasyon

Her merge'de CHANGELOG.md'yi otomatik güncelleyen agent. Commit mesajlarından ve PR
açıklamalarından yararlanarak versiyonlu değişiklik notları üretir. Conventional Commits
formatı benimsenmesi gerektirir.

---

## Durum Özeti

| ID | Başlık | Alan | Versiyon |
|----|--------|------|----------|
| BL-001 | "Tüm gün" modu | DateTime Picker | v0.10.0 |
| BL-002 | Geçmiş tarih uyarısı | DateTime Picker | v0.10.0 |
| BL-003 | Toggle → bildirim iptali | Bildirimler | v0.10.0 |
| BL-004 | `placeholder` prop | Teknik | v0.10.0 |
| BL-005 | `isOverdue` utility | Teknik | v0.10.0 |
| BL-006 | Filtreleme ve sıralama | Görev Yönetimi | v1.1.0 |
| BL-007 | Dark / Light tema | UI | v1.4.0 |
| BL-008 | Görev istatistikleri | Görev Yönetimi | v1.2.0 |
| BL-009 | Görev kategorileri | Görev Yönetimi | v1.1.0 |
| BL-010 | Şifre sıfırlama | Auth | v1.0.0 |
| BL-011 | Email doğrulama | Auth | v1.0.0 |
| BL-012 | Refresh token | Auth | v1.0.0 |
| BL-013 | `reminderOffset` backend | Bildirimler | v1.1.0 |
| BL-014 | Registry–OS reconcile | Bildirimler | v1.1.0 |
| BL-015 | Restore / Undelete | Soft Delete | v1.1.0 |
| BL-016 | Rate limiting | Auth | v1.0.0 |
| BL-017 | Push notifications | Bildirimler | v1.3.0 |
| BL-018 | Deep link yönlendirme | Bildirimler | v1.3.0 |
| BL-019 | Tekrarlayan görevler | Görev Yönetimi | v1.1.0 |
| BL-020 | Gerçek zamanlı senkronizasyon | Offline / Sync | v1.3.0 |
| BL-021 | Dosya / Resim eki | Görev Yönetimi | v1.3.0 |
| BL-022 | CI/CD pipeline | DevOps | Meta |
| BL-023 | Sosyal giriş (OAuth) | Auth | v1.4.0 |
| BL-024 | 2FA | Auth | v1.4.0 |
| BL-025 | Profil fotoğrafı | Profil | v1.3.0 |
| BL-026 | Display name | Profil | v1.1.0 |
| BL-027 | Otomatik purge | Soft Delete | v1.1.0 |
| BL-028 | Code review agent | Meta | Meta |
| BL-029 | Documentation agent | Meta | Meta |
| BL-030 | Onboarding ekranı | UX | v1.0.0 |
| BL-031 | App icon + splash screen | Store | v1.0.0 |
| BL-032 | Hata izleme (Sentry) | Gözlemlenebilirlik | v1.0.0 |
| BL-033 | Development build geçişi | Altyapı | v1.0.0 |
| BL-034 | Performans optimizasyonu | Frontend | v1.0.0 |
| BL-044 | Çoklu dil desteği (i18n) | Yerelleştirme | v1.0.0 |
| BL-050 | Tablet / iPad responsive layout | UI | v1.0.0 |
| BL-035 | Alt görevler (subtask) | Görev Yönetimi | v1.1.0 |
| BL-036 | Takvim görünümü | Görev Yönetimi | v1.2.0 |
| BL-037 | Pomodoro zamanlayıcı | Verimlilik | v1.2.0 |
| BL-038 | Widget desteği | Platform | v1.2.0 |
| BL-039 | Paylaşılan listeler | İşbirliği | v1.3.0 |
| BL-040 | Görev atama | İşbirliği | v1.3.0 |
| BL-051 | Huawei AppGallery desteği | Platform | v1.3.0 |
| BL-041 | AI görev asistanı | AI | v1.4.0 |
| BL-042 | Doğal dil görev ekleme | AI | v1.4.0 |
| BL-043 | Akıllı öneriler | AI | v1.4.0 |
| BL-045 | Web uygulaması | Platform | v2.0.0 |
| BL-046 | Masaüstü uygulaması | Platform | v2.0.0 |
| BL-047 | Apple Watch / Wear OS | Platform | v2.0.0 |
| BL-048 | Public API | Ekosistem | v2.0.0 |
| BL-049 | Habit tracker | Yeni Özellik | v2.0.0 |
