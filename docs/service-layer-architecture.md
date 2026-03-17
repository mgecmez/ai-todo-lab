# Service Layer Mimarisi — Backend Refactoring

Versiyon: 1.0  
Tarih: 2026-03-12  
Hazırlayan: Architect Agent  
Kapsam: `backend/TodoApp.Api/` — Controller → Service → Repository katman ekleme

---

## 1. Genel Bakış ve Motivasyon

Mevcut mimaride `TodosController` doğrudan `ITodoRepository`'e bağımlıdır. Controller şu anda iki farklı sorumluluğu üstlenmektedir:

1. **HTTP katmanı sorumluluğu** — request alma, validasyon yanıtı döndürme, HTTP status code belirleme
2. **İş mantığı sorumluluğu** — `Todo` nesnesini DTO'dan inşa etme, alan varsayılanlarını belirleme

Aynı zamanda `EfTodoRepository.Add()` içinde `Id`, `CreatedAt`, `UpdatedAt`, `IsCompleted`, `IsPinned` atanmaktadır; bu alanlar saf veri erişim işlemi değil, iş kurallarıdır.

Bu refactoring ile sorumluluklar net biçimde ayrılır:

| Katman | Sorumluluk |
|--------|-----------|
| `TodosController` | HTTP: request alma → service çağrısı → response döndürme |
| `TodoService` | İş mantığı: alan türetme, varsayılanlar, toggle kararları |
| `EfTodoRepository` | Saf veri erişimi: EF Core üzerinden okuma ve yazma |

---

## 2. Mimari Diyagramı

### 2.1 Mevcut Durum (v0.5.0)

```
HTTP Request
     │
     ▼
┌────────────────────────────────────────────────┐
│  TodosController                               │
│  - DTO'dan Todo nesnesi inşa eder              │
│  - Alan varsayılanlarını ayarlar               │
│  - Repository çağrısı yapar                    │
└──────────────────────┬─────────────────────────┘
                       │ ITodoRepository
                       ▼
┌────────────────────────────────────────────────┐
│  EfTodoRepository                              │
│  - Id, CreatedAt, UpdatedAt atar (iş kuralı!) │
│  - IsCompleted, IsPinned default'ları atar     │
│  - Toggle mantığını çalıştırır                │
│  - EF Core üzerinden veri yazar               │
└────────────────────────────────────────────────┘
```

### 2.2 Hedef Durum (Service Layer sonrası)

```
HTTP Request
     │
     ▼
┌────────────────────────────────────────────────┐
│  TodosController                               │
│  - [İNCE] Validate → Service çağır → Respond  │
└──────────────────────┬─────────────────────────┘
                       │ ITodoService
                       ▼
┌────────────────────────────────────────────────┐
│  TodoService                                   │
│  - Id üretimi (Guid.NewGuid())                 │
│  - Timestamp atama (DateTime.UtcNow)           │
│  - Alan varsayılanları (IsCompleted, IsPinned) │
│  - Toggle mantığı (GetById → mutate → Save)    │
│  - DTO → Todo dönüşümü                        │
└──────────────────────┬─────────────────────────┘
                       │ ITodoRepository
                       ▼
┌────────────────────────────────────────────────┐
│  EfTodoRepository                              │
│  - [SAF VERİ ERİŞİMİ]                         │
│  - Tam oluşturulmuş Todo nesnesini kaydeder    │
│  - Alan güncelleme + SaveChanges               │
│  - Toggle için: sadece okur, sonucu kaydeder  │
└────────────────────────────────────────────────┘
```

### 2.3 DI Bağımlılık Grafiği

```
Program.cs
  ├── AddScoped<ITodoRepository, EfTodoRepository>
  └── AddScoped<ITodoService, TodoService>
        └── TodoService(ITodoRepository repository)
              └── TodosController(ITodoService service)
```

---

## 3. ITodoService — Arayüz Tanımı

Dosya konumu: `TodoApp.Api/Services/ITodoService.cs`

