# 003 — UI Redesign

Referans: `docs/design-system.md`, `docs/component-list.md`, `docs/screen-list.md`, `docs/design-spec.md`

Amaç: Designer tarafından belirlenen yeni görsel dili mevcut çalışan uygulamaya aşamalı olarak uygulamak.

---

## Faz Planı

| Faz | Kapsam | Durum |
|-----|--------|-------|
| **FAZ 1** | Gradient, kart redesign, search bar, FAB, form güncelleme, task detail ekranı | Şimdi uygulanacak |
| **FAZ 2** | Bottom navigation, bottom sheet modal, pin özelliği, transparent header polish | Sonraya bırakıldı |

**Kural:** Mevcut CRUD işlevselliği (create, edit, toggle, delete) hiçbir ticket'ta bozulmamalıdır.

---

---

# FAZ 1

---

## DESIGN-001 — expo-linear-gradient kurulumu

**Owner:** Frontend Developer
**Bağımlılık:** Yok — ilk yapılacak ticket

### Amaç

`expo-linear-gradient` paketini projeye ekle. Tüm ekran arka planları bu paketle üretilecek.

### Dosyalar

- `mobile/package.json`

### Kabul Kriterleri

- [ ] `expo install expo-linear-gradient` komutu çalıştırılmış
- [ ] `package.json` bağımlılıklara eklenmiş
- [ ] `import { LinearGradient } from 'expo-linear-gradient'` herhangi bir dosyada hata vermeden çalışıyor
- [ ] iOS ve Android'de gradient render ediliyor (Expo Go ile doğrulanabilir)

---

## DESIGN-002 — Design token dosyası oluştur

**Owner:** Frontend Developer
**Bağımlılık:** Yok — DESIGN-001 ile paralel yapılabilir

### Amaç

`docs/design-system.md` bölüm 8'deki token objelerini tek bir kaynak dosyasına al. Tüm ekran ve component'ler renk, spacing ve radius değerlerini buradan import edecek. Magic number kullanımı sona erecek.

### Dosyalar

- `mobile/src/theme/tokens.ts` (**yeni dosya**)

### İçerik

Token objelerini `docs/design-system.md` → Bölüm 8 "Design Tokens" kısmından al:
- `colors` (gradient, surface, primary, action, status, text)
- `spacing` (xs → 3xl)
- `radius` (sm, md, lg, actionBtn, full)
- `fontSize` (tüm typography scale)

### Kabul Kriterleri

- [ ] `src/theme/tokens.ts` dosyası oluşturulmuş
- [ ] `colors`, `spacing`, `radius`, `fontSize` named export edilmiş
- [ ] TypeScript hata yok (`npx tsc --noEmit`)
- [ ] Dosya başka herhangi bir yerden import edildiğinde çalışıyor

---

## DESIGN-003 — ScreenGradient component oluştur

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-001, DESIGN-002

### Amaç

`LinearGradient`'ı saran, tüm ekranlarda tekrar kullanılabilen `ScreenGradient` wrapper component'i yaz. Gradient değerleri token'lardan gelecek.

### Dosyalar

- `mobile/src/components/ScreenGradient.tsx` (**yeni dosya**)

### Davranış

- `flex: 1`, `colors: [colors.gradientTop, colors.gradientBottom]`, `start: {x:0, y:0}`, `end: {x:0, y:1}`
- `children` prop alır; içeriği render eder
- Başka bir prop almaz (YAGNI)

### Kabul Kriterleri

- [ ] Component oluşturulmuş ve TypeScript hatası yok
- [ ] Herhangi bir ekranda kullanıldığında `#1B3A7A → #0A1628` gradient görünüyor
- [ ] iOS ve Android'de render doğru

---

## DESIGN-004 — RootNavigator header stillerini güncelle

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-002

### Amaç

`RootNavigator.tsx` içindeki `screenOptions` değerlerini yeni design system'a uyarla. Özellikle header arka planını gradient ekranlarla uyumlu hale getir.

