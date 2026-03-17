# Task List: 006 — Backend Service Layer

Source spec: Feature — Backend Service Layer (Controller → Service → Repository)
Stack: .NET 8 / ASP.NET Core Web API · Entity Framework Core · xUnit

---

## TICKET-SL-1
**Owner:** Architect
**Title:** Define ITodoService interface contract

### Description
Design the `ITodoService` interface that will sit between `TodosController` and `ITodoRepository`. This interface becomes the authoritative contract; the Backend Developer must not deviate from the method signatures defined here. No code is written — the output is the interface file and a brief note documenting ownership boundaries.

### Steps
1. Review the existing `ITodoRepository` in `backend/TodoApp.Api/Repositories/ITodoRepository.cs` and `TodosController` in `backend/TodoApp.Api/Controllers/TodosController.cs` to understand the full call surface.
2. Define `ITodoService` with the following methods, matching existing DTO and model types exactly:
   - `GetAll() : IReadOnlyList<Todo>`
   - `GetById(Guid id) : Todo?`
   - `Create(CreateTodoRequest request) : Todo`
   - `Update(Guid id, UpdateTodoRequest request) : Todo?`
   - `Delete(Guid id) : bool`
   - `ToggleComplete(Guid id) : Todo?`
   - `TogglePin(Guid id) : Todo?`
3. Document which business logic belongs in the service layer vs the repository layer:
   - Service: Id generation, timestamp assignment, field trimming, default values
   - Repository: pure data access (no Id/timestamp/default logic)
4. Save the interface file to `backend/TodoApp.Api/Services/ITodoService.cs`.

### Files Created
- `backend/TodoApp.Api/Services/ITodoService.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Models/Todo.cs`
- `backend/TodoApp.Api/DTOs/CreateTodoRequest.cs`
- `backend/TodoApp.Api/DTOs/UpdateTodoRequest.cs`

### Acceptance Criteria
- [ ] `ITodoService.cs` exists under `Services/` folder
- [ ] All 7 method signatures are present with correct return types and parameter types
- [ ] Interface compiles: `dotnet build` exits clean
- [ ] A comment block at the top of the file documents the service/repository boundary rule

---

## TICKET-SL-2
**Owner:** Backend Developer
**Title:** Implement TodoService

### Description
Create `TodoService`, which implements `ITodoService` and injects `ITodoRepository`. All business logic currently scattered between `TodosController` and the repository `Add()`/`Update()` methods must be centralised here: Id generation, timestamp assignment, field trimming, and default value enforcement.

### Steps
1. Create `backend/TodoApp.Api/Services/TodoService.cs`.
2. Inject `ITodoRepository` via constructor parameter.
3. Implement each method following the boundary rules defined in TICKET-SL-1:
   - `Create`: trim fields, assign `Id = Guid.NewGuid()`, `CreatedAt = UpdatedAt = DateTime.UtcNow`, `IsCompleted = false`, `IsPinned = false`, then call `repository.Add(todo)`.
   - `Update`: map `UpdateTodoRequest` fields (with trimming) onto a `Todo` object, then call `repository.Update(id, todo)`.
   - `ToggleComplete` / `TogglePin`: delegate directly to repository.
   - `GetAll` / `GetById` / `Delete`: delegate directly to repository.
4. Run `dotnet build` — no errors expected at this stage (controller still injects `ITodoRepository`).

### Files Created
- `backend/TodoApp.Api/Services/TodoService.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Services/ITodoService.cs`
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Controllers/TodosController.cs` (wait for TICKET-SL-3)

### Acceptance Criteria
- [ ] `TodoService` implements all 7 methods from `ITodoService`
- [ ] Business logic (Id, timestamps, trimming, defaults) lives in `TodoService`, not the repository methods
- [ ] `dotnet build` exits clean

**Depends On:** TICKET-SL-1

---

## TICKET-SL-3
**Owner:** Backend Developer
**Title:** Register TodoService in DI and wire up TodosController

### Description
Register `ITodoService → TodoService` in `Program.cs` as a scoped service, then update `TodosController` to inject `ITodoService` instead of `ITodoRepository`. The controller must become purely a thin HTTP adapter: it only handles HTTP plumbing (routing, status codes, model binding) and delegates all work to the service.

### Steps
1. Open `backend/TodoApp.Api/Program.cs`.
2. Add after the existing repository registration:
   `builder.Services.AddScoped<ITodoService, TodoService>();`
3. Open `backend/TodoApp.Api/Controllers/TodosController.cs`:
   - Replace the `ITodoRepository` constructor parameter with `ITodoService`.
   - Remove all `using` references to `ITodoRepository`.
   - Remove all direct `Todo` object construction from action methods (this logic is now in `TodoService`).
   - Each action method calls the corresponding service method and maps the result to an `ActionResult`.
4. Run `dotnet build` — must be clean.
5. Start the API with `dotnet run --urls "http://localhost:5100"` and smoke-test all 6 endpoints via Swagger to confirm no regression.

### Files Modified
- `backend/TodoApp.Api/Program.cs`
- `backend/TodoApp.Api/Controllers/TodosController.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Services/ITodoService.cs`
- `backend/TodoApp.Api/Services/TodoService.cs`
- `backend/TodoApp.Api/Repositories/ITodoRepository.cs`
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`

