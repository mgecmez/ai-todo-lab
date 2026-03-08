# Persistence Layer Mimarisi

**Sprint:** Persistence Layer – Step 1
**Yazar:** Architect Agent
**Tarih:** 2026-03-08
**Durum:** Taslak

---

## 1. Neden SQLite + EF Core?

### Karar

In-memory repository, uygulama yeniden başladığında tüm verileri kaybeder. Öğrenme projesi için kalıcı bir veri katmanı gerekiyor.

### SQLite

| Kriter | Değerlendirme |
|--------|--------------|
| Kurulum | Sıfır — ek sunucu, servis, Docker container gerekmez |
| Dosya yapısı | Tek `.db` dosyası; taşımak/silmek tek komut |
| Geliştirici deneyimi | Macintosh + Windows + Linux'ta aynı davranış |
| Öğrenme eğrisi | SQL dialekti minimal; EF Core soyutlar |
| Üretim uygunluğu | Tek kullanıcılı / düşük eşzamanlılıklı projeler için yeterli |
| Alternatif yol | İleride PostgreSQL/SQL Server'a geçiş yalnızca connection string + provider değişimi |

### EF Core

| Kriter | Değerlendirme |
|--------|--------------|
| .NET ekosistemi | Resmi Microsoft ORM; .NET 10 ile tam uyumlu |
| Migration | `dotnet ef migrations add` / `database update` — kod tabanlı şema yönetimi |
| LINQ desteği | C# sorgularını SQL'e çevirir; ham SQL yazmak zorunda değiliz |
| Repository pattern | `DbContext` doğrudan repository olarak kullanılabilir; katman sayısını düşük tutar |
| Test | `UseInMemoryDatabase` provider ile entegrasyon testleri izole çalışır |

---

## 2. Yeni Backend Mimarisi

### Mevcut Durum

```
TodoApp.Api/
├── Controllers/
│   ├── HealthController.cs
│   └── TodosController.cs          ← ITodoRepository'ye bağımlı
├── DTOs/
│   ├── CreateTodoRequest.cs
│   └── UpdateTodoRequest.cs
├── Models/
│   └── Todo.cs
├── Repositories/
│   ├── ITodoRepository.cs          ← Sözleşme (interface)
│   └── InMemoryTodoRepository.cs   ← Tek implementasyon
├── Validation/
│   └── NotWhitespaceAttribute.cs
└── Program.cs                      ← Singleton kayıt
```

### Hedef Durum

```
TodoApp.Api/
├── Controllers/          (değişmez)
├── DTOs/                 (değişmez)
├── Models/
│   └── Todo.cs           (değişmez — alanlar aynı)
├── Data/                 ← YENİ KLASÖR
│   └── AppDbContext.cs   ← YENİ — EF Core DbContext
├── Repositories/
│   ├── ITodoRepository.cs              (değişmez — sözleşme korunur)
│   ├── InMemoryTodoRepository.cs       (korunur — silinmez, testlerde kullanılabilir)
│   └── EfTodoRepository.cs             ← YENİ — SQLite implementasyonu
├── Validation/           (değişmez)
└── Program.cs            ← güncellenir (DI kaydı + migration)
```

### Mimari Prensip

**Controller → ITodoRepository → EfTodoRepository → AppDbContext → SQLite**

`TodosController` hiçbir değişiklik görmez. DI container hangi implementasyonu enjekte ettiğini bilir; controller bunu bilemez ve bilmek zorunda değildir. Bu, Dependency Inversion prensibinin doğrudan uygulamasıdır.

---

## 3. Eklenecek Katmanlar / Dosyalar

### 3.1 Yeni Dosyalar (üretim kodu)

| Dosya | Amaç |
|-------|------|
| `Data/AppDbContext.cs` | EF Core `DbContext`; `DbSet<Todo>` ve model konfigürasyonu |
| `Repositories/EfTodoRepository.cs` | `ITodoRepository` implementasyonu; `AppDbContext` üzerinden CRUD |

### 3.2 Güncellenen Dosyalar (üretim kodu)

