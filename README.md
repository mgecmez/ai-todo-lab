# AI Todo Lab

Modern, cross-platform bir Todo uygulaması.
React Native (Expo) ile geliştirilmiş mobil arayüz ve .NET tabanlı backend API içerir.

Bu proje, **AI agent destekli bir geliştirme süreci** ile oluşturulmuş bir referans uygulamadır. Amaç hem modern mobil mimariyi hem de agent-driven development yaklaşımını göstermek.

---

## ✨ Özellikler

### Kimlik Doğrulama
- 🔐 Email ve şifre ile kayıt & giriş
- 🔑 JWT tabanlı oturum yönetimi
- 🔒 Güvenli token saklama (SecureStore)

### Profil Yönetimi
- 👤 Profil ekranı (email, kayıt tarihi)
- ✉️ Email değiştirme
- 🔏 Şifre değiştirme
- 🗑 Hesap silme

### Görev Yönetimi
- ✅ Görev oluşturma, düzenleme, tamamlama, silme
- 📌 Görev sabitleme (pin)
- 🏷 Etiket desteği
- 📅 Son tarih (due date)
- ⚡ Öncelik seviyeleri (Low / Normal / High / Urgent)
- 🔎 Gerçek zamanlı arama

### Bildirimler
- 🔔 Yerel hatırlatıcılar (5 dk / 15 dk / 30 dk / 1 saat / 1 gün öncesi)

### Offline & Senkronizasyon
- 📶 Offline-first veri mimarisi
- 🔄 Otomatik arka plan senkronizasyonu
- ⚡ Optimistic UI updates
- 💾 Kalıcı sorgu cache (AsyncStorage)

### Veri Güvenliği
- 🛡 Soft delete — silinen kayıtlar veritabanından fiziksel olarak kaldırılmaz
- 🔏 Kullanıcı verisi izolasyonu — her kullanıcı yalnızca kendi verilerini görür

---

## 🖼 Screenshots

### Android

| Task List                                   | Task Detail                                   | Edit Task                                   |
| ------------------------------------------- | --------------------------------------------- | ------------------------------------------- |
| ![](docs/screenshots/android-task-list.png) | ![](docs/screenshots/android-task-detail.png) | ![](docs/screenshots/android-task-edit.png) |

### iOS

| Task List                               | Task Detail                               | Edit Task                               |
| --------------------------------------- | ----------------------------------------- | --------------------------------------- |
| ![](docs/screenshots/ios-task-list.png) | ![](docs/screenshots/ios-task-detail.png) | ![](docs/screenshots/ios-task-edit.png) |

---

## 🧱 Proje Mimarisi

```
ai-todo-lab
│
├─ backend
│   └─ TodoApp.Api
│       ├─ Controllers        # TodosController, AuthController
│       ├─ Data               # AppDbContext (EF Core)
│       ├─ DTOs               # Request/Response modelleri
│       ├─ Exceptions         # Domain exception'ları
│       ├─ Migrations         # EF Core migrations
│       ├─ Models             # Todo, User, ISoftDeletable
│       ├─ Repositories       # ITodoRepository, IUserRepository, implementasyonlar
│       └─ Services           # ITodoService, IUserService, implementasyonlar
│
├─ mobile
│   ├─ App.tsx
│   └─ src
│       ├─ components         # Reusable UI bileşenleri
│       ├─ context            # AuthContext
│       ├─ mutations          # TanStack Query mutation hook'ları
│       ├─ navigation         # Stack navigator, route tipleri
│       ├─ screens
│       │   ├─ profile        # ProfileScreen, ChangeEmailScreen, ChangePasswordScreen
│       │   └─ ...            # TodoListScreen, TodoFormScreen, TaskDetailScreen
│       ├─ services
│       │   ├─ api            # apiFetch interceptor
│       │   ├─ notifications  # Yerel bildirim servisi
│       │   └─ profile        # profileService
│       └─ theme              # Design tokens (renkler, spacing, radius, font)
│
├─ docs                       # Mimari belgeler, spec'ler, test raporları
└─ tasks                      # Sprint task listeleri
```

