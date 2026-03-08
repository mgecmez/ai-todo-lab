# Sprint 004 — Persistence Layer: SQLite + EF Core

**Kaynak:** `docs/persistence-architecture.md`
**Hedef:** In-memory repository'yi SQLite + EF Core tabanlı kalıcı yapıya geçirmek.
**Kural:** Mevcut API sözleşmesi bozulmaz. Frontend değişikliği gerekmez. Sprint sonunda tüm testler geçer.

---

## Ticket Listesi

| Ticket | Başlık | Owner | Durum |
|--------|--------|-------|-------|
| PERSIST-001 | EF Core NuGet paketleri — API projesi | Backend Dev | Bekliyor |
| PERSIST-002 | AppDbContext oluştur | Backend Dev | Bekliyor |
| PERSIST-003 | SQLite connection string ve appsettings | Backend Dev | Bekliyor |
| PERSIST-004 | EfTodoRepository oluştur | Backend Dev | Bekliyor |
| PERSIST-005 | DI geçişi — InMemory'den EF'e | Backend Dev | Bekliyor |
| PERSIST-006 | InitialCreate migration oluştur | Backend Dev | Bekliyor |
| PERSIST-007 | Test projesi güncelle — izole InMemory DB | Tester | Bekliyor |
| PERSIST-008 | Uçtan uca doğrulama | Tester | Bekliyor |

---

## PERSIST-001 — EF Core NuGet Paketleri (API Projesi)

**Owner:** Backend Developer
**Amaç:** `TodoApp.Api` projesine EF Core SQLite provider ve EF Core Tools paketlerini eklemek. Kod yazmadan önce derleme altyapısını hazırlamak.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/TodoApp.Api.csproj`

**Eklenecek paketler:**
- `Microsoft.EntityFrameworkCore.Sqlite` — SQLite provider
- `Microsoft.EntityFrameworkCore.Design` — `dotnet ef` CLI desteği (migration oluşturma)

**Kabul kriterleri:**
- [ ] İki paket `.csproj` dosyasına `<PackageReference>` olarak eklenmiş
- [ ] `dotnet build backend/TodoApp.Api` hatasız tamamlanıyor
- [ ] `dotnet ef` komutu `backend/TodoApp.Api` dizininde çalışıyor (EF tooling erişilebilir)
- [ ] Mevcut çalışan API (`dotnet run`) bozulmuyor

**Bağımlılıklar:** Yok (ilk adım)

---

## PERSIST-002 — AppDbContext Oluştur

**Owner:** Backend Developer
**Amaç:** EF Core'un veritabanıyla konuştuğu merkezi bağlam sınıfını oluşturmak. `Todo` entity'sini tablo olarak tanımlamak ve kolon kısıtlarını yapılandırmak.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Data/AppDbContext.cs` ← yeni dosya, yeni klasör

**Yapılacaklar:**
- `Data/` klasörü oluştur
- `AppDbContext : DbContext` sınıfı yaz
- `DbContextOptions<AppDbContext>` alan constructor ekle
- `DbSet<Todo> Todos` özelliği tanımla
- `OnModelCreating` içinde entity konfigürasyonu:
  - `HasKey(t => t.Id)` — Primary Key (explicit)
  - `Title`: `HasMaxLength(200)`, `IsRequired()`
  - `Description`: `HasMaxLength(1000)` (nullable, ek işaret gerekmez)
  - `CreatedAt`, `UpdatedAt`: `IsRequired()`

**Kabul kriterleri:**
- [ ] `Data/AppDbContext.cs` dosyası oluşturulmuş
- [ ] `DbSet<Todo> Todos` tanımlı
- [ ] `OnModelCreating` içinde tüm kısıtlar yazılmış
- [ ] `dotnet build backend/TodoApp.Api` hatasız geçiyor
- [ ] `Models/Todo.cs` dosyasına hiç dokunulmamış

**Bağımlılıklar:** PERSIST-001

---

## PERSIST-003 — SQLite Connection String ve appsettings