| Dosya | Değişiklik |
|-------|-----------|
| `Program.cs` | `AddSingleton<InMemory>` → `AddScoped<EfTodoRepository>` + EF Core servis kaydı + migration çağrısı |
| `TodoApp.Api.csproj` | İki yeni NuGet paketi eklenir |

### 3.3 Yeni Dosyalar (altyapı)

| Dosya | Amaç |
|-------|------|
| `Migrations/` klasörü | `dotnet ef migrations add InitialCreate` ile otomatik oluşur |
| `todos.db` | Uygulama ilk çalıştığında `wwwroot/` yanında oluşacak SQLite dosyası |

### 3.4 Güncellenen Dosyalar (test kodu)

| Dosya | Değişiklik |
|-------|-----------|
| `TodoApp.Api.Tests.csproj` | EF Core InMemory provider paketi eklenir |
| `TodoApiIntegrationTests.cs` | Her test için izole InMemory database kurulumu |

---

## 4. Todo Entity Alanları

`Models/Todo.cs` dosyası **değişmez.** Mevcut alanlar EF Core için zaten uygun:

| Alan | Tür | EF Core Davranışı | Not |
|------|-----|-------------------|-----|
| `Id` | `Guid` | Primary Key (convention) | `Id` adı otomatik PK tanınır |
| `Title` | `string` | `NOT NULL`, max 200 | `AppDbContext`'te `HasMaxLength(200)` ile kısıtlanır |
| `Description` | `string?` | `NULL` | Nullable referans tipi; EF bunu otomatik algılar |
| `IsCompleted` | `bool` | `NOT NULL`, default `false` | — |
| `CreatedAt` | `DateTime` | `NOT NULL` | UTC kaydedilir; repository sorumluluğu |
| `UpdatedAt` | `DateTime` | `NOT NULL` | UTC kaydedilir; repository sorumluluğu |

### Sütun Adları

EF Core varsayılan olarak C# property adını sütun adı olarak kullanır. `[Column]` attribute veya `HasColumnName()` çağrısı gerekmez. Tablo adı: `Todos` (DbSet adından türetilir).

---

## 5. DbContext Yapısı

### `Data/AppDbContext.cs` — Tasarım

```
AppDbContext : DbContext
│
├── DbSet<Todo> Todos
│
└── OnModelCreating(ModelBuilder)
    └── Todo entity konfigürasyonu
        ├── HasKey(t => t.Id)              ← convention ile zaten çalışır; explicit yazılır
        ├── Property(Title).HasMaxLength(200).IsRequired()
        ├── Property(Description).HasMaxLength(1000)
        └── Property(CreatedAt/UpdatedAt).IsRequired()
```

### Constructor Yaklaşımı

`AppDbContext(DbContextOptions<AppDbContext> options)` constructor'ı alır. Bu şablonu test ortamında farklı seçeneklerle (InMemory provider) enjekte etmeye olanak tanır.

### Connection String Yeri

`appsettings.json` içinde:

```
ConnectionStrings:
  DefaultConnection: "Data Source=todos.db"
```

Dosya yolu uygulama dizinine görece olur; `Environment.CurrentDirectory` veya `IWebHostEnvironment.ContentRootPath` üzerinden mutlak yola çevrilmesi düşünülmeli. **Geliştirme ortamı için** `appsettings.Development.json` ayrı bir yol tanımlayabilir.

---

## 6. Migration Yaklaşımı

### Strateji: Code-First Migration

Schema kaynak koddan türetilir; SQL dosyaları elle yazılmaz.

### Adımlar (geliştirici komutları)

```
1. dotnet ef migrations add InitialCreate --project TodoApp.Api
   → Migrations/ klasörü oluşur; tarih damgalı .cs dosyaları üretilir

2. dotnet ef database update --project TodoApp.Api
   → todos.db dosyası oluşur; Todos tablosu yaratılır
```

### Otomatik Migration (Program.cs'te)

Uygulama başlarken bekleyen migration varsa otomatik uygula:

```
Program.cs içinde, app.Run() öncesinde:
  scope aç → AppDbContext al → context.Database.Migrate() çağır → scope kapat
```

Bu yaklaşım geliştirme ortamında konfordindir; üretimde CI pipeline üzerinden `database update` tercih edilir. Şimdilik öğrenme projesi olduğundan otomatik migration yeterlidir.

