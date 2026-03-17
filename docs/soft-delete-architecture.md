# Soft Delete — Architecture

## Overview

Bu belge, `Todo` ve `User` entity'lerine soft delete mekanizması eklenmesi için mimari kararları tanımlar.

Mevcut sistemde silme işlemleri hard delete olarak gerçekleşmektedir:
- `EfTodoRepository.Delete()` → `dbContext.Todos.Remove(todo)` + `SaveChanges()`
- `EfUserRepository.DeleteAsync()` → `RemoveRange(todos)` + `Remove(user)` + `SaveChangesAsync()`

Soft delete sonrasında kayıtlar fiziksel olarak silinmeyecek; `IsDeleted = true` ve `DeletedAt = UTC now` atanacaktır. EF Core global query filter aracılığıyla silinen kayıtlar tüm sorgulardan otomatik olarak dışlanacaktır.

### Motivasyon

- Veri kurtarma imkanı (audit trail)
- İlişkisel bütünlük korunur (foreign key referansları bozulmaz)
- Gelecekte "çöp kutusu" (undo delete) özelliğine zemin hazırlanır
- GDPR uyumlu silme akışlarında geçiş süresi tanımlanabilir

---

## Data Model Changes

### Todo Entity

Mevcut `Todo.cs` dosyasına iki alan eklenir:

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|-----------|----------|
| `IsDeleted` | `bool` | evet | `false` | Soft delete bayrağı |
| `DeletedAt` | `DateTime?` | hayır | `null` | Silme zamanı (UTC) |

```csharp
public bool IsDeleted { get; set; }
public DateTime? DeletedAt { get; set; }
```

### User Entity

Mevcut `User.cs` dosyasına aynı iki alan eklenir:

| Alan | Tür | Zorunlu | Varsayılan | Açıklama |
|------|-----|---------|-----------|----------|
| `IsDeleted` | `bool` | evet | `false` | Soft delete bayrağı |
| `DeletedAt` | `DateTime?` | hayır | `null` | Silme zamanı (UTC) |

```csharp
public bool IsDeleted { get; set; }
public DateTime? DeletedAt { get; set; }
```

### ISoftDeletable Interface (Opsiyonel Soyutlama)

Her iki entity'nin ortak alanlarını tanımlamak için bir marker interface önerilir. Bu sayede global filter tek bir yerden yönetilir:

```csharp
// Models/ISoftDeletable.cs
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
}
```

`Todo` ve `User` bu interface'i implement eder. Bu, `OnModelCreating` içinde generic bir filter tanımına olanak tanır.

---

## EF Core Global Query Filter

### AppDbContext Değişiklikleri

`OnModelCreating` metodu içine her iki entity için `HasQueryFilter` çağrıları eklenir:

```csharp
// Todo entity konfigürasyonu içine eklenir
entity.HasQueryFilter(t => !t.IsDeleted);

// User entity konfigürasyonu içine eklenir
entity.HasQueryFilter(u => !u.IsDeleted);
```

Bu filtrelerin etkisi:
- `dbContext.Todos.Where(...)` → Otomatik olarak `AND IsDeleted = 0` koşulu eklenir
- `dbContext.Users.FindAsync(id)` → Soft-deleted user için `null` döner
- `dbContext.Users.FirstOrDefaultAsync(u => u.Email == email)` → Silinmiş kullanıcıya erişim engellenir

### IgnoreQueryFilters Kullanımı

