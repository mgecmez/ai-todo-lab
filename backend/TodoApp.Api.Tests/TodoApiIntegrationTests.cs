using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using TodoApp.Api.Models;

namespace TodoApp.Api.Tests;

public class TodoApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;

    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public TodoApiIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    // TICKET-011 / Senaryo 1: GET /health -> 200 + { status: "ok" }
    [Fact]
    public async Task Health_Returns200_WithStatusOk()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal("ok", body.GetProperty("status").GetString());
    }

    // TICKET-011 / Senaryo 2: POST /api/todos (valid) -> 201 + Location + dönen body title
    [Fact]
    public async Task CreateTodo_ValidRequest_Returns201WithLocationAndBody()
    {
        var payload = new { title = "Integration test todo", description = "Test açıklaması" };

        var response = await _client.PostAsJsonAsync("/api/todos", payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(response.Headers.Location);

        var todo = await response.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(todo);
        Assert.Equal("Integration test todo", todo.Title);
    }

    // TICKET-011 / Senaryo 3: POST /api/todos (invalid title) -> 400 ProblemDetails
    [Fact]
    public async Task CreateTodo_EmptyTitle_Returns400ProblemDetails()
    {
        var payload = new { title = "", description = "Başlık yok" };

        var response = await _client.PostAsJsonAsync("/api/todos", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problem = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.True(
            problem.TryGetProperty("title", out _) || problem.TryGetProperty("errors", out _),
            "Response body ProblemDetails formatında olmalı (title veya errors alanı içermeli)"
        );
    }

    // TICKET-011 / Senaryo 4: GET /api/todos -> oluşturulan todo listede var
    [Fact]
    public async Task GetAllTodos_CreatedTodoExists_InList()
    {
        var title = $"Listede görünmeli {Guid.NewGuid()}";
        var payload = new { title };
        var createResponse = await _client.PostAsJsonAsync("/api/todos", payload);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);

        var listResponse = await _client.GetAsync("/api/todos");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        var todos = await listResponse.Content.ReadFromJsonAsync<List<Todo>>(JsonOptions);
        Assert.NotNull(todos);
        Assert.Contains(todos, t => t.Id == created!.Id && t.Title == title);
    }

    // TICKET-011 / Senaryo 5: PATCH /api/todos/{id}/toggle -> isCompleted değişiyor
    [Fact]
    public async Task ToggleTodo_ChangesIsCompleted()
    {
        // Todo oluştur (başlangıçta IsCompleted = false)
        var payload = new { title = "Toggle edilecek todo" };
        var createResponse = await _client.PostAsJsonAsync("/api/todos", payload);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(created);
        Assert.False(created.IsCompleted);

        // Toggle uygula
        var toggleResponse = await _client.PatchAsync($"/api/todos/{created.Id}/toggle", null);
        Assert.Equal(HttpStatusCode.OK, toggleResponse.StatusCode);

        var toggled = await toggleResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(toggled);
        Assert.True(toggled.IsCompleted);

        // Tekrar toggle -> false'a döner
        var toggleBackResponse = await _client.PatchAsync($"/api/todos/{created.Id}/toggle", null);
        Assert.Equal(HttpStatusCode.OK, toggleBackResponse.StatusCode);

        var toggledBack = await toggleBackResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(toggledBack);
        Assert.False(toggledBack.IsCompleted);
    }

    // ── TM-012: Task Management alanları doğrulama ──────────────────────────

    // TM-012 / Senaryo 1: Yeni alanlarla create → yanıtta priority/dueDate/tags görünmeli
    [Fact]
    public async Task CreateTodo_WithNewFields_ReturnsPriorityDueDateAndTags()
    {
        var dueDate = new DateTime(2026, 4, 1, 0, 0, 0, DateTimeKind.Utc);
        var payload = new
        {
            title = "Yeni alan testi",
            priority = 2,           // High
            dueDate,
            tags = "iş,test"
        };

        var response = await _client.PostAsJsonAsync("/api/todos", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var todo = await response.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(todo);
        Assert.Equal(TodoPriority.High, todo.Priority);
        Assert.NotNull(todo.DueDate);
        Assert.Equal("iş,test", todo.Tags);
        Assert.False(todo.IsPinned); // Create'de IsPinned her zaman false
        Assert.False(todo.IsCompleted);
    }

    // TM-012 / Senaryo 2: Geriye dönük uyumluluk — eski format body (sadece title) → varsayılanlar
    [Fact]
    public async Task CreateTodo_LegacyFormat_ReturnsDefaults()
    {
        var payload = new { title = "Eski format todo" };

        var response = await _client.PostAsJsonAsync("/api/todos", payload);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var todo = await response.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(todo);
        Assert.Equal(TodoPriority.Normal, todo.Priority); // varsayılan Normal (1)
        Assert.False(todo.IsPinned);                      // varsayılan false
        Assert.Null(todo.DueDate);
        Assert.Null(todo.Tags);
    }

    // TM-012 / Senaryo 3: PATCH /pin → IsPinned toggle (false → true → false)
    [Fact]
    public async Task PinTodo_TogglesIsPinned()
    {
        var payload = new { title = "Pin testi" };
        var createResponse = await _client.PostAsJsonAsync("/api/todos", payload);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(created);
        Assert.False(created.IsPinned);

        // İlk pin → true
        var pinResponse = await _client.PatchAsync($"/api/todos/{created.Id}/pin", null);
        Assert.Equal(HttpStatusCode.OK, pinResponse.StatusCode);
        var pinned = await pinResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(pinned);
        Assert.True(pinned.IsPinned);

        // İkinci pin → false (toggle)
        var unpinResponse = await _client.PatchAsync($"/api/todos/{created.Id}/pin", null);
        Assert.Equal(HttpStatusCode.OK, unpinResponse.StatusCode);
        var unpinned = await unpinResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(unpinned);
        Assert.False(unpinned.IsPinned);
    }

    // TM-012 / Senaryo 4: PATCH /pin bilinmeyen id → 404
    [Fact]
    public async Task PinTodo_UnknownId_Returns404()
    {
        var response = await _client.PatchAsync($"/api/todos/{Guid.NewGuid()}/pin", null);
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // TM-012 / Senaryo 5: PUT ile yeni alanlar güncelleniyor
    [Fact]
    public async Task UpdateTodo_WithNewFields_UpdatesCorrectly()
    {
        var createPayload = new { title = "Güncellenecek todo" };
        var createResponse = await _client.PostAsJsonAsync("/api/todos", createPayload);
        Assert.Equal(HttpStatusCode.Created, createResponse.StatusCode);
        var created = await createResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(created);

        var dueDate = new DateTime(2026, 5, 15, 0, 0, 0, DateTimeKind.Utc);
        var updatePayload = new
        {
            title = "Güncellenmiş başlık",
            isCompleted = false,
            priority = 3,           // Urgent
            dueDate,
            isPinned = true,
            tags = "acil,sprint"
        };

        var updateResponse = await _client.PutAsJsonAsync($"/api/todos/{created.Id}", updatePayload);
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        var updated = await updateResponse.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(updated);
        Assert.Equal("Güncellenmiş başlık", updated.Title);
        Assert.Equal(TodoPriority.Urgent, updated.Priority);
        Assert.NotNull(updated.DueDate);
        Assert.True(updated.IsPinned);
        Assert.Equal("acil,sprint", updated.Tags);
    }

    // TM-012 / Senaryo 6: GET listede pinli todo, pinli olmayandan önce gelir
    [Fact]
    public async Task GetAllTodos_PinnedTodoAppearsBeforeUnpinned()
    {
        var uid = Guid.NewGuid().ToString("N")[..8];

        // Normal todo (pin yok)
        var normalCreate = await _client.PostAsJsonAsync("/api/todos", new { title = $"Normal-{uid}" });
        Assert.Equal(HttpStatusCode.Created, normalCreate.StatusCode);
        var normal = await normalCreate.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(normal);

        // Pinlenecek todo oluştur + pin uygula
        var pinCreate = await _client.PostAsJsonAsync("/api/todos", new { title = $"Pinli-{uid}" });
        Assert.Equal(HttpStatusCode.Created, pinCreate.StatusCode);
        var toPin = await pinCreate.Content.ReadFromJsonAsync<Todo>(JsonOptions);
        Assert.NotNull(toPin);
        await _client.PatchAsync($"/api/todos/{toPin.Id}/pin", null);

        // Listeyi al
        var listResponse = await _client.GetAsync("/api/todos");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);
        var todos = await listResponse.Content.ReadFromJsonAsync<List<Todo>>(JsonOptions);
        Assert.NotNull(todos);

        var pinnedIdx = todos.FindIndex(t => t.Id == toPin.Id);
        var normalIdx  = todos.FindIndex(t => t.Id == normal.Id);
        Assert.True(pinnedIdx >= 0 && normalIdx >= 0, "Her iki todo listede bulunmalı");
        Assert.True(pinnedIdx < normalIdx, "Pinli todo, pinsiz tododan önce sıralanmalı");
    }

    // TM-012 / Senaryo 7: Geçersiz priority değeri → 400
    [Fact]
    public async Task CreateTodo_InvalidPriority_Returns400()
    {
        var payload = new { title = "Geçersiz priority", priority = 99 };
        var response = await _client.PostAsJsonAsync("/api/todos", payload);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
