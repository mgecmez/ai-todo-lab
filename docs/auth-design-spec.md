# Auth Design Spec — LoginScreen ve RegisterScreen

Versiyon: 1.0
Tarih: 2026-03-13
Hazırlayan: UI/UX Designer
Baz Tasarım: Figma node 25:150 (Login), node 25:169 (Register)
Hedef Sürüm: v0.6.0

---

## 1. Genel Ekran Yapısı

Auth ekranları mevcut uygulamanın gradient sistemini kullanır. Bottom navigation bar bu ekranlarda yer almaz.

**Gradient:**
Figma orijinalinde `rgb(18,83,170)` → `rgb(5,36,62)` görünmüştür. Bu değerler mevcut tasarım sistemiyle karşılaştırıldığında renk farkı önemsizdir ve mevcut gradient token'ına uyum sağlamak için mevcut `#1B3A7A` → `#0A1628` token'ı kullanılır. Uygulamada tek bir gradient kimliği korunur.

```
LinearGradient
  colors: ['#1B3A7A', '#0A1628']   // gradient.screen — mevcut token
  start: { x: 0, y: 0 }
  end:   { x: 0, y: 1 }
  flex: 1
```

**Temel Layout Şablonu (her iki auth ekranı için):**

```
┌──────────────────────────────────┐
│  LinearGradient (flex: 1)        │
│                                  │
│  [StatusBar: light content]      │
│                                  │
│  KeyboardAvoidingView (flex: 1)  │
│  └── ScrollView                  │
│      └── View                    │
│          paddingHorizontal: 24   │
│          paddingTop: 60          │
│          paddingBottom: 40       │
│                                  │
│          Logo Alanı              │
│          Başlık                  │
│          Alt Başlık              │
│                                  │
│          Form Alanları           │
│                                  │
│          Ana Buton               │
│          Navigasyon Linki        │
└──────────────────────────────────┘
```

**ScrollView kullanım gerekçesi:** Klavye açıkken form içeriği kaymadan erişilebilir olmalıdır. `KeyboardAvoidingView` ile sarılmalıdır (`behavior='padding'` iOS, `behavior='height'` Android).

**StatusBar:** `barStyle="light-content"` — gradient üzerinde beyaz ikonlar.

---

## 2. Yeni Renk Token'ları

Mevcut `tokens.ts` dosyasına eklenmesi gereken token'lar. Hiçbiri mevcut token değeriyle çakışmamaktadır.

### Eklenmesi Gereken Token'lar

| Token Adı | Hex Değeri | Kullanım Yeri |
|-----------|-----------|---------------|
| `authButtonBg` | `#0EA5E9` | Auth ekranı ana buton arka planı |
| `authButtonPressed` | `#0284C7` | Auth buton basılı hali (koyu ton) |
| `surfaceAuthInput` | `#FFFFFF` | Auth ekranı input arka planı (beyaz) |
| `textAuthInput` | `#1A1A1A` | Auth input içinde yazılan metin |
| `textAuthPlaceholder` | `rgba(0,0,0,0.44)` | Auth input placeholder |
| `textAuthLink` | `#63D9F3` | "Kayıt Ol" / "Giriş Yap" vurgu link metni |
| `textAuthLinkMuted` | `rgba(255,255,255,0.80)` | Link satırındaki düz metin kısmı |
| `authInputIcon` | `rgba(0,0,0,0.44)` | Input sol ikonları (envelope, lock) |
| `errorBg` | `rgba(244,67,54,0.15)` | Hata mesajı arka planı |