```csharp
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;

namespace TodoApp.Api.Services;

/// <summary>
/// Todo iş mantığı katmanının soyut arayüzü.
/// Controller bu arayüze bağımlıdır; somut implementasyon DI tarafından enjekte edilir.
/// </summary>
public interface ITodoService
{
    /// <summary>Tüm todo'ları sıralanmış biçimde döndürür.</summary>
    IReadOnlyList<Todo> GetAll();

    /// <summary>
    /// Verilen id'ye sahip todo'yu döndürür.
    /// Bulunamazsa null döner.
    /// </summary>
    Todo? GetById(Guid id);

    /// <summary>
    /// Yeni bir todo oluşturur.
    /// Id, CreatedAt, UpdatedAt ve varsayılan alan değerlerini bu katman atar.
    /// </summary>
    Todo Create(CreateTodoRequest request);

    /// <summary>
    /// Var olan bir todo'yu günceller.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? Update(Guid id, UpdateTodoRequest request);

    /// <summary>
    /// Verilen id'ye sahip todo'yu siler.
    /// Başarılıysa true, bulunamazsa false döner.
    /// </summary>
    bool Delete(Guid id);

    /// <summary>
    /// Todo'nun IsCompleted değerini tersine çevirir.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? ToggleComplete(Guid id);

    /// <summary>
    /// Todo'nun IsPinned değerini tersine çevirir.
    /// Todo bulunamazsa null döner.
    /// </summary>
    Todo? TogglePin(Guid id);
}
```

**Tasarım kararı — DTO vs. Entity parametresi:**  
`Create` ve `Update` metodları `CreateTodoRequest` / `UpdateTodoRequest` alır. Böylece Service katmanı DTO'dan entity dönüşümünü üstlenir; Controller raw `Todo` nesnesi oluşturmaz. Bu yaklaşım Controller'ı daha ince yapar ve ileride aynı Service'i farklı input kaynaklarından (gRPC, CLI, background job) çağırma imkânı sağlar.

---

## 4. TodoService — Implementasyon Tasarımı

Dosya konumu: `TodoApp.Api/Services/TodoService.cs`

```csharp
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Repositories;

namespace TodoApp.Api.Services;

/// <summary>
/// ITodoService'in birincil implementasyonu.
/// İş mantığını barındırır; veri erişimini ITodoRepository'ye devreder.
/// </summary>
public class TodoService(ITodoRepository repository) : ITodoService
{
    public IReadOnlyList<Todo> GetAll() => repository.GetAll();

    public Todo? GetById(Guid id) => repository.GetById(id);

    public Todo Create(CreateTodoRequest request)
    {
        var todo = new Todo
        {
            Id          = Guid.NewGuid(),
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Priority    = (TodoPriority)(request.Priority ?? (int)TodoPriority.Normal),
            DueDate     = request.DueDate,
            Tags        = request.Tags?.Trim(),
            IsCompleted = false,
            IsPinned    = false,
            CreatedAt   = DateTime.UtcNow,
            UpdatedAt   = DateTime.UtcNow,
        };

        return repository.Add(todo);
    }

    public Todo? Update(Guid id, UpdateTodoRequest request)
    {
        var updated = new Todo
        {
            Title       = request.Title.Trim(),
            Description = request.Description?.Trim(),
            IsCompleted = request.IsCompleted,
            Priority    = (TodoPriority)request.Priority,
            DueDate     = request.DueDate,
            IsPinned    = request.IsPinned,
            Tags        = request.Tags?.Trim(),
            UpdatedAt   = DateTime.UtcNow,
        };

        return repository.Update(id, updated);
    }

    public bool Delete(Guid id) => repository.Delete(id);

    public Todo? ToggleComplete(Guid id) => repository.ToggleComplete(id);

    public Todo? TogglePin(Guid id) => repository.TogglePin(id);
}
```

**Toggle metodları hakkında tasarım kararı:**  
`ToggleComplete` ve `TogglePin` için iki yaklaşım değerlendirildi:

