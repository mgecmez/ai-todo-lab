---
description: Projenin genel sağlık kontrolünü yapar — build, test, type check
---
## Project Health Check

Aşağıdaki kontrolleri sırayla çalıştır ve sonuçları raporla:

### 1. Backend Build
```bash
cd backend/TodoApp.Api && dotnet build
```

### 2. Backend Tests
```bash
dotnet test backend/TodoApp.Api.Tests
```

### 3. Frontend TypeScript Check
```bash
cd mobile && npx tsc --noEmit
```

### 4. Sonuç Tablosu
| Kontrol | Durum | Detay |
|---------|-------|-------|
| Backend build | ✅/❌ | |
| Backend tests | ✅/❌ | X passed, Y failed |
| TypeScript | ✅/❌ | X errors |

### 5. Sorun varsa
Hata detaylarını göster ve hangi agent ile düzeltilebileceğini öner.