**Owner:** Backend Developer
**Amaç:** Veritabanı dosya yolunu yapılandırma dosyasında tanımlamak. Dosya yolunu uygulama kök dizinine sabitlemek.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/appsettings.json` ← güncellenir
- `backend/TodoApp.Api/appsettings.Development.json` ← yeni dosya

**Yapılacaklar:**
- `appsettings.json`'a `ConnectionStrings` bölümü ekle:
  ```
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=todos.db"
  }
  ```
- `appsettings.Development.json` oluştur; geliştirme ortamında da aynı connection string tanımla (ortam farklılıklarına hazırlık)
- Dosya yolu mutlaklaştırması notu: `Program.cs`'te (PERSIST-005'te) connection string `Path.Combine(ContentRootPath, "todos.db")` ile mutlak yola çevrilecek

**Kabul kriterleri:**
- [ ] `appsettings.json` içinde `ConnectionStrings:DefaultConnection` anahtarı mevcut
- [ ] `appsettings.Development.json` dosyası oluşturulmuş ve aynı anahtarı içeriyor
- [ ] `dotnet build` hatasız geçiyor (bu adımda runtime kontrolü henüz yapılmıyor)
- [ ] Connection string içinde `todos.db` dosya adı kullanılmış

**Bağımlılıklar:** PERSIST-001

---

## PERSIST-004 — EfTodoRepository Oluştur

**Owner:** Backend Developer
**Amaç:** `ITodoRepository` interface'ini EF Core + SQLite üzerinde implemente etmek. Mevcut `InMemoryTodoRepository`'nin tüm davranışlarını korumak, lock mekanizması yerine EF Core'un transaction yönetimini kullanmak.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs` ← yeni dosya

**Yapılacaklar:**
- `EfTodoRepository : ITodoRepository` sınıfı oluştur
- Constructor'a `AppDbContext` enjekte et
- Her metodu uygula:

| Metot | Davranış |
|-------|---------|
| `GetAll()` | `Todos.OrderByDescending(t => t.CreatedAt).ToList()` döndür |
| `GetById(id)` | `Todos.Find(id)` veya `FirstOrDefault`; null ise `null` döndür |
| `Add(todo)` | `Id = Guid.NewGuid()`, `CreatedAt = UpdatedAt = DateTime.UtcNow`, `IsCompleted = false` ata; `Todos.Add(todo)`; `SaveChanges()`; todo döndür |
| `Update(id, updated)` | `Find(id)` → null ise `null` döndür; `Title`, `Description`, `IsCompleted`, `UpdatedAt = DateTime.UtcNow` güncelle; `SaveChanges()`; entity döndür |
| `Delete(id)` | `Find(id)` → null ise `false` döndür; `Todos.Remove(todo)`; `SaveChanges()`; `true` döndür |
| `ToggleComplete(id)` | `Find(id)` → null ise `null` döndür; `IsCompleted = !IsCompleted`, `UpdatedAt = DateTime.UtcNow`; `SaveChanges()`; entity döndür |

