# Soft Delete Mekanizması — Product Spec

Versiyon: 1.0
Tarih: 2026-03-18
Hazırlayan: Product Manager Agent
Durum: Taslak
Hedef Sürüm: v0.8.0

---

## Problem Statement

Mevcut uygulamada `DELETE /api/todos/{id}` ve `DELETE /api/auth/account` işlemleri hard delete (doğrudan veritabanından silme) gerçekleştirmektedir. Bu durum aşağıdaki sorunlara yol açmaktadır:

1. **Geri alınamaz veri kaybı:** Yanlışlıkla silinen bir todo veya hesap geri getirilemez.
2. **Denetim izi eksikliği:** Hangi kaydın ne zaman silindiğine dair iz bulunmamaktadır.
3. **Referans bütünlüğü riski:** İleride eklenebilecek ilişkili tablolar (ör. etiketler, yorumlar) orphan kayıt sorunuyla karşılaşabilir.
4. **Raporlama kısıtlaması:** Silinmiş kayıtlara ilişkin herhangi bir istatistik veya sorgulama yapılamamaktadır.

Bu feature, silme işlemlerini `IsDeleted` ve `DeletedAt` flag'leri üzerinden gerçekleştirerek veritabanından fiziksel kayıt kaldırılmasını engeller.

---

## Goals

| # | Hedef |
|---|-------|
| G-1 | `User` entity'sine `IsDeleted` (bool) ve `DeletedAt` (DateTime?) alanları eklenir |
| G-2 | `Todo` entity'sine `IsDeleted` (bool) ve `DeletedAt` (DateTime?) alanları eklenir |
| G-3 | `DELETE /api/todos/{id}` isteği hard delete yerine soft delete uygular |
| G-4 | `DELETE /api/auth/account` isteği kullanıcıyı ve ilgili todo'ları soft delete ile işaretler |
| G-5 | EF Core global query filter ile soft-deleted kayıtlar tüm sorgulardan otomatik filtrelenir |
| G-6 | Soft-deleted bir todo'ya yapılan GET/PUT/PATCH istekleri `404 Not Found` döner |
| G-7 | Mevcut EF Core migration geçmişi korunur; yeni alanlar ayrı migration ile eklenir |
| G-8 | Mevcut API kontratı değişmez; yanıt kodları ve body yapısı aynı kalır |

---

## Non-Goals

- Soft-deleted kayıtların listelenmesi (admin paneli vb.) bu versiyonda kapsam dışıdır.
- Silinen todo'ların geri yüklenmesi (restore / undelete) bu versiyonda kapsam dışıdır.
- Silinen kullanıcı hesabının reaktive edilmesi kapsam dışıdır.
- Frontend'de herhangi bir değişiklik yapılmayacaktır; silme işleminin kullanıcı deneyimi değişmez.
- Soft-deleted kayıtlar için otomatik temizleme (purge) cronjob'u kapsam dışıdır.

---

## User Stories

### US-1 — Todo Silme (Kullanıcı Perspektifi)

Bir kullanıcı olarak, bir todo'yu sildiğimde bu işlemin geri alınamaz olduğunu düşünmeden silebilmek istiyorum; böylece ileride bir kurtarma mekanizması eklendiğinde verilerimin kaybolmadığından emin olabilirim.

### US-2 — Hesap Silme (Kullanıcı Perspektifi)

Kayıtlı bir kullanıcı olarak, hesabımı sildiğimde sistemden tamamen ayrılmak istiyorum; silme işlemi tüm verilerimi etkisiz hale getirmelidir.

### US-3 — Silinen Kaydın Görünmemesi

Bir kullanıcı olarak, sildiğim todo'ların listede bir daha görünmemesini istiyorum; böylece aktif listemi temiz tutabilirim.

### US-4 — Sistem Bütünlüğü (Sistem Perspektifi)

Bir sistem yöneticisi olarak, silme işlemlerinin veritabanı düzeyinde iz bırakmasını istiyorum; böylece veri tutarlılığını ve denetim geçmişini inceleyebilirim.

---

## Acceptance Criteria

### Backend — Todo Soft Delete

