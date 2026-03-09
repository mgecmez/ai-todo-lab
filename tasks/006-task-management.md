# Sprint 006 — Task Management Features

**Kaynak:** `docs/task-management-architecture.md`
**Hedef:** Priority, DueDate, IsPinned ve Tags özelliklerini mevcut akışı bozmadan backend + mobile'a eklemek.
**Kural:** Mevcut API sözleşmesi geriye dönük uyumlu kalır. Entegrasyon testleri ek assertion olmaksızın geçmeye devam eder. Frontend UI davranışı bozulmaz.

---

## Ticket Listesi

| Ticket | Başlık | Owner | Durum |
|--------|--------|-------|-------|
| TM-001 | Todo entity genişletme + TodoPriority enum | Backend Dev | Bekliyor |
| TM-002 | AppDbContext güncelleme + AddTaskManagementFields migration | Backend Dev | Bekliyor |
| TM-003 | DTO güncelleme: CreateTodoRequest + UpdateTodoRequest | Backend Dev | Bekliyor |
| TM-004 | ITodoRepository arayüzüne TogglePin metodu ekleme | Backend Dev | Bekliyor |
| TM-005 | EfTodoRepository: Add, Update, GetAll ve TogglePin | Backend Dev | Bekliyor |
| TM-006 | TodosController: Create, Update, GetAll ve Pin endpoint | Backend Dev | Bekliyor |
| TM-007 | Mobile tip tanımları: todo.ts + TodoPriority | Frontend Dev | Bekliyor |
| TM-008 | todosApi.ts: pinTodo fonksiyonu | Frontend Dev | Bekliyor |
| TM-009 | TodoFormScreen: yeni form alanları | Frontend Dev | Bekliyor |
| TM-010 | TodoListScreen: kart görünümü + istemci sıralama | Frontend Dev | Bekliyor |
| TM-011 | TaskDetailScreen: yeni alanlar + pin akışı | Frontend Dev | Bekliyor |
| TM-012 | Entegrasyon testleri doğrulama + cache uyumluluk | Tester | Bekliyor |

---

## TM-001 — Todo Entity Genişletme + TodoPriority Enum

**Owner:** Backend Developer
**Amaç:** `Todo` C# sınıfına dört yeni özellik eklemek. `TodoPriority` enum'ını ayrı bir dosyada tanımlamak. Mevcut alanlar ve davranışlar değişmez.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Models/Todo.cs` ← 4 yeni özellik
- `backend/TodoApp.Api/Models/TodoPriority.cs` ← yeni dosya

**Yapılacaklar:**

`TodoPriority.cs` (yeni):
```
public enum TodoPriority
{
    Low    = 0,
    Normal = 1,
    High   = 2,
    Urgent = 3,
}
```

`Todo.cs`'e eklenecek özellikler:
```
Priority   TodoPriority   (default: TodoPriority.Normal)
DueDate    DateTime?      (nullable)
IsPinned   bool           (default: false)
Tags       string?        (nullable, max 500)
```

**Kabul kriterleri:**
- [ ] `TodoPriority.cs` dosyası `Models/` klasöründe oluşturulmuş; Low/Normal/High/Urgent değerleri 0–3 arasında
- [ ] `Todo.cs`'e dört yeni özellik eklenmiş; varsayılan değerleri atanmış (`Priority = TodoPriority.Normal`, `IsPinned = false`)
- [ ] Mevcut altı özellik (`Id`, `Title`, `Description`, `IsCompleted`, `CreatedAt`, `UpdatedAt`) değişmemiş
- [ ] `dotnet build backend/TodoApp.Api` hatasız tamamlanıyor

**Bağımlılıklar:** Yok (ilk adım)

---

## TM-002 — AppDbContext Güncelleme + Migration

**Owner:** Backend Developer
**Amaç:** EF Core'un yeni alanları veritabanıyla doğru eşlemesini sağlamak. `AddTaskManagementFields` migration'ı oluşturmak. Mevcut `InitialCreate` migration'ına dokunulmaz.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Data/AppDbContext.cs` ← yeni alan konfigürasyonları
- `backend/TodoApp.Api/Migrations/` ← yeni migration dosyaları (araç tarafından üretilir)

