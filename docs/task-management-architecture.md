# Task Management Features Mimari

**Sprint:** Step 3 — Task Management Features
**Yazar:** Architect Agent
**Tarih:** 2026-03-08
**Durum:** Taslak

---

## 1. Bu Özellikler Neden Gerekli?

### Mevcut Durum

Uygulama şu an yalnızca bir görev listesi yöneticisidir: başlık, açıklama, tamamlandı durumu. Kullanıcı görevler arasında önceliklendirme yapamaz, tarihe göre hatırlatma koyamaz, sık başvurduğu görevi üste sabitleyemez ya da görevleri etiketle gruplayamaz.

### Kullanıcı İhtiyacı

| Özellik | Kullanıcı Problemi | Çözüm |
|---------|-------------------|-------|
| **Priority** | Hangi görevi önce yapmalıyım? | Görevlere öncelik seviyesi atamak |
| **Due Date** | Bu görevi ne zamana kadar yapmalıyım? | Son tarih belirtmek |
| **Pin** | Bu göreve sık erişiyorum, kaybetmek istemiyorum | Listeye sabitlemek |
| **Tags** | İş, kişisel ve alışveriş listemi ayırt edemiyorum | Esnek etiketleme |

### Kapsam (Faz 1)

Bu sprint kasıtlı olarak basit ve güvenli tutulmuştur. Yeni alanlar mevcut `Todo` entity'sine eklenir; ayrı ilişkisel tablo oluşturulmaz. Mevcut API sözleşmesi geriye dönük uyumlu biçimde genişletilir.

---

## 2. Veri Modeline Eklenecek Alanlar

### Mevcut Model (Sprint öncesi)

```
Todo
├── Id           Guid
├── Title        string (max 200)
├── Description  string? (max 1000)
├── IsCompleted  bool
├── CreatedAt    DateTime
└── UpdatedAt    DateTime
```

### Genişletilmiş Model (Sprint sonrası)

```
Todo
├── Id           Guid
├── Title        string (max 200)
├── Description  string? (max 1000)
├── IsCompleted  bool
├── Priority     int (TodoPriority enum, default: 1 = Normal)   ← YENİ
├── DueDate      DateTime? (nullable, UTC)                      ← YENİ
├── IsPinned     bool (default: false)                          ← YENİ
├── Tags         string? (virgülle ayrılmış, max 500)           ← YENİ
├── CreatedAt    DateTime
└── UpdatedAt    DateTime
```

### Alan Açıklamaları

**Priority (`int`):**
- Veritabanında integer olarak saklanır; C#'ta enum'a eşlenir.
- Varsayılan değer: `1` (Normal).
- Enum değerleri bölüm 7'de detaylandırılmıştır.

**DueDate (`DateTime?`):**
- Nullable; kullanıcı son tarih belirtmek zorunda değil.
- UTC olarak saklanır; frontend yerel saate çevirir.
- Saat bileşeni Faz 1'de yok sayılır — sadece gün bilgisi kullanılır.

**IsPinned (`bool`):**
- Varsayılan: `false`.
- Listeleme sırasında sabitlenmiş görevler her zaman üstte görünür.

**Tags (`string?`):**
- Virgülle ayrılmış değer olarak saklanır: `"iş,kişisel,önemli"`.
- Maksimum 500 karakter.
- Frontend bu string'i split/join ederek string dizisi gibi kullanır.
- Ayrı Tags tablosu Faz 2'ye bırakılmıştır.

---

## 3. Backend API Etkisi

### Geriye Dönük Uyumluluk İlkesi

Mevcut endpoint'lerin URL'leri, HTTP metodları ve zorunlu alan yapıları **değişmez**. Yeni alanlar opsiyonel olarak eklenir; mevcut istemciler (veya testler) yeni alan göndermezse varsayılan değerler kullanılır.

### Güncellenen DTO'lar