- [ ] `Todo` entity'sinde `IsDeleted` (bool, default `false`) alanı mevcuttur
- [ ] `Todo` entity'sinde `DeletedAt` (DateTime?, nullable) alanı mevcuttur
- [ ] `DELETE /api/todos/{id}` — geçerli token + todo sahibi: `204 No Content` döner ve kayıt veritabanından silinmez
- [ ] `DELETE /api/todos/{id}` sonrasında ilgili todo'da `IsDeleted = true` ve `DeletedAt = UTC now` değerleri set edilir
- [ ] `DELETE /api/todos/{id}` — soft-deleted kayıt için tekrar çağrı: `404 Not Found` döner
- [ ] `GET /api/todos` — soft-deleted todo'lar listede yer almaz
- [ ] `GET /api/todos/{id}` — soft-deleted bir todo için: `404 Not Found` döner
- [ ] `PUT /api/todos/{id}` — soft-deleted bir todo için: `404 Not Found` döner
- [ ] `PATCH /api/todos/{id}/toggle` — soft-deleted bir todo için: `404 Not Found` döner

### Backend — User Soft Delete

- [ ] `User` entity'sinde `IsDeleted` (bool, default `false`) alanı mevcuttur
- [ ] `User` entity'sinde `DeletedAt` (DateTime?, nullable) alanı mevcuttur
- [ ] `DELETE /api/auth/account` — doğru şifre: `204 No Content` döner ve `User` kaydı veritabanından silinmez
- [ ] `DELETE /api/auth/account` sonrasında `User` kaydında `IsDeleted = true` ve `DeletedAt = UTC now` set edilir
- [ ] `DELETE /api/auth/account` sonrasında kullanıcıya ait tüm `Todo` kayıtlarında `IsDeleted = true` ve `DeletedAt = UTC now` set edilir
- [ ] `POST /api/auth/login` — soft-deleted kullanıcı email/şifre ile giriş yapmaya çalışırsa `401 Unauthorized` döner

### EF Core Global Query Filter

- [ ] `AppDbContext`'te `Todo` için `IsDeleted == false` global query filter tanımlıdır
- [ ] `AppDbContext`'te `User` için `IsDeleted == false` global query filter tanımlıdır
- [ ] Yeni alanlar ayrı bir EF Core migration ile eklenir; mevcut migration geçmişi bozulmaz
- [ ] `dotnet test` — mevcut tüm testler geçer

### Genel

- [ ] `DELETE /api/todos/{id}` yanıt kodu değişmez: `204 No Content`
- [ ] `DELETE /api/auth/account` yanıt kodu değişmez: `204 No Content`
- [ ] Veritabanında hard delete yapan hiçbir `Remove()` çağrısı kalmaz (hesap ve todo silme akışları için)

---

## Edge Cases

### EC-1 — Soft-Deleted Kullanıcının Email Çakışması

Soft delete uygulanmış bir kullanıcının email adresiyle yeni bir kayıt denendiğinde, global query filter aktif kullanıcıları döndüreceğinden `409 Conflict` dönebilir ya da email benzersizlik kısıtına takılabilir. **Karar:** Bu davranış Architect'e bırakılmıştır.

### EC-2 — Toplu Soft Delete (Hesap Silindiğinde Todo'lar)

Hesap silindiğinde kullanıcıya ait todo'lar tek tek mi işaretlenmeli, yoksa toplu mu? **Karar:** Architect kararı; beklenen sonuç tüm todo'ların `IsDeleted = true` ve `DeletedAt = UTC now` ile işaretlenmesidir.

### EC-3 — Global Query Filter Bypass

Admin sorguları veya veri kurtarma senaryoları için bypass mekanizması bu versiyonda kapsam dışıdır.

### EC-4 — Zaten Soft-Deleted Bir Todo'ya İkinci Kez Silme İsteği

Global query filter aktif olduğundan repository kaydı bulamaz ve `404 Not Found` döner. İdempotent davranış korunur.

### EC-5 — DeletedAt Zaman Dilimleri

Mevcut alanlarla uyumlu olarak `DateTime.UtcNow` kullanılır.

---

## Fazlar

### Faz 1 — MVP (v0.8.0)

- `Todo` ve `User` entity'lerine `IsDeleted` + `DeletedAt` alanları eklenir
- EF Core global query filter'lar tanımlanır
- Repository implementasyonları soft delete ile güncellenir
- Migration eklenir; mevcut testler güncellenir

### Faz 2 — Gelecek (kapsam dışı)

- Soft-deleted kayıtların listelenmesi / restore edilmesi
- Otomatik purge mekanizması
- Soft-deleted email adresinin serbest bırakılması politikası
