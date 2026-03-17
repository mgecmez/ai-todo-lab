# Feature: Backend Service Layer (ITodoService / TodoService)

Versiyon: 1.0
Tarih: 2026-03-12
Hazırlayan: Product Manager Agent
Durum: Taslak

---

## Problem Tanımı

Mevcut mimaride `TodosController`, `ITodoRepository`'ye doğrudan bağımlıdır. Bu yaklaşım iki temel soruna yol açmaktadır:

### 1. İş Mantığı Repository'de Sıkışmış Durumda

`EfTodoRepository.Add()` metodu saf bir veri erişim işlemi yapması gerekirken şu anda iş kararları da vermektedir:

- `todo.Id = Guid.NewGuid()` — kimlik üretimi bir iş kuralıdır, veritabanı detayı değil
- `todo.CreatedAt = DateTime.UtcNow` / `todo.UpdatedAt = DateTime.UtcNow` — zaman damgası atama kararı
- `todo.IsCompleted = false` — varsayılan durum ataması
- `todo.IsPinned = false` — varsayılan durum ataması

`ToggleComplete()` ve `TogglePin()` içindeki `UpdatedAt = DateTime.UtcNow` ataması da aynı sorunun devamıdır.

### 2. Controller DTO'dan Entity'ye Dönüşüm Yapıyor

`TodosController.Create()` ve `TodosController.Update()` metotları, gelen `CreateTodoRequest` / `UpdateTodoRequest` DTO'larından `Todo` entity'si inşa etmektedir. Bu inşa süreci bir iş kararıdır; controller'ın sorumluluğu yalnızca HTTP isteklerini karşılamak ve yanıt döndürmek olmalıdır.

---

## Hedefler

| # | Hedef |
|---|-------|
| G-1 | `ITodoService` arayüzü ve `TodoService` sınıfı oluşturulur |
| G-2 | Tüm iş mantığı (ID üretimi, zaman damgası atama, varsayılan değer atama, toggle mantığı) `TodoService`'e taşınır |
| G-3 | `ITodoRepository` implementasyonları saf veri erişim katmanına dönüştürülür |
| G-4 | `TodosController` yalnızca `ITodoService`'e bağımlı olur |
| G-5 | Mevcut API kontratı değişmez |
| G-6 | Mevcut tüm entegrasyon testleri herhangi bir değişiklik yapılmadan geçmeye devam eder |

## Hedef Dışı (Non-Goals)

| # | Hedef Dışı |
|---|------------|
| NG-1 | `ITodoRepository` arayüz imzası değiştirilmez |
| NG-2 | Yeni API endpoint'i eklenmez |
| NG-3 | Frontend (mobile) kodu değiştirilmez |
| NG-4 | Veritabanı şeması veya EF Core migration'ları değiştirilmez |
| NG-5 | Async/await geçişi bu kapsama dahil edilmez |

---

## User Stories

**US-1 — Service Katmanı Oluşturma**
Bir backend geliştirici olarak, iş mantığını barındıran bir `ITodoService` / `TodoService` katmanı istiyorum; böylece controller'ı ince tutabilir, repository'yi saf veri erişimiyle sınırlı kılabilir ve iş kurallarını tek bir yerde yönetebilirim.

**US-2 — Controller'ın Repository Bağımlılığının Kesilmesi**
Bir backend geliştirici olarak, `TodosController`'ın yalnızca `ITodoService`'e bağımlı olmasını istiyorum.

**US-3 — Repository'nin Temizlenmesi**
Bir backend geliştirici olarak, `EfTodoRepository.Add()`'ın yalnızca entity'yi veritabanına yazmasını istiyorum; kimlik üretimi ve zaman damgası ataması repository'ye ait olmamalı.

---

## Kabul Kriterleri

### Mimari Yapı

- [ ] `Services/ITodoService.cs` oluşturulmuştur
- [ ] `Services/TodoService.cs` oluşturulmuştur
- [ ] `TodosController` constructor bağımlılığı `ITodoService`'e değiştirilmiştir
- [ ] `Program.cs`'te `ITodoService` → `TodoService` DI kaydı eklenmiştir

### İş Mantığı Dağılımı

- [ ] `TodoService.Create()` içinde `Guid.NewGuid()` ile `Id` üretilmektedir
- [ ] `TodoService.Create()` içinde `DateTime.UtcNow` ile `CreatedAt` ve `UpdatedAt` atanmaktadır
- [ ] `TodoService.Create()` içinde `IsCompleted = false` ve `IsPinned = false` varsayılanları atanmaktadır
- [ ] `EfTodoRepository.Add()` içinde business logic atamaları kaldırılmıştır

### API Kontratı Korunumu

- [ ] Tüm endpoint'lerin yanıt şeması ve durum kodları değişmemiştir

### Test Geçerliliği

- [ ] `dotnet test` tüm mevcut testlerde başarıyla geçmektedir

---

## Fazlar

### Faz 1 — Bu Spec Kapsamı

- `ITodoService` arayüzünü tanımla
- `TodoService`'i implement et
- `TodosController`'ı `ITodoService`'e geçir
- `EfTodoRepository`'yi temizle
- DI kaydını ekle

### Faz 2 — Gelecek (Kapsam Dışı)

- `ITodoService` üzerinde unit test yazılması
- Async servis arayüzüne geçiş