### Geri Alma

```
dotnet ef database update <önceki-migration-adı>
dotnet ef migrations remove
```

---

## 7. Repository / Service Geçiş Stratejisi

### DI Değişikliği (Program.cs)

**Önce:**
```
builder.Services.AddSingleton<ITodoRepository, InMemoryTodoRepository>();
```

**Sonra:**
```
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddScoped<ITodoRepository, EfTodoRepository>();
```

### Scoped vs Singleton

| | InMemory | EfTodoRepository |
|--|---------|-----------------|
| Lifetime | `Singleton` (state bellekte yaşar) | `Scoped` (her HTTP isteğinde yeni instance) |
| Neden | Thread-safe `Lock` ile korunuyor | `DbContext` Scoped olmak zorunda; EF Core bunu zorunlu kılar |

### EfTodoRepository Sözleşmesi

`ITodoRepository` interface'i **değişmez.** `EfTodoRepository` tüm metotları uygular:

| Metot | EF Core karşılığı |
|-------|------------------|
| `GetAll()` | `dbContext.Todos.OrderByDescending(t => t.CreatedAt).ToList()` |
| `GetById(id)` | `dbContext.Todos.Find(id)` veya `FirstOrDefault` |
| `Add(todo)` | `dbContext.Todos.Add(todo)` + `SaveChanges()` |
| `Update(id, updated)` | `Find` → alan güncelle → `SaveChanges()` |
| `Delete(id)` | `Find` → `Remove` → `SaveChanges()` |
| `ToggleComplete(id)` | `Find` → `IsCompleted` flip → `UpdatedAt` güncelle → `SaveChanges()` |

### InMemoryTodoRepository'nin Akıbeti

Silinmez. İki sebeple korunur:

1. **Fallback / Feature flag:** `appsettings.json`'da bir `"UseSqlite": true/false` anahtarıyla ortama göre geçiş yapılabilir (isteğe bağlı).
2. **Test izolasyonu:** Entegrasyon testleri EF InMemory provider kullanacak; `InMemoryTodoRepository` ise birim testi örneği olarak kalabilir.

---

## 8. Testlere Etkisi

### Mevcut Testler — `TodoApiIntegrationTests.cs`

Mevcut testler `WebApplicationFactory<Program>` kullanıyor. Üretim `Program.cs` SQLite kayıt edince testler de SQLite'a bağlanır. Bu iki sorun yaratır:

1. Testler aynı `.db` dosyasını paylaşır → testler birbirini kirletir
2. Her test çalıştırmasında dosya birikilebilir

### Çözüm: EF Core InMemory Provider ile İzolasyon

Test projesi `Microsoft.EntityFrameworkCore.InMemory` paketini ekler. `WebApplicationFactory` override ile `AppDbContext` seçenekleri test başına yeniden yapılandırılır:

```
CustomWebApplicationFactory : WebApplicationFactory<Program>
│
└── ConfigureWebHost(builder)
    └── builder.ConfigureServices(services =>
        │
        ├── Mevcut AppDbContext kaydını kaldır
        └── Yeni kayıt: UseInMemoryDatabase(Guid.NewGuid().ToString())
            (her factory instance'ı için benzersiz isim → tam izolasyon)
        )
```

Her test sınıfı `IClassFixture<CustomWebApplicationFactory>` yerine gerekirse `IClassFixture` ile paylaşabilir; ya da her test metodu için `CreateClient()` yeterlidir çünkü InMemory database instance factory'ye bağlıdır.

### Test Senaryolarına Etkisi

| Senaryo | Etkileniyor mu? | Neden |
|---------|-----------------|-------|
| `Health_Returns200` | Hayır | Repository bağımlılığı yok |
| `CreateTodo_ValidRequest` | Hayır | Mantık değişmiyor |
| `CreateTodo_EmptyTitle` | Hayır | Validation katmanı değişmiyor |
| `GetAllTodos_CreatedTodoExists` | Hayır | InMemory provider aynı LINQ davranışını verir |
| `ToggleTodo_ChangesIsCompleted` | Hayır | Mantık repository içine taşındı, sonuç aynı |

