# Todo Uygulaması — Mimari Tasarım

Versiyon: 1.0
Tarih: 2026-03-04
Hazırlayan: Architect Agent

---

## 1. Genel Bakış

```
┌─────────────────────────────┐        HTTP/REST        ┌──────────────────────────────┐
│   Expo React Native App     │ ──────────────────────► │   .NET Web API               │
│   (iOS / Android)           │ ◄────────────────────── │   (ASP.NET Core)             │
└─────────────────────────────┘        JSON              └──────────────────────────────┘
```

- Frontend ve Backend birbirinden tamamen bağımsızdır.
- İletişim yalnızca HTTP/JSON üzerinden REST API ile sağlanır.
- Bu aşamada veritabanı yoktur; Backend in-memory liste kullanır.

---

## 2. Backend Mimarisi (.NET Web API)

### 2.1 Teknoloji Seçimleri

| Bileşen          | Seçim                        | Gerekçe                                  |
|------------------|------------------------------|------------------------------------------|
| Framework        | ASP.NET Core Web API (.NET 8) | Minimal boilerplate, güçlü DI desteği   |
| Mimari Desen     | Layered Architecture         | Basit CRUD için yeterli, anlaşılır       |
| Veri Katmanı     | In-Memory Repository         | İlk aşama için DB gereksiz               |
| Validasyon       | Data Annotations + ModelState | Yerleşik, ek kütüphane gerektirmez      |
| Dokümantasyon    | Swagger / OpenAPI            | Otomatik API dokümantasyonu              |
| CORS             | AllowAll (local dev)         | Frontend ile aynı makinede çalışır      |

### 2.2 Katman Yapısı

```
┌─────────────────────────────────────────┐
│              Controllers                │  ← HTTP isteklerini karşılar
├─────────────────────────────────────────┤
│            DTOs / Requests              │  ← Gelen/giden veri şekilleri
├─────────────────────────────────────────┤
│               Models                   │  ← Domain entity'leri
├─────────────────────────────────────────┤
│             Repositories               │  ← Veri erişim soyutlaması
└─────────────────────────────────────────┘
```

### 2.3 Klasör Yapısı

```
TodoApp/
├── TodoApp.sln
└── TodoApp.Api/
    ├── Controllers/
    │   └── TodosController.cs       ← Tüm CRUD endpoint'leri
    ├── DTOs/
    │   ├── CreateTodoRequest.cs     ← POST body
    │   └── UpdateTodoRequest.cs     ← PUT body
    ├── Models/
    │   └── Todo.cs                  ← Todo entity
    ├── Repositories/
    │   ├── ITodoRepository.cs       ← Soyut arayüz
    │   └── InMemoryTodoRepository.cs← Somut uygulama
    ├── Program.cs                   ← DI kayıtları, middleware, CORS
    └── TodoApp.Api.csproj
```

### 2.4 Dependency Injection Akışı

```
Program.cs
  └── builder.Services.AddSingleton<ITodoRepository, InMemoryTodoRepository>()
        └── TodosController(ITodoRepository repo)
              └── repo.GetAll() / Add() / Update() / Delete()
```

---

## 3. Frontend Mimarisi (Expo React Native)

### 3.1 Teknoloji Seçimleri

| Bileşen       | Seçim                  | Gerekçe                                      |
|---------------|------------------------|----------------------------------------------|
| Framework     | Expo (React Native)    | iOS + Android tek codebase                   |
| Dil           | TypeScript             | Tip güvenliği, API kontratı ile uyum         |
| HTTP Client   | Axios                  | İstek/yanıt interceptor desteği, sade API   |
| State         | React useState/useEffect | Basit CRUD için harici state yönetimi gereksiz |
| Navigasyon    | React Navigation (Stack)| Ekranlar arası geçiş                         |

### 3.2 Ekran Akışı