| Yaklaşım | Açıklama | Karar |
|----------|---------|-------|
| **A — Repository toggle'ı korur** | Repository `GetById → flip → SaveChanges` yapar; Service sadece iletir | **Seçildi** |
| **B — Service toggle'ı üstlenir** | Service `GetById` → `UpdatedAt` atar → `Update` çağırır; Repository'de toggle metodu kalmaz | Gelecek adım için opsiyonel |

Yaklaşım A seçildi çünkü:
- `ITodoRepository` arayüzünde kırıcı değişiklik yapmaz.
- `InMemoryTodoRepository` mevcut stub implementasyonunu korur.
- Mevcut entegrasyon testleri değiştirilmeden geçer.
- Toggle işlemleri atomik kalmaya devam eder (EF Core single SaveChanges).

---

## 5. ITodoRepository — Değişiklikler

### 5.1 Arayüz Değişiklikleri

`ITodoRepository` arayüzü **değişmez**. Mevcut imzalar korunur:

```csharp
IReadOnlyList<Todo> GetAll();
Todo? GetById(Guid id);
Todo Add(Todo todo);
Todo? Update(Guid id, Todo updated);
bool Delete(Guid id);
Todo? ToggleComplete(Guid id);
Todo? TogglePin(Guid id);
```

**Gerekçe:** Interface değişikliği `InMemoryTodoRepository` implementasyonunu etkiler ve entegrasyon testlerini kırar. Service katmanı eklenerek iş mantığı zaten oraya taşınmış olur; interface'in daraltılmasına gerek yoktur.

### 5.2 EfTodoRepository — Kaldırılan İş Mantığı

`Add()` metodundan şu satırlar kaldırılır:

```csharp
// KALDIRILACAK — bu atamalar artık TodoService.Create() içinde yapılıyor
todo.Id = Guid.NewGuid();
todo.CreatedAt = DateTime.UtcNow;
todo.UpdatedAt = DateTime.UtcNow;
todo.IsCompleted = false;
todo.IsPinned = false;
```

`Add()` hedef hali — sadece EF Core kaydı:

```csharp
public Todo Add(Todo todo)
{
    // todo nesnesi Service tarafından tam olarak oluşturulmuş gelir.
    // Repository yalnızca persist eder.
    dbContext.Todos.Add(todo);
    dbContext.SaveChanges();
    return todo;
}
```

`Update()` metodundan `UpdatedAt` ataması kaldırılır:

```csharp
// KALDIRILACAK — TodoService.Update() içinde DTO dönüşümünde zaten atanıyor
existing.UpdatedAt = DateTime.UtcNow;
```

`Update()` hedef hali:

```csharp
public Todo? Update(Guid id, Todo updated)
{
    var existing = dbContext.Todos.Find(id);
    if (existing is null) return null;

    existing.Title       = updated.Title;
    existing.Description = updated.Description;
    existing.IsCompleted = updated.IsCompleted;
    existing.Priority    = updated.Priority;
    existing.DueDate     = updated.DueDate;
    existing.IsPinned    = updated.IsPinned;
    existing.Tags        = updated.Tags;
    existing.UpdatedAt   = updated.UpdatedAt;  // Service'den gelen değeri kullan

    dbContext.SaveChanges();
    return existing;
}
```

**`ToggleComplete` ve `TogglePin` korunur** — bu metodlar atomik flip işlemleri içerdiğinden Repository'de kalmaya devam eder. `UpdatedAt = DateTime.UtcNow` bu metodlarda korunur çünkü Service bu iki metodu doğrudan iletmekte, timestamp ataması Repository'de gerçekleşmektedir. Bu tutarsızlık kabul edilebilir: gelecekte toggle'lar da Service'e taşınabilir (Bkz. Bölüm 4 — Yaklaşım B).

### 5.3 EfTodoRepository — Kalıcı Metodlar