Test metotlarının içeriği değişmez; yalnızca `WebApplicationFactory` altyapısı güncellenir.

---

## 9. Riskler ve Dikkat Edilmesi Gerekenler

### 9.1 DateTime ve SQLite

**Risk:** SQLite'ın yerel `DateTime` desteği sınırlıdır. EF Core SQLite provider `DateTime` değerlerini metin (ISO 8601) olarak saklar. UTC / local karışımı yanlış sonuçlara yol açabilir.

**Çözüm:** Repository içinde `DateTime.UtcNow` kullanmaya devam edilmeli. `CreatedAt` ve `UpdatedAt` değerleri her zaman UTC olarak yazılmalı.

---

### 9.2 Guid Primary Key ve SQLite

**Risk:** SQLite'ta `Guid` değerleri TEXT olarak saklanır. Büyük veri setlerinde BLOB veya INTEGER PK'ya göre daha yavaştır.

**Etki (bu proje için):** Önemsiz. Todo uygulaması yüzlerce kayıtla çalışır; performans sorunu çıkmaz.

---

### 9.3 todos.db Dosyasının Konumu

**Risk:** `Data Source=todos.db` çalışma dizinine göredir. `dotnet run` ve publish sonrası çalışma dizinleri farklı olabilir.

**Çözüm:** `Program.cs`'te connection string içindeki yolu `Path.Combine(builder.Environment.ContentRootPath, "todos.db")` ile mutlaklaştırmak önerilir.

---

### 9.4 Eşzamanlılık (Concurrency)

**Risk:** `InMemoryTodoRepository`'de `Lock` ile korunan bölümler vardı. EF Core `DbContext` thread-safe değildir; ancak Scoped lifetime ile her HTTP isteği kendi `DbContext` instance'ını alır.

**Etki:** ASP.NET Core isteği tekli thread üzerinde çalıştığı sürece sorun yoktur. Aynı anda aynı todo'ya iki istek gelirse "last write wins" senaryosu oluşabilir. Bu öğrenme projesi için kabul edilebilir risk.

---

### 9.5 Migration Kümülasyonu

**Risk:** Geliştirme sürecinde model değişiklikleri olursa migration sayısı birikir.

**Çözüm:** Proje geliştirme aşamasındayken `InitialCreate` sonrası her şemayı değiştiren migration yerine mevcut migration'ı squash etmek veya sıfırdan başlamak kabul edilebilirdir. Üretim veritabanı henüz yok.

---

### 9.6 API Sözleşmesi Korunuyor

Tüm endpoint URL'leri, HTTP metodları, istek/yanıt gövdeleri değişmez:

| Endpoint | Öncesi | Sonrası |
|----------|--------|---------|
| `GET /api/todos` | ✓ | ✓ |
| `POST /api/todos` | ✓ | ✓ |
| `GET /api/todos/{id}` | ✓ | ✓ |
| `PUT /api/todos/{id}` | ✓ | ✓ |
| `DELETE /api/todos/{id}` | ✓ | ✓ |
| `PATCH /api/todos/{id}/toggle` | ✓ | ✓ |

Frontend mobil uygulaması bu sprint kapsamında hiçbir değişiklik gerektirmez.

---

## Özet: Değişim Haritası

```
DEĞİŞMEZ                          YENİ / GÜNCELLENIR
─────────────────────────────     ──────────────────────────────────────
TodosController.cs                Data/AppDbContext.cs          (yeni)
HealthController.cs               Repositories/EfTodoRepository.cs  (yeni)
Models/Todo.cs                    Migrations/ klasörü           (yeni)
DTOs/                             Program.cs                    (güncellenir)
ITodoRepository.cs                TodoApp.Api.csproj            (güncellenir)
InMemoryTodoRepository.cs         TodoApp.Api.Tests.csproj      (güncellenir)
Validation/                       TodoApiIntegrationTests.cs    (güncellenir)
API endpoint sözleşmesi           appsettings.json              (güncellenir)
Frontend (mobile/)                appsettings.Development.json  (yeni)
```

**Toplam yeni dosya:** 3 (AppDbContext, EfTodoRepository, Migrations)
**Toplam güncellenen dosya:** 5
**Frontend değişikliği:** Sıfır
