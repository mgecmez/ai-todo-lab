# AI Todo Lab — Ürün Yol Haritası

Son güncelleme: 2026-03-21
Kaynak: Cowork roadmap + proje backlog birleşimi

---

## Tamamlanan Versiyonlar

| Versiyon | Özellik | Tarih |
|----------|---------|-------|
| v0.1.0 | Initial mobile UI + backend CRUD | ✅ |
| v0.2.0 | SQLite persistence (EF Core) | ✅ |
| v0.3.0 | Offline-first read (SWR + AsyncStorage cache) | ✅ |
| v0.4.0 | Offline write + sync queue (TanStack Query) | ✅ |
| v0.5.0 | Local reminders (expo-notifications) | ✅ |
| v0.6.0 | JWT Authentication + kullanıcı izolasyonu | ✅ |
| v0.7.0 | Profil yönetimi (email/şifre değiştir, hesap sil) | ✅ |
| v0.8.0 | Soft delete (Todo + User) | ✅ |
| v0.9.0 | Native datetime picker (tarih + saat seçimi) | ✅ |

---

## v0.10.0 — Hızlı Kazanımlar

> Mevcut özelliklerdeki küçük eksikleri kapatan, bağımlılığı olmayan iyileştirmeler.

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-005 | `isOverdue` utility | İki ekranda tekrarlanan fonksiyon `src/utils/isOverdue.ts`'e taşınır |
| BL-004 | `DateTimePickerField` placeholder prop | Sabit Türkçe metin yerine prop |
| BL-001 | "Tüm gün" modu | `dueDate` saat seçimi olmadan sadece tarih; gece yarısı UTC kaydedilir |
| BL-002 | Geçmiş tarih uyarısı | Picker kapanınca bilgilendirici uyarı (engelleme yok) |
| BL-003 | Toggle → bildirim iptali | Görev tamamlanınca yerel bildirim otomatik iptal |

---

## v1.0.0 — MVP Release

