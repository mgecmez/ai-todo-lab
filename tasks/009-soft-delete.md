# Task List: 009 — Soft Delete Mekanizması (v0.8.0)

Source spec: docs/soft-delete-architecture.md
Stack: .NET 8 / ASP.NET Core · Entity Framework Core · SQLite · xUnit

---

## SFTDEL-001
**Owner:** Backend
**Title:** Data Model: ISoftDeletable Interface + Entity Güncellemeleri

### Description
`ISoftDeletable` marker interface'i oluştur. `Todo.cs` ve `User.cs` entity'lerine `IsDeleted` ve `DeletedAt` alanlarını ekle; her iki entity bu interface'i implement etsin. Bu adım sonraki tüm backend ticket'larının temelini oluşturur; interface veya entity imzaları tamamlanmadan migration veya repository değişikliklerine geçilemez.

### Adımlar
1. `backend/TodoApp.Api/Models/ISoftDeletable.cs` dosyasını oluştur:
   - `bool IsDeleted { get; set; }` property'si
   - `DateTime? DeletedAt { get; set; }` property'si
2. `backend/TodoApp.Api/Models/Todo.cs` dosyasını güncelle:
   - `ISoftDeletable` implement et
   - `public bool IsDeleted { get; set; }` ekle (varsayılan `false`)
   - `public DateTime? DeletedAt { get; set; }` ekle
3. `backend/TodoApp.Api/Models/User.cs` dosyasını güncelle:
   - `ISoftDeletable` implement et
   - `public bool IsDeleted { get; set; }` ekle (varsayılan `false`)
   - `public DateTime? DeletedAt { get; set; }` ekle
4. `dotnet build` ile derlemeyi doğrula

### Etkilenen Dosyalar
- Oluşturulacak: `backend/TodoApp.Api/Models/ISoftDeletable.cs`
- Güncellenecek: `backend/TodoApp.Api/Models/Todo.cs`
- Güncellenecek: `backend/TodoApp.Api/Models/User.cs`
- Değiştirilmeyecek: `ITodoRepository.cs`, `IUserRepository.cs`, herhangi bir controller

### Kabul Kriterleri
- [ ] `ISoftDeletable.cs` dosyası oluşturulmuş ve doğru iki property'yi içeriyor
- [ ] `Todo` entity `ISoftDeletable` implement ediyor; `IsDeleted` ve `DeletedAt` alanları mevcut
- [ ] `User` entity `ISoftDeletable` implement ediyor; `IsDeleted` ve `DeletedAt` alanları mevcut
- [ ] `dotnet build` hatasız tamamlanıyor
- [ ] `ITodoRepository` ve `IUserRepository` imzaları değişmemiş

**Tahmini Süre:** 1 saat

---

## SFTDEL-002
**Owner:** Backend
**Title:** EF Core: AppDbContext Global Query Filter + Migration

### Description
`AppDbContext.OnModelCreating` içine `Todo` ve `User` entity'leri için `HasQueryFilter(!IsDeleted)` ekle. Property konfigürasyonlarını (`IsRequired`, `HasDefaultValue`) yaz. Composite index'leri tanımla. `AddSoftDeleteFields` adında EF Core migration'ı oluştur. Bu ticket tamamlanmadan SFTDEL-003, SFTDEL-004, SFTDEL-005 çalışamaz.

### Adımlar
1. `backend/TodoApp.Api/Data/AppDbContext.cs` dosyasını güncelle:
   - `Todos` entity konfigürasyonuna ekle:
     - `entity.Property(t => t.IsDeleted).IsRequired().HasDefaultValue(false);`
     - `entity.Property(t => t.DeletedAt);`
     - `entity.HasQueryFilter(t => !t.IsDeleted);`
     - `entity.HasIndex(t => new { t.UserId, t.IsDeleted }).HasDatabaseName("IX_Todos_UserId_IsDeleted");`
   - `Users` entity konfigürasyonuna ekle:
     - `entity.Property(u => u.IsDeleted).IsRequired().HasDefaultValue(false);`
     - `entity.Property(u => u.DeletedAt);`
     - `entity.HasQueryFilter(u => !u.IsDeleted);`
     - `entity.HasIndex(u => new { u.Email, u.IsDeleted }).HasDatabaseName("IX_Users_Email_IsDeleted");`
