# AI Todo Lab

Modern, cross-platform bir Todo uygulaması.
React Native (Expo) ile geliştirilmiş mobil arayüz ve .NET tabanlı backend API içerir.

Bu proje, **AI agent destekli bir geliştirme süreci** ile oluşturulmuş bir referans uygulamadır. Amaç hem modern mobil mimariyi hem de agent-driven development yaklaşımını göstermek.

---

## ✨ Özellikler

- 📱 Cross-platform mobil uygulama (iOS & Android)
- 🎨 Modern gradient tabanlı UI
- 🔎 Gerçek zamanlı görev arama
- ✅ Görev tamamlama / geri alma
- ✏️ Görev düzenleme
- 🗑 Görev silme
- 📄 Görev detay ekranı
- ⚡ Optimistic UI updates
- 🧪 End-to-end testler (Playwright)

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
│       ├─ Controllers
│       ├─ Services
│       └─ Models
│
├─ mobile
│   ├─ src
│   │   ├─ components
│   │   ├─ navigation
│   │   ├─ screens
│   │   └─ theme
│   │
│   └─ tests
│       └─ e2e
│
└─ docs
    └─ screenshots
```

---

## ⚙️ Backend Kurulumu (.NET)

Backend API'yi çalıştırmak için:

```bash
cd backend/TodoApp.Api
dotnet run --urls "http://localhost:5100"
```

API şu adreste çalışır:

```
http://localhost:5100
```

---

## 📱 Mobile Kurulumu (Expo)

```bash
cd mobile
npm install
npx expo start
```

Android emulator için:

```
press a
```

iOS simulator için:

```
press i
```

---

## 🧪 E2E Testleri

Playwright ile uçtan uca testler:

```bash
npm run test:e2e
```

Test kapsamı:

- liste görüntüleme
- görev oluşturma
- görev düzenleme
- görev silme
- görev tamamlama
- arama filtreleme
- detail ekranı

---

## 🎨 UI Tasarım

Uygulama tasarımı aşağıdaki prensiplere göre geliştirildi:

- gradient tabanlı arka plan
- token tabanlı design system
- reusable component mimarisi
- platform uyumlu shadow ve spacing

Kullanılan ana UI teknolojileri:

- React Native
- Expo
- Ionicons
- Expo Linear Gradient

---

## 🚀 Gelecek Geliştirmeler

Planlanan özellikler:

- 📌 görev sabitleme (pin)
- ⏰ hatırlatıcılar
- 🏷 etiketleme sistemi
- 🔔 push notification
- 💾 kalıcı veri (SQLite)
- 📊 görev istatistikleri

---

## 🧑‍💻 Teknolojiler

Backend

- .NET
- ASP.NET Web API

Mobile

- React Native
- Expo
- TypeScript

Testing

- Playwright

---

## 📄 Lisans

MIT
