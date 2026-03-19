# Native DateTime Picker — Mimari Tasarım

Versiyon: 1.0  
Tarih: 2026-03-19  
Hazırlayan: Architect Agent  
Hedef Sürüm: v0.9.0  
İlgili Spec: `docs/datetime-picker-spec.md`

---

## 1. Paket Kararı

### Seçilen Paket

`@react-native-community/datetimepicker`

### Gerekçe

| Kriter | Değerlendirme |
|--------|---------------|
| Expo managed workflow desteği | Expo SDK 50+ ile resmi olarak desteklenir; `expo install` ile native rebuild gerekmeden entegre edilir |
| Platform kapsamı | iOS + Android native picker sağlar |
| Bakım durumu | React Native Community tarafından aktif bakımda; Expo'nun önerilen paketidir |
| Alternatif (`expo-date-picker` vb.) | Üçüncü parti; daha az bakımlı, managed workflow'da belirsiz |

### Kurulum Komutu

```bash
npx expo install @react-native-community/datetimepicker
```

`expo install` kullanılmalıdır; `npm install` değil. Expo SDK versiyonuyla uyumlu paketi otomatik seçer.

### TypeScript Tipi

Paket kendi `@types` tanımlarını içerir; ekstra `@types/...` kurulumu gerekmez.

---

## 2. Platform Stratejisi

### 2.1 iOS

iOS'ta `mode="datetime"` tek picker ile hem tarih hem saat seçilebilir. Ancak bu mod inline spinner'ı arka arkaya gösterir ve form içinde alan kaplar. Bu nedenle **iki aşamalı akış** tercih edilmiştir:

1. Tetikleyiciye dokunulduğunda `mode="date"` picker açılır.
2. Kullanıcı tarihi onayladıktan sonra otomatik olarak `mode="time"` picker geçer.
3. Saat de onaylandığında picker kapanır, değer form state'ine yazılır.

**Neden tek `mode="datetime"` değil?**
- Tutarlılık: Android `mode="datetime"` desteklemez. Platform farkını minimuma indirmek için her iki platformda da iki aşamalı akış kullanmak kod tekrarını azaltır.
- UX kontrolü: Kullanıcı iki ayrı adımda tarih ve saati açıkça seçer; yanlışlıkla onaylama riski düşer.

### 2.2 Android

Android'de `DateTimePicker` daima modal dialog olarak açılır. `mode="datetime"` **desteklenmez**; birleşik seçim için iki ayrı modal çağrısı yapılmalıdır.