**`CreateTodoRequest`'e eklenecek alanlar (hepsi opsiyonel):**

```
Priority    int?      (belirtilmezse → Normal)
DueDate     DateTime? (belirtilmezse → null)
IsPinned    bool?     (belirtilmezse → false)
Tags        string?   (belirtilmezse → null)
```

**`UpdateTodoRequest`'e eklenecek alanlar:**

```
Priority    int       (zorunlu; mevcut değer gönderilebilir)
DueDate     DateTime? (nullable)
IsPinned    bool      (zorunlu; mevcut değer gönderilebilir)
Tags        string?   (nullable)
```

### Yeni Endpoint: Pin Toggle

Pinleme işlemi için `ToggleComplete` modelini takip eden ayrı bir endpoint önerilir:

```
PATCH /api/todos/{id}/pin
→ 200 OK + güncel Todo
→ 404 Not Found
```

Bu yaklaşımın gerekçesi: istemci, pinleme sırasında tüm alanları (title, description, isCompleted, priority, dueDate, tags) göndermek zorunda kalmaz. `ToggleComplete` ile yapısal tutarlılık sağlanır.

### Güncellenen `Todo` Yanıtı

Tüm endpoint'ler artık genişletilmiş `Todo` nesnesini döndürür:

```json
{
  "id": "...",
  "title": "Sunum hazırla",
  "description": null,
  "isCompleted": false,
  "priority": 2,
  "dueDate": "2026-03-15T00:00:00Z",
  "isPinned": true,
  "tags": "iş,sunum",
  "createdAt": "...",
  "updatedAt": "..."
}
```

Mevcut entegrasyon testleri yeni alanlara assertion eklemediği sürece (eklemek zorunda değil) geçmeye devam eder.

---

## 4. Database Migration Stratejisi

### Mevcut Durum

`InitialCreate` migration'ı mevcut; `todos.db` üretimde çalışıyor.

### Yeni Migration: `AddTaskManagementFields`

Tek bir migration ile dört yeni kolon eklenir:

```sql
ALTER TABLE Todos ADD COLUMN Priority     INTEGER NOT NULL DEFAULT 1;
ALTER TABLE Todos ADD COLUMN DueDate      TEXT    NULL;
ALTER TABLE Todos ADD COLUMN IsPinned     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE Todos ADD COLUMN Tags         TEXT    NULL;
```

SQLite `TEXT` türü DateTime değerleri için kullanılır (EF Core otomatik yönetir).

### Güvenlik

- `NOT NULL DEFAULT` kullanımı: Mevcut satırlar (`InitialCreate` ile oluşturulmuş) migration çalıştığında otomatik olarak varsayılan değer alır. Veri kaybı yoktur.
- `Program.cs`'teki `Database.Migrate()` çağrısı uygulama başlangıcında migration'ı otomatik uygular; manuel adım gerekmez.
- Test projesi InMemory provider kullanır; bu migration'dan etkilenmez.

### Sıra

```
InitialCreate  (mevcut, dokunulmaz)
       │
AddTaskManagementFields  (yeni)
```

---

## 5. Frontend Ekranlarına Etkisi

### `mobile/src/types/todo.ts`

`Todo` interface'i ve request tipleri güncellenir:

```
Todo interface'ine eklenecekler:
├── priority: number
├── dueDate: string | null   (ISO 8601)
├── isPinned: boolean
└── tags: string | null      (virgülle ayrılmış)

CreateTodoRequest'e eklenecekler (hepsi opsiyonel):
├── priority?: number
├── dueDate?: string
├── isPinned?: boolean
└── tags?: string

UpdateTodoRequest'e eklenecekler:
├── priority: number
├── dueDate: string | null
├── isPinned: boolean
└── tags: string | null
```

### `TodoFormScreen.tsx`

Yeni form alanları eklenir:

