# AI Todo Lab — Project Guide

## Project Overview

Modern cross-platform Todo uygulaması. React Native (Expo) frontend + .NET Web API backend.
AI agent destekli geliştirme süreci ile oluşturuluyor.

## Tech Stack

### Backend
- .NET 8 / ASP.NET Core Web API
- Entity Framework Core + SQLite
- Repository pattern (ITodoRepository → EfTodoRepository)
- Swagger/OpenAPI

### Frontend (Mobile)
- React Native + Expo (managed workflow)
- TypeScript
- TanStack Query (React Query) — state management + offline queue
- AsyncStorage — persistent query cache
- React Navigation v7 (native-stack)
- expo-notifications — local reminders
- expo-linear-gradient — UI gradient background

### Testing
- Backend: xUnit + WebApplicationFactory + EF Core InMemory
- Frontend: Playwright E2E

## Project Structure

```
ai-todo-lab/
├── backend/
│   └── TodoApp.Api/
│       ├── Controllers/        # TodosController, HealthController
│       ├── Data/               # AppDbContext (EF Core)
│       ├── DTOs/               # CreateTodoRequest, UpdateTodoRequest
│       ├── Models/             # Todo entity
│       ├── Repositories/       # ITodoRepository, EfTodoRepository, InMemoryTodoRepository
│       ├── Validation/         # NotWhitespaceAttribute
│       ├── Migrations/         # EF Core migrations
│       └── Program.cs          # DI, middleware, CORS, auto-migration
│
├── mobile/
│   ├── App.tsx                 # NavigationContainer + Stack Navigator
│   └── src/
│       ├── screens/            # TodoListScreen, TodoFormScreen, TaskDetailScreen
│       ├── components/         # TodoItem, EmptyState, UI components
│       ├── services/
│       │   ├── api/            # config.ts, todosApi.ts
│       │   ├── cache/          # storage.ts, todosCacheService.ts, cacheKeys.ts
│       │   └── notifications/  # notificationService.ts, notificationRegistry.ts
│       ├── mutations/          # useCreateTodo, useUpdateTodo, useDeleteTodo
│       ├── navigation/         # types.ts (RootStackParamList)
│       ├── theme/              # tokens.ts (colors, spacing, radius, fontSize)
│       └── types/              # todo.ts
│
├── docs/                       # Architecture docs, design specs, checklists
├── tasks/                      # Sprint task definitions
├── agents/                     # Agent role descriptions (legacy)
└── .claude/
    ├── agents/                 # Claude Code subagent definitions
    └── commands/               # Slash commands
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/todos | List all todos (ordered by CreatedAt desc) |
| POST | /api/todos | Create todo (title required, max 200 chars) |
| PUT | /api/todos/{id} | Update todo |
| DELETE | /api/todos/{id} | Delete todo → 204 No Content |
| PATCH | /api/todos/{id}/toggle | Toggle isCompleted |
| GET | /health | Health check |

## API Response Format

Success: direct entity or array
Error: `{ status: int, message: string, errors: { field: string[] } }`

## Todo Entity

| Field | Type | Required | Constraints |
|-------|------|----------|-------------|
| id | GUID | auto | System-generated |
| title | string | yes | max 200, not whitespace |
| description | string | no | max 1000 |
| isCompleted | bool | yes | default false |
| createdAt | DateTime | auto | UTC |
| updatedAt | DateTime | auto | UTC |

## Development Commands

```bash
# Backend
cd backend/TodoApp.Api
dotnet run --urls "http://localhost:5100"

# Mobile
cd mobile
npm install
npx expo start

# Backend tests
dotnet test backend/TodoApp.Api.Tests

# E2E tests
cd mobile && npm run test:e2e

# TypeScript check
cd mobile && npx tsc --noEmit
```

## Conventions

### Backend
- Controllers thin: validation + delegation to repository
- All DateTime values in UTC (DateTime.UtcNow)
- ITodoRepository interface must not change without Architect approval
- EF Core migrations via code-first
- Scoped lifetime for EfTodoRepository

### Frontend
- TanStack Query for all server state
- Optimistic updates for toggle/delete
- Offline mutations queued via TanStack paused mutation
- Cache persisted in AsyncStorage
- Error messages in Turkish, user-friendly (no raw technical strings)
- Design tokens in src/theme/tokens.ts — always use tokens, never hardcode colors/spacing
- Components: PascalCase filenames
- Files: kebab-case for services/utilities

### General
- Docs go in docs/ folder
- Task definitions go in tasks/ folder
- Architecture decisions documented before implementation
- Every sprint ends with a QA checklist

## Agent Workflow

Bu proje subagent tabanlı bir geliştirme süreci kullanır.
Roller ve sorumluluklar `.claude/agents/` altında tanımlıdır.

Tipik akış:
1. Product Manager → feature spec yazar
2. Architect → mimari tasarım + API contract belirler
3. Backend Developer → API implementasyonu
4. Frontend Developer → mobil UI implementasyonu
5. UI Designer → design spec (kod yazmaz, sadece dokümantasyon)
6. Tester → test senaryoları + doğrulama raporu

### GitHub Issue Kuralı

Her sprint'te Team Lead task listesi oluşturduktan sonra, tüm ticket'lar otomatik olarak GitHub issue olarak da açılmalı.
- Label: owner'a göre (`architect`, `backend`, `frontend`, `test`)
- Milestone: ilgili version numarası (örn. `v0.6.0 — Authentication`)

## Release History

| Version | Feature |
|---------|---------|
| v0.1.0 | Initial mobile UI + backend CRUD |
| v0.2.0 | SQLite persistence (EF Core) |
| v0.3.0 | Offline-first read (SWR + AsyncStorage cache) |
| v0.4.0 | Offline write + sync queue (TanStack Query) |
| v0.5.0 | Local reminders (expo-notifications) |