**Yapılacaklar:**

`AppDbContext.OnModelCreating`'e eklenecek konfigürasyonlar:
```
Priority:  .HasConversion<int>()   (enum → int dönüşümü)
           .HasDefaultValue(TodoPriority.Normal)
DueDate:   yapılandırma gerekmez (EF Core nullable DateTime'ı otomatik tanır)
IsPinned:  .HasDefaultValue(false)
Tags:      .HasMaxLength(500)      (nullable, ek yapılandırma gerekmez)
```

Migration oluşturma:
```
cd backend/TodoApp.Api
dotnet ef migrations add AddTaskManagementFields
```

Üretilen migration'da şu kolonların eklenmesi beklenir:
```sql
Priority  INTEGER NOT NULL DEFAULT 1
DueDate   TEXT    NULL
IsPinned  INTEGER NOT NULL DEFAULT 0
Tags      TEXT    NULL
```

**Kabul kriterleri:**
- [ ] `AppDbContext.OnModelCreating`'de `Priority` için `HasConversion<int>()` ve `HasDefaultValue` mevcut
- [ ] `IsPinned` için `HasDefaultValue(false)` mevcut
- [ ] `Tags` için `HasMaxLength(500)` mevcut
- [ ] Migration dosyaları üretilmiş; `Priority`, `DueDate`, `IsPinned`, `Tags` kolonları içeriyor
- [ ] Mevcut satırlarda veri kaybı olmadığını garantileyen DEFAULT değerler migration içinde görünüyor
- [ ] `dotnet ef database update` hatasız tamamlanıyor
- [ ] `dotnet build` hatasız geçiyor

**Bağımlılıklar:** TM-001

---

## TM-003 — DTO Güncelleme: CreateTodoRequest + UpdateTodoRequest

**Owner:** Backend Developer
**Amaç:** İstemcinin yeni alanları gönderebilmesini sağlamak. Geriye dönük uyumluluk korunur: yeni alanlar `CreateTodoRequest`'te opsiyonel; mevcut istemciler yeni alan göndermeden çalışmaya devam eder.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/DTOs/CreateTodoRequest.cs`
- `backend/TodoApp.Api/DTOs/UpdateTodoRequest.cs`

**Yapılacaklar:**

`CreateTodoRequest`'e eklenecekler (hepsi opsiyonel):
```
Priority   int?       (belirtilmezse controller Normal kullanır)
DueDate    DateTime?  (nullable)
IsPinned   bool?      (belirtilmezse false)
Tags       string?    (nullable; MaxLength 500)
```

`UpdateTodoRequest`'e eklenecekler (zorunlu — istemci mevcut değeri gönderir):
```
Priority   int        (zorunlu; validation: 0–3 arası)
DueDate    DateTime?  (nullable)
IsPinned   bool       (zorunlu)
Tags       string?    (nullable; MaxLength 500)
```

Validation notları:
- `Priority` aralık kısıtı: `[Range(0, 3)]`
- `Tags` uzunluk kısıtı: `[MaxLength(500)]`
- Virgül içeren etiket backend'de kabul edilir (kısıtlama frontend sorumluluğunda)

**Kabul kriterleri:**
- [ ] `CreateTodoRequest`'te dört yeni alan var; hepsi nullable / opsiyonel
- [ ] `UpdateTodoRequest`'te dört yeni alan var; `Priority` ve `IsPinned` zorunlu
- [ ] `Priority` için `[Range(0, 3)]` validasyon attribute'u mevcut
- [ ] `Tags` için `[MaxLength(500)]` mevcut
- [ ] Mevcut iki zorunlu alan (`Title`, `IsCompleted` vb.) değişmemiş
- [ ] `dotnet build` hatasız geçiyor
- [ ] Mevcut entegrasyon testleri (yeni alan göndermeden çalışanlar) geçmeye devam eder

**Bağımlılıklar:** TM-001

---

## TM-004 — ITodoRepository Arayüzüne TogglePin Metodu