| Metod | Durum | Açıklama |
|-------|-------|---------|
| `GetAll()` | Değişmez | Sıralama mantığı (IsPinned, Priority, DueDate, CreatedAt) burada kalır |
| `GetById()` | Değişmez | Saf EF Core sorgusu |
| `Add()` | Güncellenir | İş mantığı çıkar, sadece `dbContext.Todos.Add` + `SaveChanges` kalır |
| `Update()` | Güncellenir | `UpdatedAt` ataması çıkar, `updated.UpdatedAt` değeri kullanılır |
| `Delete()` | Değişmez | Saf silme işlemi |
| `ToggleComplete()` | Değişmez | Atomik flip + `DateTime.UtcNow` korunur |
| `TogglePin()` | Değişmez | Atomik flip + `DateTime.UtcNow` korunur |

---

## 6. InMemoryTodoRepository — Değişiklikler

`InMemoryTodoRepository` legacy bir implementasyondur; entegrasyon testlerinde `EfTodoRepository` (InMemory EF Core provider üzerinde) kullanılmaktadır. Yine de interface uyumluluğunu korumak gerekir.

### 6.1 Add() Güncelleme

`EfTodoRepository.Add()` ile paralel olarak iş mantığı kaldırılır:

```csharp
public Todo Add(Todo todo)
{
    // Service tarafından tam oluşturulmuş Todo beklenir.
    // Aşağıdaki atamalar kaldırılır:
    // todo.Id = Guid.NewGuid();           ← Service atar
    // todo.CreatedAt = DateTime.UtcNow;   ← Service atar
    // todo.UpdatedAt = DateTime.UtcNow;   ← Service atar
    // todo.IsCompleted = false;           ← Service atar

    lock (_lock)
    {
        _todos.Add(todo);
    }
    return todo;
}
```

### 6.2 Update() Güncelleme

`UpdatedAt` ataması kaldırılır, `updated.UpdatedAt` değeri kullanılır:

```csharp
public Todo? Update(Guid id, Todo updated)
{
    lock (_lock)
    {
        var existing = _todos.FirstOrDefault(t => t.Id == id);
        if (existing is null) return null;

        existing.Title       = updated.Title;
        existing.Description = updated.Description;
        existing.IsCompleted = updated.IsCompleted;
        existing.Priority    = updated.Priority;
        existing.DueDate     = updated.DueDate;
        existing.IsPinned    = updated.IsPinned;
        existing.Tags        = updated.Tags;
        existing.UpdatedAt   = updated.UpdatedAt;  // Service'den gelen değeri kullan

        return existing;
    }
}
```

### 6.3 TogglePin() — Stub'dan Implementasyona

Mevcut `throw new NotImplementedException()` stub'ı gerçek implementasyonla doldurulur:

```csharp
public Todo? TogglePin(Guid id)
{
    lock (_lock)
    {
        var todo = _todos.FirstOrDefault(t => t.Id == id);
        if (todo is null) return null;

        todo.IsPinned = !todo.IsPinned;
        todo.UpdatedAt = DateTime.UtcNow;

        return todo;
    }
}
```

**Not:** `InMemoryTodoRepository` aktif olarak üretimde kullanılmamaktadır. Entegrasyon testleri `CustomWebApplicationFactory` aracılığıyla EF Core InMemory provider kullanan `EfTodoRepository` üzerinde çalışmaktadır. Bu değişiklikler interface tutarlılığı için yapılmaktadır.

---

## 7. TodosController — Değişiklikler

Controller `ITodoRepository` yerine `ITodoService` enjekte eder ve tüm iş mantığı kodunu bırakır.

