---
description: Yeni bir özellik eklemek için tam agent pipeline başlatır (PM → Architect → Team Lead → Implementation → Test)
---
## New Feature Request: $ARGUMENTS

Bu komutu aldığında aşağıdaki agent pipeline'ını sırayla çalıştır:

### Adım 1: Product Manager
Product Manager agent'ını kullanarak bu özellik için feature spec yaz.
Çıktı: `docs/[feature-slug]-spec.md`

### Adım 2: Architect
Architect agent'ını kullanarak teknik tasarımı oluştur.
Çıktı: `docs/[feature-slug]-architecture.md`

### Adım 3: Team Lead
Team Lead agent'ını kullanarak görev listesi oluştur.
Çıktı: `tasks/[NNN]-[feature-slug].md`

### Adım 4: Onay
Kullanıcıya task listesini göster ve onay al.
"Bu görevleri uygulamaya başlayayım mı?" diye sor.

### Adım 5: Implementation
Onay alındıktan sonra task'ları dependency sırasına göre uygula:
1. Architect ticket'larını çalıştır
2. Backend ticket'larını backend-dev agent'ı ile çalıştır
3. Frontend ticket'larını frontend-dev agent'ı ile çalıştır
4. Tester ticket'larını tester agent'ı ile çalıştır

### Adım 6: Doğrulama
Tester agent'ını kullanarak doğrulama raporu oluştur.
Çıktı: `docs/[feature-slug]-checklist.md`
