# Task List: 001 — Todo CRUD (Core Feature)

Source spec: Feature — Todo Management (Core CRUD)
Stack: .NET Web API (Backend) · Expo React Native (Frontend)

---

## TICKET-001
**Owner:** Architect
**Title:** Design the Todo data model and API contract

### Description
Define the `Todo` entity schema and the REST API contract that Backend and Frontend will both implement against. No code written — output is a shared reference document.

### Steps
1. Define the `Todo` entity fields:
   - `id` (GUID)
   - `title` (string, required, max 200)
   - `description` (string, optional, max 1000)
   - `isCompleted` (bool, default false)
   - `createdAt` (UTC datetime)
   - `updatedAt` (UTC datetime)
2. Define REST endpoints:
   - `GET    /api/todos`        — list all todos
   - `POST   /api/todos`        — create a todo
   - `PUT    /api/todos/{id}`   — update a todo
   - `DELETE /api/todos/{id}`   — delete a todo
3. Define request/response JSON shapes for each endpoint
4. Define error response format (status code + message)
5. Save the contract to `docs/api-contract.md`

### Acceptance Criteria
- [ ] Entity fields documented with types, constraints, and defaults
- [ ] All 4 endpoints documented with method, path, request body, and response body
- [ ] HTTP status codes specified for success and error cases
- [ ] `docs/api-contract.md` is committed

---

## TICKET-002
**Owner:** Architect
**Title:** Scaffold .NET Web API project

### Description
Create the initial .NET Web API project structure that the Backend developer will work inside.

### Steps
1. Create the solution and project:
   ```
   dotnet new sln -n TodoApp
   dotnet new webapi -n TodoApp.Api --no-openapi false
   dotnet sln add TodoApp.Api
   ```
2. Remove the default `WeatherForecast` example files
3. Configure `Program.cs` for CORS (allow all origins for local dev)
4. Confirm the project builds and runs:
   ```
   dotnet build
   dotnet run --project TodoApp.Api
   ```
5. Confirm Swagger UI is accessible at `https://localhost:{port}/swagger`

### Acceptance Criteria
- [ ] `dotnet build` exits with no errors
- [ ] `dotnet run` starts the API server
- [ ] Swagger UI loads in browser
- [ ] No default sample files remain

---

## TICKET-003
**Owner:** Architect
**Title:** Scaffold Expo React Native project

### Description
Create the initial Expo React Native project that the Frontend developer will work inside.

### Steps
1. Scaffold the project:
   ```
   npx create-expo-app@latest TodoApp --template blank-typescript
   cd TodoApp
   ```
2. Confirm the app runs:
   ```
   npx expo start
   ```
3. Remove the default boilerplate content from `App.tsx`, leaving a bare root component
4. Install HTTP client:
   ```
   npx expo install axios
   ```
5. Create folder structure:
   - `src/screens/`
   - `src/components/`
   - `src/services/`
   - `src/types/`

### Acceptance Criteria
- [ ] `npx expo start` runs without errors
- [ ] App loads on simulator/device showing a blank screen
- [ ] `axios` is listed in `package.json`
- [ ] Folder structure (`screens`, `components`, `services`, `types`) is in place

---

## TICKET-004
**Owner:** Backend
**Title:** Create the Todo entity and in-memory repository

### Description
Implement the `Todo` entity class and a simple in-memory list repository so the API can store and retrieve todos without a database (to be swapped later).

### Steps
1. Create `Models/Todo.cs` with all fields from the API contract (TICKET-001)
2. Create `Repositories/ITodoRepository.cs` interface with methods:
   - `GetAll()`, `GetById(Guid id)`, `Add(Todo todo)`, `Update(Todo todo)`, `Delete(Guid id)`
3. Create `Repositories/InMemoryTodoRepository.cs` implementing the interface using a `List<Todo>`
4. Register the repository as a singleton in `Program.cs`:
   ```
   builder.Services.AddSingleton<ITodoRepository, InMemoryTodoRepository>();
   ```
5. Build:
   ```
   dotnet build
   ```

### Acceptance Criteria
- [ ] `Todo` model matches the contract (all fields, correct types)
- [ ] Interface and in-memory implementation compile with no errors
- [ ] Repository is registered in DI
- [ ] `dotnet build` exits clean

---

## TICKET-005
**Owner:** Backend
**Title:** Implement GET /api/todos and POST /api/todos

### Description
Implement the list and create endpoints on a `TodosController`.

### Steps
1. Create `Controllers/TodosController.cs` with `[ApiController]` and `[Route("api/todos")]`
2. Inject `ITodoRepository` via constructor
3. Implement `GET /api/todos`:
   - Returns `200 OK` with array of all todos