**Dikkat:** `surfaceAuthInput` ve `surfaceInput` iki farklı bağlamı temsil eder. `surfaceInput` (#162040) koyu nav bağlamı içindir; `surfaceAuthInput` (#FFFFFF) yalnızca auth ekranlarında kullanılır.

---

## 3. Component Spec'leri

### 3.1 AuthInput

Auth ekranlarına özgü beyaz arka planlı, ikonlu text input.

**Boyut:**

| Özellik | Değer |
|---------|-------|
| width | `100%` |
| height | `42pt` |
| borderRadius | `5pt` — Figma referansından (mevcut `radius.sm` 8pt'nin altında, auth'a özgü) |
| paddingHorizontal | `12pt` |

**Renkler:**

| Özellik | Token | Değer |
|---------|-------|-------|
| backgroundColor | `surfaceAuthInput` | `#FFFFFF` |
| placeholder color | `textAuthPlaceholder` | `rgba(0,0,0,0.44)` |
| text color | `textAuthInput` | `#1A1A1A` |
| icon color | `authInputIcon` | `rgba(0,0,0,0.44)` |

**İkon Yerleşimi:**

```
┌──────────────────────────────────────────┐
│  [ikon 18pt] [gap: 8]  placeholder metin │
└──────────────────────────────────────────┘
```

İkon boyutu: `18pt`.

| Input | İkon (Ionicons) |
|-------|----------------|
| Email | `mail-outline` |
| Şifre | `lock-closed-outline` |
| Şifre Tekrar | `lock-closed-outline` |

Şifre inputlarında `secureTextEntry={true}`, `autoCapitalize='none'`.
Email inputunda `keyboardType='email-address'`, `autoCapitalize='none'`, `autoCorrect={false}`.

**State'ler:**

| State | Görsel Değişiklik |
|-------|------------------|
| `default` | Beyaz arka plan, soluk placeholder |
| `focused` | `borderWidth: 1.5`, `borderColor: '#0EA5E9'` |
| `error` | `borderWidth: 1.5`, `borderColor: '#F44336'` |
| `disabled` | `opacity: 0.55`, `editable={false}` |

**Touch target notu:** Input yüksekliği 42pt; iOS HIG 44pt minimumunun altındadır. Wrapper View'a `minHeight: 44` uygulanmalıdır.

---

### 3.2 AuthButton

Auth ekranlarına özgü tam genişlik, dolu mavi buton.

**Boyut:**

| Özellik | Değer |
|---------|-------|
| width | `100%` |
| height | `42pt` |
| borderRadius | `10pt` — Figma referansından |
| paddingHorizontal | `16pt` |

**State'ler:**

| State | backgroundColor | label color | opacity |
|-------|----------------|-------------|---------|
| `default` | `#0EA5E9` | `#FFFFFF` | 1.0 |
| `pressed` | `#0284C7` | `#FFFFFF` | 1.0 |
| `loading` | `#0EA5E9` | — (ActivityIndicator) | 0.70 |
| `disabled` | `#0EA5E9` | `#FFFFFF` | 0.50 |

**Typography:**

| Özellik | Değer |
|---------|-------|
| fontSize | `16pt` |
| fontWeight | `'600'` |
| color | `#FFFFFF` |
| textAlign | `'center'` |

**Loading state:** Label metni kaldırılır, merkeze `ActivityIndicator` (size `'small'`, color `#FFFFFF`) yerleştirilir. Buton `disabled={true}`.

---

### 3.3 AuthLinkText

Ekran altındaki navigasyon linki.

**Layout:** Tek satır, yatay ortalama (`textAlign: 'center'`).

**İki bölümlü metin:**
1. Düz kısım: `color: 'rgba(255,255,255,0.80)'`, `fontWeight: '400'`
2. Vurgu kısım: `color: '#63D9F3'`, `fontWeight: '600'`

**Typography:**

| Özellik | Değer |
|---------|-------|
| fontSize | `14pt` |
| minHeight | `44pt` (touch target) |
| paddingVertical | `8pt` |

| State | Görsel |
|-------|--------|
| `default` | Normal |
| `pressed` | `activeOpacity: 0.70` |

---

## 4. LoginScreen Layout

Ekran adı: `LoginScreen`
Navigasyon: Stack kökü (token yoksa buraya yönlendirilir)

**Dikey Eleman Sırası:**

```
LinearGradient (flex: 1)
└── KeyboardAvoidingView (flex: 1)
    └── ScrollView
        └── View (paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40)
            │
            ├── [Logo: Checkmark]
            │     width: 83, height: 83, alignSelf: 'center'
            │     backgroundColor: 'rgba(255,255,255,0.15)'
            │     borderRadius: 9999 (full)
            │     Ionicons 'checkmark-circle-outline', size: 48, color: '#FFFFFF'
            │     marginBottom: 32
            │
            ├── [Başlık: "Welcome Back to DO IT"]
            │     fontSize: 25, fontWeight: '500', color: '#FFFFFF'
            │     textAlign: 'center', marginBottom: 8
            │
            ├── [Alt Başlık: "Have an other productive day !"]
            │     fontSize: 18, fontWeight: '500', color: '#FFFFFF'
            │     textAlign: 'center', marginBottom: 32
            │
            ├── [Email AuthInput]
            │     marginBottom: 16
            │
            ├── [Şifre AuthInput]
            │     marginBottom: 8
            │
            ├── [Hata Mesajı Alanı]  ← sadece hata varsa render edilir
            │     marginBottom: 8
            │
            ├── [AuthButton "Giriş Yap"]
            │     marginBottom: 24
            │
            └── [AuthLinkText "Hesabın yok mu? Kayıt Ol"]
```

**Kapsam dışı (bu sprintte uygulanmaz):**
- "Şifremi Unuttum" linki
- Social login (Apple / Google)

---

## 5. RegisterScreen Layout

Ekran adı: `RegisterScreen`
Navigasyon: LoginScreen'den "Kayıt Ol" linkine basılınca (Stack push)

**Dikey Eleman Sırası:**

```
LinearGradient (flex: 1)
└── KeyboardAvoidingView (flex: 1)
    └── ScrollView
        └── View (paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40)
            │
            ├── [Logo: Checkmark]
            │     Aynı spec — marginBottom: 32
            │
            ├── [Başlık: "Welcome to DO IT"]
            │     fontSize: 25, fontWeight: '500', color: '#FFFFFF'
            │     textAlign: 'center', marginBottom: 8
            │
            ├── [Alt Başlık: "create an account and Join us now!"]
            │     fontSize: 18, fontWeight: '500', color: '#FFFFFF'
            │     textAlign: 'center', marginBottom: 32
            │
            ├── [Email AuthInput]
            │     marginBottom: 16
            │
            ├── [Şifre AuthInput]
            │     marginBottom: 16
            │
            ├── [Şifre Tekrar AuthInput]  ← Figma'da yok, auth-spec FR-F2 gereği eklendi
            │     placeholder: "Şifre Tekrar"
            │     icon: 'lock-closed-outline'
            │     marginBottom: 8
            │
            ├── [Hata Mesajı Alanı]  ← sadece hata varsa render edilir
            │     marginBottom: 8
            │
            ├── [AuthButton "Kayıt Ol"]
            │     marginBottom: 24
            │
            └── [AuthLinkText "Zaten hesabın var mı? Giriş Yap"]
```

**Figma sapmaları:**
- "Full Name" alanı: auth-spec.md email+password only olduğu için UYGULANMAZ.
- "Şifre Tekrar" alanı: Figma'da bulunmayıp auth-spec FR-F2 gereği eklenmiştir.
- Social login butonları: KAPSAM DIŞI.

---

## 6. Hata Mesajı Stili

**Pozisyon:** Son input ile ana buton arasında, ayrı bir `View` içinde.

**Style değerleri:**

| Özellik | Değer | Token |
|---------|-------|-------|
| backgroundColor | `rgba(244,67,54,0.15)` | `errorBg` (yeni) |
| borderRadius | `8pt` | `radius.sm` |
| borderWidth | `1pt` | — |
| borderColor | `#F44336` | `delete` (mevcut) |
| paddingVertical | `8pt` | `space.sm` |
| paddingHorizontal | `12pt` | `space.md` |
| marginBottom | `8pt` | `space.sm` |

**Typography:**

| Özellik | Değer |
|---------|-------|
| fontSize | `13pt` |
| fontWeight | `'400'` |
| color | `#F44336` |

**İkon:** `Ionicons 'alert-circle-outline'`, size `16`, color `#F44336`, solda `6pt` boşlukla.

**Hata mesajları (Türkçe):**

| Durum | Mesaj |
|-------|-------|
| Şifre uyuşmazlığı (client) | `"Şifreler eşleşmiyor."` |
| 401 (login) | `"E-posta adresi veya şifre hatalı."` |
| 409 (register) | `"Bu e-posta adresi zaten kayıtlı."` |
| 400 | `"Geçersiz giriş bilgileri."` |
| Ağ hatası | `"Bağlantı hatası. İnternet bağlantınızı kontrol edin."` |

**Davranış:** Mesaj `null` veya `undefined` iken `View` render edilmez — layout kayması engellenir.

---

## 7. Yükleme Durumu

Auth işlemleri süresince UI'ın donması engellenir.

| Eleman | Loading State |
|--------|--------------|
| AuthButton | `disabled={true}`, label kaldırılır, `ActivityIndicator` (small, beyaz) |
| Input alanları | `editable={false}`, `opacity: 0.55` |
| AuthLinkText | `pointerEvents='none'` |

Tam ekran overlay veya modal gerekmez. Spinner yalnızca buton içinde gösterilir.

---

## 8. Token Uyum Notu

### Mevcut Token'lardan Yeniden Kullanılanlar

| Token | Kullanım Yeri |
|-------|--------------|
| `gradientTop` / `gradientBottom` | Her iki auth ekranı arka planı |
| `textOnDark` (`#FFFFFF`) | Başlık, alt başlık, buton etiketi |
| `delete` (`#F44336`) | Hata mesajı border ve metin |
| `radius.sm` (8) | Hata mesajı container |
| `spacing.*` | Tüm margin ve padding değerleri |

### Yeni Eklenmesi Gereken Token'lar (tokens.ts)

```ts
// mobile/src/theme/tokens.ts — colors nesnesine eklenmeli
authButtonBg: '#0EA5E9',
authButtonPressed: '#0284C7',
surfaceAuthInput: '#FFFFFF',
textAuthInput: '#1A1A1A',
textAuthPlaceholder: 'rgba(0,0,0,0.44)',
textAuthLink: '#63D9F3',
textAuthLinkMuted: 'rgba(255,255,255,0.80)',
authInputIcon: 'rgba(0,0,0,0.44)',
errorBg: 'rgba(244,67,54,0.15)',
```

### Kapsam Dışı Figma Elemanları

| Figma Elemanı | Gerekçe |
|---------------|---------|
| Social login (Apple / Google) | auth-spec.md Out of Scope |
| Full Name input | auth-spec email+password only |
| Forget password linki | auth-spec.md Out of Scope (Faz 2) |
| Poppins font | Mevcut uygulama sistem fontu kullanıyor; bundle maliyeti getirir, görsel fark önemsiz |

---

*Bu spec `docs/auth-architecture.md`, `docs/auth-spec.md` ve `tasks/007-auth.md` ile birlikte okunmalıdır.*
*AUTH-012 (LoginScreen + RegisterScreen) implementasyonunda bu doküman referans alınmalıdır.*
