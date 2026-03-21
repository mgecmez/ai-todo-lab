# AI Todo Lab — Roadmap Durum Analizi

Tarih: 2026-03-21
Kaynak: `docs/ai-todo-lab-roadmap.md` (Cowork) + `tasks/backlog.md` + git history + mevcut kod

---

## Mevcut Durum Özeti

Son tamamlanan versiyon: **v0.9.0** (Native datetime picker)

Tamamlanan sprint'ler: v0.1.0 → v0.9.0

---

## 1. Tamamlanmış Roadmap Öğeleri

### v1.0.0 kapsamından tamamlananlar

| Özellik | Versiyon | Notlar |
|---------|----------|--------|
| Profil ekranı + şifre değiştirme | v0.7.0 | `ProfileScreen`, `ChangeEmailScreen`, `ChangePasswordScreen` implement edildi |
| Hesap silme (KVKK/GDPR) | v0.7.0 + v0.8.0 | v0.7.0'da `DELETE /api/auth/account`; v0.8.0'da soft delete ile Todo verileri korundu |

### v1.1.0 kapsamından tamamlananlar

| Özellik | Versiyon | Notlar |
|---------|----------|--------|
| Öncelik seviyeleri | v0.6.0 | Low/Normal/High/Urgent; renk kodlu badge, PRIORITY_META map |

---

## 2. Kısmen Tamamlanmış Öğeler

| Özellik | Hedef Versiyon | Mevcut Durum | Eksik |
|---------|----------------|--------------|-------|
| Gelişmiş filtreleme ve sıralama | v1.1.0 | Frontend'de metin tabanlı title+description araması var (`TodoListScreen`) | Backend query params (`?q=`, `?priority=`, `?completed=`), filtre panel/chip UI, sıralama |
| Push notifications | v1.3.0 | Local bildirimler (`expo-notifications`) v0.5.0'dan beri mevcut | FCM/APNs entegrasyonu, backend'den tetikleme, development build geçişi |

---

## 3. Başlanmamış Öğeler

### v1.0.0 — MVP (Öncelikli)

| Özellik | BL-ID | Notlar |
|---------|-------|--------|
| Onboarding / hoş geldin ekranı | BL-030 | Hiç başlanmadı |
| App icon + splash screen | BL-031 | Expo default icon/splash kullanılıyor |
| Hata izleme (Sentry veya benzeri) | BL-032 | Hiç başlanmadı |
| Development build geçişi | BL-033 | Expo Go managed workflow |
| Performans optimizasyonu | BL-034 | 100+ todo senaryosu test edilmedi |

### v1.1.0 — Temel Üretkenlik

| Özellik | BL-ID |
|---------|-------|
| Görev kategorileri / listeler | BL-009 |
| Tekrarlayan görevler | BL-019 |
| Alt görevler (subtask) | BL-035 |
| Backend filtreleme (Öncelik/Durum/Kategori) | BL-006 |

### v1.2.0 — Planlama

| Özellik | BL-ID |
|---------|-------|
| Görev istatistikleri ekranı | BL-008 |
| Takvim görünümü | BL-036 |
| Pomodoro zamanlayıcı | BL-037 |
| Widget desteği | BL-038 |

### v1.3.0 — İşbirliği ve Senkronizasyon

| Özellik | BL-ID |
|---------|-------|
| Push notification (FCM/APNs) | BL-017 |
| Paylaşılan listeler | BL-039 |
| Görev atama | BL-040 |
| Gerçek zamanlı senkronizasyon (SignalR) | BL-020 |
| Dosya/resim eki | BL-021 |

### v1.4.0 — Akıllı Özellikler

| Özellik | BL-ID |
|---------|-------|
| Dark/Light tema | BL-007 |
| AI görev asistanı | BL-041 |
| Doğal dil ile görev ekleme | BL-042 |
| Akıllı öneriler | BL-043 |
| Çoklu dil desteği | BL-044 |

### v2.0.0 — Platform Genişleme

| Özellik | BL-ID |
|---------|-------|
| Web uygulaması | BL-045 |
| Masaüstü uygulaması | BL-046 |
| Apple Watch / Wear OS | BL-047 |
| Public API | BL-048 |
| Habit tracker | BL-049 |

---

## 4. Backlog'da Olan Ama Roadmap'te Olmayan Öğeler

Bunlar auth/bildirim altyapısını güçlendiren teknik iyileştirmeler ve güvenlik kapsamındaki maddeler. Roadmap'te ayrı bir versiyon olarak tanımlanmamış; ilgili versiyonlara dahil edilmesi önerilir:

| BL-ID | Özellik | Önerilen Versiyon |
|-------|---------|-------------------|
| BL-001 | "Tüm gün" modu (DateTime Picker) | v0.10.0 (hızlı kazanım) |
| BL-002 | Geçmiş tarih uyarısı | v0.10.0 |
| BL-003 | Toggle → bildirim iptali | v0.10.0 |
| BL-004 | `placeholder` prop (DateTimePickerField) | v0.10.0 |
| BL-005 | `isOverdue` utility'ye taşı | v0.10.0 |
| BL-010 | Şifre sıfırlama (Forgot Password) | v1.0.0 |
| BL-011 | Email doğrulama | v1.0.0 |
| BL-012 | Refresh token | v1.0.0 |
| BL-013 | `reminderOffset` backend'e taşı | v1.1.0 |
| BL-014 | Registry–OS reconcile | v1.1.0 |
| BL-015 | Restore / Undelete (Geri Al toast) | v1.1.0 |
| BL-016 | Rate limiting | v1.0.0 |
| BL-018 | Deep link yönlendirme | v1.3.0 |
| BL-023 | Sosyal giriş (OAuth) | v1.4.0 |
| BL-024 | 2FA | v1.4.0 |
| BL-025 | Profil fotoğrafı | v1.3.0 |
| BL-026 | Display name | v1.1.0 |
| BL-027 | Otomatik purge (fiziksel silme) | v1.1.0 |
| BL-028 | Code review agent | Meta |
| BL-029 | Documentation agent / CHANGELOG | Meta |

---

## 5. Önerilen Uygulama Sırası

### Önce: v0.10.0 — Hızlı Kazanımlar (Bağımlılık yok)
BL-005 → BL-004 → BL-001 → BL-002 → BL-003

### Sonra: v1.0.0 — MVP Hazırlığı
BL-033 (dev build) önce yapılmalı çünkü push notification buna bağlı.
BL-016 → BL-012 → BL-010 → BL-011 → BL-030 → BL-031 → BL-032 → BL-034

### Ardından: v1.1.0 — Üretkenlik
BL-026 → BL-009 → BL-006 → BL-015 → BL-027 → BL-035 → BL-019 → BL-013 → BL-014

### v1.2.0 — Planlama
BL-008 → BL-036 → BL-037 → BL-038

### v1.3.0 — İşbirliği (BL-033 tamamlanmış olmalı)
BL-017 → BL-018 → BL-025 → BL-021 → BL-039 → BL-040 → BL-020

### v1.4.0 — AI + Tema
BL-007 → BL-044 → BL-023 → BL-024 → BL-041 → BL-042 → BL-043
