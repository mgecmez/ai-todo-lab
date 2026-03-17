---
description: Hata düzeltme akışı başlatır — analiz, fix, test
---
## Bug Fix: $ARGUMENTS

### Adım 1: Analiz
Hatayı analiz et:
- Hangi katmanda? (backend / frontend / her ikisi)
- İlgili dosyaları bul (Grep/Glob ile)
- Root cause'u belirle

### Adım 2: Fix
Doğru agent'ı kullanarak düzeltmeyi uygula:
- Backend hatası → backend-dev agent'ı
- Frontend hatası → frontend-dev agent'ı

### Adım 3: Doğrulama
- Backend: `dotnet build` + `dotnet test`
- Frontend: `npx tsc --noEmit`
- İlgili senaryoyu manuel test et

### Adım 4: Rapor
Yapılan değişikliği özetle:
- Değişen dosyalar
- Root cause
- Fix açıklaması