2. Migration oluştur:
   ```
   dotnet ef migrations add AddSoftDeleteFields --project backend/TodoApp.Api
   ```
3. Migration içeriğini doğrula: `IsDeleted BIT NOT NULL DEFAULT 0` ve `DeletedAt DATETIME NULL` her iki tabloda da mevcut olmalı
4. Migration'ı uygula:
   ```
   dotnet ef database update --project backend/TodoApp.Api
   ```

### Etkilenen Dosyalar
- Güncellenecek: `backend/TodoApp.Api/Data/AppDbContext.cs`
- Oluşturulacak: `backend/TodoApp.Api/Migrations/[timestamp]_AddSoftDeleteFields.cs`
- Değiştirilmeyecek: tüm controller'lar, repository interface'leri

### Kabul Kriterleri
- [ ] `AppDbContext.OnModelCreating` içinde her iki entity için `HasQueryFilter` mevcut
- [ ] `dotnet ef migrations add AddSoftDeleteFields` başarıyla tamamlanıyor
- [ ] Migration dosyası `IsDeleted` ve `DeletedAt` sütunlarını her iki tabloya ekliyor
- [ ] `dotnet ef database update` başarılı; mevcut kayıtlarda veri kaybı yok
- [ ] Composite index tanımları (`IX_Todos_UserId_IsDeleted`, `IX_Users_Email_IsDeleted`) migration'da mevcut
- [ ] `dotnet build` hatasız tamamlanıyor

**Tahmini Süre:** 1.5 saat

---

## SFTDEL-003
**Owner:** Backend
**Title:** Repository: EfTodoRepository.Delete — Soft Delete

### Description
`EfTodoRepository.Delete()` metodunu fiziksel silme yerine soft delete uygulayacak şekilde güncelle. `ITodoRepository` interface imzası kesinlikle değişmeyecek; yalnızca metodun iç implementasyonu değişecek. Delete çağrısı sonrasında kayıt veritabanında kalmalı, ancak global query filter sayesinde `GetAll` ve `GetById` sorgularına dahil edilmemeli.

### Adımlar
1. `backend/TodoApp.Api/Repositories/EfTodoRepository.cs` dosyasını aç
2. `Delete(Guid id, string userId)` metodunu bul
3. `dbContext.Todos.Remove(todo)` çağrısını kaldır
4. Yerine şunu yaz:
   ```csharp
   todo.IsDeleted = true;
   todo.DeletedAt = DateTime.UtcNow;
   ```
5. `SaveChanges()` çağrısının yerinde kaldığını doğrula
6. `dotnet build` ile derlemeyi doğrula

### Etkilenen Dosyalar
- Güncellenecek: `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`
- Değiştirilmeyecek: `ITodoRepository.cs`, `TodosController.cs`

### Kabul Kriterleri
- [ ] `ITodoRepository.Delete` imzası değişmemiş
- [ ] `dbContext.Todos.Remove()` çağrısı kaldırılmış
- [ ] `IsDeleted = true` ve `DeletedAt = DateTime.UtcNow` atamaları yapılıyor
- [ ] `SaveChanges()` çağrısı mevcut
- [ ] `DELETE /api/todos/{id}` endpoint'i hâlâ `204 No Content` dönüyor
- [ ] Silinen todo `GET /api/todos` listesinde görünmüyor (global filter aktif)
- [ ] Silinen todo veritabanında `IsDeleted = 1` ile kayıtlı kalıyor
- [ ] `dotnet build` hatasız tamamlanıyor

**Tahmini Süre:** 1 saat

---

## SFTDEL-004
**Owner:** Backend
**Title:** Repository: InMemoryTodoRepository — Soft Delete + Filter

### Description
Test amaçlı `InMemoryTodoRepository`'nin `Delete()` metodunu soft delete uygulayacak şekilde güncelle. `GetAll()` ve `GetById()` metotlarına `!IsDeleted` filtresi ekle. Bu adım olmadan unit testler ile entegrasyon testleri arasında davranış tutarsızlığı oluşur; in-memory implementasyonda EF Core global query filter çalışmadığından filtre manuel olarak eklenmek zorunda.