### Dosyalar

- `mobile/src/navigation/RootNavigator.tsx`

### Değişiklikler

Mevcut `screenOptions` içinde:

| Property | Eski değer | Yeni değer |
|----------|-----------|-----------|
| `headerStyle.backgroundColor` | `#fff` | `#0A1628` (gradient bottom — koyu nav ile uyumlu) |
| `contentStyle.backgroundColor` | `#fff` | `transparent` (ScreenGradient arkada gösterilecek) |
| `headerTitleStyle.color` | `#222` | `#FFFFFF` |
| `headerTintColor` | `#2563eb` | `#FFFFFF` |

`headerShadowVisible` ve `headerBackButtonDisplayMode: 'minimal'` değişmez.

### Kabul Kriterleri

- [ ] Header arka planı koyu navy; mevcut beyaz arka plan yok
- [ ] Header başlık ve geri butonu beyaz
- [ ] `TodoForm` ekranına geçişte geri butonu görünüyor ve çalışıyor
- [ ] Mevcut navigate/goBack işlevselliği bozulmamış

---

## DESIGN-005 — TodoListScreen: ScreenGradient + TaskCard redesign

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-002, DESIGN-003

### Amaç

`TodoListScreen`'in tüm görsel katmanını yenile:
- Düz beyaz arka plan → `ScreenGradient`
- `TodoItem` → `TaskCard` (beyaz kart, shadow, chevron, meta text)
- Ekran başlığı ("Görevlerim") artık native header yerine screen body içinde `Text` olarak render edilecek (FAZ 2'de bottom nav gelene kadar native header kalabilir — bu ticket'ta native header korunur, sadece title stili güncellenir)

### Dosyalar

- `mobile/src/screens/TodoListScreen.tsx`

### Görsel Değişiklikler

**Ekran arka planı:**
- Mevcut `<View style={styles.container}>` → `<ScreenGradient>` wrapper

