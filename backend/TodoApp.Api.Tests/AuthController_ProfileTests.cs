using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

namespace TodoApp.Api.Tests;

public class AuthController_ProfileTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly CustomWebApplicationFactory _factory;
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    public AuthController_ProfileTests(CustomWebApplicationFactory factory)
    {
        _factory = factory;
    }

    /// <summary>
    /// Yeni bir kullanıcı register + login yaparak token ve userId döndürür.
    /// Her test kendi izole kullanıcısını bu yöntemle oluşturur.
    /// </summary>
    private async Task<(HttpClient client, string token, string userId, string email)> CreateAuthenticatedUserAsync(
        string? emailSuffix = null)
    {
        var suffix = emailSuffix ?? Guid.NewGuid().ToString("N")[..8];
        var email    = $"user-{suffix}@test.com";
        var password = "Password123!";

        var anonClient = _factory.CreateClient();

        // Register
        var registerPayload = new { email, password };
        var registerResponse = await anonClient.PostAsJsonAsync("/api/auth/register", registerPayload);
        Assert.Equal(HttpStatusCode.Created, registerResponse.StatusCode);

        // Login
        var loginPayload = new { email, password };
        var loginResponse = await anonClient.PostAsJsonAsync("/api/auth/login", loginPayload);
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        var authBody  = await loginResponse.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var token     = authBody.GetProperty("token").GetString()!;
        var userId    = authBody.GetProperty("userId").GetString()!;

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        return (client, token, userId, email);
    }

    // ── GET /api/auth/me ──────────────────────────────────────────────────────

    // PROF-006 / GET me / Senaryo 1: Geçerli token → 200, userId + email + createdAt mevcut
    [Fact]
    public async Task GetMe_WithValidToken_Returns200WithProfileFields()
    {
        var (client, _, userId, email) = await CreateAuthenticatedUserAsync();

        var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(userId, body.GetProperty("userId").GetString());
        Assert.Equal(email,  body.GetProperty("email").GetString());
        Assert.True(body.TryGetProperty("createdAt", out _), "createdAt alanı response'da bulunmalı");
    }

    // PROF-006 / GET me / Senaryo 2: Token yok → 401
    [Fact]
    public async Task GetMe_WithoutToken_Returns401()
    {
        var anonClient = _factory.CreateClient();

        var response = await anonClient.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // ── PUT /api/auth/email ───────────────────────────────────────────────────

    // PROF-006 / PUT email / Senaryo 1: Doğru şifre + geçerli yeni email → 200, yanıtta yeni email
    [Fact]
    public async Task ChangeEmail_ValidPasswordAndNewEmail_Returns200WithNewEmail()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();
        var newEmail = $"changed-{Guid.NewGuid().ToString("N")[..8]}@test.com";

        var payload  = new { currentPassword = "Password123!", newEmail };
        var response = await client.PutAsJsonAsync("/api/auth/email", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        Assert.Equal(newEmail, body.GetProperty("email").GetString());
    }

    // PROF-006 / PUT email / Senaryo 2: Yanlış şifre → 401
    [Fact]
    public async Task ChangeEmail_WrongPassword_Returns401()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();
        var newEmail = $"changed-{Guid.NewGuid().ToString("N")[..8]}@test.com";

        var payload  = new { currentPassword = "WrongPassword!", newEmail };
        var response = await client.PutAsJsonAsync("/api/auth/email", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // PROF-006 / PUT email / Senaryo 3: Geçersiz email formatı → 400
    [Fact]
    public async Task ChangeEmail_InvalidEmailFormat_Returns400()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();

        var payload  = new { currentPassword = "Password123!", newEmail = "notanemail" };
        var response = await client.PutAsJsonAsync("/api/auth/email", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // PROF-006 / PUT email / Senaryo 4: Mevcut email ile aynı → 400
    [Fact]
    public async Task ChangeEmail_SameAsCurrentEmail_Returns400()
    {
        var (client, _, _, email) = await CreateAuthenticatedUserAsync();

        var payload  = new { currentPassword = "Password123!", newEmail = email };
        var response = await client.PutAsJsonAsync("/api/auth/email", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // PROF-006 / PUT email / Senaryo 5: Başka kullanıcıya ait email → 409
    [Fact]
    public async Task ChangeEmail_EmailAlreadyUsedByAnotherUser_Returns409()
    {
        // İki ayrı kullanıcı oluştur
        var (clientA, _, _, emailA) = await CreateAuthenticatedUserAsync();
        var (clientB, _, _, _)      = await CreateAuthenticatedUserAsync();

        // Kullanıcı B, A'nın emailini almaya çalışıyor
        var payload  = new { currentPassword = "Password123!", newEmail = emailA };
        var response = await clientB.PutAsJsonAsync("/api/auth/email", payload);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    // ── PUT /api/auth/password ────────────────────────────────────────────────

    // PROF-006 / PUT password / Senaryo 1: Doğru şifre + geçerli yeni şifre → 200
    [Fact]
    public async Task ChangePassword_ValidCurrentPasswordAndNewPassword_Returns200()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();

        var payload  = new { currentPassword = "Password123!", newPassword = "NewPassword456!" };
        var response = await client.PutAsJsonAsync("/api/auth/password", payload);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    // PROF-006 / PUT password / Senaryo 2: Yanlış şifre → 401
    [Fact]
    public async Task ChangePassword_WrongCurrentPassword_Returns401()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();

        var payload  = new { currentPassword = "WrongPassword!", newPassword = "NewPassword456!" };
        var response = await client.PutAsJsonAsync("/api/auth/password", payload);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    // PROF-006 / PUT password / Senaryo 3: 7 karakterlik yeni şifre → 400 (MinLength=8)
    [Fact]
    public async Task ChangePassword_NewPasswordTooShort_Returns400()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();

        var payload  = new { currentPassword = "Password123!", newPassword = "Short7!" };
        var response = await client.PutAsJsonAsync("/api/auth/password", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // PROF-006 / PUT password / Senaryo 4: Mevcut şifre ile aynı yeni şifre → 400
    [Fact]
    public async Task ChangePassword_SameAsCurrentPassword_Returns400()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();

        var payload  = new { currentPassword = "Password123!", newPassword = "Password123!" };
        var response = await client.PutAsJsonAsync("/api/auth/password", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── DELETE /api/auth/account ──────────────────────────────────────────────

    // PROF-006 / DELETE account / Senaryo 1: Doğru şifre → 204, ardından login → 401
    [Fact]
    public async Task DeleteAccount_CorrectPassword_Returns204AndUserIsDeleted()
    {
        var suffix   = Guid.NewGuid().ToString("N")[..8];
        var email    = $"delete-{suffix}@test.com";
        var password = "Password123!";

        var anonClient = _factory.CreateClient();

        // Register + login
        await anonClient.PostAsJsonAsync("/api/auth/register", new { email, password });
        var loginResp = await anonClient.PostAsJsonAsync("/api/auth/login", new { email, password });
        var authBody  = await loginResp.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var token     = authBody.GetProperty("token").GetString()!;

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Hesabı sil
        var deletePayload  = new { currentPassword = password };
        var deleteResponse = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/account")
        {
            Content = JsonContent.Create(deletePayload)
        });
        Assert.Equal(HttpStatusCode.NoContent, deleteResponse.StatusCode);

        // Silinen kullanıcı ile tekrar login dene → 401 (yanlış kimlik bilgisi) veya 404
        var loginAfterDelete = await anonClient.PostAsJsonAsync("/api/auth/login", new { email, password });
        Assert.True(
            loginAfterDelete.StatusCode == HttpStatusCode.Unauthorized ||
            loginAfterDelete.StatusCode == HttpStatusCode.NotFound,
            $"Silinen kullanıcı ile login 401 veya 404 döndürmeli, dönen: {loginAfterDelete.StatusCode}");
    }

    // SFTDEL-006 / DELETE account + todos: Hesap silinince todo'lar listeden kayboluyor
    [Fact]
    public async Task DeleteAccount_TodosAreAlsoSoftDeleted()
    {
        var suffix   = Guid.NewGuid().ToString("N")[..8];
        var email    = $"tododel-{suffix}@test.com";
        var password = "Password123!";
        var anonClient = _factory.CreateClient();

        // Register + login
        await anonClient.PostAsJsonAsync("/api/auth/register", new { email, password });
        var loginResp = await anonClient.PostAsJsonAsync("/api/auth/login", new { email, password });
        var authBody  = await loginResp.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var token     = authBody.GetProperty("token").GetString()!;

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Todo oluştur
        var createResp = await client.PostAsJsonAsync("/api/todos", new { title = "Hesapla silinecek todo" });
        Assert.Equal(HttpStatusCode.Created, createResp.StatusCode);

        // Todo listede görünmeli
        var listBefore = await client.GetAsync("/api/todos");
        var todosBefore = await listBefore.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>(JsonOptions);
        Assert.True(todosBefore.GetArrayLength() > 0, "Hesap silinmeden önce todo listede bulunmalı");

        // Hesabı sil
        var deleteResp = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/account")
        {
            Content = JsonContent.Create(new { currentPassword = password })
        });
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Eski token ile todo listesi → 401 (kullanıcı soft-deleted, token artık geçersiz)
        var listAfter = await client.GetAsync("/api/todos");
        Assert.Equal(HttpStatusCode.Unauthorized, listAfter.StatusCode);
    }

    // SFTDEL-006 / DELETE account + email geri kullanım: Silinmiş email ile yeni kayıt açılabilir
    [Fact]
    public async Task DeleteAccount_EmailCanBeReusedForNewRegistration()
    {
        var suffix   = Guid.NewGuid().ToString("N")[..8];
        var email    = $"reuse-{suffix}@test.com";
        var password = "Password123!";
        var anonClient = _factory.CreateClient();

        // Register + login
        await anonClient.PostAsJsonAsync("/api/auth/register", new { email, password });
        var loginResp = await anonClient.PostAsJsonAsync("/api/auth/login", new { email, password });
        var authBody  = await loginResp.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var token     = authBody.GetProperty("token").GetString()!;

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        // Hesabı sil
        var deleteResp = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/account")
        {
            Content = JsonContent.Create(new { currentPassword = password })
        });
        Assert.Equal(HttpStatusCode.NoContent, deleteResp.StatusCode);

        // Aynı email ile yeni kayıt → 201 (email geri kullanılabilir)
        var reRegisterResp = await anonClient.PostAsJsonAsync("/api/auth/register", new { email, password });
        Assert.Equal(HttpStatusCode.Created, reRegisterResp.StatusCode);
    }

    // PROF-006 / DELETE account / Senaryo 2: Yanlış şifre → 401
    [Fact]
    public async Task DeleteAccount_WrongPassword_Returns401()
    {
        var (client, _, _, _) = await CreateAuthenticatedUserAsync();

        var payload  = new { currentPassword = "WrongPassword!" };
        var response = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/auth/account")
        {
            Content = JsonContent.Create(payload)
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
