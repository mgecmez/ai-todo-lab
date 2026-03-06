# Navigation Mimari Tasarımı

Versiyon: 1.0
Tarih: 2026-03-06
Hazırlayan: Architect Agent
İlgili Ticket: NAV-001

---

## 1. Navigation Stack Diyagramı

```
┌─────────────────────────────────────────────────────────────────┐
│  App.tsx — NavigationContainer                                  │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  createNativeStackNavigator<RootStackParamList>()         │  │
│  │                                                           │  │
│  │   Screen: "TodoList"           Screen: "TodoForm"         │  │
│  │  ┌─────────────────────┐      ┌─────────────────────┐    │  │
│  │  │  TodoListScreen     │ ───► │  TodoFormScreen      │    │  │
│  │  │                     │      │                      │    │  │
│  │  │  • Todo listesi     │      │  • Başlık input      │    │  │
│  │  │  • FAB (+)          │      │  • Açıklama input    │    │  │
│  │  │  • Toggle           │      │  • Kaydet butonu     │    │  │
│  │  │  • Sil              │      │  • Native geri ok    │    │  │
│  │  └─────────────────────┘      └─────────────────────┘    │  │
│  │        ▲                               │                  │  │
│  │        └───────── goBack() ───────────┘                  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Navigator seçimi: `@react-navigation/native-stack`**

| Alternatif | Neden seçilmedi |
|---|---|
| `@react-navigation/stack` (JS) | JS tabanlı animasyon; native-stack daha performanslı |
| Tab Navigator | Todo akışı doğrusaldır; sekme gereksiz |
| Drawer Navigator | İki ekran için aşırı karmaşık |

---

## 2. Screen Listesi

| Screen Adı | Route Key | Bileşen Dosyası | Amaç |
|---|---|---|---|
| Todo Listesi | `TodoList` | `src/screens/TodoListScreen.tsx` | Tüm todo'ları listeler; toggle ve sil aksiyonları |
| Todo Formu | `TodoForm` | `src/screens/TodoFormScreen.tsx` | Create ve edit modunu tek formda yönetir |

### Screen Özellikleri

#### `TodoList`
- **İlk ekran (initialRouteName)**
- Header: `"Görevlerim"` — statik başlık
- Header sağ: Yeni todo için `+` butonu (native `headerRight`)
- FAB: Listede de `+` butonu bulunabilir; `headerRight` ile birlikte çalışır
- Listeleme: `useFocusEffect` ile her odaklanmada API'den yenilenir

#### `TodoForm`
- Parametre moduna göre iki davranış:
  - **Create modu** → başlık `"Yeni Görev"`, alanlar boş
  - **Edit modu** → başlık `"Görevi Düzenle"`, alanlar `todo` verisiyle dolu
- Header sol: Native geri oku (otomatik — ek kod gerekmez)
- Başlık `navigation.setOptions()` ile `useEffect` içinde dinamik set edilir

---

## 3. Route Param Sözleşmesi

### 3.1 TypeScript Tip Tanımları

Kaynak: `src/navigation/types.ts`

```typescript
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { Todo } from '../types/todo';

// ── Stack parametre haritası ───────────────────────────────────────────────

export type RootStackParamList = {
  /**
   * Todo listesi ekranı — parametre almaz.
   */
  TodoList: undefined;

  /**
   * Create modu : { mode: 'create' }
   * Edit modu   : { mode: 'edit'; todo: Todo }
   */
  TodoForm: { mode: 'create' } | { mode: 'edit'; todo: Todo };
};

// ── Screen prop yardımcı tipleri ──────────────────────────────────────────

export type TodoListScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TodoList'
>;

export type TodoFormScreenProps = NativeStackScreenProps<
  RootStackParamList,
  'TodoForm'
>;
```

### 3.2 Parametre Kararları

| Karar | Gerekçe |
|---|---|
| `mode: 'create' \| 'edit'` discriminated union | Form bileşeni `if (params.mode === 'edit')` ile güvenli tip daralması yapabilir; `todo` alanına edit modunda erişim garantili |
| `mode: 'edit'` → `todo: Todo` (tam nesne, sadece ID değil) | Ekstra API çağrısını ortadan kaldırır; liste zaten nesneyi biliyor |
| `TodoList: undefined` | Parametresiz ekranlarda `undefined` kullanımı React Navigation best practice'i |

---

## 4. Navigation Akışları

### 4.1 Liste → Yeni Todo (Create)

```
Kullanıcı [FAB (+) veya headerRight (+)] tıklar
      │
      ▼
TodoListScreen
  navigation.navigate('TodoForm', { mode: 'create' })
      │
      ▼  [push animasyonu — sağdan girer]
TodoFormScreen
  • route.params.mode === 'create'
  • Başlık: "Yeni Görev"
  • Alanlar boş
      │
  [Kaydet]
      │  createTodo(request) → API
      ▼
  navigation.goBack()
      │
      ▼  [pop animasyonu — sağa çıkar]
TodoListScreen
  useFocusEffect → getTodos() tetiklenir
  Yeni todo listede görünür
```

### 4.2 Liste → Mevcut Todo Düzenle (Edit)

```
Kullanıcı [Todo öğesine tıklar]
      │
      ▼
TodoListScreen
  navigation.navigate('TodoForm', { mode: 'edit', todo: selectedTodo })
      │
      ▼  [push animasyonu]