### Adımlar
1. `backend/TodoApp.Api/Repositories/InMemoryTodoRepository.cs` dosyasını aç
2. `Delete()` metodunda `_todos.Remove(todo)` çağrısını kaldır; yerine şunu yaz:
   ```csharp
   todo.IsDeleted = true;
   todo.DeletedAt = DateTime.UtcNow;
   ```
3. `GetAll()` metoduna `!t.IsDeleted` filtresi ekle:
   ```csharp
   return _todos.Where(t => !t.IsDeleted).ToList();
   ```
4. `GetById()` metoduna `!t.IsDeleted` koşulu ekle:
   ```csharp
   return _todos.FirstOrDefault(t => t.Id == id && !t.IsDeleted);
   ```
5. `dotnet build` ile derlemeyi doğrula

### Etkilenen Dosyalar
- Güncellenecek: `backend/TodoApp.Api/Repositories/InMemoryTodoRepository.cs`
- Değiştirilmeyecek: `ITodoRepository.cs`, `EfTodoRepository.cs`

### Kabul Kriterleri
- [ ] `InMemoryTodoRepository.Delete()` artık fiziksel silme yapmıyor
- [ ] `Delete()` sonrasında kayıt `IsDeleted = true` olarak listede kalıyor
- [ ] `GetAll()` yalnızca `IsDeleted = false` olan kayıtları döndürüyor
- [ ] `GetById()` silinmiş kayıt için `null` döndürüyor
- [ ] `ITodoRepository` imzası değişmemiş
- [ ] `dotnet build` hatasız tamamlanıyor

**Tahmini Süre:** 1 saat

---

## SFTDEL-005
**Owner:** Backend
**Title:** Repository: EfUserRepository.DeleteAsync — Cascade Soft Delete

### Description
`EfUserRepository.DeleteAsync()` metodunu; kullanıcıya ait tüm todo'ları ve ardından kullanıcının kendisini soft delete edecek şekilde güncelle. Tüm değişiklikler tek bir `SaveChangesAsync()` çağrısıyla atomik olarak commit edilmeli; kısmi silme durumu oluşmamalı. `IUserRepository` interface imzası değişmeyecek.

### Adımlar
1. `backend/TodoApp.Api/Repositories/EfUserRepository.cs` dosyasını aç
2. `DeleteAsync(Guid userId)` metodunu bul
3. Mevcut `RemoveRange(todos)` + `Remove(user)` çağrılarını kaldır
4. Yerine şu akışı uygula:
   ```
   1. userId'ye ait tüm Todo'ları sorgula (global filter aktif; zaten silinmiş olanlar dahil edilmez)
   2. Her Todo için: IsDeleted = true, DeletedAt = DateTime.UtcNow
   3. User için: IsDeleted = true, DeletedAt = DateTime.UtcNow
   4. SaveChangesAsync() — tek transaction'da tüm değişiklikler persist edilir
   ```
5. `dotnet build` ile derlemeyi doğrula

### Etkilenen Dosyalar
- Güncellenecek: `backend/TodoApp.Api/Repositories/EfUserRepository.cs`
- Değiştirilmeyecek: `IUserRepository.cs`, `AuthController.cs` veya ilgili controller

### Kabul Kriterleri
- [ ] `IUserRepository.DeleteAsync` imzası değişmemiş
- [ ] `RemoveRange` ve `Remove` çağrıları kaldırılmış
- [ ] Kullanıcıya ait tüm todo'lar `IsDeleted = true` olarak işaretleniyor
- [ ] Kullanıcı `IsDeleted = true` olarak işaretleniyor
- [ ] Tek `SaveChangesAsync()` çağrısıyla tüm değişiklikler atomik commit ediliyor
- [ ] `DELETE /auth/account` sonrasında kullanıcı ile `POST /auth/login` isteği `401` dönüyor
- [ ] `dotnet build` hatasız tamamlanıyor

**Tahmini Süre:** 1 saat

---

## SFTDEL-006
**Owner:** Tester
**Title:** Test: Entegrasyon Testleri Güncellemesi ve Yeni Soft Delete Senaryoları