**TaskCard (TodoItem yeniden tasarımı):**
- `backgroundColor: '#FFFFFF'`
- `borderRadius: 12`
- `paddingVertical: 16, paddingHorizontal: 16`
- `marginBottom: 10`
- Shadow: `shadowOpacity: 0.15, shadowRadius: 6, elevation: 3`
- Title: `fontSize: 15, fontWeight: '600', color: '#0A1628'`
- Meta satırı: tarih + saat birleşik, `fontSize: 12, color: '#7A8DA0'`
- Sağ taraf: `Ionicons 'chevron-forward'` (mevcut trash icon'u yerinden kalkmaz — hâlâ erişilebilir olmalı)
- Checkbox: beyaz kart içinde `color: '#0A1628'` veya mevcut mavi

**Empty state:**
- Text: `color: '#8FA8C8'`

**Loading state:**
- `ActivityIndicator` color: `#FFFFFF`

**Error state:**
- Text ve buton renkleri değişmez (`#c0392b` kalır — bu renk gradient üzerinde okunabilir)

### Kabul Kriterleri

- [ ] Ekran gradient arka plana sahip
- [ ] Her todo kartı beyaz, yuvarlak köşeli, shadow'lu
- [ ] Kart başlığı koyu, meta text muted blue-grey
- [ ] Kart sağında chevron ikonu var
- [ ] Delete (trash) ikonu hâlâ erişilebilir ve çalışıyor (kart içinde veya swipe/long-press ile — tasarım tercihine göre)
- [ ] Toggle (checkbox) işlevi çalışıyor
- [ ] Empty state ve Error state render ediliyor
- [ ] `npm run test:e2e` geçiyor (veya selector güncellemesi DESIGN-011'e erteleniyor)

---

## DESIGN-006 — SearchBar component oluştur ve listeye entegre et

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-002, DESIGN-005

### Amaç

`docs/design-spec.md` → SearchBar bölümüne uygun, koyu navy arka planlı search bar bileşeni oluştur. Client-side filtreleme yapar (backend search endpoint yok).

### Dosyalar

- `mobile/src/components/SearchBar.tsx` (**yeni dosya**)
- `mobile/src/screens/TodoListScreen.tsx` (entegre)

### Davranış

- `value` ve `onChangeText` prop alır (controlled input)
- Sol taraf: `Ionicons 'search-outline'`
- Placeholder: `"Görev ara..."` (veya `"Search by task title"`)
- `TodoListScreen` içinde search query state'i tutar; `todos` listesi client-side `title.toLowerCase().includes(query)` ile filtrelenir

### Görsel Spec (`docs/design-spec.md` SearchBar bölümü)

- `backgroundColor: '#162040'`
- `borderRadius: 12`
- `height: 48`
- `paddingHorizontal: 16`
- Placeholder color: `#4A6A8A`
- Input text color: `#FFFFFF`

### Kabul Kriterleri

- [ ] SearchBar görsel olarak spec'e uygun
- [ ] Yazı yazıldığında liste anlık filtreleniyor
- [ ] Query temizlendiğinde tam liste geri geliyor
- [ ] Boş sonuç durumunda empty state mesajı gösteriliyor
- [ ] TypeScript hata yok

---

## DESIGN-007 — FAB redesign

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-002, DESIGN-005

### Amaç

FAB'ı `docs/design-spec.md` → FAB bölümüne uyarla. Mevcut "+" `Text` karakteri → `Ionicons 'add'` ikonu. Shadow mavi glow efektine dönüşüyor.

### Dosyalar

- `mobile/src/screens/TodoListScreen.tsx`

### Değişiklikler

| Property | Eski | Yeni |
|----------|------|------|
| `backgroundColor` | `#2563eb` | `#2563EB` (aynı) |
| Label | `<Text>+</Text>` | `<Ionicons name="add" size={28} color="#FFFFFF" />` |
| `shadowColor` | `#000` | `#2563EB` |
| `shadowOpacity` | `0.25` | `0.4` |
| `shadowRadius` | `4` | `8` |
| `elevation` | `4` | `8` |
| `right` | `24` | `16` |

### Kabul Kriterleri

- [ ] FAB `Ionicons 'add'` ikonu gösteriyor
- [ ] Blue glow shadow iOS'ta görünüyor, Android'de elevation doğru
- [ ] FAB tıklandığında `TodoForm` ekranına navigate ediyor (mevcut işlev korunuyor)

---

## DESIGN-008 — TodoFormScreen: dark input theme uyarlaması

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-002, DESIGN-003

### Amaç

Create ve Edit formunu yeni görsel dile uyarla. Fonksiyonellik (create, edit, validation, goBack) değişmez; yalnızca görsel katman güncellenir.

### Dosyalar

- `mobile/src/screens/TodoFormScreen.tsx`

### Görsel Değişiklikler

**Ekran arka planı:**
- `<View>` → `<ScreenGradient>` wrapper

**Input alanları (Başlık + Açıklama):**
- `backgroundColor: '#162040'`
- `borderRadius: 12`
- `color: '#FFFFFF'` (input text)
- `placeholderTextColor: '#4A6A8A'`
- `borderColor` → error state hariç border yok (veya `borderColor: 'transparent'`)
- Error state: `borderWidth: 1, borderColor: '#F44336'`

**Label text:**
- `color: '#8FA8C8'`
- `fontSize: 14`

**Cancel butonu (İptal):**
- `borderColor: '#00BCD4'`
- `borderWidth: 1.5`
- Label: `color: '#00BCD4'`
- `backgroundColor: 'transparent'`

**Save/Update butonu (Kaydet / Güncelle):**
- `backgroundColor: '#26A69A'`
- Label: `color: '#FFFFFF', fontWeight: '600'`
- Disabled state: opacity `0.7`

**Validation error text:**
- `color: '#F44336'`

**Save error banner:**
- `color: '#F44336'`

### Kabul Kriterleri

- [ ] Ekran gradient arka plana sahip
- [ ] Input alanları koyu navy, beyaz text, doğru placeholder rengi
- [ ] Validation hatası görünüyor
- [ ] Cancel (teal outline) ve Save (teal-green fill) butonlar spec'e uygun
- [ ] Create ve Edit modu ikisi de çalışıyor (`navigation.goBack()` sonrası liste yenileniyor)
- [ ] `npm run test:e2e` geçiyor

---

## DESIGN-009 — Navigation: TaskDetail route ekle

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-002

### Amaç

`RootStackParamList`'e `TaskDetail` route'unu ekle ve `RootNavigator`'a screen kaydını yap. `TaskDetailScreen` henüz tam implement edilmemiş olabilir — placeholder kabul edilir.

### Dosyalar

- `mobile/src/navigation/types.ts`
- `mobile/src/navigation/RootNavigator.tsx`

### Route Parametreleri

```
TaskDetail: { todo: Todo }
```

Tam `Todo` objesi parametre olarak geçirilir (backend'e `GET /api/todos/:id` endpoint'i olmadığından params üzerinden veri taşınır).

### Kabul Kriterleri

- [ ] `types.ts`'e `TaskDetail` route ve `TaskDetailScreenProps` type'ı eklenmiş
- [ ] `RootNavigator.tsx`'e `<Stack.Screen name="TaskDetail" ... />` eklenmiş
- [ ] `TodoListScreen`'deki kart tıklama → `navigation.navigate('TaskDetail', { todo })` çalışıyor
- [ ] TypeScript hata yok

---

## DESIGN-010 — TaskDetailScreen oluştur

**Owner:** Frontend Developer
**Bağımlılık:** DESIGN-002, DESIGN-003, DESIGN-009

### Amaç

`docs/screen-list.md` → TaskDetailScreen bölümüne uygun yeni ekranı oluştur. Backend API'deki mevcut toggle ve delete endpoint'lerini kullanır.

### Dosyalar

- `mobile/src/screens/TaskDetailScreen.tsx` (**yeni dosya**)
- `mobile/src/navigation/RootNavigator.tsx` (header options güncelleme)

### Layout ve Componentler (`docs/design-spec.md` TaskDetailScreen bölümünden)

**Header:**
- `headerTransparent: true`
- `headerTintColor: '#FFFFFF'`
- `title: 'Task Details'`

**İçerik:**
1. **EditableTitleHeader** — görev başlığı (24sp, bold, beyaz) + edit ikonu (pencil — tıklandığında `TodoForm` edit moduna navigate eder)
2. **MetaRow** — `Ionicons 'calendar-outline'` + tarih, `Ionicons 'time-outline'` + saat (eğer task'ta varsa; yoksa tarih alanı gösterilmez)
3. **Description body** — açıklama metni (14sp, beyaz, opacity 0.9); açıklama yoksa gösterilmez
4. **ActionButton row** (alt kısım):
   - **Done** — `Ionicons 'checkmark-circle'`, `#4CAF50` → `PATCH /api/todos/:id/toggle`
   - **Delete** — `Ionicons 'trash'`, `#F44336` → Alert confirm → `DELETE /api/todos/:id` → `goBack()`
   - **Pin** — `Ionicons 'pin'`, `#FFC107` → FAZ 2'de implement edilecek; şimdilik `Alert.alert('Yakında', 'Pin özelliği yakında gelecek.')`

### Kabul Kriterleri

- [ ] Ekran gradient arka plana sahip
- [ ] EditableTitleHeader: başlık ve edit (pencil) ikonu görünüyor
- [ ] Edit ikonuna tıklamak → `TodoForm` edit modunu açıyor
- [ ] MetaRow: tarih alanı `createdAt`'ten formatlanmış olarak gösteriliyor
- [ ] Description body: `description` varsa gösteriliyor, yoksa görünmüyor
- [ ] Done butonu: toggle çalışıyor, başarı sonrası `goBack()` ile listeye dönüyor
- [ ] Delete butonu: confirm dialog → silme → `goBack()` → listede artık yok
- [ ] Pin butonu: "Yakında" alert gösteriyor
- [ ] TypeScript hata yok

---

## DESIGN-011 — E2E testleri güncelle

**Owner:** Tester
**Bağımlılık:** DESIGN-005 → DESIGN-010 (tümü tamamlandıktan sonra)

### Amaç

`mobile/tests/e2e/todo.spec.ts`'i yeni UI'a göre güncelle. Kart selector'ları değişti (beyaz kart, chevron), TaskDetail ekranı eklendi.

### Dosyalar

- `mobile/tests/e2e/todo.spec.ts`

### Güncellenecek Test Senaryoları

**Mevcut testlerin selector güncellemeleri:**
- FAB: `page.getByText('+')` → `page.locator('[accessible-label="add"]')` veya koordinat bazlı — yeni ikona göre güncelle
- TaskCard tıklama: mevcut `page.getByText(title).first().click()` muhtemelen çalışmaya devam eder

**Yeni eklenecek test:**
- **TaskDetail flow** — Bir todo oluştur → karta tıkla → TaskDetail açılıyor → "Task Details" header görünüyor → Delete → listede yok

**Korunacak testler (değişmeden çalışması beklenen):**
- Create flow
- Validation flow
- Toggle flow (selector değişebilir)
- Delete flow (API workaround hâlâ geçerli)

### Kabul Kriterleri

- [ ] `npm run test:e2e` 6/6 (veya daha fazla) test geçiyor
- [ ] TaskDetail navigation testi geçiyor
- [ ] Tüm mevcut testler geçmeye devam ediyor

---

---

# FAZ 2 — Sonraya Bırakılanlar

Aşağıdaki özellikler FAZ 1 tamamlandıktan sonra ayrı bir sprint olarak planlanacaktır.

| Ticket ID | Başlık | Neden ertelendi |
|-----------|--------|-----------------|
| DESIGN-101 | Bottom Navigation Bar (4 tab) | Yeni navigation yapısı gerektirir; mevcut stack'ı etkiler |
| DESIGN-102 | CreateTask Bottom Sheet modal | `@gorhom/bottom-sheet` veya custom modal altyapısı; FAZ 1 kapsamı dışında |
| DESIGN-103 | Transparent header polish | `headerTransparent` + gradient geçişi; FAZ 1'de opak header kabul edilir |
| DESIGN-104 | Pin özelliği — backend + UI | Backend'de yeni alan (`isPinned`) gerektirir; API değişikliği |
| DESIGN-105 | Dark / Light mode toggle | Tasarım referansında yok; ilerisi için |

---

## Bağımlılık Grafiği — FAZ 1

```
DESIGN-001 (expo-linear-gradient)
    └── DESIGN-003 (ScreenGradient)
            ├── DESIGN-005 (TodoListScreen)
            │       └── DESIGN-006 (SearchBar)
            │       └── DESIGN-007 (FAB)
            └── DESIGN-008 (TodoFormScreen)

DESIGN-002 (tokens.ts)  ←── tüm ticket'lar buna bağımlı
    └── DESIGN-004 (RootNavigator header)
    └── DESIGN-009 (navigation types + TaskDetail route)
            └── DESIGN-010 (TaskDetailScreen)

DESIGN-010 (tümü tamamlandı)
    └── DESIGN-011 (E2E testler)
```

## Uygulama Sırası (Önerilen)

```
1. DESIGN-001 + DESIGN-002  (paralel)
2. DESIGN-003 + DESIGN-004 + DESIGN-009  (paralel)
3. DESIGN-005
4. DESIGN-006 + DESIGN-007 + DESIGN-008 + DESIGN-010  (paralel)
5. DESIGN-011
```