TodoFormScreen
  • route.params.mode === 'edit'
  • route.params.todo → { id, title, description, isCompleted, ... }
  • Başlık: "Görevi Düzenle"
  • Alanlar todo değerleriyle dolu
      │
  [Güncelle]
      │  updateTodo(id, request) → API
      ▼
  navigation.goBack()
      │
      ▼  [pop animasyonu]
TodoListScreen
  useFocusEffect → getTodos() tetiklenir
  Güncel todo listede yansır
```

### 4.3 Form → İptal → Listeye Dönüş

```
Kullanıcı [Native geri ok veya İptal butonuna] basar
      │
      ▼
TodoFormScreen
  navigation.goBack()   ←── API çağrısı yapılmaz
      │
      ▼  [pop animasyonu]
TodoListScreen
  useFocusEffect tetiklenir (her odaklanmada)
  Liste yenilenir (değişiklik olmadıysa aynı kalır)
```

### 4.4 Liste Yenileme Stratejisi

```typescript
// TodoListScreen.tsx içinde (implementation hint)
useFocusEffect(
  useCallback(() => {
    // Ekran her odaklandığında (push'tan döndükten sonra dahil) çalışır
    loadTodos();
  }, [])
);
```

**Neden `useFocusEffect`?**

| Alternatif | Dezavantaj |
|---|---|
| `useEffect([], [])` | Sadece mount'ta çalışır; geri dönüşte tetiklenmez |
| Navigation event listener (`focus`) | Manuel cleanup gerektirir; `useFocusEffect` daha idiomatik |
| State geçirme / callback prop | Navigation katmanını kirleten anti-pattern |

---

## 5. Klasör Yapısı Önerisi

```
mobile/
├── App.tsx                          ← NavigationContainer + Stack tanımı
└── src/
    ├── navigation/
    │   └── types.ts                 ← RootStackParamList + screen props tipleri
    │
    ├── screens/
    │   ├── TodoListScreen.tsx       ← (mevcut — navigation-aware yapılacak)
    │   └── TodoFormScreen.tsx       ← (mevcut — route.params ile güncellenecek)
    │
    ├── services/
    │   └── api/
    │       ├── config.ts
    │       └── todosApi.ts
    │
    └── types/
        └── todo.ts                  ← Todo, CreateTodoRequest, UpdateTodoRequest
```

### Değişen Dosyalar (uygulama adımları)

| Dosya | Değişim | Ticket |
|---|---|---|
| `src/navigation/types.ts` | **Yeni** — `RootStackParamList` ve screen prop tipleri | NAV-002 |
| `App.tsx` | `NavigationContainer` + `NativeStack` ile yeniden yaz | NAV-002 |
| `src/screens/TodoListScreen.tsx` | Conditional form render → `navigate()` + `useFocusEffect` | NAV-003 |
| `src/screens/TodoFormScreen.tsx` | Props → `route.params` + `navigation.goBack()` | NAV-004 |

### Değişmeyen Dosyalar

| Dosya | Neden dokunulmaz |
|---|---|
| `src/types/todo.ts` | Veri modeli navigation'dan bağımsız |
| `src/services/api/todosApi.ts` | API katmanı navigation'dan bağımsız |
| `src/services/api/config.ts` | Konfigürasyon navigation'dan bağımsız |

---

## 6. Paket Bağımlılıkları

```bash
# Navigation core
npx expo install @react-navigation/native
npx expo install @react-navigation/native-stack

# Native bağımlılıklar (Expo managed workflow)
npx expo install react-native-screens
npx expo install react-native-safe-area-context
```

**Versiyon uyumluluk notu:**
Expo SDK 55 + React Native 0.83 ile React Navigation v7 uyumludur.
`react-native-screens` ve `react-native-safe-area-context` Expo tarafından yönetilen versiyonlarda kurulmalıdır (`npx expo install`, `npm install` değil).

---

## 7. Mimari Kararlar Özeti

| Karar | Seçim | Gerekçe |
|---|---|---|
| Navigator tipi | `native-stack` | Native performans, platform-native animasyon ve header |
| Ekran sayısı | 2 (TodoList, TodoForm) | YAGNI — şimdilik fazlası aşırı mühendislik |
| Form modu aktarımı | `mode: 'create' \| 'edit'` discriminated union | TypeScript tip güvenliği; edit'te `todo` garanti var |
| Todo nesnesinin aktarımı | Tam `Todo` nesnesi (ID değil) | Ekstra API round-trip yok |
| Liste yenileme | `useFocusEffect` | Geri dönüşte otomatik tetikleme, temiz kod |
| Header yönetimi | `navigation.setOptions()` | Ekrana özel header, bileşen içinden yönetim |

---

## 8. Sonraki Adımlar

| Ticket | Görev |
|---|---|
| **NAV-002** | `@react-navigation/native-stack` kur, `App.tsx`'i güncelle, `types.ts` oluştur |
| **NAV-003** | `TodoListScreen`'i navigation-aware yap (`navigate` + `useFocusEffect`) |
| **NAV-004** | `TodoFormScreen`'i `route.params` ve `goBack()` ile güncelle |
| **NAV-005** | Header konfigürasyonu ve görsel tutarlılık |
| **NAV-006** | E2E test güncellemesi ve manuel doğrulama |