### Acceptance Criteria
- [ ] `Program.cs` contains `AddScoped<ITodoService, TodoService>()`
- [ ] `TodosController` constructor parameter is `ITodoService`, not `ITodoRepository`
- [ ] No `Todo` object is constructed inside any controller action
- [ ] `dotnet build` exits clean
- [ ] All 6 endpoints return expected HTTP status codes via Swagger smoke test

**Depends On:** TICKET-SL-2

---

## TICKET-SL-4
**Owner:** Backend Developer
**Title:** Clean up business logic from EfTodoRepository

### Description
Now that `TodoService` owns all business logic, remove the Id assignment, timestamp assignment, and default-value lines from `EfTodoRepository.Add()`. The repository must become a pure data access object. `Update()` already only patches fields and sets `UpdatedAt`; confirm it no longer needs to know about defaults.

### Steps
1. Open `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`.
2. In `Add(Todo todo)`:
   - Remove: `todo.Id = Guid.NewGuid();`
   - Remove: `todo.CreatedAt = DateTime.UtcNow;`
   - Remove: `todo.UpdatedAt = DateTime.UtcNow;`
   - Remove: `todo.IsCompleted = false;`
   - Remove: `todo.IsPinned = false;`
   - Keep only: `dbContext.Todos.Add(todo); dbContext.SaveChanges(); return todo;`
3. In `Update(Guid id, Todo updated)`:
   - Keep the `existing.UpdatedAt = DateTime.UtcNow;` line here only if `TodoService.Update()` does NOT set it. Coordinate with TICKET-SL-2: `UpdatedAt` must be set exactly once (preferably in `TodoService`). Remove it from the repository if the service sets it.
4. Run `dotnet build` and `dotnet test` — all existing tests must pass.