4. Implement `POST /api/todos`:
   - Accept `CreateTodoRequest` DTO (title required, description optional)
   - Validate title not empty and max 200 chars (use Data Annotations)
   - Create `Todo`, set `id = Guid.NewGuid()`, `createdAt = updatedAt = UtcNow`, `isCompleted = false`
   - Return `201 Created` with the created todo
   - Return `400 Bad Request` on validation failure
5. Run and test via Swagger:
   ```
   dotnet run --project TodoApp.Api
   ```

### Acceptance Criteria
- [ ] `GET /api/todos` returns `200` with an array (empty array when no todos)
- [ ] `POST /api/todos` with valid body returns `201` and the new todo in response
- [ ] `POST /api/todos` with empty title returns `400`
- [ ] Both endpoints visible and testable in Swagger UI

---

## TICKET-006
**Owner:** Backend
**Title:** Implement PUT /api/todos/{id} and DELETE /api/todos/{id}

### Description
Implement the update and delete endpoints to complete the CRUD surface.

### Steps
1. Add `PUT /api/todos/{id}` to `TodosController`:
   - Accept `UpdateTodoRequest` DTO (title, description, isCompleted)
   - Validate title not empty and max 200 chars
   - Return `404 Not Found` if id doesn't exist
   - Update fields, set `updatedAt = UtcNow`
   - Return `200 OK` with updated todo
2. Add `DELETE /api/todos/{id}`:
   - Return `404 Not Found` if id doesn't exist
   - Remove todo from repository
   - Return `204 No Content`
3. Run and test via Swagger:
   ```
   dotnet run --project TodoApp.Api
   ```

### Acceptance Criteria
- [ ] `PUT /api/todos/{id}` returns `200` with updated todo
- [ ] `PUT /api/todos/{id}` with unknown id returns `404`
- [ ] `DELETE /api/todos/{id}` returns `204`
- [ ] `DELETE /api/todos/{id}` with unknown id returns `404`
- [ ] `dotnet build` exits clean

---

## TICKET-007
**Owner:** Frontend
**Title:** Define Todo TypeScript types and API service

### Description
Create the shared TypeScript type definitions and an Axios-based API service that wraps all 4 backend endpoints.

### Steps
1. Create `src/types/todo.ts`:
   - `Todo` interface matching the API contract
   - `CreateTodoRequest` interface
   - `UpdateTodoRequest` interface
2. Create `src/services/api.ts`:
   - Configure Axios base URL pointing to local API (e.g. `http://localhost:5000/api`)
   - Export functions: `getTodos()`, `createTodo()`, `updateTodo()`, `deleteTodo()`
3. Confirm TypeScript compiles:
   ```
   npx tsc --noEmit
   ```

### Acceptance Criteria
- [ ] `Todo`, `CreateTodoRequest`, `UpdateTodoRequest` types defined and match API contract
- [ ] All 4 API functions implemented with correct HTTP methods and paths
- [ ] `npx tsc --noEmit` exits with no type errors

---

## TICKET-008
**Owner:** Frontend
**Title:** Build the Todo List screen

### Description
Implement the main screen that displays all todos fetched from the API, with an empty state and visual distinction for completed items.

### Steps
1. Create `src/screens/TodoListScreen.tsx`
2. On mount, call `getTodos()` and store result in state
3. Render a `FlatList` of todo items, each showing: title, creation date, completion checkbox/toggle
4. Completed todos rendered with strikethrough style on title
5. Show an empty state message ("No todos yet") when list is empty
6. Show a loading indicator while fetching
7. Add a "+" button (header or FAB) that navigates to the Create screen (stub navigation for now)
8. Run:
   ```
   npx expo start
   ```

### Acceptance Criteria
- [ ] List screen renders on app launch
- [ ] Todos fetched from API appear in the list
- [ ] Empty state message shown when no todos
- [ ] Completed todos visually distinguished (strikethrough)
- [ ] Loading indicator shown during fetch

---

## TICKET-009
**Owner:** Frontend
**Title:** Build the Create / Edit Todo screen

### Description
Implement a single form screen used for both creating new todos and editing existing ones.

### Steps
1. Create `src/screens/TodoFormScreen.tsx`
2. Accept an optional `todo` prop — if provided, pre-fill fields (edit mode); otherwise blank (create mode)
3. Form fields: Title (TextInput, required), Description (TextInput, multiline, optional)
4. On submit:
   - Create mode: call `createTodo()`, then navigate back to list
   - Edit mode: call `updateTodo()`, then navigate back to list
5. Disable submit button while request is in flight
6. Show inline validation error if title is empty
7. Run:
   ```
   npx expo start
   ```