```
App
 └── Stack Navigator
      ├── TodoListScreen    (Ana ekran — listeleme)
      │    └── [+ butonu] ──────────────────────► TodoFormScreen (create mode)
      │    └── [todo'ya dokun] ─────────────────► TodoFormScreen (edit mode)
      └── TodoFormScreen    (Oluştur / Düzenle)
           └── [kaydet] ──────────────────────── TodoListScreen'e geri dön
```

### 3.3 Klasör Yapısı

```
TodoApp/
├── App.tsx                         ← Navigator kök bileşeni
├── src/
│   ├── screens/
│   │   ├── TodoListScreen.tsx      ← Liste, toggle, sil
│   │   └── TodoFormScreen.tsx      ← Oluştur / düzenle formu
│   ├── components/
│   │   ├── TodoItem.tsx            ← Tek bir todo satırı
│   │   └── EmptyState.tsx          ← Boş liste mesajı
│   ├── services/
│   │   └── api.ts                  ← Axios + tüm API fonksiyonları
│   └── types/
│       └── todo.ts                 ← TypeScript tip tanımları
├── package.json
└── tsconfig.json
```

### 3.4 Bileşen Sorumlulukları

| Bileşen           | Sorumluluk                                                   |
|-------------------|--------------------------------------------------------------|
| `App.tsx`         | Stack Navigator'ı başlatır, ekranları tanımlar              |
| `TodoListScreen`  | API'den listeler, toggle/sil aksiyonlarını yönetir          |
| `TodoFormScreen`  | Create ve Edit modunu tek formda yönetir                    |
| `TodoItem`        | Tek todo öğesini render eder (görsel durum, aksiyonlar)     |
| `EmptyState`      | Liste boş olduğunda mesaj gösterir                          |
| `api.ts`          | Tüm HTTP çağrılarını kapsüller, tip güvenli fonksiyonlar    |
| `todo.ts`         | `Todo`, `CreateTodoRequest`, `UpdateTodoRequest` tipleri    |

---

## 4. Todo Veri Modeli

### 4.1 Entity Alanları

| Alan          | Tip      | Zorunlu | Kısıtlamalar          | Varsayılan       |
|---------------|----------|---------|-----------------------|------------------|
| `id`          | GUID     | Evet    | Sistem üretir         | `Guid.NewGuid()` |
| `title`       | string   | Evet    | Min: 1, Max: 200 char | —                |
| `description` | string   | Hayır   | Max: 1000 char        | `null`           |
| `isCompleted` | bool     | Evet    | —                     | `false`          |
| `createdAt`   | DateTime | Evet    | UTC, sistem üretir    | `DateTime.UtcNow`|
| `updatedAt`   | DateTime | Evet    | UTC, sistem günceller | `DateTime.UtcNow`|

### 4.2 JSON Temsili (Örnek)

```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Market alışverişi yap",
  "description": "Süt, ekmek, yumurta",
  "isCompleted": false,
  "createdAt": "2026-03-04T10:00:00Z",
  "updatedAt": "2026-03-04T10:00:00Z"
}
```

---

## 5. API Endpointleri

Base URL (local): `http://localhost:5000/api`

### 5.1 GET /api/todos — Tümünü Listele

| | |
|---|---|
| **Method** | GET |
| **Path** | `/api/todos` |
| **Request Body** | Yok |
| **Başarı Yanıtı** | `200 OK` — Todo dizisi |
| **Hata Yanıtı** | — |

**Yanıt:**
```json
[
  { "id": "...", "title": "...", "isCompleted": false, "createdAt": "...", "updatedAt": "..." }
]
```

---

### 5.2 POST /api/todos — Yeni Todo Oluştur

| | |
|---|---|
| **Method** | POST |
| **Path** | `/api/todos` |
| **Request Body** | `CreateTodoRequest` |
| **Başarı Yanıtı** | `201 Created` — Oluşturulan todo |
| **Hata Yanıtı** | `400 Bad Request` — Validasyon hatası |