### Files Modified
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Services/TodoService.cs`
- `backend/TodoApp.Api/Controllers/TodosController.cs`

### Acceptance Criteria
- [ ] `EfTodoRepository.Add()` contains no Id, timestamp, or default-value assignments
- [ ] `dotnet build` exits clean
- [ ] `dotnet test` — all existing tests pass with no changes to test files

**Depends On:** TICKET-SL-3

---

## TICKET-SL-5
**Owner:** Backend Developer
**Title:** Clean up and complete InMemoryTodoRepository

### Description
Apply the same cleanup to `InMemoryTodoRepository` for consistency: remove business logic from `Add()`, and replace the `TogglePin` stub (`throw new NotImplementedException()`) with a real implementation. The in-memory repository is used in integration tests via `WebApplicationFactory`; a working `TogglePin` is required for test coverage of the pin endpoint.

### Steps
1. Open `backend/TodoApp.Api/Repositories/InMemoryTodoRepository.cs`.
2. In `Add(Todo todo)`:
   - Remove: `todo.Id = Guid.NewGuid();`
   - Remove: `todo.CreatedAt = DateTime.UtcNow;`
   - Remove: `todo.UpdatedAt = DateTime.UtcNow;`
   - Remove: `todo.IsCompleted = false;`
   - Keep only the `lock(_lock)` block that adds to the list and returns.
3. In `Update(Guid id, Todo updated)`:
   - Add the missing fields that `EfTodoRepository.Update()` already handles: `Priority`, `DueDate`, `IsPinned`, `Tags`.
   - Remove `existing.UpdatedAt = DateTime.UtcNow;` if `TodoService.Update()` now sets it (coordinate with TICKET-SL-4 decision).
4. Replace the `TogglePin` stub with a full implementation mirroring `ToggleComplete`:
   - Find todo by id, flip `IsPinned`, set `UpdatedAt`, return todo (or null if not found).
5. Run `dotnet build` and `dotnet test`.

### Files Modified
- `backend/TodoApp.Api/Repositories/InMemoryTodoRepository.cs`

### Files Must NOT Be Modified
- `backend/TodoApp.Api/Services/ITodoService.cs`
- `backend/TodoApp.Api/Services/TodoService.cs`
- `backend/TodoApp.Api/Repositories/EfTodoRepository.cs`

### Acceptance Criteria
- [ ] `InMemoryTodoRepository.Add()` contains no Id, timestamp, or default-value assignments
- [ ] `InMemoryTodoRepository.Update()` updates all fields (Title, Description, IsCompleted, Priority, DueDate, IsPinned, Tags)
- [ ] `InMemoryTodoRepository.TogglePin()` no longer throws `NotImplementedException`
- [ ] `dotnet build` exits clean
- [ ] `dotnet test` — all existing tests pass

**Depends On:** TICKET-SL-4

---

## TICKET-SL-6
**Owner:** Tester
**Title:** Validate service layer end-to-end and write test report

### Description
Run the full test suite, perform a manual regression pass against all API endpoints, and produce a short validation report confirming the refactor did not break any observable behaviour. Focus specifically on: correct HTTP status codes, correct response bodies, and correct `createdAt`/`updatedAt` timestamps.

### Steps
1. Run the automated test suite:
   ```
   dotnet test backend/TodoApp.Api.Tests
   ```
   All tests must pass. Log any failures.
2. Start the API:
   ```
   cd backend/TodoApp.Api && dotnet run --urls "http://localhost:5100"
   ```
3. Using Swagger UI at `http://localhost:5100/swagger`, test each scenario in the acceptance criteria below.
4. Confirm that `createdAt` and `updatedAt` are present and valid UTC timestamps in all responses.
5. Confirm the `PATCH /api/todos/{id}/pin` endpoint returns a toggled `isPinned` value (was broken by the stub in `InMemoryTodoRepository` — verify it now works).
6. Save the validation report to `docs/service-layer-test-report.md`.

### Files Created
- `docs/service-layer-test-report.md`

### Files Must NOT Be Modified
- Any file under `backend/TodoApp.Api/` (read-only during testing)

### Acceptance Criteria
- [ ] `dotnet test` exits with 0 failed tests
- [ ] `GET /api/todos` returns `200` with an array; `createdAt` and `updatedAt` are valid UTC strings
- [ ] `POST /api/todos` returns `201`; response body contains a non-empty GUID `id`, `createdAt`, `updatedAt`
- [ ] `POST /api/todos` with whitespace-only title returns `400`
- [ ] `PUT /api/todos/{id}` returns `200` with updated fields; `updatedAt` is later than `createdAt`
- [ ] `PUT /api/todos/{id}` with unknown id returns `404`
- [ ] `DELETE /api/todos/{id}` returns `204`; subsequent `GET /api/todos` does not include the item
- [ ] `DELETE /api/todos/{id}` with unknown id returns `404`
- [ ] `PATCH /api/todos/{id}/toggle` flips `isCompleted` and returns `200`
- [ ] `PATCH /api/todos/{id}/pin` flips `isPinned` and returns `200`
- [ ] `docs/service-layer-test-report.md` is saved with pass/fail results for every criterion above

**Depends On:** TICKET-SL-5

---

## Summary Table

| Ticket | Owner | Title | Est. | Dependency |
|---|---|---|---|---|
| TICKET-SL-1 | Architect | Define ITodoService interface contract | 1 hour | — |
| TICKET-SL-2 | Backend Developer | Implement TodoService | 1.5 hours | TICKET-SL-1 |
| TICKET-SL-3 | Backend Developer | Register TodoService in DI and wire up TodosController | 1 hour | TICKET-SL-2 |
| TICKET-SL-4 | Backend Developer | Clean up business logic from EfTodoRepository | 0.5 hours | TICKET-SL-3 |
| TICKET-SL-5 | Backend Developer | Clean up and complete InMemoryTodoRepository | 1 hour | TICKET-SL-4 |
| TICKET-SL-6 | Tester | Validate service layer end-to-end and write test report | 1 hour | TICKET-SL-5 |

**Toplam tahmini süre:** 6 saat

## Dependency Order

TICKET-SL-1 → TICKET-SL-2 → TICKET-SL-3 → TICKET-SL-4 → TICKET-SL-5 → TICKET-SL-6