**Owner:** Backend Developer
**Amaç:** Pin durumunu değiştirmek için repository sözleşmesine `TogglePin` metodunu eklemek. Kontroller bu arayüz üzerinden çalışır; implementasyon detayından bağımsız kalır.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`

**Yapılacaklar:**

Mevcut arayüze şu imza eklenir:
```
Todo? TogglePin(Guid id);
```

Davranış sözleşmesi:
- Verilen `id`'ye sahip todo bulunursa `IsPinned` değeri tersine çevrilir; güncel `Todo` döndürülür.
- Todo bulunamazsa `null` döndürülür.
- `ToggleComplete` ile yapısal tutarlılık korunur.

**Kabul kriterleri:**
- [ ] `ITodoRepository.cs`'e `TogglePin(Guid id)` imzası eklenmiş
- [ ] Döndürme tipi `Todo?`
- [ ] Mevcut altı metod imzası değişmemiş
- [ ] `dotnet build` (çözüm genelinde) derleme hatası verir — `EfTodoRepository` henüz implement etmedi; bu beklenen bir ara durumdur ve TM-005 ile giderilir

**Bağımlılıklar:** TM-001

---

## TM-005 — EfTodoRepository: Add, Update, GetAll ve TogglePin

**Owner:** Backend Developer
**Amaç:** Repository implementasyonunu yeni alanlara uyarlamak. `Add` ve `Update` metodlarında yeni alanların veritabanına yazılmasını sağlamak. `GetAll` sıralamasını güncellemek. `TogglePin` metodunu implement etmek.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`

**Yapılacaklar:**

**`Add` metodu güncellemesi:**
```
todo.Priority  = todo.Priority  (DTO'dan gelen değer; atanmamışsa entity varsayılanı Normal)
todo.DueDate   = todo.DueDate   (DTO'dan gelen; null olabilir)
todo.IsPinned  = false          (Add sırasında her zaman false — oluşturma anında pin yok)
todo.Tags      = todo.Tags      (DTO'dan gelen; null olabilir)
```
`Id`, `CreatedAt`, `UpdatedAt`, `IsCompleted` atamaları mevcut haliyle korunur.

**`Update` metodu güncellemesi:**
```
existing.Priority  = updated.Priority
existing.DueDate   = updated.DueDate
existing.IsPinned  = updated.IsPinned
existing.Tags      = updated.Tags
existing.UpdatedAt = DateTime.UtcNow   (mevcut)
```

**`GetAll` sıralama güncellemesi:**
```
.OrderByDescending(t => t.IsPinned)
.ThenByDescending(t => t.Priority)
.ThenBy(t => t.DueDate == null)
.ThenBy(t => t.DueDate)
.ThenByDescending(t => t.CreatedAt)
```

**`TogglePin` yeni metod:**
```
todo = Find(id) → null ise null döndür
todo.IsPinned = !todo.IsPinned
todo.UpdatedAt = DateTime.UtcNow
SaveChanges()
return todo
```

**Kabul kriterleri:**
- [ ] `Add`'de yeni dört alan atanıyor; `IsPinned` her zaman `false` olarak başlıyor
- [ ] `Update`'de yeni dört alan güncelleniyor
- [ ] `GetAll` IsPinned → Priority → DueDate → CreatedAt sırasıyla sıralıyor
- [ ] `TogglePin` implement edilmiş; bulunamazsa `null` döndürüyor
- [ ] Mevcut `GetById`, `Delete`, `ToggleComplete` metodları değişmemiş
- [ ] `dotnet build` hatasız geçiyor

**Bağımlılıklar:** TM-002, TM-003, TM-004

---

## TM-006 — TodosController: Create, Update, GetAll ve Pin Endpoint