### Acceptance Criteria
- [ ] Form renders with Title and Description fields
- [ ] Submitting with empty title shows validation error, does not call API
- [ ] Create mode: new todo appears in list after submission
- [ ] Edit mode: updated todo reflects changes in list after submission
- [ ] Submit button disabled during API call

---

## TICKET-010
**Owner:** Frontend
**Title:** Implement complete toggle and delete with confirmation

### Description
Wire up the completion toggle and delete action on each todo list item.

### Steps
1. In `TodoListScreen`, on checkbox/toggle press:
   - Call `updateTodo()` with `isCompleted` flipped
   - Update local state immediately (optimistic update)
2. Add a delete button (e.g. swipe action or trash icon) on each list item
3. On delete press, show an `Alert.alert()` confirmation dialog
4. On confirmation, call `deleteTodo()` and remove item from local state
5. Run:
   ```
   npx expo start
   ```

### Acceptance Criteria
- [ ] Tapping toggle marks todo complete/incomplete and updates the API
- [ ] Completed state is reflected visually without requiring a full reload
- [ ] Tapping delete shows a confirmation dialog
- [ ] Confirming deletion removes the item from the list and calls the API
- [ ] Cancelling deletion leaves the item unchanged

---

## TICKET-011
**Owner:** Tester
**Title:** Test all Backend API endpoints

### Description
Manually test all API endpoints against the acceptance criteria in the feature spec using Swagger UI or a REST client (e.g. curl, Postman).

### Steps
1. Start the API:
   ```
   dotnet run --project TodoApp.Api
   ```
2. Open Swagger UI at `https://localhost:{port}/swagger`
3. Test each scenario listed in acceptance criteria below
4. Log any failures as bugs referencing the ticket number

### Acceptance Criteria
- [ ] `GET /api/todos` returns `200` with empty array on fresh start
- [ ] `POST /api/todos` with valid title returns `201` with a todo object including a GUID id
- [ ] `POST /api/todos` with empty title returns `400`
- [ ] `POST /api/todos` with title > 200 chars returns `400`
- [ ] `GET /api/todos` returns all previously created todos
- [ ] `PUT /api/todos/{id}` updates title, description, and isCompleted, returns `200`
- [ ] `PUT /api/todos/{id}` with unknown id returns `404`
- [ ] `DELETE /api/todos/{id}` returns `204` and item no longer appears in GET list
- [ ] `DELETE /api/todos/{id}` with unknown id returns `404`

---

## TICKET-012
**Owner:** Tester
**Title:** Test Frontend end-to-end flows

### Description
Manually test the full user flows in the Expo app running against the local API.

### Steps
1. Ensure API is running:
   ```
   dotnet run --project TodoApp.Api
   ```
2. Start the app:
   ```
   npx expo start
   ```
3. Run through each scenario in acceptance criteria below on simulator or device

### Acceptance Criteria
- [ ] App launches and shows the todo list (empty state message visible)
- [ ] Tapping "+" opens the create form
- [ ] Submitting the form with a title creates a todo and it appears in the list
- [ ] Submitting the form with an empty title shows a validation error
- [ ] Tapping a todo opens the edit form pre-filled with current values
- [ ] Saving edits updates the todo in the list
- [ ] Toggling completion checkbox updates visual style (strikethrough)
- [ ] Tapping delete shows a confirmation dialog
- [ ] Confirming delete removes the item from the list
- [ ] Cancelling delete leaves the item unchanged

---

## Summary

| Ticket | Owner    | Title                                          | Est.     |
|--------|----------|------------------------------------------------|----------|
| 001    | Architect | Design data model and API contract            | 1 hour   |
| 002    | Architect | Scaffold .NET Web API project                 | 1 hour   |
| 003    | Architect | Scaffold Expo React Native project            | 1 hour   |
| 004    | Backend  | Todo entity and in-memory repository          | 1 hour   |
| 005    | Backend  | GET /api/todos and POST /api/todos            | 1.5 hours |
| 006    | Backend  | PUT /api/todos/{id} and DELETE /api/todos/{id}| 1 hour   |
| 007    | Frontend | TypeScript types and API service              | 1 hour   |
| 008    | Frontend | Todo List screen                              | 2 hours  |
| 009    | Frontend | Create / Edit Todo form screen                | 2 hours  |
| 010    | Frontend | Complete toggle and delete with confirmation  | 1 hour   |
| 011    | Tester   | Test all backend API endpoints                | 1 hour   |
| 012    | Tester   | Test frontend end-to-end flows                | 1 hour   |

**Dependency order:**
001 → 002, 003 → 004 → 005 → 006 → 011
001 → 007 → 008 → 009 → 010 → 012
