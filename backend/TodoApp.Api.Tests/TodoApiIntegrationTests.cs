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
}