Android akışı:
1. Tetikleyiciye dokunulduğunda `mode="date"` modal açılır.
2. Kullanıcı tarihi onayladığında (`onChange` event'i `action === 'set'` ile gelir) tarih seçilen `Date` nesnesine yazılır ve hemen `mode="time"` modal açılır.
3. Saat de onaylandığında picker kapanır, birleştirilen değer form state'ine yazılır.
4. Herhangi bir adımda iptal edilirse (`action === 'dismissed'`) picker kapanır, değer değişmez.

---

## 3. Bileşen Tasarımı

### 3.1 Karar: Ayrı Bileşen (`DateTimePickerField`)

`TodoFormScreen`'e inline state koymak yerine yeniden kullanılabilir bir bileşen oluşturulmalıdır.

**Gerekçeler:**
- `DateTimePickerField` ileride başka formlarda da kullanılabilir (örn. tekrarlayan görev ekranı).
- Platform dallanma mantığı (`Platform.OS === 'ios'`) tek yerde kapsüllenir.
- `TodoFormScreen` sadece `dueDate` state'ini tutar; picker açık/kapalı state'leri bileşen içinde kalır.

### 3.2 Bileşen Konumu

```
mobile/src/components/DateTimePickerField.tsx
```

### 3.3 Props Arayüzü

```typescript
interface DateTimePickerFieldProps {
  /** Seçili değer; null = henüz seçilmedi */
  value: Date | null;
  /** Kullanıcı tarih+saat seçimini tamamladığında çağrılır */
  onChange: (date: Date | null) => void;
  /** Picker tetikleyicisi devre dışı mı? (form kaydetme sırasında) */
  disabled?: boolean;
  /** Placeholder metni; value null iken gösterilir */
  placeholder?: string;
}
```

### 3.4 Bileşen Render Yapısı

```
DateTimePickerField
├── TouchableOpacity (tetikleyici satır)
│   ├── Ionicons  calendar-outline  (sol ikon)
│   ├── Text      değer veya placeholder
│   └── TouchableOpacity  (sağda × temizle; sadece value !== null iken)
└── DateTimePicker  (platform native; sadece picker açıkken render edilir)
```

Picker gösterimi için **koşullu render** (`showDatePicker && <DateTimePicker .../>`) yöntemi kullanılır. Modal overlay değil; React Native'in kendi native modal'ına bırakılır.

---

## 4. State Yönetimi

### 4.1 Bileşen İçi State

`DateTimePickerField` içinde tutulacak state'ler:

```typescript
// Picker hangi aşamada?
type PickerPhase = 'date' | 'time' | 'closed';

const [phase, setPhase] = useState<PickerPhase>('closed');

// Android'de date → time geçişinde tarihi geçici tut
const [pendingDate, setPendingDate] = useState<Date | null>(null);
```

### 4.2 Akış Diyagramı

```
Tetikleyiciye dokunuldu
        │
        ▼
phase = 'date'
DateTimePicker mode="date" göster
        │
   ┌────┴────────────────────────────────┐
   │ onChange çağrıldı                   │
   │                                     │
   │  action === 'dismissed'?     NO     │
   │       │                             │
   │      YES                    selectedDate kaydet
   │       │                     pendingDate = selectedDate
   │  phase = 'closed'           phase = 'time'
   │  değer değişmez             DateTimePicker mode="time" göster
   └────────────────────────────────┐
                                    │
                               ┌────┴──────────────────────────┐
                               │ onChange çağrıldı             │
                               │                               │
                               │  action === 'dismissed'?  NO  │
                               │       │                       │
                               │      YES               pendingDate + time birleştir
                               │       │                props.onChange(combined)
                               │  phase = 'closed'      phase = 'closed'
                               └───────────────────────────────┘
```

### 4.3 TodoFormScreen'deki State Değişikliği

Mevcut:
```typescript
const [dueDateText, setDueDateText] = useState<string>('...');
const [dueDate, setDueDate] = useState<string | null>(null);
```

Yeni:
```typescript
const [dueDate, setDueDate] = useState<Date | null>(
  editTodo?.dueDate ? new Date(editTodo.dueDate) : null
);
```

`dueDateText` state'i tamamen kaldırılır. `DateTimePickerField` tek kaynak (`dueDate: Date | null`) ile çalışır.

---

## 5. Veri Formatı

### 5.1 State Tipi: `Date | null`

`TodoFormScreen`'deki `dueDate` state'i **`Date | null`** tutmalıdır; `string | null` değil.

**Gerekçe:**
- Native picker `Date` nesnesi ile çalışır. Her render'da `string → Date` parse maliyeti gereksizdir.
- `DateTimePickerField` zaten `Date | null` alır ve döndürür.
- `isOverdue` gibi karşılaştırmalar da `Date` nesnesiyle daha doğaldır.

### 5.2 Dönüşüm Noktası: `handleSave`

`Date → ISO 8601 UTC string` dönüşümü yalnızca **kaydetme anında**, `handleSave` içinde yapılır:

```typescript
dueDate: dueDate ? dueDate.toISOString() : null
```

Bu nokta tek dönüşüm noktasıdır. Bileşen içinde veya onChange'de dönüşüm yapılmaz.

### 5.3 Backend Sözleşmesi

Backend API değişmez. `dueDate` alanı `DateTime?` (ISO 8601 UTC string) olarak kabul edilmeye devam eder. `toISOString()` her zaman UTC format üretir (`2026-03-15T14:30:00.000Z`); timezone kayması riski yoktur.

### 5.4 Düzenleme Modu Başlangıç Değeri

`editTodo.dueDate` (ISO string) → `new Date(editTodo.dueDate)` dönüşümü `useState` başlangıç değerinde yapılır. Bu tek seferlik parse kabul edilebilirdir.

---

## 6. `formatDate` Yardımcısı

### 6.1 Karar: Ortak Utility'ye Taşı

`formatDate(iso: string)` şu an hem `TodoListScreen` hem `TaskDetailScreen` içinde **aynı kodu** tekrar eder. Bu fonksiyon ortak bir utility dosyasına taşınmalıdır.

**Hedef konum:**
```
mobile/src/utils/formatDate.ts
```

### 6.2 Yeni İmza

```typescript
export function formatDate(iso: string): string
```

### 6.3 Saat Gösterimi Mantığı (FR-6, FR-7)

Spec'te tanımlanan kural: saat bilgisi `00:00 UTC`'den farklıysa saat de gösterilir.

```
Gelen ISO string → new Date(iso)
                       │
              getUTCHours() === 0 &&
              getUTCMinutes() === 0
                       │
            ┌──────────┴──────────┐
           YES                   NO
            │                     │
  "GG.AA.YYYY"          "GG.AA.YYYY HH:mm"
  (sadece tarih)         (tarih + saat — cihaz local saati)
```

Saat görüntüsü **cihazın local timezone**'una göre formatlanır (`toLocaleString` veya `toLocaleDateString` + `toLocaleTimeString` kombinasyonu, locale `tr-TR`).

### 6.4 Import Güncellemesi

`TodoListScreen` ve `TaskDetailScreen` içindeki inline `formatDate` fonksiyonları kaldırılır; yerine `import { formatDate } from '../utils/formatDate'` eklenir.

---

## 7. Token Entegrasyonu

`DateTimePickerField` tetikleyici satırı aşağıdaki token değerlerini kullanmalıdır:

| Özellik | Token | Değer |
|---------|-------|-------|
| Satır yüksekliği | `sizes.dateTimeField` | `48` |
| Arka plan rengi | `colors.surfaceInput` | `#162040` |
| Ana metin rengi | `colors.textOnDark` | `#FFFFFF` |
| Placeholder metin rengi | `colors.textOnDarkSecondary` | `#8FA8C8` |
| Kenarlık radius | `radius.md` | `12` |
| Yatay padding | `spacing.lg` | `16` |

Tetikleyici stil örneği (Frontend Dev'e referans):

```typescript
trigger: {
  height: sizes.dateTimeField,          // 48
  backgroundColor: colors.surfaceInput, // '#162040'
  borderRadius: radius.md,              // 12
  paddingHorizontal: spacing.lg,        // 16
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.sm,                      // 8
},
triggerText: {
  flex: 1,
  fontSize: fontSize.body,             // 14
  color: colors.textOnDark,            // '#FFFFFF'
},
triggerPlaceholder: {
  color: colors.textOnDarkSecondary,   // '#8FA8C8'
},
```

`TodoFormScreen` içinde bu bileşen, mevcut `FormField` (Son Tarih) ile "Tarihi Temizle" `TouchableOpacity` birlikte **silinip** yerlerine `DateTimePickerField` konur.

---

## 8. Etkilenen Dosyalar Özeti

| Dosya | Değişiklik Türü |
|-------|----------------|
| `mobile/src/components/DateTimePickerField.tsx` | **Yeni dosya** — picker bileşeni |
| `mobile/src/utils/formatDate.ts` | **Yeni dosya** — ortak tarih formatter |
| `mobile/src/screens/TodoFormScreen.tsx` | **Güncelleme** — `dueDateText` state kaldırılır, `dueDate` tipi `Date | null` olur, `DateTimePickerField` entegre edilir |
| `mobile/src/screens/TodoListScreen.tsx` | **Güncelleme** — inline `formatDate` kaldırılır, utility import edilir |
| `mobile/src/screens/TaskDetailScreen.tsx` | **Güncelleme** — inline `formatDate` kaldırılır, utility import edilir |
| `package.json` / `package-lock.json` | **Güncelleme** — `@react-native-community/datetimepicker` eklenir |

---

## 9. Korunan Davranışlar

Bu feature aşağıdaki mevcut davranışları değiştirmez:

- `reminderOffset` / `dueDate` bağımlılığı (`notifications-architecture.md` §4): `dueDate` null iken reminder pasif kalır. `dueDate` temizlendiğinde `reminderOffset` null sıfırlanır. Bu mantık `TodoFormScreen`'de korunur.
- Backend API sözleşmesi: `dueDate: string | null` (ISO 8601 UTC).
- `isOverdue` hesaplama mantığı: hem `TodoListScreen` hem `TaskDetailScreen`'deki `isOverdue(dueDate, isCompleted)` fonksiyonu değişmez; zaten ISO string alarak `new Date()` ile karşılaştırır.

---

## 10. Kapsam Dışı

| Konu | Gerekçe |
|------|---------|
| Backend değişikliği | `dueDate: DateTime?` zaten var |
| Timezone dönüşümü / seçici | Standart `Date` API + `toISOString()` yeterli |
| "Tüm gün" modu | Sonraki sprint |
| Geçmiş tarih engeli | Ayrı feature |
| Web platform desteği | Expo managed workflow önceliği iOS/Android |