```csharp
using Microsoft.AspNetCore.Mvc;
using TodoApp.Api.DTOs;
using TodoApp.Api.Models;
using TodoApp.Api.Services;

namespace TodoApp.Api.Controllers;

[ApiController]
[Route("api/todos")]
public class TodosController(ITodoService service) : ControllerBase
{
    [HttpGet]
    public ActionResult<IEnumerable<Todo>> GetAll()
        => Ok(service.GetAll());

    [HttpGet("{id:guid}")]
    public ActionResult<Todo> GetById(Guid id)
    {
        var todo = service.GetById(id);
        return todo is null ? NotFound() : Ok(todo);
    }

    [HttpPost]
    public ActionResult<Todo> Create([FromBody] CreateTodoRequest request)
    {
        var created = service.Create(request);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:guid}")]
    public ActionResult<Todo> Update(Guid id, [FromBody] UpdateTodoRequest request)
    {
        var result = service.Update(id, request);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpDelete("{id:guid}")]
    public IActionResult Delete(Guid id)
    {
        var deleted = service.Delete(id);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPatch("{id:guid}/toggle")]
    public ActionResult<Todo> Toggle(Guid id)
    {
        var result = service.ToggleComplete(id);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPatch("{id:guid}/pin")]
    public ActionResult<Todo> Pin(Guid id)
    {
        var result = service.TogglePin(id);
        return result is null ? NotFound() : Ok(result);
    }
}
```

**Controller'dan kaldırılan sorumluluklar:**
- `new Todo { ... }` inşası — Service'e taşındı
- `(TodoPriority)(request.Priority ?? ...)` cast — Service'e taşındı
- `.Trim()` çağrıları — Service'e taşındı
- Default değer atamaları — Service'e taşındı

---

## 8. DI Kayıt Değişiklikleri — Program.cs

`Program.cs`'e tek bir satır eklenir. Mevcut satırlar değişmez.

```csharp
// ── Repository kaydı (mevcut — değişmez) ────────────────────────────────────
builder.Services.AddScoped<ITodoRepository, EfTodoRepository>();

// ── Service kaydı (YENİ) ─────────────────────────────────────────────────────
// TodoService, ITodoRepository bağımlılığını constructor injection ile alır.
// Scoped lifetime: her HTTP isteği kendi TodoService instance'ını alır.
builder.Services.AddScoped<ITodoService, TodoService>();
```

**Lifetime tercihi — Scoped:**  
`EfTodoRepository` Scoped olduğundan `TodoService` da Scoped olmalıdır. Singleton bir Service, Scoped bir Repository'i inject edemez (captive dependency anti-pattern).

---

## 9. Klasör Yapısı Değişiklikleri

```
TodoApp.Api/
├── Controllers/
│   └── TodosController.cs       ← ITodoService enjekte eder (güncellenir)
├── Data/
│   └── AppDbContext.cs           ← Değişmez
├── DTOs/
│   ├── CreateTodoRequest.cs      ← Değişmez
│   └── UpdateTodoRequest.cs      ← Değişmez
├── Models/
│   └── Todo.cs                   ← Değişmez
├── Repositories/
│   ├── ITodoRepository.cs        ← Değişmez (arayüz korunur)
│   ├── EfTodoRepository.cs       ← Add() ve Update() güncellenir
│   └── InMemoryTodoRepository.cs ← Add(), Update(), TogglePin() güncellenir
├── Services/                     ← YENİ KLASÖR
│   ├── ITodoService.cs           ← YENİ
│   └── TodoService.cs            ← YENİ
├── Validation/
│   └── NotWhitespaceAttribute.cs ← Değişmez
└── Program.cs                    ← AddScoped<ITodoService, TodoService>() eklenir
```

---

## 10. Test Stratejisi — Kırıcı Değişiklik Analizi

### 10.1 Mevcut Entegrasyon Testleri

`TodoApiIntegrationTests` HTTP seviyesinde test yazmaktadır. Controller → Service → Repository zinciri tamamen gerçek implementasyonla çalışır. `CustomWebApplicationFactory` yalnızca `DbContextOptions<AppDbContext>`'i override etmektedir.

**Sonuç: Mevcut testler değiştirilmeden geçmeye devam eder.**

Gerekçe:
- API endpoint'leri ve HTTP response formatları değişmez.
- `CustomWebApplicationFactory` sadece EF Core provider'ı değiştirir; Service kaydını dokunmaz.
- `ITodoService` ve `TodoService`, `ITodoRepository`'yi DI ile alır; test ortamında yine `EfTodoRepository` (InMemory EF Core üzerinde) çalışır.