Soft-deleted kayıtlara erişim gerektiğinde (örn. admin araçları, migration script'leri) `IgnoreQueryFilters()` kullanılır:

```csharp
dbContext.Todos.IgnoreQueryFilters().Where(t => t.UserId == userId)
```

Mevcut uygulama akışında bu kullanıma gerek yoktur; ilerleyen versiyonlar için not olarak bırakılmıştır.

### Kritik Etki: EfUserRepository.GetByEmailAsync

Mevcut `LoginAsync` akışında, soft-deleted bir kullanıcı e-posta ile sorgulandığında global filter devreye gireceğinden `null` dönecektir. Bu davranış kasıtlıdır: silinmiş hesap ile giriş yapılmamalıdır.

---

## Repository Layer Changes

### ITodoRepository — Delete Metodu (İmza Değişmez)

`bool Delete(Guid id, string userId)` imzası değişmez. Davranış değişir:

- **Önce:** `dbContext.Todos.Remove(todo)` ile fiziksel silme
- **Sonra:** `todo.IsDeleted = true; todo.DeletedAt = DateTime.UtcNow;` + `SaveChanges()`

`ITodoRepository` interface imzası değişmediğinden bu bir breaking change değildir.

### IUserRepository — DeleteAsync Metodu (İmza Değişmez)

`Task DeleteAsync(Guid userId)` imzası değişmez. Davranış değişir:

- **Önce:** `RemoveRange(todos)` + `Remove(user)` ile fiziksel silme
- **Sonra:** Tüm ilişkili todo'lar için soft delete, ardından kullanıcı için soft delete

`EfUserRepository.DeleteAsync()` içindeki akış:

```
1. userId'ye ait tüm Todo'ları sorgula (global filter aktif; zaten silinmiş olanlar dahil edilmez)
2. Her Todo için: IsDeleted = true, DeletedAt = DateTime.UtcNow
3. User için: IsDeleted = true, DeletedAt = DateTime.UtcNow
4. SaveChangesAsync() — tek transaction'da tüm değişiklikler persist edilir
```

Bu yaklaşım, mevcut hard delete implementasyonundaki `RemoveRange` + `Remove` çiftinin yerini alır.

### InMemoryTodoRepository — Delete Metodu

Test amaçlı `InMemoryTodoRepository` da güncellenir. Fiziksel liste silmesi (`_todos.Remove(todo)`) yerine:

```csharp
todo.IsDeleted = true;
todo.DeletedAt = DateTime.UtcNow;
```

Ancak `GetAll` ve `GetById` metotlarının da `!t.IsDeleted` filtresi ile çalışması gerekir; çünkü in-memory implementasyonda global query filter yoktur. Bu, interface davranış tutarlılığı için zorunludur.

---

## Migration Strategy

### Migration Sırası

1. `AddSoftDeleteFields` adında yeni bir EF Core migration oluşturulur.
2. Migration, `Todos` ve `Users` tablolarına iki sütun ekler:
   - `IsDeleted BIT NOT NULL DEFAULT 0`
   - `DeletedAt DATETIME NULL`
3. Mevcut kayıtların `IsDeleted = 0` alması `HasDefaultValue(false)` ile sağlanır; veri kaybı yoktur.

### AppDbContext Konfigürasyonu

```csharp
// Todo entity
entity.Property(t => t.IsDeleted)
      .IsRequired()
      .HasDefaultValue(false);

entity.Property(t => t.DeletedAt);

entity.HasQueryFilter(t => !t.IsDeleted);

// User entity
entity.Property(u => u.IsDeleted)
      .IsRequired()
      .HasDefaultValue(false);

entity.Property(u => u.DeletedAt);

entity.HasQueryFilter(u => !u.IsDeleted);
```

### Index Önerisi

Soft delete sonrasında `IsDeleted` üzerinde composite index oluşturulması sorgu performansını korur:

```csharp
// Todos tablosu için
entity.HasIndex(t => new { t.UserId, t.IsDeleted })
      .HasDatabaseName("IX_Todos_UserId_IsDeleted");

// Users tablosu için
entity.HasIndex(u => new { u.Email, u.IsDeleted })
      .HasDatabaseName("IX_Users_Email_IsDeleted");
```

---

## Test Considerations

### Etkilenen Test Senaryoları

| Senaryo | Beklenen Değişiklik |
|---------|-------------------|
| `DELETE /api/todos/{id}` → 204 | Fiziksel silme yerine soft delete; veritabanında kayıt kalır |
| `GET /api/todos` sonrası delete | Silinen todo listede görünmez |
| `GET /api/todos/{id}` silinmiş todo | 404 döner (global filter `null` döndürür) |
| `DELETE /auth/account` | User + todos soft delete; yeni login `401` döner |
| `POST /auth/login` silinmiş kullanıcı | `null` döner → `401 Unauthorized` |
| `POST /auth/register` silinmiş e-posta ile | Silinmiş kullanıcının e-postası tekrar kullanılabilir mi? |

### E-posta Geri Kullanımı Kararı

Silinmiş bir kullanıcının e-posta adresiyle yeni kayıt yapılmak istenirse global filter devreye gireceğinden `GetByEmailAsync` `null` döner ve kayıt başarılı olur. Bu davranış kasıtlıdır ve kabul edilebilir (silme = iptal). Eğer e-posta kilitleme gereksinimi doğarsa `IgnoreQueryFilters` ile kontrol yapan ayrı bir servis metodu tanımlanmalıdır; bu karar ilerleyen versiyona bırakılmıştır.

### InMemoryTodoRepository Test Uyumu

Unit testlerde kullanılan `InMemoryTodoRepository.GetAll()` ve `GetById()` metotlarına `!t.IsDeleted` koşulu eklenmezse entegrasyon testleri ile unit testler arasında davranış tutarsızlığı oluşur. Bu, SFTDEL-004 kapsamında ele alınmalıdır.

### WebApplicationFactory Testleri

EF Core InMemory provider global query filter'ları destekler. Mevcut `WebApplicationFactory` tabanlı entegrasyon testleri, `HasQueryFilter` eklendiğinde otomatik olarak filtrelenmiş sorgular kullanacaktır. Ek konfigürasyon gerekmez.

---

## Ticket Breakdown

### SFTDEL-001 — Data Model: ISoftDeletable Interface + Entity Güncellemeleri
- **Sahip:** Backend Developer
- **Açıklama:** `ISoftDeletable` interface'i oluştur. `Todo.cs` ve `User.cs`'e `IsDeleted` ve `DeletedAt` alanlarını ekle.
- **Çıktı:** Derlenebilir model değişiklikleri

### SFTDEL-002 — EF Core: AppDbContext Global Query Filter + Migration
- **Sahip:** Backend Developer
- **Açıklama:** `AppDbContext.OnModelCreating` içine `HasQueryFilter(!IsDeleted)` ekle; property konfigürasyonlarını yaz; `AddSoftDeleteFields` migration'ını oluştur; composite index'leri ekle.
- **Çıktı:** `dotnet ef migrations add AddSoftDeleteFields` başarılı; schema güncel

### SFTDEL-003 — Repository: EfTodoRepository.Delete — Soft Delete
- **Sahip:** Backend Developer
- **Açıklama:** `EfTodoRepository.Delete()` metodunu fiziksel silme yerine `IsDeleted = true`, `DeletedAt = DateTime.UtcNow` set edecek şekilde güncelle.
- **Not:** `ITodoRepository` imzası değişmez.
- **Çıktı:** Delete sonrası kayıt veritabanında kalır, GetAll/GetById'de görünmez

### SFTDEL-004 — Repository: InMemoryTodoRepository — Soft Delete + Filter
- **Sahip:** Backend Developer
- **Açıklama:** `InMemoryTodoRepository.Delete()` soft delete uygulasın; `GetAll()` ve `GetById()` metodlarına `!IsDeleted` filtresi ekle.
- **Çıktı:** Unit test davranışı EF Core implementasyonu ile tutarlı

### SFTDEL-005 — Repository: EfUserRepository.DeleteAsync — Cascade Soft Delete
- **Sahip:** Backend Developer
- **Açıklama:** `EfUserRepository.DeleteAsync()` metodunu; ilişkili Todo'ları soft delete edecek, ardından User'ı soft delete edecek şekilde güncelle. Tek `SaveChangesAsync()` çağrısı ile atomik işlem.
- **Not:** `IUserRepository` imzası değişmez.
- **Çıktı:** deleteAccount sonrası user + todos silinmiş görünür; login `401` döner

### SFTDEL-006 — Test: Entegrasyon Testleri Güncellemesi
- **Sahip:** Tester / Backend Developer
- **Açıklama:** Mevcut delete senaryoları için test assertion'larını güncelle. Yeni senaryolar ekle: silinmiş todo'ya erişim 404, silinmiş kullanıcı ile login 401, deleteAccount sonrası user + todos görünmez.
- **Çıktı:** Tüm testler yeşil; soft delete coverage belgesi

---

## Kararlar ve Kısıtlamalar

| Karar | Gerekçe |
|-------|---------|
| `ITodoRepository` ve `IUserRepository` imzaları değişmez | Architect onayı olmadan interface değişikliği yapılamaz (CLAUDE.md) |
| Soft delete işlemi Service katmanında değil Repository katmanında yapılır | Tutarlılık: Delete davranışı veri erişim katmanının sorumluluğundadır |
| Tek `SaveChangesAsync()` ile atomik cascade soft delete | Kısmi silme durumunun önlenmesi |
| E-posta geri kullanımı varsayılan olarak izin verilir | Global filter yeterli; ek kontrol sonraki versiyona bırakıldı |
| `ISoftDeletable` interface opsiyonel; zorunlu değil | Generic filter soyutlaması için yararlı ancak entegrasyon için blocker değil |