### Description
Mevcut `DELETE` senaryolarındaki test assertion'larını soft delete davranışına göre güncelle. Yeni senaryolar ekle: silinmiş todo'ya erişim 404 dönmeli, silinmiş kullanıcı ile login 401 dönmeli, `deleteAccount` sonrasında kullanıcı ve todo'ları listede görünmemeli. xUnit + WebApplicationFactory tabanlı mevcut test altyapısı kullanılacak; EF Core InMemory provider global query filter'ları desteklediğinden ek konfigürasyon gerekmez.

### Adımlar
1. `backend/TodoApp.Api.Tests/` klasöründeki mevcut delete test'lerini bul
2. Fiziksel silme varsayımıyla yazılmış assertion'ları güncelle:
   - `DELETE /api/todos/{id}` hâlâ `204 No Content` dönmeli (değişmez)
   - `GET /api/todos` sonrası silinen item artık listede görünmemeli (davranış aynı; ama artık soft delete ile sağlanıyor)
3. Yeni test senaryoları ekle:
   - Silinmiş todo'ya `GET /api/todos/{id}` → `404 Not Found`
   - `DELETE /auth/account` sonrasında `POST /auth/login` aynı kullanıcı ile → `401 Unauthorized`
   - `DELETE /auth/account` sonrasında `GET /api/todos` → todo listesi boş (veya ilgili todo'lar görünmüyor)
   - Silinmiş kullanıcının e-posta adresiyle `POST /auth/register` → `200` veya `201` (e-posta geri kullanımı izin veriliyor; bu davranış kasıtlı)
4. Tüm testleri çalıştır:
   ```
   dotnet test backend/TodoApp.Api.Tests
   ```
5. Test sonuçlarını belge olarak kaydet

### Etkilenen Dosyalar
- Güncellenecek: `backend/TodoApp.Api.Tests/` altındaki ilgili test dosyaları
- Değiştirilmeyecek: uygulama kaynak kodundaki herhangi bir dosya

### Kabul Kriterleri
- [ ] `DELETE /api/todos/{id}` → `204 No Content` testi geçiyor
- [ ] Silinen todo `GET /api/todos` listesinde görünmüyor (test geçiyor)
- [ ] Silinmiş todo `GET /api/todos/{id}` → `404` testi geçiyor
- [ ] `deleteAccount` sonrası aynı kullanıcıyla `login` → `401` testi geçiyor
- [ ] `deleteAccount` sonrası todo listesi görünmüyor testi geçiyor
- [ ] Silinmiş e-posta ile yeni kayıt senaryosu test edilmiş ve sonuç belgelenmiş
- [ ] `dotnet test` tüm testleri yeşil tamamlıyor
- [ ] Test coverage raporu veya özeti `docs/` klasörüne eklenmiş

**Tahmini Süre:** 2 saat

---

## Özet Tablosu

| Ticket     | Owner   | Başlık                                                        | Tahmini Süre | Bağımlılık                          |
|------------|---------|---------------------------------------------------------------|--------------|-------------------------------------|
| SFTDEL-001 | Backend | Data Model: ISoftDeletable Interface + Entity Güncellemeleri  | 1 saat       | —                                   |
| SFTDEL-002 | Backend | EF Core: AppDbContext Global Query Filter + Migration          | 1.5 saat     | SFTDEL-001                          |
| SFTDEL-003 | Backend | Repository: EfTodoRepository.Delete — Soft Delete             | 1 saat       | SFTDEL-002                          |
| SFTDEL-004 | Backend | Repository: InMemoryTodoRepository — Soft Delete + Filter     | 1 saat       | SFTDEL-002                          |
| SFTDEL-005 | Backend | Repository: EfUserRepository.DeleteAsync — Cascade Soft Delete| 1 saat       | SFTDEL-002                          |
| SFTDEL-006 | Tester  | Test: Entegrasyon Testleri Güncellemesi ve Yeni Senaryolar     | 2 saat       | SFTDEL-003, SFTDEL-004, SFTDEL-005 |

**Toplam Tahmini Süre:** 7.5 saat

## Bağımlılık Sırası

```
SFTDEL-001 → SFTDEL-002 → SFTDEL-003 ──┐
                        → SFTDEL-004 ──┼──→ SFTDEL-006
                        → SFTDEL-005 ──┘
```