> Uygulamanın canlıya (store'a) çıkabilmesi için gereken minimum özellik seti.

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-016 | Rate limiting | `/api/auth/login` brute-force koruması |
| BL-012 | Refresh token | Uzun süreli oturum; `SecureStore` uyumlu |
| BL-010 | Şifre sıfırlama (Forgot Password) | Email üzerinden reset token akışı |
| BL-011 | Email doğrulama | Kayıt sonrası doğrulama linki; SMTP entegrasyonu |
| BL-030 | Onboarding ekranı | İlk açılışta uygulamayı tanıtan kısa akış |
| BL-031 | App icon + splash screen | Store'a yüklemek için gerekli varlıklar |
| BL-033 | Development build geçişi | Expo Go'dan EAS Build'e geçiş (push notification için de zorunlu) |
| BL-032 | Hata izleme (Sentry) | Canlıda oluşan hataların yakalanması ve raporlanması |
| BL-034 | Performans optimizasyonu | 100+ todo'da akıcı liste; gereksiz re-render temizliği |

---

## v1.1.0 — Temel Üretkenlik

> Görev yönetimini derinleştiren, günlük kullanım için kritik özellikler.

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-026 | Display name (Görünen ad) | `displayName` alanı; profil ekranında gösterim + düzenleme |
| BL-009 | Görev kategorileri / listeler | "İş", "Kişisel" gibi kullanıcı tanımlı listeler; yeni `List` entity |
| BL-006 | Gelişmiş filtreleme ve sıralama | Backend query params + filtre paneli + çoklu kriter birleştirme |
| BL-015 | Restore / Undelete | Silme sonrası "Geri Al" toast; `PATCH /api/todos/{id}/restore` |
| BL-027 | Otomatik purge | 30 gün sonra soft-deleted kayıtları fiziksel silen arka plan job'ı |
| BL-035 | Alt görevler (subtask) | Parent-child todo ilişkisi; büyük görevi adımlara bölme |
| BL-019 | Tekrarlayan görevler | Günlük/haftalık/aylık tekrar; cron job ile otomatik görev üretimi |
| BL-013 | `reminderOffset` backend'e taşı | Çoklu cihaz desteği; login sonrası senkronizasyon |
| BL-014 | Registry–OS reconcile | Cihaz restart'ında kayıt–OS senkronizasyonu |

---

## v1.2.0 — Planlama ve Zaman Yönetimi

> Görsel planlama araçları ve verimlilik izleme.

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-008 | Görev istatistikleri ekranı | Tamamlanan/bekleyen oranı, haftalık verimlilik grafiği, streak |
| BL-036 | Takvim görünümü | Aylık ve haftalık takvimde tarihli görevler |
| BL-037 | Pomodoro zamanlayıcı | Görev bazlı odaklanma timer'ı; tamamlanan pomodoro sayısı |
| BL-038 | Widget desteği | Ana ekran widget'ı ile hızlı görev görüntüleme ve ekleme |

---

## v1.3.0 — İşbirliği ve Senkronizasyon

> Çok kullanıcılı ve çok cihazlı senaryo desteği.
> **Bağımlılık:** BL-033 (development build) tamamlanmış olmalı.

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-017 | Push notification (FCM/APNs) | Backend'den tetiklenen bildirimler; Expo Push veya FCM |
| BL-018 | Deep link yönlendirme | Bildirime tıklayınca görev detay ekranına doğrudan git |
| BL-025 | Profil fotoğrafı / avatar | `expo-image-picker` + S3/R2 upload altyapısı |
| BL-021 | Dosya/resim eki | Todo'ya fotoğraf veya dosya ekleme; multipart upload |
| BL-039 | Paylaşılan listeler | Başka kullanıcılarla ortak todo listesi oluşturma |
| BL-040 | Görev atama | Paylaşılan listede belirli kullanıcılara görev atama |
| BL-020 | Gerçek zamanlı senkronizasyon | SignalR WebSocket; çok cihazda anlık güncelleme |

---

## v1.4.0 — Akıllı Özellikler

> AI asistanı, kişiselleştirme ve güvenlik derinleştirme.

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-007 | Dark/Light tema | Sistem teması takip eden otomatik geçiş; `tokens.ts` dark varyant |
| BL-044 | Çoklu dil desteği | Türkçe + İngilizce; dil seçimi ayarlardan |
| BL-023 | Sosyal giriş (OAuth) | Google / Apple ile giriş; `expo-auth-session` |
| BL-024 | 2FA | TOTP (Google Authenticator) veya SMS OTP |
| BL-041 | AI görev asistanı | Büyük görevi alt görevlere otomatik bölme (Claude API) |
| BL-042 | Doğal dil ile görev ekleme | "Yarın saat 3'te ara" → tarih + saat + başlık otomatik ayrıştırma |
| BL-043 | Akıllı öneriler | Geçmiş görev pattern'lerine göre öneri |

---

## v2.0.0 — Platform Genişleme

> Yeni platformlara taşınma ve ekosistem açılımı.

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-045 | Web uygulaması | React; mevcut backend API |
| BL-046 | Masaüstü uygulaması | Electron veya Tauri; Windows + macOS |
| BL-047 | Apple Watch / Wear OS | Bilekten hızlı görev görüntüleme ve ekleme |
| BL-048 | Public API | Üçüncü parti entegrasyon; API key yönetimi |
| BL-049 | Habit tracker | Günlük alışkanlık tanımlama, takip ve streak |

---

## Meta — Geliştirici Araçları

| BL-ID | Özellik | Açıklama |
|-------|---------|----------|
| BL-022 | CI/CD pipeline | GitHub Actions; `dotnet test` + `tsc --noEmit` + EAS Build |
| BL-028 | Code review agent | PR'da otomatik çalışan Claude Code agent (BL-022 sonrası) |
| BL-029 | Documentation agent | Her merge'de otomatik CHANGELOG; Conventional Commits formatı |

---

## Sürüm İlerleme Özeti

```
✅ v0.1 → v0.9   Tamamlandı
⬜ v0.10          Hızlı kazanımlar (5 madde, ~1 sprint)
⬜ v1.0           MVP Release (9 madde, ~3 sprint)
⬜ v1.1           Temel Üretkenlik (9 madde, ~3 sprint)
⬜ v1.2           Planlama (4 madde, ~2 sprint)
⬜ v1.3           İşbirliği (7 madde, ~4 sprint)
⬜ v1.4           Akıllı Özellikler (7 madde, ~3 sprint)
⬜ v2.0           Platform Genişleme (5 madde, uzun vadeli)
```
