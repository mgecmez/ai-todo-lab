# Soft Delete — Test & Doğrulama Raporu

Tarih: 2026-03-18
Versiyon: v0.8.0
Hazırlayan: Tester Agent

## Özet

| Metrik | Değer |
|--------|-------|
| Toplam test | 27 |
| Geçen | 27 |
| Başarısız | 0 |
| Atlanan | 0 |
| Süre | ~1 sn |

`dotnet test` çıktısı: **Passed! — Failed: 0, Passed: 27, Skipped: 0**

---

## Ticket Doğrulama

### SFTDEL-001 — Data Model
- [x] `ISoftDeletable.cs` interface oluşturuldu (`Models/ISoftDeletable.cs`)
- [x] `Todo : ISoftDeletable` — `IsDeleted`, `DeletedAt` eklendi
- [x] `User : ISoftDeletable` — `IsDeleted`, `DeletedAt` eklendi
- [x] `ITodoRepository` ve `IUserRepository` imzaları değişmedi
- [x] `dotnet build` hatasız

### SFTDEL-002 — EF Core Global Query Filter + Migration
- [x] `AppDbContext.OnModelCreating` içinde `HasQueryFilter(!IsDeleted)` — `Todo` ve `User`
- [x] `IX_Todos_UserId_IsDeleted` composite index tanımlı
- [x] `IX_Users_Email_IsDeleted` composite index tanımlı
- [x] `AddSoftDeleteFields` migration oluşturuldu ve uygulandı
- [x] Mevcut kayıtlarda veri kaybı yok (`HasDefaultValue(false)`)

### SFTDEL-003 — EfTodoRepository Soft Delete
- [x] `Remove()` kaldırıldı; `IsDeleted = true`, `DeletedAt = UtcNow` set ediliyor
- [x] `SaveChanges()` yerinde
- [x] `ITodoRepository.Delete` imzası değişmedi

### SFTDEL-004 — InMemoryTodoRepository Soft Delete
- [x] `Delete()`: `_todos.Remove()` → soft delete flag
- [x] `GetAll()`: `!t.IsDeleted` filtresi eklendi
- [x] `GetById()`: `!t.IsDeleted` koşulu eklendi
- [x] EF Core davranışıyla tutarlı

### SFTDEL-005 — EfUserRepository Cascade Soft Delete
- [x] `RemoveRange()` ve `Remove()` kaldırıldı
- [x] İlişkili tüm todo'lar soft delete
- [x] User soft delete
- [x] Tek `SaveChangesAsync()` — atomik
- [x] `IUserRepository.DeleteAsync` imzası değişmedi

### SFTDEL-006 — Entegrasyon Testleri
- [x] `DeleteTodo_Returns204_AndTodoDisappearsFromList`
- [x] `DeleteTodo_ThenGetById_Returns404`
- [x] `DeleteTodo_AlreadyDeleted_Returns404`
- [x] `DeleteAccount_TodosAreAlsoSoftDeleted`
- [x] `DeleteAccount_EmailCanBeReusedForNewRegistration`
- [x] Mevcut 22 test — tümü geçiyor (regresyon yok)

---

## Acceptance Criteria Doğrulama

| Kriter | Durum |
|--------|-------|
| `DELETE /api/todos/{id}` → `204 No Content` | ✅ |
| Silinen todo `GET /api/todos`'dan kayboluyor | ✅ |
| Silinen todo `GET /api/todos/{id}` → `404` | ✅ |
| Soft-deleted todo'ya ikinci DELETE → `404` | ✅ |
| `DELETE /auth/account` → `204 No Content` | ✅ |
| Hesap silinince todo'lar da silinmiş görünüyor | ✅ |
| Silinen kullanıcıyla login → `401` | ✅ |
| Silinmiş email ile yeni kayıt → `201` (geri kullanım) | ✅ |
| `RemoveRange` / `Remove` hard delete çağrısı kalmadı | ✅ |
| `dotnet test` — tümü yeşil | ✅ |

---

## Davranış Notları

- **Email geri kullanımı:** Soft-deleted kullanıcının email adresiyle yeni kayıt açılabilir. Global query filter `GetByEmailAsync`'ı `null` döndürür, register akışı email'i müsait sayar. Bu davranış mimari belgede kasıtlı olarak belgelenmiştir.
- **Token geçersizliği:** Soft-deleted kullanıcının tokeni ile yapılan API çağrıları `401` döner; JWT middleware kullanıcıyı claim'den yüklediğinde global filter devreye girer.
- **Atomik cascade:** User + todo soft delete tek `SaveChangesAsync()` ile yapılır; kısmi silme durumu oluşmaz.
- **InMemory uyumu:** EF Core global query filter InMemory'de otomatik çalışmadığından `InMemoryTodoRepository`'ye manuel filtreler eklendi; davranış tutarlı.