---

## ⚙️ Backend Kurulumu (.NET)

```bash
cd backend/TodoApp.Api
dotnet run --urls "http://localhost:5100"
```

API şu adreste çalışır: `http://localhost:5100`

### Backend Testleri

```bash
dotnet test backend/TodoApp.Api.Tests
```

---

## 📱 Mobile Kurulumu (Expo)

```bash
cd mobile
npm install
npx expo start
```

Android emulator için `a`, iOS simulator için `i` tuşuna basın.

### TypeScript Kontrolü

```bash
cd mobile && npx tsc --noEmit
```

---

## 🔌 API Endpoints

### Auth

| Method | Path | Açıklama |
|--------|------|----------|
| POST | /api/auth/register | Yeni hesap oluştur |
| POST | /api/auth/login | Giriş yap, JWT token al |
| GET | /api/auth/me | Profil bilgilerini getir |
| PUT | /api/auth/email | Email değiştir |
| PUT | /api/auth/password | Şifre değiştir |
| DELETE | /api/auth/account | Hesabı sil |

### Todos

| Method | Path | Açıklama |
|--------|------|----------|
| GET | /api/todos | Kullanıcıya ait tüm görevler |
| POST | /api/todos | Yeni görev oluştur |
| PUT | /api/todos/{id} | Görevi güncelle |
| DELETE | /api/todos/{id} | Görevi soft-delete ile sil |
| PATCH | /api/todos/{id}/toggle | Tamamlama durumunu değiştir |
| PATCH | /api/todos/{id}/pin | Sabitleme durumunu değiştir |
| GET | /health | Sağlık kontrolü |

---

## 🧪 Testler

### Backend Entegrasyon Testleri

xUnit + WebApplicationFactory + EF Core InMemory ile 27 entegrasyon testi:

- CRUD işlemleri (oluşturma, güncelleme, silme, toggle, pin)
- Kimlik doğrulama ve kullanıcı izolasyonu
- Profil yönetimi (email, şifre, hesap silme)
- Soft delete senaryoları

### E2E Testler

```bash
cd mobile && npm run test:e2e
```

---

## 🎨 UI Tasarım

- Gradient tabanlı arka plan (expo-linear-gradient)
- Token tabanlı design system (`src/theme/tokens.ts`)
- Reusable component mimarisi
- Ionicons ikon seti
- Platform uyumlu shadow ve spacing

---

## 🧑‍💻 Teknolojiler

### Backend

- .NET 8 / ASP.NET Core Web API
- Entity Framework Core + SQLite
- Repository pattern
- JWT Bearer Authentication
- ASP.NET Core Identity (`PasswordHasher<User>`)

### Mobile

- React Native + Expo (managed workflow)
- TypeScript
- TanStack Query — server state yönetimi + offline kuyruk
- AsyncStorage — kalıcı sorgu cache
- expo-secure-store — JWT token ve kullanıcı bilgisi
- expo-notifications — yerel bildirimler
- expo-linear-gradient — UI gradient arka planı
- React Navigation v7

### Testing

- Backend: xUnit + WebApplicationFactory + EF Core InMemory
- Frontend: Playwright E2E

---

## 📦 Release Geçmişi

| Versiyon | Özellik |
|----------|---------|
| v0.1.0 | İlk mobil UI (React Native + Expo) |
| v0.2.0 | SQLite kalıcı depolama (EF Core) |
| v0.3.0 | Offline-first okuma (SWR + AsyncStorage cache) |
| v0.4.0 | Offline yazma + senkronizasyon kuyruğu |
| v0.5.0 | Yerel hatırlatıcılar (expo-notifications) |
| v0.6.0 | JWT kimlik doğrulama ve kullanıcı veri izolasyonu |
| v0.7.0 | Profil yönetimi (email, şifre, hesap silme) |
| v0.8.0 | Soft delete mekanizması (Todo ve User) |

---

## 📄 Lisans

MIT