| Alan | UI Bileşeni | Not |
|------|------------|-----|
| Priority | `SegmentedControl` veya Picker (4 seçenek) | Faz 1: basit buton grubu |
| Due Date | Native `DateTimePicker` (Expo) | Sadece tarih seçimi; saat yok |
| Tags | TextInput (virgülle ayrılmış giriş) | Faz 1: serbest metin; chip UI Faz 2 |
| IsPinned | `Switch` veya `Checkbox` | Basit boolean toggle |

Create ve update akışları yeni alanları request body'e dahil eder.

### `TodoListScreen.tsx`

**Kart görünümüne eklenecekler:**
- Priority badge (renk kodlu küçük etiket)
- Due date metni (varsa, yaklaşansa vurgu rengi)
- Pin ikonu (kart sağ üst köşesi)

**Listeleme sırası değişir** (bölüm 6'da detaylandırıldı).

**Offline cache uyumu:** `setCachedTodos` çağrıları zaten genişletilmiş `Todo` nesnesini saklar; ek değişiklik gerekmez. Yeni alanlar JSON'a otomatik dahil olur.

### `TaskDetailScreen.tsx`

Görev detay ekranına yeni alanlar için okuma alanları eklenir:

- Priority gösterimi (metin veya renk etiketi)
- Due date gösterimi (tarih formatlanmış)
- Tags gösterimi (virgülle ayrılmış veya badge)
- Pin/Unpin butonu (mevcut toggle/delete modeliyle aynı akış)

---

## 6. Listeleme ve Sıralama Etkisi

### Mevcut Sıralama

```
OrderByDescending(t => t.CreatedAt)
```

### Yeni Sıralama (Önerilen Varsayılan)

```
1. IsPinned DESC        (sabitlenmiş görevler her zaman üste)
2. Priority  DESC       (Urgent → High → Normal → Low)
3. DueDate   ASC NULLS LAST  (yakın tarihli önce; tarih olmayanlar sona)
4. CreatedAt DESC       (eşitlerde en yeni üste)
```

LINQ karşılığı:

```
.OrderByDescending(t => t.IsPinned)
.ThenByDescending(t => t.Priority)
.ThenBy(t => t.DueDate == null)
.ThenBy(t => t.DueDate)
.ThenByDescending(t => t.CreatedAt)
```

### Kullanıcı Taraflı Filtreler (Faz 1 — Frontend)

Faz 1'de sıralama/filtreleme client-side yapılır; yeni query parametresi eklenmez:

| Filtre | Uygulama |
|--------|---------|
| Sadece pinlenmiş | `todos.filter(t => t.isPinned)` |
| Önceliğe göre | `todos.sort(...)` |
| Tarihe göre | `todos.sort(...)` |
| Etikete göre | `todos.filter(t => t.tags?.includes(tag))` |

Faz 2'de `GET /api/todos?priority=high&tag=iş` gibi server-side filtreleme eklenebilir.

---

## 7. Priority Enum Önerisi

### C# (Backend)

```csharp
public enum TodoPriority
{
    Low    = 0,
    Normal = 1,
    High   = 2,
    Urgent = 3,
}
```

Veritabanında integer olarak saklanır. `AppDbContext.OnModelCreating`'de `.HasConversion<int>()` ile eşlenir.

### TypeScript (Frontend)

```typescript
export const TODO_PRIORITY = {
  Low:    0,
  Normal: 1,
  High:   2,
  Urgent: 3,
} as const;

export type TodoPriority = typeof TODO_PRIORITY[keyof typeof TODO_PRIORITY];
```

### Görsel Kodlama Önerisi

| Seviye | Değer | Renk | Etiket |
|--------|-------|------|--------|
| Low | 0 | Gri | Düşük |
| Normal | 1 | Mavi | Normal |
| High | 2 | Turuncu | Yüksek |
| Urgent | 3 | Kırmızı | Acil |

### Varsayılan Değer

Yeni görev oluşturulurken `Priority` belirtilmezse `Normal (1)` kullanılır. Bu hem backend hem frontend'de varsayılan olarak ayarlanır.

---

## 8. Tags için Başlangıç Yaklaşımı

### Faz 1 Kararı: Virgülle Ayrılmış String

Tags için ayrı bir tablo oluşturmak yerine `Todo` entity'sinde `Tags` adlı tek bir string kolonu kullanılır.

**Depolama formatı:**
```
"iş,kişisel,önemli"
```

**Gerekçe:**

| Yaklaşım | Artı | Eksi |
|----------|------|------|
| Ayrı Tags tablosu | Tam ilişkisel; SQL sorgulama | Migration karmaşıklığı; join maliyet |
| JSON string (`["iş","kişisel"]`) | Tip bilgisi saklanır | Daha uzun; SQLite LIKE sorgusu zor |
| **Virgülle ayrılmış** | Sade; SQLite LIKE ile aranabilir; parse kolay | Virgül içeren etiket kullanılamaz |

**Kısıt:** Etiket değerleri virgül içeremez. Frontend bu kısıtı form validasyonuyla bildirir.

**Backend filtresi (Faz 2 için hazırlık):**
SQLite'ta `LIKE '%iş%'` sorgusu çalışır:
```sql
WHERE Tags LIKE '%,iş,%' OR Tags LIKE 'iş,%' OR Tags LIKE '%,iş' OR Tags = 'iş'
```

Faz 2'de etiketler popülerliğe göre önerilecekse ayrı tablo gerekir.

---

## 9. Faz 1 Kapsamı ve Faz 2'ye Bırakılanlar

### Faz 1 (Bu Sprint)

- [ ] `Todo` entity'sine 4 yeni alan eklenmesi
- [ ] `AddTaskManagementFields` migration
- [ ] DTO güncelleme (`CreateTodoRequest`, `UpdateTodoRequest`)
- [ ] `PATCH /api/todos/{id}/pin` endpoint'i
- [ ] `EfTodoRepository.Add`, `Update` metodlarına yeni alanların dahil edilmesi
- [ ] Listeleme sıralamasının güncellenmesi (IsPinned → Priority → DueDate → CreatedAt)
- [ ] `TodoPriority` enum (backend + frontend)
- [ ] `types/todo.ts` güncellemesi
- [ ] `TodoFormScreen`: priority, dueDate, tags, isPinned form alanları
- [ ] `TodoListScreen`: kart görünümünde yeni alanlar
- [ ] `TaskDetailScreen`: detay görünümünde yeni alanlar
- [ ] Offline cache uyumu (otomatik; `setCachedTodos` genişletilmiş nesneyi saklar)
- [ ] Entegrasyon testleri güncelleme (yeni alanlar için assertion ekleme isteğe bağlı)

### Faz 2'ye Ertelenen Konular

| Konu | Neden Ertelendi |
|------|----------------|
| Server-side filtreleme (`?priority=`, `?tag=`) | Faz 1'de client-side yeterli |
| Tags için ayrı tablo (many-to-many) | Fazla karmaşıklık; virgüllü string yeterli |
| Etiket öneri / otomatik tamamlama | UX iyileştirmesi; Faz 1'de serbest metin |
| Due date bildirim / hatırlatma | Push notification altyapısı gerektiriyor |
| Due date saat bileşeni | Gün seçimi Faz 1 için yeterli |
| Tekrarlayan görevler (recurrence) | Karmaşık durum yönetimi |
| Arşiv / completed görev filtreleme | Ayrı sprint konusu |
| Priority bazlı renk teması | UX iyileştirmesi |
| Tags ile bulk-edit (toplu etiket değiştirme) | Backend desteği gerektiriyor |

---

## 10. Riskler

### 10.1 Migration Güvenliği

**Risk:** `todos.db`'de mevcut veriler varken `AddTaskManagementFields` çalışırsa veri bozulabilir mi?

**Analiz:** Tüm yeni kolonlar `DEFAULT` değerle ekleniyor (`Priority = 1`, `IsPinned = 0`, `DueDate = NULL`, `Tags = NULL`). SQLite `ALTER TABLE ADD COLUMN` mevcut satırlara varsayılan değeri yazar; veri kaybı yoktur.

**Önlem:** Migration çalıştırılmadan önce `todos.db` yedeği alınır.

---

### 10.2 Frontend Cache Uyumu

**Risk:** Eski cache (`todos_cache`) yeni alanlar olmadan yazılmış bir `Todo[]` içerebilir. Uygulama güncellendikten sonra `priority`, `dueDate`, `isPinned`, `tags` alanları `undefined` gelir.

**Analiz:** TypeScript bu alanları zorunlu olarak tanımlarsa tip hataları oluşabilir. Ancak `JSON.parse` eksik alanları `undefined` bırakır; runtime crash olmaz.

**Çözüm:** `types/todo.ts`'te yeni alanlar başlangıçta `? (opsiyonel)` tanımlanır. Güncelleme sonrası cache'i geçersiz kılmak için `clearTodosCache()` bir kez çağrılabilir (opsiyonel migration mantığı).

---

### 10.3 Tags Virgül Kısıtı

**Risk:** Kullanıcı "C#, .NET" gibi virgüllü bir etiket girerse parse bozulur.

**Çözüm:** Frontend validasyonu: etiket değerinde virgül varsa hata göster. Backend'de ek validasyon gerekmez (DB string olarak saklar).

---

### 10.4 DueDate Timezone

**Risk:** Kullanıcı farklı timezone'da göreve tarih atarsa tarih kaymaya uğrayabilir.

**Çözüm (Faz 1):** Sadece gün seçimi yapılır; saat bileşeni yok sayılır. Frontend seçilen günü UTC midnight olarak gönderir (`2026-03-15T00:00:00Z`). Gösterirken `toLocaleDateString` kullanılır; kaymaya gerek kalmaz.

---

### 10.5 Sıralama Değişikliği Kullanıcı Şaşkınlığı

**Risk:** Mevcut kullanıcılar listeyi farklı sıralanmış görünce şaşırabilir.

**Çözüm:** Yeni sıralama mantıklıdır (pinned > priority > dueDate > createdAt). Patlak bir değişiklik değil; kullanıcılar genellikle iyileştirme olarak algılar.

---

## Özet: Değişim Haritası

```
DEĞİŞMEZ                          YENİ / GÜNCELLENIR
──────────────────────────────   ──────────────────────────────────────
HTTP endpoint URL'leri            Models/Todo.cs            (4 yeni alan)
GET /health                       DTOs/CreateTodoRequest.cs (4 opsiyonel alan)
Mevcut 6 endpoint davranışı       DTOs/UpdateTodoRequest.cs (4 alan)
InMemoryTodoRepository            EfTodoRepository.cs       (Add + Update)
Entegrasyon test kabul kriterleri AppDbContext.cs           (yeni kolonlar)
                                  Migrations/               (yeni migration)
                                  Program.cs                (pin endpoint)
                                  ─────────────────────────────────────
                                  types/todo.ts             (genişletilmiş)
                                  TodoFormScreen.tsx        (yeni form alanları)
                                  TodoListScreen.tsx        (sıralama + kart)
                                  TaskDetailScreen.tsx      (detay gösterimi)
```

**Yeni backend dosyası:** İsteğe bağlı `TodoPriority.cs` enum dosyası (veya `Models/` içine inline)
**Yeni migration:** `AddTaskManagementFields`
**Backend değişikliği kapsamı:** Küçük — yeni enum, DTO genişletmesi, 1 yeni endpoint, sıralama değişikliği
**Frontend değişikliği kapsamı:** Orta — form alanları, kart görünümü, detay görünümü
