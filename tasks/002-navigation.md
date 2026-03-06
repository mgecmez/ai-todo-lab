# Task List: 002 — React Navigation (Stack)

Source spec: Mini Feature — Screen Navigation
Stack: Expo React Native · React Navigation v7

Mevcut durum: `TodoListScreen` içinde conditional render ile `TodoFormScreen` gösteriliyor.
Hedef: Her ekran ayrı bir route; `navigation.navigate()` / `navigation.goBack()` ile geçiş.

---

## NAV-001
**Owner:** Architect
**Title:** Navigation mimarisi ve route sözleşmesi tasarımı

### Description
Kodlamaya başlamadan önce navigation yapısını ve ekranlar arası parametre sözleşmesini belgelemek.
Uygulama sadece iki ekrana sahip; basit bir `NativeStack` yeterli.

### Steps
1. Navigator tipini seç ve gerekçelendir (`@react-navigation/native-stack` — performans, native header).
2. Route isimlerini ve TypeScript tip sözleşmesini tanımla:
   - `TodoList` → parametre yok
   - `TodoForm` → `{ editTodo?: Todo }` (opsiyonel; create modunda `undefined`)
3. Header stratejisini belirle:
   - `TodoList`: başlık "Görevlerim", "+" butonu header'da
   - `TodoForm`: başlık "Yeni Görev" / "Görevi Düzenle" (mode'a göre dinamik), geri ok otomatik
4. Liste yenileme stratejisini belgele:
   - `TodoListScreen` → `useFocusEffect` ile her odaklanmada `getTodos()` çağrısı
5. Tasarımı `docs/navigation-design.md` dosyasına kaydet.

### Acceptance Criteria
- [ ] Route isimleri ve TypeScript param tipleri dokümante edildi
- [ ] Header stratejisi (hangi ekranda ne gösterildiği) belgelendi
- [ ] Liste yenileme yöntemi belgelendi
- [ ] `docs/navigation-design.md` oluşturuldu

---

## NAV-002
**Owner:** Frontend
**Title:** React Navigation paketlerini kur ve temel yapıyı ayağa kaldır

### Description
Gerekli npm paketlerini yükle ve `App.tsx`'te `NavigationContainer` + `NativeStack.Navigator`
iskeletini oluştur. Bu ticket sonunda uygulama derlenmeli; içerik henüz değişmeyebilir.

### Steps
1. Paketleri yükle:
   ```
   npx expo install @react-navigation/native @react-navigation/native-stack
   npx expo install react-native-screens react-native-safe-area-context
   ```
2. `src/navigation/types.ts` dosyasını oluştur:
   - `RootStackParamList` tipini tanımla (NAV-001 sözleşmesine göre)
   - `NativeStackScreenProps` helper tiplerini export et
3. `App.tsx`'i güncelle:
   - `NavigationContainer` ile wrap
   - `createNativeStackNavigator<RootStackParamList>()` ile navigator oluştur
   - `TodoList` ve `TodoForm` screen tanımlarını ekle (component henüz eskisi)
   - Mevcut `SafeAreaView` + custom header yapısını kaldır (navigation header devralacak)
4. `npx expo start` ile uygulama açılıyor mu kontrol et, hata yok mu doğrula.

### Acceptance Criteria
- [ ] `@react-navigation/native-stack` ve bağımlılıkları `package.json`'da
- [ ] `src/navigation/types.ts` mevcut ve `RootStackParamList` export ediyor
- [ ] `App.tsx` `NavigationContainer` kullanıyor
- [ ] `npx expo start` ile uygulama açılıyor, konsol hatası yok

---

## NAV-003
**Owner:** Frontend
**Title:** TodoListScreen'i navigation-aware ekrana dönüştür

### Description
`TodoListScreen` şu an kendi içinde `form` state tutarak `TodoFormScreen`'i conditional render ediyor.
Bu state ve conditional render kaldırılacak; navigasyon ile değiştirilecek.

### Steps
1. `NativeStackScreenProps<RootStackParamList, 'TodoList'>` tipini ekle.
2. İçerideki `form: FormMode` state'ini ve tüm form conditional render bloklarını kaldır.
3. FAB (+) `onPress`: `navigation.navigate('TodoForm', {})` olarak güncelle.
4. Her `TodoItem`'da "Düzenle" tıklaması: `navigation.navigate('TodoForm', { editTodo: todo })`.
5. `useFocusEffect` + `useCallback` ile her ekran odaklanmasında `getTodos()` çağır
   (liste yenileme — form'dan geri dönünce listeyi tazele).
6. Artık kullanılmayan `form` state ve `TodoFormScreen` import'unu temizle.

### Acceptance Criteria
- [ ] `form: FormMode` state'i yok, conditional `TodoFormScreen` render'ı yok
- [ ] FAB (+) tıklayınca `TodoForm` ekranına geçiş yapıyor
- [ ] Bir todo'ya tıklayınca `TodoForm` ekranı `editTodo` parametresiyle açılıyor
- [ ] Listeden form'a gidip geri dönünce liste yenileniyor (yeni / güncel todo görünüyor)
- [ ] `npx tsc --noEmit` hata vermiyor

---

## NAV-004
**Owner:** Frontend
**Title:** TodoFormScreen'i route params ve navigation ile yönet

### Description
`TodoFormScreen` şu an `editTodo?`, `onSuccess`, `onCancel` prop'larıyla çalışıyor.
Navigation'a geçince bu prop'lar kaldırılacak; `route.params` ve `navigation.goBack()` kullanılacak.

### Steps
1. Prop interface'ini kaldır; `NativeStackScreenProps<RootStackParamList, 'TodoForm'>` tipini ekle.
2. `editTodo` verisini `route.params.editTodo` üzerinden oku.
3. `onSuccess()` çağrılarını → `navigation.goBack()` ile değiştir.
4. `onCancel()` çağrılarını → `navigation.goBack()` ile değiştir.
5. Ekran başlığını mod'a göre dinamik ayarla:
   ```typescript
   navigation.setOptions({
     title: editTodo ? 'Görevi Düzenle' : 'Yeni Görev',
   });
   ```
6. `npx tsc --noEmit` ile tip hatası olmadığını doğrula.

### Acceptance Criteria
- [ ] `onSuccess` / `onCancel` prop'ları yok; navigation üzerinden yönetiliyor
- [ ] Create modunda başlık "Yeni Görev", edit modunda "Görevi Düzenle"
- [ ] Kaydet / güncelle sonrası `navigation.goBack()` ile listeye dönülüyor
- [ ] İptal butonu `navigation.goBack()` ile listeye dönüyor
- [ ] `npx tsc --noEmit` hata vermiyor

---

## NAV-005
**Owner:** Frontend
**Title:** Header'ı konfigüre et ve görsel tutarlılığı sağla

### Description
Native stack header devreye girdi; mevcut custom `View + Text` header App.tsx'ten kaldırıldı.
Her iki ekranın header görünümü ve davranışı navigation options ile tamamlanacak.

### Steps
1. Stack.Navigator'da global header stilini ayarla:
   - Arka plan rengi, başlık rengi, font ağırlığı (mevcut tasarımla tutarlı).
2. `TodoList` ekranı header options:
   - `title: "Görevlerim"`
   - `headerRight`: "+" (Yeni Görev) butonu — FAB'ı oraya taşımak yerine ikisi birden
     kalabilir; tercih Architect kararına bırakılır (NAV-001 kararı).
3. `TodoForm` ekranı header options:
   - `title` dinamik (NAV-004'te `navigation.setOptions` ile yapılıyor)
   - Geri ok otomatik gösteriliyor; ek bir İptal butonu header'da isteniyorsa `headerLeft` ile ekle.
4. `App.tsx`'teki artık kullanılmayan `styles.header` / `styles.headerTitle` stillerini sil.
5. Uygulamayı iOS ve Android görünümünde test et (simulator / Expo Go).

### Acceptance Criteria
- [ ] `App.tsx`'te custom header `View` bloğu yok
- [ ] Her iki ekranda native header görünüyor, başlık doğru
- [ ] `TodoForm` ekranında native geri oku çalışıyor (tıklanınca listeye dönüyor)
- [ ] Görsel: renk, font ağırlığı mevcut tasarımla tutarlı

---

## NAV-006
**Owner:** Tester
**Title:** Navigation akışlarını E2E test güncelleme ve manuel doğrulama

### Description
Navigation eklendikten sonra mevcut Playwright E2E testleri (`tests/e2e/todo.spec.ts`)
ve manuel test listesi güncellenmeli. Yeni ekran geçiş davranışları kapsama alınmalı.

### Steps
1. Playwright E2E testini gözden geçir:
   - FAB (+) tıklaması artık yeni bir sayfaya navigate ediyor — `page.getByText('Yeni Görev')` beklentisi hâlâ geçerli mi kontrol et.
   - "Kaydet" sonrası liste ekranına dönüş: `page.getByText('Görevlerim')` görünüyor mu doğrula.
   - Geri navigasyon için gerekiyorsa `page.goBack()` veya native back button selektörü ekle.
2. Gerekiyorsa `todo.spec.ts`'deki adımları güncelle; hâlâ geçen adımları dokunmadan bırak.
3. Manuel test senaryoları:
   - Uygulama açılır → "Görevlerim" başlıklı liste ekranı gelir
   - "+" tıklanır → "Yeni Görev" başlıklı form ekranı açılır, native geri ok var
   - Form doldurulup kaydedilir → liste ekranına dönülür, yeni todo listede görünür
   - Bir todo tıklanır → "Görevi Düzenle" başlıklı form açılır, alanlar dolu
   - Güncelleme yapılır → listeye dönülür, değişiklik yansır
   - Geri ok tıklanır → kaydedilmeden listeye dönülür
   - `npm run test:e2e` çalıştırılır, tüm testler geçer
4. Bulunan hataları `bugs/nav-*.md` dosyası açarak raporla.

### Acceptance Criteria
- [ ] `npm run test:e2e` → 2/2 test geçiyor (güncelleme gerektiriyorsa güncellendi)
- [ ] Manuel: liste → form → geri → liste akışı düzgün çalışıyor
- [ ] Manuel: create sonrası liste yenileniyor
- [ ] Manuel: edit sonrası güncel veri listede görünüyor
- [ ] Manuel: native back button ile çıkış çalışıyor
- [ ] Tespit edilen hatalar raporlandı

---

## Özet

| Ticket  | Owner     | Başlık                                              | Bağımlılık     |
|---------|-----------|-----------------------------------------------------|----------------|
| NAV-001 | Architect | Navigation mimarisi ve route sözleşmesi             | —              |
| NAV-002 | Frontend  | Paket kurulumu ve NavigationContainer iskeleti      | NAV-001        |
| NAV-003 | Frontend  | TodoListScreen → navigation-aware                   | NAV-002        |
| NAV-004 | Frontend  | TodoFormScreen → route params + goBack()            | NAV-002        |
| NAV-005 | Frontend  | Header konfigürasyonu ve görsel tutarlılık          | NAV-003, NAV-004 |
| NAV-006 | Tester    | E2E test güncellemesi ve manuel doğrulama           | NAV-005        |

**Dependency sırası:**
NAV-001 → NAV-002 → NAV-003 ┐
                              ├→ NAV-005 → NAV-006
              NAV-002 → NAV-004 ┘