**Owner:** Backend Developer
**Amaç:** Controller'ı yeni DTO alanlarına uyarlamak. `GetAll`'daki çift sıralamayı kaldırmak (sıralama artık repository'de). `PATCH /api/todos/{id}/pin` endpoint'ini eklemek.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api/Controllers/TodosController.cs`

**Yapılacaklar:**

**`Create` action güncellemesi:**
Mevcut `new Todo { Title, Description }` yapısına yeni alanlar eklenir:
```
Priority  = (TodoPriority)(request.Priority ?? (int)TodoPriority.Normal)
DueDate   = request.DueDate
IsPinned  = false   (Create'de her zaman false; pin ayrı endpoint ile)
Tags      = request.Tags?.Trim()
```

**`Update` action güncellemesi:**
```
Priority  = (TodoPriority)request.Priority
DueDate   = request.DueDate
IsPinned  = request.IsPinned
Tags      = request.Tags?.Trim()
```

**`GetAll` action güncellemesi:**
Mevcut `.OrderByDescending(t => t.CreatedAt)` satırı kaldırılır.
`repository.GetAll()` artık kendi içinde sıralanmış döndürür (TM-005).

**Yeni `Pin` action:**
```
[HttpPatch("{id:guid}/pin")]
public ActionResult<Todo> Pin(Guid id)
    → repository.TogglePin(id)
    → null ise 404 NotFound
    → 200 Ok(result)
```

**Kabul kriterleri:**
- [ ] `Create`'de yeni dört alan `Todo` nesnesine atanıyor; `IsPinned` her zaman `false`
- [ ] `Update`'de yeni dört alan `Todo` nesnesine atanıyor
- [ ] `GetAll`'daki çift sıralama kaldırılmış; `repository.GetAll()` doğrudan `Ok()` ile döndürülüyor
- [ ] `PATCH /api/todos/{id}/pin` endpoint'i mevcut; 200 ve 404 durumları işleniyor
- [ ] `dotnet run` ile uygulama başlıyor
- [ ] `GET /api/todos` yeni sıralamayı döndürüyor (pinned üstte, priority'ye göre)
- [ ] `POST /api/todos` yeni alanlı body kabul ediyor; eski body (sadece title) de çalışıyor
- [ ] `PUT /api/todos/{id}` yeni alanları güncelliyor
- [ ] `PATCH /api/todos/{id}/pin` IsPinned'i tersine çeviriyor

**Bağımlılıklar:** TM-003, TM-005

---

## TM-007 — Mobile Tip Tanımları: todo.ts + TodoPriority

**Owner:** Frontend Developer
**Amaç:** TypeScript tip tanımlarını backend'deki yeni alanlarla uyumlu hale getirmek. `TodoPriority` sabit nesnesini ve yardımcı tiplerini eklemek. Cache uyumluluk riskini yönetmek.

**Dokunulacak dosyalar:**
- `mobile/src/types/todo.ts`

**Yapılacaklar:**

`Todo` interface'ine eklenecekler:
```typescript
priority: number
dueDate:  string | null   // ISO 8601, sadece gün önemli
isPinned: boolean
tags:     string | null   // virgülle ayrılmış
```

`CreateTodoRequest`'e eklenecekler (hepsi opsiyonel):
```typescript
priority?: number
dueDate?:  string
isPinned?: boolean
tags?:     string
```

`UpdateTodoRequest`'e eklenecekler:
```typescript
priority: number
dueDate:  string | null
isPinned: boolean
tags:     string | null
```

Aynı dosyaya `TodoPriority` sabiti ve tipi:
```typescript
export const TODO_PRIORITY = {
  Low:    0,
  Normal: 1,
  High:   2,
  Urgent: 3,
} as const;

export type TodoPriority = typeof TODO_PRIORITY[keyof typeof TODO_PRIORITY];
```

Priority görsel etiket ve renk yardımcı sabiti (aynı dosyada veya ayrı sabit dosyasında):
```typescript
export const PRIORITY_META = {
  0: { label: 'Düşük',  color: '#9E9E9E' },
  1: { label: 'Normal', color: '#2196F3' },
  2: { label: 'Yüksek', color: '#FF9800' },
  3: { label: 'Acil',   color: '#F44336' },
} as const;
```

**Cache uyumluluk notu:**
Mevcut cache (`todos_cache`) eski `Todo[]` içerebilir (yeni alanlar eksik).
`JSON.parse` eksik alanları `undefined` bırakır; runtime crash olmaz.
Ekranlar bu değerleri gösterirken `?? varsayılan` pattern'iyle savunmacı kod yazar.

**Kabul kriterleri:**
- [ ] `Todo` interface'inde dört yeni alan mevcut
- [ ] `CreateTodoRequest` ve `UpdateTodoRequest` güncellendi
- [ ] `TODO_PRIORITY` sabiti ve `TodoPriority` tipi export ediliyor
- [ ] `PRIORITY_META` sabiti dört öncelik için label ve color içeriyor
- [ ] `npx tsc --noEmit` hatasız geçiyor
- [ ] `todosApi.ts` dosyasına dokunulmamış

**Bağımlılıklar:** Yok (backend ile paralel yapılabilir)

---

## TM-008 — todosApi.ts: pinTodo Fonksiyonu

**Owner:** Frontend Developer
**Amaç:** `PATCH /api/todos/{id}/pin` endpoint'ini çağıran `pinTodo` fonksiyonunu API servisine eklemek. Mevcut beş fonksiyon değişmez.

**Dokunulacak dosyalar:**
- `mobile/src/services/api/todosApi.ts`

**Yapılacaklar:**

Mevcut `toggleTodo` fonksiyonunun modelini takip eden yeni fonksiyon:
```typescript
export async function pinTodo(id: string): Promise<Todo> {
  const response = await fetch(`${BASE}/${id}/pin`, { method: 'PATCH' });
  return parseResponse<Todo>(response);
}
```

**Kabul kriterleri:**
- [ ] `pinTodo(id: string): Promise<Todo>` fonksiyonu export ediliyor
- [ ] `PATCH /{id}/pin` endpoint'ini çağırıyor
- [ ] `parseResponse` ile hata yönetimi yapılıyor
- [ ] Mevcut beş fonksiyon (`getTodos`, `createTodo`, `updateTodo`, `deleteTodo`, `toggleTodo`) değişmemiş
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** TM-007

---

## TM-009 — TodoFormScreen: Yeni Form Alanları

**Owner:** Frontend Developer
**Amaç:** Create ve Edit formuna Priority, DueDate, IsPinned ve Tags alanlarını eklemek. Mevcut Title ve Description alanları değişmez. Form gönderildiğinde yeni alanlar request body'e dahil edilir.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TodoFormScreen.tsx`

**Yapılacaklar:**

**State eklemeleri:**
```
priority: number    (başlangıç: editTodo?.priority ?? TODO_PRIORITY.Normal)
dueDate:  string | null  (başlangıç: editTodo?.dueDate ?? null)
isPinned: boolean   (başlangıç: editTodo?.isPinned ?? false)
tags:     string    (başlangıç: editTodo?.tags ?? '')
```

**UI bileşenleri:**

`Priority` — 4 seçenekli buton grubu (Low/Normal/High/Urgent); seçili olan vurgulu görünür:
```
[Düşük]  [Normal]  [Yüksek]  [Acil]
```

`IsPinned` — Switch bileşeni veya basit iki-butonlu toggle:
```
Sabitle: [Switch]
```

`DueDate` — "Son tarih seç" butonu; basıldığında `DateTimePickerModal` veya platform native picker açılır:
```
Son Tarih: [15 Mart 2026]  [Temizle]
```
Seçilen tarih UTC midnight olarak saklanır: `new Date(seçilenGün).toISOString()`

`Tags` — Serbest metin girişi; virgülle ayrılmış format:
```
Etiketler: [iş, kişisel          ]
Hint: "Virgülle ayırarak birden fazla etiket ekleyebilirsiniz"
```
Virgül kısıtı yoktur (Faz 1); kullanıcıya hint yeterlidir.

**handleSave güncellemesi:**

`createTodo` ve `updateTodo` çağrılarına yeni alanlar eklenir:
```
priority: priority
dueDate:  dueDate
isPinned: isPinned
tags:     tags.trim() || null
```

**Cache güncellemesi:** Mevcut `getCachedTodos` + `setCachedTodos` akışı değişmez; yeni alanlar `Todo` nesnesinde zaten bulunacağından cache otomatik güncellenir.

**Kabul kriterleri:**
- [ ] Priority buton grubu formda görünüyor; seçim çalışıyor
- [ ] IsPinned toggle formda görünüyor; durumu değişiyor
- [ ] DueDate seçici formda görünüyor; tarih seçilebiliyor; "Temizle" null yapıyor
- [ ] Tags metin alanı formda görünüyor
- [ ] Create akışında yeni alanlar API'ye gönderiliyor
- [ ] Edit akışında mevcut değerler forma doldurulmuş geliyor; güncelleme gönderiliyor
- [ ] Mevcut Title ve Description alanları değişmemiş
- [ ] Mevcut save/cancel navigasyonu bozulmamış
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** TM-007, TM-008

---

## TM-010 — TodoListScreen: Kart Görünümü + İstemci Sıralama

**Owner:** Frontend Developer
**Amaç:** Todo kartına Priority badge, DueDate ve Pin ikonu eklemek. Liste sıralamasını istemci tarafında da uygulamak (backend ile tutarlı). Pin toggle için doğrudan liste üzerinden hızlı erişim sağlamak.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TodoListScreen.tsx`

**Yapılacaklar:**

**Kart görünümüne (TodoItem) eklenecekler:**

Priority badge — `PRIORITY_META[todo.priority]` ile renk ve etiket alınır; küçük renkli etiket olarak kart sol altında gösterilir:
```
[●Acil]  Sunum hazırla
         15 Mar · 📌
```

Due date metni — varsa, kart meta satırında `createdAt` yanında gösterilir:
```
05.03.2026  ·  Son: 15.03.2026
```
Tarihi geçmiş ve tamamlanmamış görevler vurgu rengiyle (kırmızı/turuncu) gösterilir.

Pin ikonu — kart aksiyon bölgesine "pim" ikonu eklenir; basıldığında `pinTodo` çağrılır; sonuç state ve cache'e yansır. `handleToggle` ve `handleDeleteConfirm` modeliyle aynı pattern.

**İstemci sıralaması:**
`filteredTodos` hesaplanırken (veya `todos` state güncellenirken) backend sıralamasıyla tutarlı istemci sıralaması uygulanır:
```
IsPinned DESC → Priority DESC → DueDate ASC (null sona) → CreatedAt DESC
```

Bu sıralama SWR'ın cache → API geçişinde kart sırasının tutarlı kalmasını sağlar.

**handlePin yeni fonksiyon:**
```
1. setBusy(id, true)
2. pinTodo(id) → API çağrısı
3. Başarılı: setTodos(prev → map ile IsPinned güncelle) + setCachedTodos(next)
4. Başarısız: Alert ile hata mesajı; cache dokunulmaz
5. setBusy(id, false)
```

**Kabul kriterleri:**
- [ ] Kartlarda priority badge görünüyor; renkler `PRIORITY_META`'dan geliyor
- [ ] DueDate varsa kart meta satırında görünüyor; tarihi geçmişlerde vurgu rengi var
- [ ] Pin ikonu kartta görünüyor; tıklandığında `pinTodo` çağrılıyor
- [ ] Pin başarılıysa kart anlık güncelleniyor; pinlenen görev üste geçiyor
- [ ] Pin başarısız olursa hata Alert çıkıyor; liste değişmiyor
- [ ] İstemci sıralaması backend sıralamasıyla tutarlı (pinned → priority → dueDate → createdAt)
- [ ] Mevcut toggle, delete, search, RefreshControl davranışları bozulmamış
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** TM-007, TM-008, TM-009

---

## TM-011 — TaskDetailScreen: Yeni Alanlar + Pin Akışı

**Owner:** Frontend Developer
**Amaç:** Görev detay ekranına yeni alanları okuma modunda eklemek. Pin/Unpin için detay ekranında aksiyon butonu sağlamak. Mevcut toggle/delete aksiyon butonları değişmez.

**Dokunulacak dosyalar:**
- `mobile/src/screens/TaskDetailScreen.tsx`

**Yapılacaklar:**

**Meta bölümüne eklenecekler:**

Priority gösterimi — mevcut `createdAt` meta satırının yanına eklenir:
```
[●Yüksek]   15.03.2026   Devam ediyor
```

DueDate gösterimi — varsa meta satırında; yoksa gösterilmez.

Tags gösterimi — varsa açıklama kartının altında virgülle ayrılmış veya küçük badge olarak:
```
Etiketler: iş · kişisel · önemli
```

**Pin aksiyon butonu:**
Mevcut üç buton satırına (Düzenle / Tamamla / Sil) dördüncü buton eklenir:
```
[Düzenle]  [Tamamla]  [Sabitle / Çıkar]  [Sil]
```
- `todo.isPinned` false → etiket "Sabitle", ikon `pin`
- `todo.isPinned` true → etiket "Çıkar", ikon `pin-outline` (veya benzer)

**handlePin yeni fonksiyon (TaskDetailScreen içinde):**
```
1. setToggling(true)  (busy state mevcut olanı kullanır)
2. pinTodo(todo.id) çağır
3. Başarılı: setTodo(updated) + cache güncelle
4. Başarısız: setActionError + Alert; cache dokunulmaz
5. setToggling(false)
```

`getCachedTodos` + `setCachedTodos` + `pinTodo` importları eklenir.

**Kabul kriterleri:**
- [ ] Detay ekranında priority badge görünüyor
- [ ] DueDate varsa görünüyor; yoksa alan gösterilmiyor
- [ ] Tags varsa görünüyor; yoksa alan gösterilmiyor
- [ ] "Sabitle / Çıkar" butonu görünüyor; duruma göre etiketi değişiyor
- [ ] Pin başarılıysa `setTodo(updated)` ile ekran güncelleniyor; cache güncelleniyor
- [ ] Pin başarısız olursa ekranda hata mesajı + Alert; cache dokunulmaz
- [ ] Mevcut üç aksiyon butonu (Düzenle, Tamamla, Sil) değişmemiş
- [ ] Mevcut edit → goBack akışı değişmemiş
- [ ] `npx tsc --noEmit` hatasız geçiyor

**Bağımlılıklar:** TM-007, TM-008, TM-010

---

## TM-012 — Doğrulama: Entegrasyon Testleri + Cache Uyumluluk

**Owner:** Tester / QA
**Amaç:** Sprint kapanışında tüm katmanların birlikte doğru çalıştığını doğrulamak. Mevcut entegrasyon testlerinin geçtiğini onaylamak. Yeni endpoint için temel test senaryoları çalıştırmak. Cache uyumluluğunu manuel doğrulamak.

**Dokunulacak dosyalar:**
- `backend/TodoApp.Api.Tests/TodoApiIntegrationTests.cs` ← isteğe bağlı: yeni PIN testi eklenebilir
- Yok (çoğunlukla gözlem ve çalıştırma)

**Otomatik kabul kriterleri:**

```
dotnet test backend/TodoApp.Api.Tests
```
- [ ] Mevcut 5 test (`Health`, `Create`, `CreateInvalidTitle`, `GetAll`, `Toggle`) geçiyor
- [ ] Yeni alanları göndermeden create ve toggle işlemleri çalışıyor (geriye dönük uyumluluk)

**Manuel API test senaryoları:**

1. **Yeni alan ile create:**
   - `POST /api/todos` body: `{ title, priority: 2, dueDate: "2026-04-01T00:00:00Z", isPinned: false, tags: "iş,test" }`
   - Yanıtta `priority: 2`, `dueDate`, `tags` görünmeli

2. **Eski alan ile create (geriye dönük uyumluluk):**
   - `POST /api/todos` body: `{ title: "Eski format" }`
   - `200 Created`; `priority: 1` (Normal varsayılan), `isPinned: false`, `dueDate: null`, `tags: null`

3. **Pin toggle:**
   - `PATCH /api/todos/{id}/pin` → `isPinned: true`
   - Tekrar: `PATCH /api/todos/{id}/pin` → `isPinned: false`

4. **Listeleme sırası:**
   - Birkaç todo oluştur: biri pinlenmiş, biri Urgent priority, biri due date yakın
   - `GET /api/todos` → pinlenenler üstte, priority'e göre sıralı

5. **Update ile yeni alanlar:**
   - `PUT /api/todos/{id}` body: `{ title, isCompleted, priority: 3, dueDate: null, isPinned: true, tags: "acil" }`
   - Yanıtta güncel değerler görünmeli

**Cache uyumluluk senaryosu:**

6. **Eski cache → yeni uygulama:**
   - Sprint öncesi oluşturulan bir `todos_cache` varsa (yeni alanlar yok) uygulamayı aç
   - Liste açılmalı; priority/dueDate/tags alanları eksik olsa da ekran çökmemeli
   - İlk başarılı API çağrısından sonra cache yeni alanlarla güncellenmeli

**Manuel mobile test senaryoları:**

7. **Yeni todo oluştur (tüm alanlar):**
   - Form açılır; priority "Acil" seç; tarih seç; isPinned aç; tags "iş,test" yaz; kaydet
   - Listede pin ikonu ve priority badge görünmeli; liste sırası doğru

8. **Pin listeden:**
   - Todo kartındaki pin ikonuna bas
   - Pinlenen todo listenin üstüne geçmeli; cache güncellenmeli

9. **Pin detaydan:**
   - TaskDetail'de "Sabitle" butonuna bas
   - Ekranda durum güncellenmeli; listeye dönünce todo üstte

**Kabul kriterleri özeti:**
- [ ] `dotnet test` → 5 geçen test (en az)
- [ ] Geriye dönük uyumluluk: eski format body'li create çalışıyor
- [ ] `PATCH /api/todos/{id}/pin` doğru çalışıyor
- [ ] Liste sıralaması: pinned → priority → dueDate → createdAt
- [ ] Mobile form yeni alanları gönderiyor ve cache güncelliyor
- [ ] Cache uyumluluk: yeni alanlar olmayan eski cache uygulamayı çöküştürmüyor
- [ ] `npx tsc --noEmit` → sıfır hata

**Bağımlılıklar:** TM-001 → TM-011 (tüm ticket'lar tamamlanmış olmalı)

---

## Bağımlılık Grafiği

```
TM-001 (Entity + Enum)
    │
    ├─── TM-002 (DbContext + Migration)
    │         │
    │         └─── TM-005 (EfRepository)
    │                   │
    ├─── TM-003 (DTO)──┤
    │                  │
    └─── TM-004 (ITodoRepository)
              │
              └─── TM-005 (EfRepository)
                        │
                        └─── TM-006 (Controller)
                                  │
                              [Backend hazır]

TM-007 (types/todo.ts)          [Backend ile paralel başlayabilir]
    │
    └─── TM-008 (todosApi.ts)
              │
              └─── TM-009 (TodoFormScreen)
              │         │
              │         └─── TM-010 (TodoListScreen)
              │                   │
              │                   └─── TM-011 (TaskDetailScreen)
              │
              └─── TM-010
                        │
                        └─── TM-012 (Doğrulama)
```

---

## Değişmeyecek Dosyalar (Garanti)

| Dosya | Neden |
|-------|-------|
| `Repositories/ITodoRepository.cs` (mevcut 6 metod) | Sadece `TogglePin` eklenir; imzalar değişmez |
| `Repositories/InMemoryTodoRepository.cs` | Silinmez; `TogglePin` stub olarak eklenebilir |
| `Controllers/HealthController.cs` | Repository bağımlılığı yok |
| `Validation/NotWhitespaceAttribute.cs` | Değişmez |
| `mobile/src/services/cache/` (tüm cache servisleri) | Yeni alanlar JSON'a otomatik dahil olur |
| `mobile/src/navigation/` | Route yapısı değişmez |
| `mobile/src/components/` | Mevcut bileşenler korunur (yeni bileşenler eklenebilir) |
| `mobile/src/theme/tokens.ts` | Yeni renkler varsa eklenir; mevcut token'lar değişmez |

---

## Faz 2'ye Ertelenen Konular

| Konu | Neden |
|------|-------|
| Server-side filtreleme (`?priority=`, `?tag=`) | Client-side Faz 1 için yeterli |
| Tags için ayrı tablo | Karmaşıklık; virgüllü string yeterli |
| Etiket öneri / otomatik tamamlama | UX iyileştirmesi |
| Due date push notification | Ayrı altyapı gerektiriyor |
| Due date saat bileşeni | Gün seçimi yeterli |
| Tekrarlayan görevler | Karmaşık durum yönetimi |
| Tags chip UI | UX iyileştirmesi; Faz 1'de serbest metin yeterli |