- Tüm `DateTime` değerleri `DateTime.UtcNow` kullanılarak atanmalı (SQLite'ta UTC tutarlılığı için)
- `lock` bloğu kullanılmaz (Scoped lifetime ile her istek izole)

**Kabul kriterleri:**
- [ ] `EfTodoRepository.cs` oluşturulmuş
- [ ] `ITodoRepository`'deki 6 metodun tamamı implement edilmiş
- [ ] `Add` metodunda `Id`, `CreatedAt`, `UpdatedAt`, `IsCompleted` doğru atanıyor
- [ ] `Update` ve `ToggleComplete` metodlarında `UpdatedAt` güncelleniyor
- [ ] `DateTime.UtcNow` kullanılıyor (lokal saat değil)
- [ ] `dotnet build backend/TodoApp.Api` hatasız geçiyor
- [ ] `ITodoRepository.cs` ve `InMemoryTodoRepository.cs` dosyalarına hiç dokunulmamış

**Bağımlılıklar:** PERSIST-002, PERSIST-003

---

## PERSIST-005 — DI Geçişi: InMemory'den EF'e

**Owner:** Backend Developer
**Amaç:** `Program.cs`'te DI container kaydını güncellemek. `InMemoryTodoRepository`'yi devre dışı bırakıp `EfTodoRepository`'yi aktif etmek. Startup sırasında migration'ı otomatik uygulamak.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Program.cs`

**Yapılacaklar:**
1. `AppDbContext` kaydını ekle:
   - Connection string `appsettings.json`'dan oku
   - Dosya yolunu `Path.Combine(builder.Environment.ContentRootPath, "todos.db")` ile mutlaklaştır
   - `options.UseSqlite(connectionString)` ile kaydet
2. DI kaydını değiştir:
   - Mevcut: `AddSingleton<ITodoRepository, InMemoryTodoRepository>()`
   - Yeni: `AddScoped<ITodoRepository, EfTodoRepository>()`
3. Otomatik migration ekle (`app.Run()` öncesinde):
   - Scope aç
   - `AppDbContext` al
   - `context.Database.Migrate()` çağır
   - Scope kapat

**Kabul kriterleri:**
- [ ] `AppDbContext` DI'ya kayıtlı (`AddDbContext`)
- [ ] `ITodoRepository` → `EfTodoRepository` olarak `AddScoped` ile kayıtlı
- [ ] `InMemoryTodoRepository` DI kaydı kaldırılmış (dosya silinmemiş)
- [ ] `context.Database.Migrate()` çağrısı `app.Run()` öncesinde mevcut
- [ ] `dotnet run` ile uygulama başladığında `todos.db` dosyası proje dizininde oluşuyor
- [ ] `GET /api/todos` isteği `200 OK` döndürüyor (boş liste `[]`)
- [ ] `POST /api/todos` ile oluşturulan todo, uygulama yeniden başlatıldıktan sonra `GET /api/todos`'ta hâlâ görünüyor (kalıcılık doğrulandı)
- [ ] `TodosController.cs`'e hiç dokunulmamış

**Bağımlılıklar:** PERSIST-002, PERSIST-003, PERSIST-004

---

## PERSIST-006 — InitialCreate Migration Oluştur

**Owner:** Backend Developer
**Amaç:** EF Core tooling ile ilk migration dosyalarını üretmek. `Todos` tablosunun şemasını kod tabanlı olarak kayıt altına almak. `todos.db`'nin sağlıklı oluştuğunu doğrulamak.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Migrations/` ← yeni klasör (araç tarafından oluşturulur)
  - `<tarih>_InitialCreate.cs`
  - `<tarih>_InitialCreate.Designer.cs`
  - `AppDbContextModelSnapshot.cs`

**Yapılacaklar:**
1. Migration oluştur:
   ```
   cd backend/TodoApp.Api
   dotnet ef migrations add InitialCreate
   ```
2. Üretilen migration dosyasını incele — `Todos` tablosu ve tüm sütunlar doğru görünmeli
3. Manuel migration uygula (isteğe bağlı, otomatik migration zaten `Program.cs`'te var):
   ```
   dotnet ef database update
   ```
4. Oluşan `todos.db` dosyasının kaynak kontrolüne alınmayacağını not et (`.gitignore`'a ekle)

**Kabul kriterleri:**
- [ ] `Migrations/` klasörü oluşturulmuş ve 3 dosya içeriyor
- [ ] Migration içinde `Todos` tablosu tanımlı; tüm alanlar (`Id`, `Title`, `Description`, `IsCompleted`, `CreatedAt`, `UpdatedAt`) mevcut
- [ ] `Title` için `maxLength: 200` kısıtı migration'da görünüyor
- [ ] `dotnet ef database update` komutu hatasız tamamlanıyor
- [ ] `todos.db` dosyası oluşuyor
- [ ] `todos.db` `.gitignore`'a eklenmiş (veya eklenmesi için not bırakılmış)
- [ ] `dotnet build` hatasız geçiyor

**Bağımlılıklar:** PERSIST-005

---

## PERSIST-007 — Test Projesi Güncelle: İzole InMemory Database

**Owner:** Tester / QA
**Amaç:** Entegrasyon testlerini SQLite'a bağımlı olmaktan kurtarmak. Her test çalıştırmasında izole, temiz bir EF Core InMemory database ile çalışmasını sağlamak.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api.Tests/TodoApp.Api.Tests.csproj`
- `backend/TodoApp.Api.Tests/TodoApiIntegrationTests.cs`

**Yapılacaklar:**

**`.csproj` güncellemesi:**
- `Microsoft.EntityFrameworkCore.InMemory` paketini ekle

**`TodoApiIntegrationTests.cs` güncellemesi:**
- `CustomWebApplicationFactory : WebApplicationFactory<Program>` sınıfı oluştur
- `ConfigureWebHost` override içinde:
  1. Mevcut `AppDbContext` DI kaydını kaldır (`services.Remove(...)`)
  2. `UseInMemoryDatabase(Guid.NewGuid().ToString())` ile yeni kayıt ekle (her factory instance'ı benzersiz DB ismi alır → tam izolasyon)
- `TodoApiIntegrationTests` sınıfında `IClassFixture<WebApplicationFactory<Program>>` yerine `IClassFixture<CustomWebApplicationFactory>` kullan
- Test metotlarının içeriği (`Assert` satırları) değişmez

**Kabul kriterleri:**
- [ ] `Microsoft.EntityFrameworkCore.InMemory` paketi test `.csproj`'a eklenmiş
- [ ] `CustomWebApplicationFactory` sınıfı oluşturulmuş
- [ ] `ConfigureWebHost` içinde `AppDbContext` override mevcut; `UseInMemoryDatabase` ile kayıtlı
- [ ] Her test metodu kendi izole veritabanında çalışıyor (testler birbirini etkilemiyor)
- [ ] 5 mevcut test senaryosunun tamamı geçiyor
- [ ] `dotnet test backend/TodoApp.Api.Tests` çıktısında `5 passed` görünüyor
- [ ] Test çalıştırmaları arasında `todos.db` dosyasına bağımlılık yok

**Bağımlılıklar:** PERSIST-005, PERSIST-006

---

## PERSIST-008 — Uçtan Uca Doğrulama

**Owner:** Tester / QA
**Amaç:** Tüm katmanların birlikte doğru çalıştığını doğrulamak. Kalıcılığı elle test etmek. Sprint kapanış kriteri.

**Dokunulacak dosyalar:**
- Yok (sadece test ve gözlem)

**Manuel test senaryoları:**

1. **Kalıcılık testi:**
   - `dotnet run` ile API başlat
   - `POST /api/todos` ile bir todo oluştur
   - API'yi durdur (`Ctrl+C`)
   - `dotnet run` ile API'yi yeniden başlat
   - `GET /api/todos` — önceki todo listede görünmeli

2. **CRUD tam döngü:**
   - Create → GET ile doğrula
   - Update (PUT) → GET ile doğrula
   - Toggle (PATCH) → `isCompleted: true` döndürmeli
   - Delete → `204 No Content`; ardından GET'te kaybolmalı

3. **Boş başlatma:**
   - `todos.db` dosyasını sil
   - `dotnet run` → uygulama migration'ı otomatik uygulayarak `todos.db`'yi yeniden oluşturmalı
   - `GET /api/todos` → `200 OK`, `[]`

4. **Test paketi son çalıştırma:**
   - `dotnet test backend/TodoApp.Api.Tests`
   - `5 passed` bekleniyor

**Otomatik kabul kriterleri:**
- [ ] `dotnet test backend/TodoApp.Api.Tests` → `5 passed, 0 failed`
- [ ] `dotnet build` (solution genelinde) hatasız tamamlanıyor

**Manuel kabul kriterleri:**
- [ ] Uygulama yeniden başlatma sonrası veriler korunuyor (kalıcılık)
- [ ] Tüm 6 CRUD endpoint çalışıyor (`GET`, `POST`, `GET by id`, `PUT`, `DELETE`, `PATCH toggle`)
- [ ] `todos.db` silinip uygulama başlatılınca migration otomatik uygulanıyor
- [ ] `TodosController.cs`, `ITodoRepository.cs`, `Models/Todo.cs`, `DTOs/` değişmemiş
- [ ] Frontend (mobile) herhangi bir değişiklik gerektirmiyor

**Bağımlılıklar:** PERSIST-001 → PERSIST-007 (tüm ticket'lar tamamlanmış olmalı)

---

## Bağımlılık Grafiği

```
PERSIST-001 (Paketler)
    │
    ├─── PERSIST-002 (AppDbContext)
    │         │
    │         └─── PERSIST-004 (EfTodoRepository)
    │                   │
    └─── PERSIST-003 ───┤
         (Config)       │
                        └─── PERSIST-005 (DI Geçişi)
                                  │
                                  └─── PERSIST-006 (Migration)
                                            │
                                            └─── PERSIST-007 (Test Güncelle)
                                                      │
                                                      └─── PERSIST-008 (Doğrulama)
```

## Değişmeyecek Dosyalar (Garanti)

Aşağıdaki dosyalara bu sprint boyunca hiç dokunulmaz:

| Dosya | Neden |
|-------|-------|
| `Controllers/TodosController.cs` | `ITodoRepository` interface'i üzerinden çalışır; implementasyon değişmesi onu etkilemez |
| `Controllers/HealthController.cs` | Repository bağımlılığı yok |
| `Models/Todo.cs` | Entity alanları EF Core için zaten uygun |
| `DTOs/CreateTodoRequest.cs` | Değişmez |
| `DTOs/UpdateTodoRequest.cs` | Değişmez |
| `Repositories/ITodoRepository.cs` | Sözleşme korunur |
| `Repositories/InMemoryTodoRepository.cs` | Silinmez; test referansı ve fallback olarak kalır |
| `Validation/NotWhitespaceAttribute.cs` | Değişmez |
| `mobile/` (tüm frontend) | Frontend değişikliği gerektirmez |