### 10.2 Yeni Unit Test Fırsatları

Service katmanı ayrıştıktan sonra mock repository ile izole unit test yazılabilir:

```csharp
// Örnek unit test yapısı (Backend Developer tarafından implemente edilecek)
public class TodoServiceTests
{
    private readonly Mock<ITodoRepository> _mockRepo = new();
    private readonly ITodoService _service;

    public TodoServiceTests()
    {
        _service = new TodoService(_mockRepo.Object);
    }

    [Fact]
    public void Create_SetsIdAndTimestamps()
    {
        // Arrange
        _mockRepo.Setup(r => r.Add(It.IsAny<Todo>()))
                 .Returns<Todo>(t => t);
        var request = new CreateTodoRequest { Title = "Test" };

        // Act
        var result = _service.Create(request);

        // Assert
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.True(result.CreatedAt <= DateTime.UtcNow);
        Assert.False(result.IsCompleted);
        Assert.False(result.IsPinned);
    }
}
```

### 10.3 Kırıcı Değişiklik Tablosu

| Değişiklik | Kırıcı? | Açıklama |
|-----------|---------|---------|
| `ITodoRepository` arayüzü korunur | Hayır | Interface değişmez |
| Controller `ITodoService` enjekte eder | Hayır | DI otomatik çözer |
| `EfTodoRepository.Add()` iş mantığı kaldırır | Hayır | Service aynı değerleri atar |
| `InMemoryTodoRepository` güncellenir | Hayır | Legacy; testler EfTodoRepository kullanıyor |
| API endpoint'leri aynı kalır | Hayır | HTTP kontratı değişmez |

---

## 11. Migration Stratejisi

Refactoring aşamaları sıralı ve bağımsız commit'ler halinde yapılmalıdır:

### Aşama 1 — Service Katmanı Oluşturma
- `Services/ITodoService.cs` oluştur
- `Services/TodoService.cs` oluştur (mevcut `EfTodoRepository` iş mantığını buraya taşı)
- `Program.cs`'e `AddScoped<ITodoService, TodoService>()` ekle
- Testler bu aşamada hâlâ geçmez (Controller henüz eski repository'ye bağlı)

### Aşama 2 — Controller Güncelleme
- `TodosController` dependency'yi `ITodoRepository`'den `ITodoService`'e değiştir
- Tüm entegrasyon testlerini çalıştır; geçmeli

### Aşama 3 — Repository Temizleme
- `EfTodoRepository.Add()` ve `Update()` içinden iş mantığı kaldır
- `InMemoryTodoRepository` güncelle + `TogglePin()` stub'ını implemente et
- Testleri tekrar çalıştır; geçmeli

**Her aşama sonunda `dotnet test` çalıştırılmalı ve tüm testler yeşil olmalıdır.**

---

## 12. Mimari Karar Kaydı (ADR)

**ADR-006 — Service Layer Eklenmesi**

| Alan | Değer |
|------|-------|
| Tarih | 2026-03-12 |
| Durum | Kabul Edildi |
| Karar Veren | Architect Agent |

**Bağlam:** Controller'da iş mantığı ve HTTP sorumluluğu karışmış durumdaydı. Repository'de de alan varsayılanları gibi iş kuralları bulunuyordu.

**Karar:** `ITodoService` arayüzü ve `TodoService` implementasyonu eklenerek iş mantığı service katmanına taşınır.

**Sonuçlar:**
- Controller tamamen ince hale gelir (HTTP only)
- Repository saf veri erişim katmanına döner
- Service izole unit test edilebilir hale gelir
- `ITodoRepository` arayüzü değişmez (backward compat)
- İleride aynı `ITodoService`'i gRPC endpoint'i veya background job üzerinden kullanmak mümkün olur

**Kabul edilen ödünleşimler:**
- `ToggleComplete` / `TogglePin` business mantığı repository'de kalmaya devam eder (atomik işlem avantajı için)
- Bu tutarsızlık gelecekte Yaklaşım B (bkz. Bölüm 4) ile giderilebilir