**Request Body:**
```json
{
  "title": "Market alışverişi yap",
  "description": "Süt, ekmek, yumurta"
}
```

---

### 5.3 PUT /api/todos/{id} — Todo Güncelle

| | |
|---|---|
| **Method** | PUT |
| **Path** | `/api/todos/{id}` |
| **Request Body** | `UpdateTodoRequest` |
| **Başarı Yanıtı** | `200 OK` — Güncellenmiş todo |
| **Hata Yanıtı** | `400 Bad Request` / `404 Not Found` |

**Request Body:**
```json
{
  "title": "Market alışverişi yapıldı",
  "description": "Süt, ekmek, yumurta",
  "isCompleted": true
}
```

---

### 5.4 DELETE /api/todos/{id} — Todo Sil

| | |
|---|---|
| **Method** | DELETE |
| **Path** | `/api/todos/{id}` |
| **Request Body** | Yok |
| **Başarı Yanıtı** | `204 No Content` |
| **Hata Yanıtı** | `404 Not Found` |

---

### 5.5 Hata Yanıt Formatı

Tüm hata yanıtları aşağıdaki standart formatı kullanır:

```json
{
  "status": 400,
  "message": "Title alanı zorunludur.",
  "errors": {
    "title": ["Title alanı zorunludur.", "Title en fazla 200 karakter olabilir."]
  }
}
```

---

## 6. Veri Akışı

### 6.1 Todo Oluşturma Akışı

```
Kullanıcı [Form Doldurur]
      │
      ▼
TodoFormScreen.onSubmit()
      │  createTodo(request)
      ▼
api.ts → POST /api/todos
      │
      ▼
TodosController.Create()
      │  Validasyon
      ├─── HATA ──► 400 Bad Request → UI validasyon mesajı gösterir
      │
      │  Geçerli
      ▼
InMemoryTodoRepository.Add(todo)
      │
      ▼
201 Created + Todo JSON
      │
      ▼
TodoListScreen state güncellenir → Liste yeniden render edilir
```

### 6.2 Todo Tamamlama Akışı

```
Kullanıcı [Toggle'a Dokunur]
      │
      ▼
TodoListScreen.onToggle(id)
      │  Optimistik güncelleme: local state anında değişir
      │  updateTodo({ isCompleted: !current })
      ▼
api.ts → PUT /api/todos/{id}
      │
      ├─── HATA ──► Local state geri alınır
      │
      ▼
200 OK + Güncellenmiş Todo
      │
      ▼
State API yanıtıyla senkronize edilir
```

### 6.3 Todo Silme Akışı

```
Kullanıcı [Sil Butonuna Dokunur]
      │
      ▼
Alert.alert() — Onay dialogu
      │
      ├─── İptal ──► Hiçbir şey olmaz
      │
      │  Onaylandı
      ▼
api.ts → DELETE /api/todos/{id}
      │
      ▼
204 No Content
      │
      ▼
Local state'ten öğe kaldırılır → Liste güncellenir
```

---

## 7. Mimari Kararlar ve Gerekçeler

| Karar | Alternatif | Gerekçe |
|---|---|---|
| In-Memory Repository | SQLite / PostgreSQL | İlk aşama için DB kurulumu gereksiz; interface sayesinde ileride kolayca değiştirilebilir |
| Layered Architecture | Clean Architecture | CRUD MVP için aşırı mühendislik; basit ve anlaşılır |
| React useState | Redux / Zustand | Global state gereksiz; veri tek ekrana ait |
| Axios | Fetch API | Interceptor, timeout ve hata yönetimi daha kolay |
| Stack Navigator | Tab Navigator | Todo uygulaması için doğrusal ekran akışı yeterli |

---

## 8. Sonraki Adımlar (Bu Tasarım Sonrası)

1. **TICKET-002** — Backend projesini scaffold et
2. **TICKET-003** — Frontend projesini scaffold et
3. **TICKET-004** — Todo entity ve repository implementasyonu
